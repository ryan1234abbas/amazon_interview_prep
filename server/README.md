# Interview Coach Backend Server

Backend API server for the Interview Coach application. Handles AWS Bedrock and Transcribe calls securely.

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Configure environment variables:
The `.env` file is already set up with your AWS credentials.

3. Start the server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The server will run on http://localhost:3001

## API Endpoints

### POST /api/generate-question
Generates a behavioral interview question using AWS Bedrock.

**Response:**
```json
{
  "question": "Tell me about a time when...",
  "category": "leadership"
}
```

### POST /api/analyze-response
Analyzes a transcribed response using AWS Bedrock.

**Request:**
```json
{
  "question": "Tell me about a time when...",
  "transcription": "User's spoken response..."
}
```

**Response:**
```json
{
  "starAnalysis": {
    "situation": "present",
    "task": "present",
    "action": "partial",
    "result": "missing"
  },
  "strengths": ["Clear communication"],
  "improvements": ["Add more detail about results"],
  "actionableTips": ["Tip 1", "Tip 2"]
}
```

### WebSocket /transcribe
Real-time audio transcription using AWS Transcribe.

**Messages:**
- `{ "action": "start" }` - Start transcription
- `{ "action": "audio", "data": "base64_pcm_audio" }` - Send audio chunk
- `{ "action": "stop" }` - Stop transcription

**Responses:**
- `{ "type": "transcript", "text": "..." }` - Transcription update
- `{ "type": "final", "text": "..." }` - Final transcription
- `{ "type": "error", "message": "..." }` - Error message
