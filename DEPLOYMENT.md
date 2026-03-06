# Deployment Guide - Interview Coach

## Deploy to Vercel (Recommended)

### Prerequisites
- Vercel account (free): https://vercel.com/signup
- AWS credentials with Bedrock access

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Set Environment Variables
You need to add your AWS credentials to Vercel:

```bash
vercel env add AWS_ACCESS_KEY_ID
vercel env add AWS_SECRET_ACCESS_KEY
vercel env add AWS_REGION
```

Or add them via Vercel dashboard:
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add:
   - `AWS_ACCESS_KEY_ID` = your AWS access key
   - `AWS_SECRET_ACCESS_KEY` = your AWS secret key
   - `AWS_REGION` = us-east-1 (or your preferred region)

### Step 4: Deploy
```bash
vercel
```

Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Select your account
- Link to existing project? **N**
- Project name? **interview-coach** (or your choice)
- Directory? **./** (press Enter)
- Override settings? **N**

### Step 5: Deploy to Production
```bash
vercel --prod
```

Your app will be live at: `https://your-project-name.vercel.app`

## Important Notes

### Web Speech API Browser Support
- ✅ Chrome, Edge, Safari
- ❌ Firefox (not supported)

Users must grant microphone permission when they click "Start Practice Session".

### AWS Bedrock Requirements
Your AWS credentials must have:
- `bedrock:InvokeModel` permission
- Access to `amazon.nova-pro-v1:0` model

### CORS
The backend is configured to accept requests from any origin in production. If you want to restrict this, edit `server/index.js` and change the CORS configuration.

## Alternative: Deploy Backend Separately

If you prefer to deploy backend separately (e.g., Railway, Render):

1. Deploy backend to your chosen platform
2. Get the backend URL (e.g., `https://your-backend.railway.app`)
3. Set environment variable in Vercel:
   ```bash
   vercel env add VITE_API_BASE_URL
   # Enter: https://your-backend.railway.app
   ```
4. Deploy frontend to Vercel

## Troubleshooting

### "Unable to generate question" error
- Check AWS credentials are set correctly in Vercel
- Verify AWS region supports Bedrock
- Check AWS IAM permissions

### Microphone not working
- Ensure HTTPS (Vercel provides this automatically)
- User must grant microphone permission
- Check browser compatibility (Chrome/Edge/Safari only)

### Build fails
- Run `npm run build` locally first to test
- Check all dependencies are in package.json
- Review build logs in Vercel dashboard
