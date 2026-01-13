# Deployment Guide - Stablecoin Peg Monitor

## Prerequisites
- Vercel account (you have this)
- Turso account (you have this)
- cron-job.org account (free, sign up at https://cron-job.org)

## Step 1: Create Turso Database

1. Go to https://turso.tech/app
2. Click "Create Database"
3. Name it `stablecoin-peg-monitor`
4. Select a region close to you
5. Once created, click on the database and go to "Connect"
6. Copy the **Database URL** (starts with `libsql://`)
7. Click "Generate Token" and copy the **Auth Token**

## Step 2: Deploy to Vercel

1. Push your code to GitHub:
   ```bash
   cd stablecoin-peg-monitor
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. Go to https://vercel.com/new
3. Import your GitHub repository
4. In "Environment Variables", add:
   - `TURSO_DATABASE_URL` = your database URL from Step 1
   - `TURSO_AUTH_TOKEN` = your auth token from Step 1
   - `CRON_SECRET` = generate a random string (e.g., `openssl rand -hex 32`)
5. Click "Deploy"
6. Note your deployment URL (e.g., `https://stablecoin-peg-monitor.vercel.app`)

## Step 3: Set Up Cron Job

1. Go to https://cron-job.org and create an account
2. Click "CREATE CRONJOB"
3. Configure:
   - **Title**: Stablecoin Peg Monitor - Fetch Prices
   - **URL**: `https://YOUR-VERCEL-URL.vercel.app/api/cron/fetch`
   - **Schedule**: Every 5 minutes
     - Select "Every" and set to "5 minutes"
   - **Request Method**: GET
   - **Headers** (click "Advanced"):
     - Add header: `Authorization: Bearer YOUR_CRON_SECRET`
     (Use the same CRON_SECRET you set in Vercel)
4. Click "CREATE"

## Step 4: Verify Everything Works

1. Visit your Vercel URL - you should see the dashboard with live data
2. Check cron-job.org execution history - it should show successful calls
3. After 5 minutes, the history page will start showing data

## Environment Variables Summary

| Variable | Description | Example |
|----------|-------------|---------|
| `TURSO_DATABASE_URL` | Turso database connection URL | `libsql://your-db.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso authentication token | `eyJhbG...` |
| `CRON_SECRET` | Secret for authenticating cron requests | `abc123...` (random string) |

## Troubleshooting

### Dashboard shows error
- Check Vercel logs for errors
- Verify DeFiLlama API is accessible
- Check environment variables are set correctly

### History page shows "No historical data"
- Wait for at least one cron job execution
- Check cron-job.org execution logs
- Verify CRON_SECRET matches between Vercel and cron-job.org

### Cron job failing
- Check the Authorization header is correct
- Verify the URL is correct (include /api/cron/fetch)
- Check Vercel function logs for errors

## Data Storage

- Each 5-minute snapshot: ~50 bytes per stablecoin
- 15 stablecoins x 288 snapshots/day = ~216 KB/day
- Turso free tier: 5 GB = ~64 years of data
