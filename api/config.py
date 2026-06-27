"""Load configuration from config.yml at the repo root."""

from pathlib import Path
from typing import Any, Optional

import yaml

ROOT = Path(__file__).parent.parent
CONFIG_PATH = ROOT / "config.yml"
_config: dict = {}


def _load() -> dict:
    global _config
    if not _config:
        with open(CONFIG_PATH) as f:
            _config = yaml.safe_load(f) or {}
    return _config


def _save() -> None:
    with open(CONFIG_PATH, "w") as f:
        yaml.safe_dump(_config, f, sort_keys=False, allow_unicode=True)


def set_config(section: str, key: str, value: Any) -> None:
    cfg = _load()
    section_dict = cfg.setdefault(section, {})
    if value is None:
        section_dict.pop(key, None)
    else:
        section_dict[key] = value
    _save()


def get_api_host() -> str:
    return _load().get("api", {}).get("host", "127.0.0.1")


def get_api_port() -> int:
    return int(_load().get("api", {}).get("port", 8000))


def get_ui_port() -> int:
    return int(_load().get("ui", {}).get("port", 3000))


def get_db_path() -> str:
    return _load().get("db", {}).get("path", "./db/data.db")


def get_dump_path() -> str:
    return _load().get("db", {}).get("dump_path", "./db/data.json")


def get_attachment_path() -> str:
    return _load().get("db", {}).get("attachment_path", "./db/attachments")


def get_resumes_path() -> str:
    return _load().get("db", {}).get("resumes_path", "./db/resumes")


def get_images_path() -> str:
    return _load().get("db", {}).get("images_path", "./db/images")


def get_inbox_scan_days() -> int:
    return int(_load().get("inbox", {}).get("scan_days", 30))


def get_inbox_scan_batch_size() -> int:
    return int(_load().get("inbox", {}).get("scan_batch_size", 10))


def get_inbox_scan_keywords() -> list[str]:
    return _load().get("inbox", {}).get("scan_keywords", [])


def get_runtime_model() -> Optional[str]:
    return _load().get("runtime", {}).get("model") or None
