# Contributing

Issues and PRs are always welcome.

## Development

This project follows a specification-driven development process. [SPEC.md](SPEC.md) is the ground truth, read it before making any code changes. Code follows the spec, never the other way around.

The `.claude/skills/` directory includes Claude Code development skills for working on this project:

- `/start` – start both the API and UI dev servers in the background
- `/stop` – stop both dev servers
- `/restart` – stop any running servers and start fresh
- `/run-spec` – validate the codebase against SPEC.md and fix all discrepancies (`/run-spec dryrun` for report only)
- `/refresh-yourself` – re-read CLAUDE.md, SPEC.md, and project structure to re-orient

## Reporting a bug

Open an issue at [github.com/donmutti/career-repo/issues](https://github.com/donmutti/career-repo/issues). Include steps to reproduce, what you expected to happen, and what actually happened.

## Submitting a PR

1. Fork the repo
2. Create a branch: `feature/short-description` or `fix/short-description` (e.g. `fix/setup-instructions`)
3. Implement your change: for features, update SPEC.md first; for bugfixes, just fix the code
4. Commit: lowercase, present tense, issue ID prefix if available: `#1 fix setup instructions` or `add dark mode support`
5. Open a pull request against `main` – the maintainer will review, request changes if needed, and merge
