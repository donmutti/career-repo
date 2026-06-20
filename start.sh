#!/bin/bash
set -e

[ ! -d venv ] && uv venv venv
uv pip install -e . --quiet --python venv/bin/python
mkdir -p .logs

venv/bin/python api/main.py > .logs/career-api.log 2>&1 &

echo "API starting (logs: .logs/career-api.log)"
until curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/system/status | grep -q "200"; do
  sleep 0.5
done

(cd ui && npm install && npm run dev > ../.logs/career-ui.log 2>&1) &
echo "UI starting (logs: .logs/career-ui.log)"
