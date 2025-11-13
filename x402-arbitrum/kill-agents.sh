#!/bin/bash

# Script to kill processes running on agent ports

echo "🔍 Checking for processes on ports 3001, 3002, 3003..."

PORT_3001=$(lsof -ti:3001)
PORT_3002=$(lsof -ti:3002)
PORT_3003=$(lsof -ti:3003)

if [ -z "$PORT_3001" ] && [ -z "$PORT_3002" ] && [ -z "$PORT_3003" ]; then
    echo "✅ No processes found on agent ports"
    exit 0
fi

if [ ! -z "$PORT_3001" ]; then
    echo "🛑 Killing process on port 3001 (PID: $PORT_3001)"
    kill -9 $PORT_3001
fi

if [ ! -z "$PORT_3002" ]; then
    echo "🛑 Killing process on port 3002 (PID: $PORT_3002)"
    kill -9 $PORT_3002
fi

if [ ! -z "$PORT_3003" ]; then
    echo "🛑 Killing process on port 3003 (PID: $PORT_3003)"
    kill -9 $PORT_3003
fi

echo "✅ All agent ports are now free"
echo "💡 You can now start the agents with: npm run agents:start"


