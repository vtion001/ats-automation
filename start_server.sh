#!/bin/bash
# AGS Automation Tool - Start AI Server

echo "Starting AGS AI Server..."

# Check if already running
if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo "✅ Server already running on http://localhost:8001"
    exit 0
fi

# Kill any existing process on port 8001
lsof -ti:8001 | xargs kill -9 2>/dev/null

# Start the server
cd /Users/archerterminez/Desktop/REPOSITORY/ats-automation
nohup python3 -m uvicorn server.ai_server:app --host 0.0.0.0 --port 8001 > /tmp/ags_server.log 2>&1 &

# Wait for server to start
sleep 2

# Check if running
if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo "✅ AGS AI Server started on http://localhost:8001"
    echo "📋 Health: http://localhost:8001/health"
    echo "📋 API: http://localhost:8001/api/analyze"
else
    echo "❌ Failed to start server"
    cat /tmp/ags_server.log
    exit 1
fi
