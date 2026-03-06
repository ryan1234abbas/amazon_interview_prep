# Quick Start Guide

## Option 1: Automatic Start (Recommended)

Run this single command to start both frontend and backend:

```bash
./start.sh
```

## Option 2: Manual Start

### Terminal 1 - Backend Server
```bash
cd server
npm start
```

Wait for: `Server running on http://localhost:3001`

### Terminal 2 - Frontend
```bash
npm run dev
```

Wait for: `Local: http://localhost:5173`

## Using the App

1. Open http://localhost:5173 in your browser
2. Click "Generate Question"
3. Click "Start Practice Session" (grant microphone permission)
4. Speak your answer
5. Click "Stop Session"
6. Review your feedback!

## Troubleshooting

**Backend won't start:**
```bash
cd server
npm install
npm start
```

**Frontend won't start:**
```bash
npm install
npm run dev
```

**AWS errors:**
- Your credentials are already configured in `server/.env`
- If they expire, update `server/.env` with new credentials

**Microphone not working:**
- Grant permission when prompted
- Make sure no other app is using your microphone
- Try refreshing the page
