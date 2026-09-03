# ⚡ Railway Quick Start - 5 Simple Steps

**Get your app online in 15 minutes!**

---

## Before You Start

You need:
- GitHub account (create at https://github.com)
- Railway account (create at https://railway.app)

---

## Step 1: Push Code to GitHub (5 min)

### Option A: GitHub Desktop (Easiest!)

1. Download: https://desktop.github.com
2. Install and login
3. Click "Add" → "Add Existing Repository"
4. Select: `/Users/mohcineyassifi/Desktop/main-app-heatwave`
5. Click "Publish repository"
6. Make it **Private**
7. Click "Publish"

### Option B: Command Line

```bash
cd /Users/mohcineyassifi/Desktop/main-app-heatwave
git init
git add .
git commit -m "Initial commit"
# Create repo on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/heatwave-locksmith.git
git push -u origin main
```

---

## Step 2: Create Railway Project (2 min)

1. Go to https://railway.app
2. Click "Login with GitHub"
3. Click "New Project"
4. Choose "Deploy from GitHub repo"
5. Select `heatwave-locksmith`

---

## Step 3: Add Database (1 min)

1. Click "+ New"
2. Choose "Database"
3. Select "PostgreSQL"
4. Wait 30 seconds

---

## Step 4: Deploy Backend (3 min)

1. Click "+ New" → "GitHub Repo" → Select your repo
2. Click "Variables" and add:
   ```
   DATABASE_URL = ${{Postgres.DATABASE_URL}}
   JWT_SECRET = YOUR_UNIQUE_RANDOM_SECRET_OF_AT_LEAST_32_CHARACTERS
   OWNER_EMAIL = YOUR_PRIVATE_LOGIN_EMAIL
   CORS_ORIGIN = YOUR_FRONTEND_URL
   NODE_ENV = production
   ```
   Generate `JWT_SECRET` locally with `openssl rand -base64 48`. Never reuse the example text or commit the generated value.
3. Click "Settings":
   - Root Directory: `server`
   - Build Command: `npm run railway:build`
   - Start Command: `npm run railway:start`
4. Click "Deploy"
5. **Copy the backend URL** (e.g., `https://xxx.up.railway.app`)

---

## Step 5: Deploy Frontend (4 min)

1. Click "+ New" → "GitHub Repo" → Select same repo
2. Click "Variables" and add:
   ```
   VITE_API_URL = YOUR_BACKEND_URL_FROM_STEP_4
   ```
3. Click "Settings":
   - Root Directory: `/`
   - Build Command: `npm run build`
   - Start Command: Leave empty (Nixpacks uses `nixpacks.toml` and runs `vite preview`)
4. Click "Settings" → "Networking" → "Generate Domain"
5. Click "Deploy"

---

## ✅ Done!

Open your frontend URL and create the owner account using the email configured in `OWNER_EMAIL` and a unique password of at least 12 characters. After the account exists, use the same credentials to log in.

---

## 💰 Cost

**$5/month** (Hobby plan) - usually enough for your app

---

## 🔄 To Update Later

```bash
cd /Users/mohcineyassifi/Desktop/main-app-heatwave
git add .
git commit -m "My changes"
git push
```

Railway auto-deploys in 2 minutes!

---

## 📚 Need More Help?

See `RAILWAY-DEPLOY-GUIDE.md` for detailed instructions.
