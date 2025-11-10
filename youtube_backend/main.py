import os
import re
import json
import time
import uuid
import hashlib
import datetime as dt
from typing import Any, Dict, List, Optional, Tuple

import urllib.error
import urllib.request

from fastapi import Body, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import yt_dlp
from yt_dlp.utils import DownloadError

try:
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
except Exception:  # pragma: no cover - google client가 설치되지 않은 로컬 환경 대비
    build = None
    HttpError = Exception

YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "").strip()
DEFAULT_COOKIE_TEXT = os.environ.get("YOUTUBE_COOKIE_TEXT", "").strip()
def _normalize_origin(origin: str) -> str:
    return origin.strip().rstrip("/")


_raw_allowed_origins = [
    _normalize_origin(origin)
    for origin in os.environ.get("ALLOWED_ORIGINS", "*").split(",")
    if origin.strip()
]

# 기본적으로 운영 중인 Netlify/Render 도메인과 로컬 개발 주소를 허용한다.
_default_allowed_origins = {
    "http://localhost:5173",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:4173",
    "https://lrissues.netlify.app",
    "https://www.lrissues.netlify.app",
    "https://lr-policy.onrender.com",
    "https://infoall.netlify.app",
    "https://www.infoall.netlify.app",
}

if not _raw_allowed_origins:
    ALLOWED_ORIGINS = ["*"]
elif "*" in _raw_allowed_origins:
    ALLOWED_ORIGINS = ["*"]
else:
    ALLOWED_ORIGINS = sorted(_default_allowed_origins | set(_raw_allowed_origins))

DATA_DIR = "data"
CHANNEL_STORE_PATH = os.path.join(DATA_DIR, "channels.json")
JOB_STORE_DIR = os.path.join(DATA_DIR, "caption_jobs")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(JOB_STORE_DIR, exist_ok=True)

CAPTION_WORKFLOW_REPO = os.environ.get("CAPTION_WORKFLOW_REPO", "").strip()
CAPTION_WORKFLOW_FILE = os.environ.get("CAPTION_WORKFLOW_FILE", "").strip()
CAPTION_WORKFLOW_REF = os.environ.get("CAPTION_WORKFLOW_REF", "main").strip() or "main"
CAPTION_WORKFLOW_TOKEN = os.environ.get("CAPTION_WORKFLOW_TOKEN", "").strip()
CAPTION_WORKFLOW_BASE_URL = os.environ.get("CAPTION_JOB_BASE_URL", "").strip()
CAPTION_WORKFLOW_RUNNER_LABELS = os.environ.get("CAPTION_WORKFLOW_RUNNER_LABELS", "").strip()
CAPTION_INTERNAL_JOB_TOKEN = os.environ.get("CAPTION_JOB_TOKEN", "").strip()

