"""Self-upgrade pipeline used by POST /system/upgrade.

Yields phase/level/line events. Spawns a detached restart child at the end.
"""

import os
import subprocess
import threading
from typing import Iterator

from packaging.version import InvalidVersion, Version

from api import __version__
from api.config import ROOT
from api.services.github_release import cached_latest_version


def stream_upgrade() -> Iterator[dict]:
    """Yield {phase, level, line} dicts and ultimately a terminal {phase: 'done', level: 'success'|'error'}."""
    target = _precheck_target()
    if isinstance(target, _PrecheckFailure):
        yield from target.events
        yield _done("error")
        return

    yield _event("precheck", "info", f"Current: {__version__}; target: {target}; branch: main; tree: clean")

    if not (yield from _run("pull", ["git", "pull", "--ff-only", "--tags", "origin", "main"])):
        yield _done("error"); return

    if not (yield from _run("reset", ["git", "reset", "--hard", f"v{target}"])):
        yield _done("error"); return

    if not (yield from _run("install", ["uv", "pip", "install", "-e", ".", "--python", "venv/bin/python", "--quiet"])):
        yield _done("error"); return

    yield _event("restart", "info", "Restart scheduled in 3s. The API will exit now.")
    yield _done("success")
    _schedule_start_and_die()


def _precheck_target():
    events: list[dict] = []

    branch_cp = subprocess.run(["git", "rev-parse", "--abbrev-ref", "HEAD"], capture_output=True, text=True, cwd=ROOT)
    branch = branch_cp.stdout.strip()
    if branch != "main":
        events.append(_event("precheck", "error", f"Expected branch 'main', got '{branch}'."))
        return _PrecheckFailure(events)

    dirty_cp = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True, cwd=ROOT)
    if dirty_cp.stdout.strip():
        events.append(_event("precheck", "error", "Working tree has uncommitted changes. Commit or stash, then retry."))
        return _PrecheckFailure(events)

    latest = cached_latest_version()
    if latest is None:
        events.append(_event("precheck", "error", "Could not determine latest version from GitHub."))
        return _PrecheckFailure(events)

    try:
        if Version(latest) <= Version(__version__):
            events.append(_event("precheck", "error", f"Already on latest version ({__version__})."))
            return _PrecheckFailure(events)
    except InvalidVersion:
        events.append(_event("precheck", "error", f"Invalid version string: {latest}"))
        return _PrecheckFailure(events)

    return latest


class _PrecheckFailure:
    def __init__(self, events: list[dict]):
        self.events = events


def _run(phase: str, cmd: list[str]) -> Iterator[dict]:
    """Yield each stdout/stderr line for the command. Returns True on success via StopIteration value."""
    yield _event(phase, "info", "$ " + " ".join(cmd))
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, cwd=ROOT, bufsize=1)
    assert proc.stdout is not None
    for line in proc.stdout:
        line = line.rstrip("\n")
        if line:
            yield _event(phase, "info", line)
    proc.wait()
    if proc.returncode != 0:
        yield _event(phase, "error", f"Command failed with exit code {proc.returncode}.")
        return False
    return True


def _schedule_start_and_die() -> None:
    """Spawn a detached child that waits 3s then runs start.sh; then hard-exit this process
    after a brief delay so the SSE terminal event has time to flush to the client.
    No stop.sh — the API kills itself, freeing port 8000 well before start.sh fires."""
    subprocess.Popen(
        ["bash", "-c", f"sleep 3 && cd {ROOT} && bash ./start.sh"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        stdin=subprocess.DEVNULL,
        start_new_session=True,
        close_fds=True,
    )
    threading.Timer(0.5, lambda: os._exit(0)).start()


def _event(phase: str, level: str, line: str) -> dict:
    return {"phase": phase, "level": level, "line": line}


def _done(level: str) -> dict:
    return {"phase": "done", "level": level, "line": ""}
