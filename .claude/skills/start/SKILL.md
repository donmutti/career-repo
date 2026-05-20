---
name: start
description: Start both the API and UI dev servers in the background. Use when the user asks to run, start, or launch the app.
disable-model-invocation: true
---

Start both the API and UI dev servers in the background.

The project root is the current working directory. Run the following two commands using the Bash tool with `run_in_background: true`:

1. API server:
```
venv/bin/python -m uvicorn api.main:app --reload --port 8000 > /tmp/career-api.log 2>&1
```

2. UI dev server:
```
cd ui && npm run dev > /tmp/career-ui.log 2>&1
```

After launching both, tell the user:
- API is starting at http://localhost:8000 (logs: /tmp/career-api.log)
- UI is starting at http://localhost:5173 (logs: /tmp/career-ui.log)
- Use /stop to stop both servers
