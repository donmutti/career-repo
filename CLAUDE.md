# Claude Code Configuration

## Development Approach

This project uses spec-driven development. SPEC.md is the ground truth, authored by the human developer. Code follows SPEC, never the other way around.

## Technical Stack

- DB: SQLite, append-only versioning, UUID identifiers
- API: FastAPI, Pydantic models, organized by resource
- UI: React 19, Vite, Tailwind, Radix UI

## Code Changes

Apply file changes directly without IDE involvement. Use Read/Edit/Write tools.
Files may be created, renamed, moved, or deleted freely to match SPEC.
Never go in circles — all commands complete in one pass.
No commits shall be made. The user commits manually.

## Python Environment

Python 3 managed via `uv`. Virtual env is at `venv/`, not `.venv/`. Use `venv/bin/python` and `uv pip` for package operations.

## No Tests

There are no automated tests. Do not create test files or add test dependencies.
