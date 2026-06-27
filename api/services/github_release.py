"""Latest-release lookup for github.com/donmutti/career-repo.

Returns the highest semver tag, semver-sorted (not creation-order). 5-minute
in-process cache; the first call after expiry kicks a background refresh and
returns the previously-cached value. The very first call returns None and
schedules an initial fetch.
"""

import threading
import time
from typing import Optional

import httpx
from packaging.version import InvalidVersion, Version

_REPO = "donmutti/career-repo"
_TAGS_URL = f"https://api.github.com/repos/{_REPO}/tags"
_TTL_SECONDS = 300

_lock = threading.Lock()
_value: Optional[str] = None
_fetched_at: float = 0.0
_in_flight: bool = False


def cached_latest_version() -> Optional[str]:
    """Return the cached latest tag (e.g. "0.1.8"). Kicks a background refresh if stale."""
    global _in_flight
    now = time.monotonic()
    with _lock:
        stale = _value is None or (now - _fetched_at) > _TTL_SECONDS
        if stale and not _in_flight:
            _in_flight = True
            threading.Thread(target=_refresh, daemon=True).start()
        return _value


def _refresh() -> None:
    global _value, _fetched_at, _in_flight
    try:
        latest = _fetch_latest_tag()
        with _lock:
            if latest is not None:
                _value = latest
            _fetched_at = time.monotonic()
    finally:
        with _lock:
            _in_flight = False


def _fetch_latest_tag() -> Optional[str]:
    try:
        r = httpx.get(_TAGS_URL, timeout=10, headers={"Accept": "application/vnd.github+json"})
        if r.status_code != 200:
            return None
        names = [t.get("name", "") for t in r.json() if isinstance(t, dict)]
    except (httpx.HTTPError, ValueError):
        return None

    versions: list[Version] = []
    for name in names:
        cleaned = name[1:] if name.startswith("v") else name
        try:
            versions.append(Version(cleaned))
        except InvalidVersion:
            continue
    if not versions:
        return None
    return str(max(versions))
