---
name: stop
description: Stop both the API and UI dev servers. Use when the user asks to stop, kill, or shut down the app.
disable-model-invocation: true
---

Stop both the API and UI dev servers that were started by /start.

Run:
```
bash "$(git rev-parse --show-toplevel)/stop.sh"
```

Tell the user both servers have been shut down.
