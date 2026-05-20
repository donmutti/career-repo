---
name: restart
description: Restart both dev servers by stopping any running ones first, then starting fresh. Use when the user asks to restart or rerun the app.
disable-model-invocation: true
---

Restart both dev servers by stopping any running ones first, then starting fresh.

Step 1 — stop any running servers:
```
pkill -f "uvicorn api.main:app" 2>/dev/null; pkill -f "vite" 2>/dev/null; true
```

Step 2 — start both servers in the background using the Bash tool with `run_in_background: true`:

API server:
```
venv/bin/python -m uvicorn api.main:app --reload --port 8000 > /tmp/career-api.log 2>&1
```

UI dev server:
```
cd ui && npm run dev > /tmp/career-ui.log 2>&1
```

After launching both, tell the user:
- API is starting at http://localhost:8000 (logs: /tmp/career-api.log)
- UI is starting at http://localhost:5173 (logs: /tmp/career-ui.log)
- Use /stop to stop both servers
