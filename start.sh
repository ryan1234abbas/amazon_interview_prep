#!/bin/bash

echo "🚀 Starting Interview Coach Application..."
echo ""

# Check if server dependencies are installed
if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd server && npm install && cd ..
fi

# Check if frontend dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo ""
echo "✅ Starting backend server on http://localhost:3001"
echo "✅ Starting frontend on http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start both servers
cd server && npm start &
SERVER_PID=$!

cd ..
npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait $SERVER_PID $FRONTEND_PID
