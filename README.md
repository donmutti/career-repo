# Career Repo

A local-first, private career tracking tool that runs entirely on your machine.

Career Repo feels like a daily organiser – familiar, calm, always one click away, bookmarked in your browser as "Career".
You return to it when something interesting in your professional life happens: a new career opportunity, an interview, a role change.
All artifacts – cover letters, CV snapshots, case studies – are downloadable at any moment, ready to send to a recruiter or a partner.

Over years, it becomes the single place that knows your entire professional story.

Built with FastAPI, SQLite, and Claude Code CLI.

![Career Repo](README.png)

---

## Demo

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/donmutti/career-repo)

Click the badge to launch a fully running Career Repo instance in your browser – no local setup required. The API and UI start automatically.

When done, delete the codespace at [github.com/codespaces](https://github.com/codespaces) to avoid using your free monthly quota.

---

## Single-User Mode

Career Repo is designed for one person running:

- **No server storage** – all data lives in a local SQLite database. To save your data remotely, commit `db/data.json` to your remote repo.
- **No multi-device access** – the app runs on one machine at a time. To move between devices, commit `db/data.json`, pull it on the other machine, and restart the app.
- **No access control** – no login or sessions. Data is accessible to anyone with access to your machine.
- **One Gmail account** – the Gmail MCP authenticates to a single Google account. Emails at other addresses are not scanned unless forwarded to the connected account.
- **One Claude Code account** – AI operations (sourcing, cover letter generation) run through your local Claude Code CLI. Concurrent use from multiple sessions is not supported.
- **CLI-configured model** – AI features use whatever model the Claude Code CLI is currently set to. To pin a specific model, set it in your Claude Code CLI config.

---

## Quick Start

**Prerequisites:**

- [Git](https://git-scm.com/downloads) – version control, needed to clone the repo
- [uv](https://docs.astral.sh/uv/getting-started/installation/) – Python package manager, needed to install Python dependencies (also auto-downloads Python 3.13+ if needed)
- [Node.js 20+](https://nodejs.org) – JavaScript runtime, needed to run the UI dev server
- [Claude Code CLI](https://code.claude.com) – local AI assistant, needed to run AI features (job scoring, cover letter generation, etc.)

After installing Claude Code CLI, authenticate and register the Gmail MCP server:

```bash
claude login
claude mcp add --transport http gmail https://gmailmcp.googleapis.com/mcp/v1
```

> **Note:** Career Repo uses `claude-agent-sdk`, which bundles its own Claude Code CLI binary. However, authentication state (Anthropic credentials, Gmail MCP config) lives in `~/.claude/`. The steps above are required to populate that shared auth state for the bundled binary to pick it up.

**Checkout:**

```bash
git clone https://github.com/donmutti/career-repo
cd career-repo
```

**Install** (one-time, local to the repo):

```bash
uv venv venv              # creates local virtual environment in `venv/`
source venv/bin/activate  # On Windows: venv\Scripts\activate
uv pip install -e .       # install app dependencies in editable mode
```

**Configure** (optional):

Defaults work out of the box. Edit `config.yml` at the repo root only if you need to change API/UI ports or database paths:

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
venv/bin/python api/main.py
```

In a second terminal, start the UI:

```bash
cd ui && npm install && npm run dev
```

Open `http://localhost:3000` (or whichever port is set in `config.yml`) in your browser. On first run you'll be guided through onboarding.

**Shutdown:**

Press `Ctrl+C` in each terminal, or:

```bash
pkill -f "api/main.py"
```

**Clean-up:**

Revert the repo to a clean checkout state. Your user data will be preserved:

```bash
# Delete Python virtual environment and build/cache artifacts
rm -rf venv
find . -type d -name __pycache__ -prune -exec rm -rf {} +
find . -type d -name '*.egg-info' -prune -exec rm -rf {} +
find . -type d -name build -prune -exec rm -rf {} +
rm -rf .pytest_cache

# Delete UI dependencies and build output
rm -rf ui/node_modules
rm -rf ui/dist
rm -rf ui/src/api/generated

# Delete logs, runtime caches and database files (your user data will survive)
rm -rf .logs
rm -rf .cache
rm -f db/data.db db/data.db-shm db/data.db-wal
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
