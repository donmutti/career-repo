# Career Repo

A local-first, private career tracking tool that runs entirely on your machine.

Career Repo feels like a daily organiser – familiar, calm, always one click away, bookmarked in your browser as "Career".
You return to it when something interesting in your professional life happens: a new career opportunity, an interview, a role change.
All artifacts – cover letters, CV snapshots, case studies – are downloadable at any moment, ready to send to a recruiter or a partner.

Over years, it becomes the single place that knows your entire professional story.

Built with FastAPI, SQLite, and Claude Code CLI.

![Career Repo](README.png)

---

## Single-User Mode

Career Repo is designed for one person running:

- **No server storage** — all data lives in a local SQLite database. To save your data remotely, commit `db/data.json` to your remote repo.
- **No multi-device access** — the app runs on one machine at a time. To move between devices, commit `db/data.json`, pull it on the other machine, and restart the app.
- **No access control** — no login or sessions. Data is accessible to anyone with access to your machine.
- **One Gmail account** — the Gmail MCP plugin authenticates to a single Google account. Emails at other addresses are not scanned unless forwarded to the connected account.
- **One Claude Code account** — AI operations (sourcing, cover letter generation) run through your local Claude Code CLI. Concurrent use from multiple sessions is not supported.

---

## Quick Start

**Prerequisites:**

- Python 3.13+
- Node.js 20+
- Claude Code CLI (installed and configured)
- Git

**Checkout:**

```bash
git clone https://github.com/donmutti/career-repo
cd career-repo
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -e .
```

**Configure:**

Edit `config.yml` at the repo root to customize API and UI ports and database paths:

```yaml
api:
  host: "127.0.0.1"
  port: 8000

ui:
  port: 3000

db:
  path: "./db/data.db"
  dump_path: "./db/data.json"
  attachment_path: "./db/attachments"
  resumes_path: "./db/resumes"
  images_path: "./db/images"
```

**Run:**

Start the API server (database initializes automatically on first run):

```bash
python3 api/main.py
```

In a second terminal, start the UI:

```bash
cd ui && npm install && npm run dev
```

Open `http://localhost:3000` (or whichever port is set in `config.yml`) in your browser. On first run you'll be guided through onboarding.

**Shutdown:**

Press `Ctrl+C` in each terminal, or:

```bash
pkill -f "python3 api/main.py"
```

---

---

## Development

This project follows specification-driven development process. See [SPEC.md](SPEC.md) for complete product specification.

The `.claude/skills/` directory includes the following Claude Code development skills:

- `/start` — start both the API and UI dev servers in the background
- `/stop` — stop both dev servers
- `/restart` — stop any running servers and start fresh
- `/run-spec` — validate the codebase against SPEC.md and fix all discrepancies (`/run-spec dryrun` for report only)
- `/refresh-yourself` — re-read CLAUDE.md, SPEC.md, and project structure to re-orient

## Contributing

Issues and PRs are always welcome!
