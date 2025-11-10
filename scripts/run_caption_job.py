#!/usr/bin/env python3
"""GitHub Actions 자막 추출 작업 실행기."""
import os
import tempfile
from typing import Any, Dict, List

import requests

from youtube_backend.main import (
    _build_sapisidhash_header,
    _ensure_netscape_cookie_text,
    _extract_cookie_map,
    _extract_text_and_title,
    sanitize_filename,
    ExtractItem,
)


def _log(message: str):
    print(message, flush=True)


def _get_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"환경변수 {name} 미설정")
    return value


def _fetch_job(base_url: str, job_id: str, token: str) -> Dict[str, Any]:
    url = f"{base_url.rstrip('/')}/internal/caption_jobs/{job_id}"
    _log(f"[job:{job_id}] 작업 정보를 요청합니다: {url}")
    resp = requests.get(url, headers={"X-Job-Token": token}, timeout=60)
    if resp.status_code != 200:
        raise RuntimeError(f"작업 정보 조회 실패: {resp.status_code} {resp.text}")
    return resp.json()


def _post_result(base_url: str, job_id: str, token: str, payload: Dict[str, Any]):
    url = f"{base_url.rstrip('/')}/internal/caption_jobs/{job_id}/complete"
    _log(f"[job:{job_id}] 작업 결과를 전송합니다: {url}")
    resp = requests.post(url, headers={"X-Job-Token": token}, json=payload, timeout=60)
    if resp.status_code != 200:
        raise RuntimeError(f"작업 결과 전송 실패: {resp.status_code} {resp.text}")
    return resp.json()


def main():
    job_id = _get_env("CAPTION_JOB_ID")
    base_url = _get_env("CAPTION_JOB_BASE_URL")
    token = _get_env("CAPTION_JOB_TOKEN")

    try:
        job_data = _fetch_job(base_url, job_id, token)
    except Exception as exc:  # pragma: no cover - 네트워크 의존
        _log(f"[job:{job_id}] 작업 정보 조회 중 오류: {exc}")
        raise

    urls: List[str] = [url for url in job_data.get("urls", []) if isinstance(url, str) and url]
    cookie_text = job_data.get("cookie_text") or ""
    http_headers: Dict[str, str] = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://www.youtube.com/",
    }
    if isinstance(job_data.get("http_headers"), dict):
        http_headers.update({k: str(v) for k, v in job_data["http_headers"].items()})

    tmp_file = None
    results: List[Dict[str, Any]] = []
    status = "completed"
    error_message = None

    try:
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
            tmp_file = tempfile.NamedTemporaryFile(delete=False, mode="w", encoding="utf-8", suffix=".txt")
            tmp_file.write(cookie_text)
            tmp_file.flush()
            tmp_file.close()
            cookie_path = tmp_file.name
        else:
            cookie_path = ""

        for url in urls:
            try:
                text, title = _extract_text_and_title(
                    url, cookie_path=cookie_path, http_headers=dict(http_headers)
                )
                filename = sanitize_filename(title) + ".txt"
                if text:
                    item = ExtractItem(url=url, title=title, filename=filename, text=text)
                else:
                    item = ExtractItem(
                        url=url,
                        title=title,
                        filename=filename,
                        text=None,
                        warning="자막 없음",
                    )
                results.append(item.dict())
            except Exception as exc:  # pragma: no cover - 네트워크 의존
                results.append(
                    ExtractItem(
                        url=url,
                        title="(unknown)",
                        filename="video.txt",
                        text=None,
                        warning=str(exc),
                    ).dict()
                )
    except Exception as exc:  # pragma: no cover
        status = "failed"
        error_message = str(exc)
        _log(f"[job:{job_id}] 작업 실행 중 오류: {exc}")
    finally:
        if tmp_file is not None:
            try:
                os.unlink(tmp_file.name)
            except Exception:
                pass

    payload = {
        "status": status,
        "results": results,
        "error": error_message,
    }

    try:
        _post_result(base_url, job_id, token, payload)
    except Exception as exc:  # pragma: no cover - 네트워크 의존
        _log(f"[job:{job_id}] 결과 전송 실패: {exc}")
        raise

    if status != "completed":
        raise RuntimeError(error_message or "자막 추출 실패")


if __name__ == "__main__":
    main()
