"""Career Repo API."""

import subprocess


def _get_version() -> str:
    try:
        return subprocess.check_output(
            ["git", "describe", "--tags", "--always", "--abbrev=0"],
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip().lstrip("v")
    except Exception:
        return "unknown"


__version__ = _get_version()
