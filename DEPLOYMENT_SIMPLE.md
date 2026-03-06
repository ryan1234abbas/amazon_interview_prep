# Simple Deployment Guide

## Option 1: Deploy Backend to Railway (Recommended - Easiest)

### Step 1: Deploy Backend to Railway

1. Go to https://railway.app and sign up (free)
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your GitHub account and select this repository
4. Railway will auto-detect the Node.js app in the `server` folder
5. Add environment variables in Railway dashboard:
   - `AWS_ACCESS_KEY_ID` = your AWS access key
   - `AWS_SECRET_ACCESS_KEY` = your AWS secret key
   - `AWS_REGION` = us-east-1
6. Railway will give you a URL like: `https://your-app.railway.app`

### Step 2: Update Frontend Config

After getting your Railway URL, update the frontend:

```bash
# Set the backend URL as environment variable for Vercel
vercel env add VITE_API_URL
# Enter your Railway URL: https://your-app.railway.app
```

### Step 3: Deploy Frontend to Vercel

```bash
vercel --prod
```

Done! Your app is live.

---

## Option 2: Run Locally (For Testing)

```bash
# Terminal 1 - Backend
cd server
node index.js

# Terminal 2 - Frontend  
npm run dev
```

Open http://localhost:5173

---

## Troubleshooting

### Backend not working on Railway
- Check Railway logs for errors
- Verify AWS credentials are set correctly
- Make sure AWS region supports Bedrock (us-east-1 recommended)

### Frontend can't connect to backend
- Check that VITE_API_URL environment variable is set in Vercel
- Make sure Railway backend URL is correct (should be https://)
- Check browser console for CORS errors

### Web Speech API not working
- Only works in Chrome, Edge, Safari (not Firefox)
- Requires HTTPS (Vercel provides this automatically)
- User must grant microphone permission
