# Interview Coach

AI-powered behavioral interview practice application for college students.

## Features

- Generate realistic behavioral interview questions using AWS Bedrock (Amazon Nova Pro)
- Real-time speech transcription using AWS Transcribe
- STAR format analysis and constructive feedback
- Clean black and white UI design

## Architecture

This application uses a client-server architecture:
- **Frontend**: React + TypeScript (Vite)
- **Backend**: Node.js + Express (handles AWS API calls securely)

## Prerequisites

- Node.js 18+ and npm
- AWS account with access to:
  - AWS Bedrock (Amazon Nova Pro model)
  - AWS Transcribe Streaming
- AWS credentials configured (already set up in `server/.env`)

## Quick Start

### 1. Start the Backend Server

```bash
cd server
npm install
npm start
```

The server will run on http://localhost:3001

### 2. Start the Frontend (in a new terminal)

```bash
npm install
npm run dev
```

The app will open at http://localhost:5173

## Usage

1. **Generate a Question**: Click "Generate Question" to get a behavioral interview question
2. **Start Practice Session**: Click "Start Practice Session" and grant microphone permission
3. **Speak Your Answer**: Your words will be transcribed in real-time
4. **Stop Session**: Click "Stop Session" when finished
5. **Review Feedback**: See STAR analysis, strengths, improvements, and actionable tips

## Testing

Run all tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Project Structure

```
├── server/              # Backend API server
│   ├── index.js        # Express server with AWS integration
│   ├── .env            # AWS credentials (configured)
│   └── package.json    # Server dependencies
├── src/
│   ├── components/     # React UI components
│   ├── services/       # Business logic (now calls backend API)
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript type definitions
│   └── config/         # Configuration (API URLs)
└── package.json        # Frontend dependencies
```

## Environment Variables

### Backend (server/.env)
Already configured with your AWS credentials.

### Frontend (.env) - Optional
```
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001/transcribe
```

## Important Notes

- **Microphone Required**: You need a working microphone and must grant permission
- **HTTPS/Localhost**: Browser security requires HTTPS or localhost for microphone access
- **Backend Must Be Running**: The frontend requires the backend server to be running
- **Internet Connection**: Required for AWS services

## Troubleshooting

**"Unable to generate question" error:**
- Make sure the backend server is running (`cd server && npm start`)
- Check that AWS credentials in `server/.env` are valid

**"Unable to connect to transcription service" error:**
- Verify the backend server is running
- Check browser console for CORS or connection errors

**Microphone not working:**
- Grant microphone permission when prompted
- Ensure you're using HTTPS or localhost
- Check that no other application is using the microphone

## Technology Stack

- React 18 with TypeScript
- Vite for build tooling
- Express.js backend server
- AWS SDK for JavaScript v3
- Jest and React Testing Library for testing
- fast-check for property-based testing
