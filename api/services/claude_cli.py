"""Probes for the Claude CLI and Anthropic API.

Used by /settings/general and /settings/inbox to report environment state.
"""

import os
import shutil
import subprocess
from typing import Optional

import httpx

GMAIL_MCP_SERVER_NAME = "claude.ai Gmail"

_FALLBACK_MODELS = [
    "claude-opus-4-7",
    "claude-sonnet-4-6",
    "claude-haiku-4-5",
]


def is_online() -> bool:
    """True iff `claude` CLI is on PATH and responds to --version."""
    if shutil.which("claude") is None:
        return False
    try:
        r = subprocess.run(["claude", "--version"], capture_output=True, timeout=5)
        return r.returncode == 0
    except (subprocess.TimeoutExpired, OSError):
        return False


def list_models() -> list[str]:
    """Return Anthropic model IDs. Falls back to a known set if API isn't reachable."""
    key = os.environ.get("ANTHROPIC_API_KEY")
    if key:
        try:
            r = httpx.get(
                "https://api.anthropic.com/v1/models",
                headers={"x-api-key": key, "anthropic-version": "2023-06-01"},
                timeout=5,
            )
            if r.status_code == 200:
                return [m["id"] for m in r.json().get("data", [])]
        except httpx.HTTPError:
            pass
    return _FALLBACK_MODELS


def _mcp_list_raw() -> Optional[str]:
    if shutil.which("claude") is None:
        return None
    try:
        r = subprocess.run(["claude", "mcp", "list"], capture_output=True, text=True, timeout=10)
        if r.returncode != 0:
            return None
        return r.stdout
    except (subprocess.TimeoutExpired, OSError):
        return None


def gmail_mcp_connected() -> Optional[bool]:
    """True if Gmail MCP is connected, False if listed-but-failed, None if unknown."""
    out = _mcp_list_raw()
    if out is None:
        return None
    for line in out.splitlines():
        if not line.startswith(GMAIL_MCP_SERVER_NAME + ":"):
            continue
        if "✓ Connected" in line:
            return True
        if "✗" in line or "Failed" in line:
            return False
        return None
    return False
