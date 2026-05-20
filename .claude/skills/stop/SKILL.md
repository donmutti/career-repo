---
name: stop
description: Stop both the API and UI dev servers. Use when the user asks to stop, kill, or shut down the app.
disable-model-invocation: true
---

Stop both the API and UI dev servers that were started by /start.

Run the following command using the Bash tool to kill both servers:
```
pkill -f "uvicorn api.main:app" 2>/dev/null; pkill -f "vite" 2>/dev/null; echo "Servers stopped."
```

Tell the user both servers have been shut down.
