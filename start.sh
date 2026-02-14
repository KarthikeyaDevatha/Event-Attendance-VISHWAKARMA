#!/bin/bash

echo "🚀 Starting Lyra Event Attendance System..."

# Function to kill background processes on exit
cleanup() {
    echo "🛑 Shutting down..."
    kill $(jobs -p) 2>/dev/null
    exit
}
trap cleanup SIGINT

# 1. Start Backend
echo "🔹 Launching Backend (FastAPI)..."
source venv/bin/activate
uvicorn server_python.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to be ready
sleep 3

# 2. Start Frontend
echo "🔹 Launching Frontend (Vite)..."
cd client
npm run dev -- --open &
FRONTEND_PID=$!
cd ..

echo "✅ System is ONLINE!"
echo "   - Web App: http://localhost:5174"
echo "   - API Docs: http://localhost:8000/docs"
echo "   - Local Scanner: Run 'python sota_scanner.py'"

wait
