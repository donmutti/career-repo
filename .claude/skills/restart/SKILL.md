---
name: restart
description: Restart both dev servers by stopping any running ones first, then starting fresh. Use when the user asks to restart or rerun the app.
disable-model-invocation: true
---

Restart both dev servers by stopping any running ones first, then starting fresh.

Step 1 — stop any running servers:
```
bash "$(git rev-parse --show-toplevel)/stop.sh"
```

Step 2 — start fresh:
```
bash "$(git rev-parse --show-toplevel)/start.sh"
```

Tell the user:
- API is starting (logs: .logs/career-api.log)
- UI is starting (logs: .logs/career-ui.log)
- Use /stop to stop both servers
