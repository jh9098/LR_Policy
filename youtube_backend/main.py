import os
import re
import json
import tempfile
import datetime as dt
from typing import Any, Dict, List, Optional

from fastapi import Body, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import yt_dlp

try:
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
except Exception:  # pragma: no cover - google client가 설치되지 않은 로컬 환경 대비
    build = None
    HttpError = Exception

YOUTUBE_API_KEY = os.environ.get("YOUTUBE_API_KEY", "").strip()
DEFAULT_COOKIE_TEXT = os.environ.get("YOUTUBE_COOKIE_TEXT", "").strip()
ALLOWED_ORIGINS = [origin.strip() for origin in os.environ.get("ALLOWED_ORIGINS", "*").split(",") if origin.strip()]
if not ALLOWED_ORIGINS:
    ALLOWED_ORIGINS = ["*"]

DATA_DIR = "data"
CHANNEL_STORE_PATH = os.path.join(DATA_DIR, "channels.json")
os.makedirs(DATA_DIR, exist_ok=True)

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


def _build_ydl_opts(base_opts: Optional[dict] = None) -> dict:
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
        "extractor_args": {"youtube": {"player_client": ["android", "ios"], "skip": ["dash", "hls"]}},
    }
    if base_opts:
        ydl_opts.update(base_opts)
    proxy_url = os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY") or ""
    if proxy_url:
        ydl_opts["proxy"] = proxy_url
    return ydl_opts


_CUE_RE = re.compile(r"^\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}")


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


def _extract_text_and_title(youtube_url: str, cookie_path: str = ""):
    opts = {
        "skip_download": True,
        "writesubtitles": True,
        "writeautomaticsub": True,
        "quiet": True,
        "forcejson": True,
        "simulate": True,
        "http_headers": {"User-Agent": "Mozilla/5.0"},
    }
    if cookie_path and os.path.exists(cookie_path):
        opts["cookiefile"] = cookie_path
    ydl_opts = _build_ydl_opts(opts)
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


class ExtractReq(BaseModel):
    urls: List[str] = Field(default_factory=list)
    cookie_text: Optional[str] = Field(default=None, description="Netscape 쿠키 텍스트")


class ExtractItem(BaseModel):
    url: str
    title: str
    filename: str
    text: Optional[str]
    warning: Optional[str] = None


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


@app.post("/api/extract_captions", response_model=List[ExtractItem])
def api_extract(req: ExtractReq):
    if not req.urls:
        raise HTTPException(400, "urls 비어있음")

    cookie_text = (req.cookie_text or "").strip() or DEFAULT_COOKIE_TEXT
    cookie_path = ""
    tmp_file = None
    try:
        if cookie_text:
            tmp_file = tempfile.NamedTemporaryFile(delete=False, mode="w", encoding="utf-8", suffix=".txt")
            tmp_file.write(cookie_text)
            tmp_file.flush()
            tmp_file.close()
            cookie_path = tmp_file.name

        results: List[ExtractItem] = []
        for url in req.urls:
            try:
                text, title = _extract_text_and_title(url, cookie_path=cookie_path)
                filename = sanitize_filename(title) + ".txt"
                if text:
                    results.append(ExtractItem(url=url, title=title, filename=filename, text=text))
                else:
                    results.append(ExtractItem(url=url, title=title, filename=filename, text=None, warning="자막 없음"))
            except Exception as exc:  # pragma: no cover - 네트워크 의존
                results.append(ExtractItem(url=url, title="(unknown)", filename="video.txt", text=None, warning=str(exc)))
        return results
    finally:
        if tmp_file is not None:
            try:
                os.unlink(tmp_file.name)
            except Exception:
                pass


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
