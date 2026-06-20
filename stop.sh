#!/bin/bash
pkill -f "api/main.py" 2>/dev/null; pkill -f "vite" 2>/dev/null; echo "Servers stopped."
