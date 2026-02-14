#!/bin/bash

# Function to kill processes on exit
cleanup() {
    echo "Stopping services..."
    kill $(jobs -p)
    exit
}

trap cleanup SIGINT

# Start Backend
echo "🚀 Starting FastAPI Backend..."
source venv/bin/activate
uvicorn server_python.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait for backend to be ready (naive check)
sleep 3

# Start Frontend
echo "💻 Starting React Frontend..."
cd client
npm run dev &
FRONTEND_PID=$!

echo "✅ System running!"
echo "   Backend:  http://localhost:8000/docs"
echo "   Frontend: http://localhost:5173"
echo ""
echo "📝 To run the scanner, open a new terminal and run:"
echo "   source venv/bin/activate"
echo "   python scanner.py"
echo ""
echo "Press Ctrl+C to stop."

wait
