"""Load configuration from config.yml at the repo root."""

from pathlib import Path

import yaml

ROOT = Path(__file__).parent.parent
_config: dict = {}


def _load() -> dict:
    global _config
    if not _config:
        path = ROOT / "config.yml"
        with open(path) as f:
            _config = yaml.safe_load(f) or {}
    return _config


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