app = FastAPI(title="YouTube Search & Caption API", version="1.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class QuietLogger:
    def debug(self, msg):  # pragma: no cover - yt_dlp 내부용
        pass

    def info(self, msg):  # pragma: no cover
        pass

    def warning(self, msg):  # pragma: no cover
        pass

    def error(self, msg):  # pragma: no cover
        print(msg)


def _build_ydl_opts(
    base_opts: Optional[dict] = None,
    *,
    disable_adaptive_formats: bool = True,
) -> dict:
    ydl_opts = {
        "skip_download": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "quiet": True,
        "no_warnings": True,
        "logger": QuietLogger(),
        "forcejson": True,
        "simulate": True,
        "http_headers": {"User-Agent": "Mozilla/5.0"},
    }
    extractor_args: Dict[str, Any] = {"youtube": {"player_client": ["android", "ios"]}}
    if disable_adaptive_formats:
        extractor_args["youtube"]["skip"] = ["dash", "hls"]
    ydl_opts["extractor_args"] = extractor_args
    if base_opts:
        ydl_opts.update(base_opts)
    proxy_url = os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY") or ""
    if proxy_url:
        ydl_opts["proxy"] = proxy_url
    return ydl_opts


_CUE_RE = re.compile(r"^\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}")
_COOKIE_LINE_RE = re.compile(
    r"^(?P<domain>\S+)\s+"
    r"(?P<flag>\S+)\s+"
    r"(?P<path>\S+)\s+"
    r"(?P<secure>\S+)\s+"
    r"(?P<expiry>-?\d+)\s+"
    r"(?P<name>[^\s]+)\s+"
    r"(?P<value>.*)$"
)


def clean_vtt(vtt_text: str) -> str:
    lines = vtt_text.splitlines()
    result: List[str] = []
    prev = ""
    for line in lines:
        if _CUE_RE.match(line):
            continue
        if line.strip().startswith(("WEBVTT", "Kind:", "Language:", "NOTE", "align:", "position:")):
            continue
        clean = re.sub(r"<[^>]+>", "", line).strip()
        if clean and clean != prev:
            result.append(clean)
            prev = clean
    return "\n".join(result)


def sanitize_filename(name: str, max_len: int = 150) -> str:
    name = re.sub(r'[\\/:*?"<>|]+', " ", name).strip()
    name = re.sub(r"\s+", " ", name)
    return (name[:max_len].rstrip() or "video")


def _job_file_path(job_id: str) -> str:
    return os.path.join(JOB_STORE_DIR, f"{job_id}.json")


def _load_job(job_id: str) -> Optional[Dict[str, Any]]:
    path = _job_file_path(job_id)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as file:
            data = json.load(file)
            if isinstance(data, dict):
                return data
    except Exception:
        pass
    return None


def _save_job(job: Dict[str, Any]):
    path = _job_file_path(job.get("job_id", ""))
    if not path:
        raise RuntimeError("잘못된 작업 ID")
    tmp_path = f"{path}.tmp"
    with open(tmp_path, "w", encoding="utf-8") as file:
        json.dump(job, file, ensure_ascii=False, indent=2)
    os.replace(tmp_path, path)


def _require_internal_token(token: str):
    if not CAPTION_INTERNAL_JOB_TOKEN:
        raise HTTPException(500, "CAPTION_JOB_TOKEN 환경변수 미설정")
    if token != CAPTION_INTERNAL_JOB_TOKEN:
        raise HTTPException(403, "작업 토큰 불일치")


def _dispatch_caption_workflow(job_id: str, *, runner_labels: Optional[str] = None):
    if not CAPTION_WORKFLOW_REPO or not CAPTION_WORKFLOW_FILE or not CAPTION_WORKFLOW_TOKEN:
        raise RuntimeError("CAPTION_WORKFLOW 환경변수 미설정")
    if not CAPTION_WORKFLOW_BASE_URL:
        raise RuntimeError("CAPTION_JOB_BASE_URL 환경변수 미설정")
    url = (
        f"https://api.github.com/repos/{CAPTION_WORKFLOW_REPO}/actions/workflows/"
        f"{CAPTION_WORKFLOW_FILE}/dispatches"
    )
    headers = {
        "Authorization": f"Bearer {CAPTION_WORKFLOW_TOKEN}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "lr-policy-backend",
    }
    inputs: Dict[str, str] = {
        "job_id": job_id,
        "base_url": CAPTION_WORKFLOW_BASE_URL,
    }
    labels = runner_labels or CAPTION_WORKFLOW_RUNNER_LABELS
    if labels:
        inputs["runner_labels"] = labels
    payload = json.dumps({"ref": CAPTION_WORKFLOW_REF, "inputs": inputs}).encode("utf-8")
    request = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(request) as response:
            if response.status not in (200, 201, 204):
                raise RuntimeError(f"GitHub Actions 응답 오류: {response.status}")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore") if hasattr(exc, "read") else str(exc)
        raise RuntimeError(f"GitHub Actions 트리거 실패: {exc.code} {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"GitHub Actions 호출 실패: {exc.reason}") from exc


def _fmt_hhmmss(total_sec: int) -> str:
    h = total_sec // 3600
    m = (total_sec % 3600) // 60
    s = total_sec % 60
    return f"{h:02d}:{m:02d}:{s:02d}" if h > 0 else f"{m:02d}:{s:02d}"


def _parse_iso8601_duration_to_seconds(iso_dur: str) -> int:
    if not iso_dur or not iso_dur.startswith("PT"):
        return 0
    h = m = s = 0
    for part in re.findall(r"(\d+H|\d+M|\d+S)", iso_dur):
        if part.endswith("H"):
            h = int(part[:-1])
        elif part.endswith("M"):
            m = int(part[:-1])
        elif part.endswith("S"):
            s = int(part[:-1])
    return h * 3600 + m * 60 + s


def _format_upload_datestr_iso8601_to_pair(iso_str: str):
    try:
        dt_utc = dt.datetime.fromisoformat(iso_str.replace("Z", "+00:00"))
        dt_kst = dt_utc.astimezone(dt.timezone(dt.timedelta(hours=9)))
        return dt_kst.strftime("%Y%m%d%H%M%S"), dt_kst.strftime("%Y-%m-%d %H:%M:%S")
    except Exception:
        return "", ""


def _extract_text_and_title(
    youtube_url: str,
    *,
    cookie_path: str = "",
    http_headers: Optional[Dict[str, str]] = None,
):
    opts = {
        "skip_download": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "quiet": True,
        "forcejson": True,
        "simulate": True,
        "http_headers": http_headers or {"User-Agent": "Mozilla/5.0"},
    }
    if cookie_path and os.path.exists(cookie_path):
        opts["cookiefile"] = cookie_path

    last_error: Optional[Exception] = None
    for disable_adaptive in (True, False):
        ydl_opts = _build_ydl_opts(opts, disable_adaptive_formats=disable_adaptive)
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(youtube_url, download=False)
                title = info.get("title") or "video"
                subs = info.get("subtitles") or {}
                auto_subs = info.get("automatic_captions") or {}

                def get_vtt(sub_dict, preferred=("ko", "ko-KR", "ko_KR", "en")):
                    for lang in preferred:
                        if lang in sub_dict:
                            for fmt in sub_dict[lang]:
                                if fmt.get("ext") == "vtt":
                                    return ydl.urlopen(fmt["url"]).read().decode("utf-8")
                    for _, formats in sub_dict.items():
                        for fmt in formats:
                            if fmt.get("ext") == "vtt":
                                return ydl.urlopen(fmt["url"]).read().decode("utf-8")
                    return None

                vtt_text = get_vtt(subs) or get_vtt(auto_subs)
                if not vtt_text:
                    return None, title
                return clean_vtt(vtt_text), title
        except DownloadError as exc:
            last_error = exc
            message = str(exc)
            if "Requested format is not available" in message or "This video is not available" in message:
                # 재시도: DASH/HLS 차단 해제 후 한 번 더 시도한다.
                continue
            raise
        except Exception as exc:  # pragma: no cover - 네트워크 의존
            last_error = exc
            raise

    if last_error:
        raise last_error
    raise RuntimeError("자막 추출 실패: 원인을 확인할 수 없습니다.")


_CHANNEL_ID_RE = re.compile(r"^UC[0-9A-Za-z_-]{22,}$")


def _resolve_channel_id(youtube, channel_input: str) -> str:
    if not channel_input:
        return ""
    s = channel_input.strip()
    if _CHANNEL_ID_RE.match(s):
        return s
    if "youtube.com" in s:
        match = re.search(r"/channel/(UC[0-9A-Za-z_-]{22,})", s)
        if match:
            return match.group(1)
        match = re.search(r"/@([A-Za-z0-9._-]+)", s)
        if match:
            try:
                resp = youtube.channels().list(part="id", forHandle=match.group(1)).execute()
                items = resp.get("items", [])
                if items:
                    return items[0]["id"]
            except Exception:
                pass
    if s.startswith("@"):
        try:
            resp = youtube.channels().list(part="id", forHandle=s[1:]).execute()
            items = resp.get("items", [])
            if items:
                return items[0]["id"]
        except Exception:
            pass
    try:
        resp = youtube.channels().list(part="id", forUsername=s).execute()
        items = resp.get("items", [])
        if items:
            return items[0]["id"]
    except Exception:
        pass
    return ""


def search_youtube_videos_api(
    api_key: str,
    keyword: str,
    max_results: int = 50,
    time_filter: str = "any",
    custom_from: str = "",
    custom_to: str = "",
    duration_filter: str = "any",
    sort_by: str = "views",
    channel_filter: str = "",
) -> List[Dict[str, Any]]:
    if not api_key:
        raise RuntimeError("YOUTUBE_API_KEY 미설정")
    if build is None:
        raise RuntimeError("google-api-python-client 필요")

    youtube = build("youtube", "v3", developerKey=api_key)
    params: Dict[str, Any] = {
        "q": keyword or "",
        "part": "snippet",
        "type": "video",
        "maxResults": min(max_results, 50),
    }
    if channel_filter:
        channel_id = _resolve_channel_id(youtube, channel_filter)
        if channel_id:
            params["channelId"] = channel_id

    now_utc = dt.datetime.now(dt.timezone.utc)
    if time_filter in ("day", "week", "month", "custom"):
        if time_filter == "day":
            params["publishedAfter"] = (now_utc - dt.timedelta(days=1)).isoformat()
        elif time_filter == "week":
            params["publishedAfter"] = (now_utc - dt.timedelta(weeks=1)).isoformat()
        elif time_filter == "month":
            params["publishedAfter"] = (now_utc - dt.timedelta(days=30)).isoformat()
        elif time_filter == "custom":
            if custom_from:
                params["publishedAfter"] = custom_from
            if custom_to:
                params["publishedBefore"] = custom_to
    if duration_filter in ("short", "medium", "long"):
        params["videoDuration"] = duration_filter
    params["order"] = "date" if sort_by == "date" else "viewCount"

    search_resp = youtube.search().list(**params).execute()
    video_ids = [item["id"]["videoId"] for item in search_resp.get("items", []) if item.get("id")]
    if not video_ids:
        return []

    videos_resp = youtube.videos().list(part="snippet,statistics,contentDetails", id=",".join(video_ids)).execute()

    items: List[Dict[str, Any]] = []
    for video in videos_resp.get("items", []):
        vid = video.get("id")
        snippet = video.get("snippet", {}) or {}
        statistics = video.get("statistics", {}) or {}
        content_details = video.get("contentDetails", {}) or {}
        title = (snippet.get("title") or "").strip()
        url = f"https://www.youtube.com/watch?v={vid}" if vid else ""
        if not (title and url):
            continue
        channel_title = (snippet.get("channelTitle") or "").strip()
        channel_id = (snippet.get("channelId") or "").strip()
        date_raw, date_fmt = _format_upload_datestr_iso8601_to_pair(snippet.get("publishedAt") or "")
        dur_seconds = _parse_iso8601_duration_to_seconds(content_details.get("duration") or "")
        try:
            view_count = int(statistics.get("viewCount")) if "viewCount" in statistics else None
        except Exception:
            view_count = None
        items.append(
            {
                "url": url,
                "title": title,
                "video_id": vid,
                "channel_title": channel_title,
                "channel_id": channel_id,
                "date_raw": date_raw,
                "date_fmt": date_fmt,
                "published_at_iso": snippet.get("publishedAt") or "",
                "view_count": view_count,
                "dur_seconds": dur_seconds,
                "dur_hms": _fmt_hhmmss(dur_seconds),
                "thumbnails": snippet.get("thumbnails") or {},
                "language": snippet.get("defaultAudioLanguage")
                or snippet.get("defaultLanguage")
                or "",
                "has_captions": str(content_details.get("caption", "")).lower() == "true",
            }
        )
    if sort_by == "views":
        items.sort(
            key=lambda item: (
                0 if isinstance(item["view_count"], int) else 1,
                -(item["view_count"] or 0),
                item["date_raw"] or "00000000",
            )
        )
    else:
        items.sort(key=lambda item: item["date_raw"] or "00000000", reverse=True)
    return items[:max_results]


def load_channel_store() -> Dict[str, Any]:
    try:
        with open(CHANNEL_STORE_PATH, "r", encoding="utf-8") as file:
            data = json.load(file)
            if isinstance(data, dict) and isinstance(data.get("channels"), list):
                return data
    except Exception:
        pass
    return {"channels": []}


def save_channel_store(data: Dict[str, Any]):
    with open(CHANNEL_STORE_PATH, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)


def add_channel_to_store(channel_id: str, title: str):
    if not channel_id or not channel_id.startswith("UC"):
        return
    data = load_channel_store()
    items = {item["id"]: item for item in data.get("channels", []) if isinstance(item, dict) and "id" in item}
    prev = items.get(channel_id)
    if not prev or (title and prev.get("title") != title):
        items[channel_id] = {"id": channel_id, "title": title or (prev.get("title") if prev else "")}
        data["channels"] = sorted(items.values(), key=lambda entry: (entry.get("title") or "").lower())
        save_channel_store(data)


def remove_channels_from_store(ids: List[str]):
    data = load_channel_store()
    keep = [item for item in data.get("channels", []) if item.get("id") not in set(ids)]
    data["channels"] = keep
    save_channel_store(data)


def _ensure_netscape_cookie_text(cookie_text: str) -> str:
    """쿠키 텍스트가 Netscape 포맷을 따르도록 헤더 및 구분자를 보강한다."""

    if not cookie_text.strip():
        return ""

    normalized = cookie_text.replace("\r\n", "\n").replace("\r", "\n")
    raw_lines = normalized.split("\n")

    header = "# Netscape HTTP Cookie File"
    output_lines: List[str] = [header]

    for raw_line in raw_lines:
        if not raw_line:
            continue
        if raw_line.startswith("# Netscape"):
            continue
        stripped = raw_line.rstrip()
        if stripped.startswith("#") and not stripped.startswith("#HttpOnly_"):
            output_lines.append(stripped)
            continue
        parsed = _split_cookie_line(stripped)
        if not parsed:
            output_lines.append(stripped)
            continue
        domain, flag, path, secure, expiry, name, value = parsed
        http_only_prefix = ""
        if domain.startswith("#HttpOnly_"):
            http_only_prefix = "#HttpOnly_"
            domain = domain[len("#HttpOnly_"):]
        normalized_line = "\t".join(
            [
                f"{http_only_prefix}{domain.strip()}",
                flag.strip(),
                path.strip(),
                secure.strip(),
                expiry.strip(),
                name.strip(),
                value.strip(),
            ]
        )
        output_lines.append(normalized_line)

    if output_lines[-1] != "":
        output_lines.append("")
    return "\n".join(output_lines)


def _split_cookie_line(line: str) -> Optional[Tuple[str, str, str, str, str, str, str]]:
    http_only_prefix = ""
    working = line.strip()
    if not working:
        return None
    if working.startswith("#HttpOnly_"):
        http_only_prefix = "#HttpOnly_"
        working = working[len("#HttpOnly_"):]

    parts = working.split("\t")
    if len(parts) < 7:
        match = _COOKIE_LINE_RE.match(working)
        if match:
            parts = [
                match.group("domain"),
                match.group("flag"),
                match.group("path"),
                match.group("secure"),
                match.group("expiry"),
                match.group("name"),
                match.group("value"),
            ]
        elif "=" in working and not working.startswith("#"):
            name, value = working.split("=", 1)
            parts = [".youtube.com", "TRUE", "/", "TRUE", "0", name.strip(), value.strip()]
        else:
            return None

    if len(parts) > 7:
        parts = parts[:6] + ["\t".join(parts[6:])]

    domain = parts[0].strip()
    if http_only_prefix:
        domain = f"{http_only_prefix}{domain}"
    parts = [domain] + [p.strip() if idx < 6 else p for idx, p in enumerate(parts[1:], start=1)]
    if len(parts) < 7:
        return None
    return tuple(parts[:7])  # type: ignore[return-value]


def _extract_cookie_map(cookie_text: str) -> Dict[str, str]:
    cookies: Dict[str, str] = {}
    normalized = cookie_text.replace("\r\n", "\n").replace("\r", "\n")
    for raw_line in normalized.split("\n"):
        stripped = raw_line.strip()
        if not stripped:
            continue
        if stripped.startswith("#") and not stripped.startswith("#HttpOnly_"):
            continue
        parsed = _split_cookie_line(raw_line)
        if not parsed:
            continue
        _, _, _, _, _, name, value = parsed
        cookies[name] = value
    return cookies


def _build_sapisidhash_header(cookies: Dict[str, str], origin: str = "https://www.youtube.com") -> Optional[str]:
    sapisid = cookies.get("SAPISID") or cookies.get("__Secure-3PAPISID")
    if not sapisid:
        return None
    timestamp = str(int(time.time()))
    digest_src = " ".join([timestamp, sapisid, origin])
    digest = hashlib.sha1(digest_src.encode("utf-8")).hexdigest()
    return f"SAPISIDHASH {timestamp}_{digest}"


class ExtractReq(BaseModel):
    urls: List[str] = Field(default_factory=list)
    cookie_text: Optional[str] = Field(default=None, description="Netscape 쿠키 텍스트")


class ExtractItem(BaseModel):
    url: str
    title: str
    filename: str
    text: Optional[str]
    warning: Optional[str] = None


class ExtractJobResponse(BaseModel):
    job_id: str
    status: str
    queued_urls: List[str]
    workflow_url: Optional[str] = None
    message: Optional[str] = None


class ExtractJobStatus(BaseModel):
    job_id: str
    status: str
    results: List[ExtractItem] = Field(default_factory=list)
    error: Optional[str] = None
    updated_at: Optional[str] = None


class ExtractJobCompleteReq(BaseModel):
    status: str
    results: List[ExtractItem] = Field(default_factory=list)
    error: Optional[str] = None


class SearchReq(BaseModel):
    keywords: List[str] = Field(default_factory=list)
    limit: int = 50
    time_filter: str = Field(default="any")
    custom_from_iso: str = Field(default="")
    custom_to_iso: str = Field(default="")
    duration_filter: str = Field(default="any")
    sort_by: str = Field(default="views")
    channel_ids: List[str] = Field(default_factory=list)
    min_views: int = 0
    len_min: Optional[int] = None
    len_max: Optional[int] = None


class SearchItem(BaseModel):
    url: str
    title: str
    date_fmt: str
    channel_title: str
    view_count: Optional[int]
    dur_seconds: int
    dur_hms: str
    channel_id: str
    video_id: str
    published_at_iso: str
    thumbnails: Dict[str, Any] = Field(default_factory=dict)
    language: str = ""
    has_captions: bool = False


@app.post("/api/extract_captions", response_model=ExtractJobResponse)
def api_extract(req: ExtractReq):
    if not req.urls:
        raise HTTPException(400, "urls 비어있음")

    if not CAPTION_WORKFLOW_REPO or not CAPTION_WORKFLOW_FILE or not CAPTION_WORKFLOW_TOKEN:
        raise HTTPException(500, "GitHub Actions 연동 환경변수가 설정되지 않았습니다.")
    if not CAPTION_WORKFLOW_BASE_URL:
        raise HTTPException(500, "CAPTION_JOB_BASE_URL 환경변수가 설정되지 않았습니다.")
    if not CAPTION_INTERNAL_JOB_TOKEN:
        raise HTTPException(500, "CAPTION_JOB_TOKEN 환경변수가 설정되지 않았습니다.")

    cookie_text = (req.cookie_text or "").strip() or DEFAULT_COOKIE_TEXT
    http_headers: Dict[str, str] = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://www.youtube.com/",
    }
    if cookie_text:
        cookie_text = _ensure_netscape_cookie_text(cookie_text)
        cookies = _extract_cookie_map(cookie_text)
        auth_header = _build_sapisidhash_header(cookies)
        if auth_header:
            http_headers["Authorization"] = auth_header
            http_headers.setdefault("Origin", "https://www.youtube.com")
            http_headers.setdefault("X-Origin", "https://www.youtube.com")
            http_headers.setdefault("X-Youtube-Client-Name", "1")
            http_headers.setdefault("X-Youtube-Client-Version", "2.20240501.01.00")

    now_utc = dt.datetime.now(dt.timezone.utc)
    job_id = f"{now_utc.strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:8]}"
    job_data = {
        "job_id": job_id,
        "status": "queued",
        "urls": req.urls,
        "cookie_text": cookie_text,
        "http_headers": http_headers,
        "created_at": now_utc.isoformat(),
        "updated_at": now_utc.isoformat(),
        "results": [],
        "error": None,
    }
    _save_job(job_data)

    try:
        _dispatch_caption_workflow(job_id)
    except Exception as exc:
        job_data["status"] = "failed"
        job_data["error"] = str(exc)
        job_data["updated_at"] = dt.datetime.now(dt.timezone.utc).isoformat()
        _save_job(job_data)
        raise HTTPException(500, f"GitHub Actions 트리거 실패: {exc}")

    workflow_url = (
        f"https://github.com/{CAPTION_WORKFLOW_REPO}/actions/workflows/{CAPTION_WORKFLOW_FILE}"
        if CAPTION_WORKFLOW_REPO and CAPTION_WORKFLOW_FILE
        else None
    )
    return ExtractJobResponse(
        job_id=job_id,
        status="queued",
        queued_urls=req.urls,
        workflow_url=workflow_url,
        message="GitHub Actions에 자막 추출 작업을 요청했습니다.",
    )


@app.get("/api/extract_captions/{job_id}", response_model=ExtractJobStatus)
def api_extract_status(job_id: str):
    job = _load_job(job_id)
    if not job:
        raise HTTPException(404, "작업을 찾을 수 없습니다.")
    results_data = job.get("results") or []
    results: List[ExtractItem] = []
    for item in results_data:
        try:
            results.append(ExtractItem(**item))
        except Exception:
            continue
    return ExtractJobStatus(
        job_id=job_id,
        status=job.get("status") or "unknown",
        results=results,
        error=job.get("error"),
        updated_at=job.get("updated_at"),
    )


@app.get("/internal/caption_jobs/{job_id}")
def internal_get_caption_job(job_id: str, x_job_token: str = Header(default="")):
    _require_internal_token(x_job_token)
    job = _load_job(job_id)
    if not job:
        raise HTTPException(404, "작업을 찾을 수 없습니다.")
    job["status"] = "running"
    job["updated_at"] = dt.datetime.now(dt.timezone.utc).isoformat()
    _save_job(job)
    return {
        "job_id": job_id,
        "urls": job.get("urls") or [],
        "cookie_text": job.get("cookie_text") or "",
        "http_headers": job.get("http_headers") or {},
    }


@app.post("/internal/caption_jobs/{job_id}/complete")
def internal_complete_caption_job(
    job_id: str,
    payload: ExtractJobCompleteReq,
    x_job_token: str = Header(default=""),
):
    _require_internal_token(x_job_token)
    job = _load_job(job_id)
    if not job:
        raise HTTPException(404, "작업을 찾을 수 없습니다.")
    now_iso = dt.datetime.now(dt.timezone.utc).isoformat()
    job["status"] = payload.status
    job["updated_at"] = now_iso
    job["error"] = payload.error
    job["results"] = [item.dict() for item in payload.results]
    job["cookie_text"] = ""
    _save_job(job)
    return {"status": job["status"], "updated_at": now_iso}


@app.post("/api/search_videos", response_model=Dict[str, List[SearchItem]])
def api_search(req: SearchReq):
    if not YOUTUBE_API_KEY:
        raise HTTPException(500, "서버에 YOUTUBE_API_KEY 환경변수 미설정")
    if not req.keywords:
        raise HTTPException(400, "keywords 비어있음")

    def _filter_local(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        out: List[Dict[str, Any]] = []
        for item in items:
            view_count = item.get("view_count")
            if isinstance(req.min_views, int) and (view_count is not None) and view_count < req.min_views:
                continue
            if req.len_min is not None and item.get("dur_seconds", 0) < req.len_min:
                continue
            if req.len_max is not None and item.get("dur_seconds", 0) > req.len_max:
                continue
            out.append(item)
        return out

    merged: Dict[str, List[SearchItem]] = {}
    for keyword in req.keywords:
        key = keyword or ""
        try:
            if req.channel_ids:
                seen_urls = set()
                combined: List[Dict[str, Any]] = []
                for channel_id in req.channel_ids:
                    items = search_youtube_videos_api(
                        YOUTUBE_API_KEY,
                        key,
                        max_results=req.limit,
                        time_filter=req.time_filter,
                        custom_from=req.custom_from_iso,
                        custom_to=req.custom_to_iso,
                        duration_filter=req.duration_filter,
                        sort_by=req.sort_by,
                        channel_filter=channel_id,
                    )
                    for item in items:
                        if item["url"] in seen_urls:
                            continue
                        seen_urls.add(item["url"])
                        combined.append(item)
                if req.sort_by == "views":
                    combined.sort(
                        key=lambda item: (
                            0 if isinstance(item["view_count"], int) else 1,
                            -(item["view_count"] or 0),
                            item["date_raw"] or "00000000",
                        )
                    )
                else:
                    combined.sort(key=lambda item: item["date_raw"] or "00000000", reverse=True)
                items_for_keyword = combined[: req.limit]
            else:
                items_for_keyword = search_youtube_videos_api(
                    YOUTUBE_API_KEY,
                    key,
                    max_results=req.limit,
                    time_filter=req.time_filter,
                    custom_from=req.custom_from_iso,
                    custom_to=req.custom_to_iso,
                    duration_filter=req.duration_filter,
                    sort_by=req.sort_by,
                    channel_filter="",
                )
        except HttpError:  # pragma: no cover - 네트워크 의존
            items_for_keyword = []
        except Exception:  # pragma: no cover
            items_for_keyword = []

        filtered = _filter_local(items_for_keyword)
        merged[keyword] = [
            SearchItem(
                url=item["url"],
                title=item["title"],
                date_fmt=item["date_fmt"],
                channel_title=item["channel_title"],
                view_count=item["view_count"],
                dur_seconds=item["dur_seconds"],
                dur_hms=item["dur_hms"],
                channel_id=item["channel_id"],
                video_id=item.get("video_id") or "",
                published_at_iso=item.get("published_at_iso") or "",
                thumbnails=item.get("thumbnails") or {},
                language=item.get("language") or "",
                has_captions=bool(item.get("has_captions")),
            )
            for item in filtered
        ]
    return merged


@app.get("/api/channel_store")
def get_channel_store():
    return load_channel_store()


@app.post("/api/channel_store/add")
def add_channels(payload: Dict[str, Any] = Body(...)):
    entries = payload.get("channels")
    if isinstance(entries, list):
        for entry in entries:
            cid = (entry or {}).get("id")
            title = (entry or {}).get("title", "")
            if cid and cid.startswith("UC"):
                add_channel_to_store(cid, title)
    else:
        cid = payload.get("id")
        title = payload.get("title", "")
        if not cid or not cid.startswith("UC"):
            raise HTTPException(400, "UC로 시작하는 채널ID 필요")
        add_channel_to_store(cid, title)
    return load_channel_store()


@app.post("/api/channel_store/remove")
def remove_channels(payload: Dict[str, Any] = Body(...)):
    ids = payload.get("ids", [])
    remove_channels_from_store(ids)
    return load_channel_store()


if __name__ == "__main__":  # pragma: no cover
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=int(os.environ.get("PORT", "8000")))
