#!/bin/bash
# Start ATS Call Log Server
# Runs in background, creates log files at ~/Desktop/ats-call-logs/

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$HOME/Desktop/ats-call-logs/startup.log"
PID_FILE="$HOME/Desktop/ats-call-logs/server.pid"

mkdir -p "$HOME/Desktop/ats-call-logs"

if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "Server already running (PID $OLD_PID)"
        exit 0
    fi
    rm -f "$PID_FILE"
fi

cd "$SCRIPT_DIR"
nohup python3 "$SCRIPT_DIR/call-log-server.py" >> "$LOG_FILE" 2>&1 &
NEW_PID=$!
echo $NEW_PID > "$PID_FILE"
echo "Server started (PID $NEW_PID)"
echo "Log file: $LOG_FILE"
echo "Output: open ~/Desktop/ats-call-logs"
