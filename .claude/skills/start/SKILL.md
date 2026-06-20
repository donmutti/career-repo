---
name: start
description: Start both the API and UI dev servers in the background. Use when the user asks to run, start, or launch the app.
disable-model-invocation: true
---

Start both the API and UI dev servers in the background.

Run:
```
bash "$(git rev-parse --show-toplevel)/start.sh"
```

Tell the user:
- API is starting (logs: .logs/career-api.log)
- UI is starting (logs: .logs/career-ui.log)
- Use /stop to stop both servers
