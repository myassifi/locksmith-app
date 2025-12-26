# 🚂 Railway Deployment Guide - Heat Wave Locksmith App

**Easy deployment for beginners - No SSH needed!**

---

## 💰 Cost: $5/month (Hobby Plan)

Railway gives you $5 credit per month which is usually enough for your locksmith app.

---

## 📋 What You Need

1. **GitHub account** (free) - to store your code
2. **Railway account** (free) - to host your app
3. **15 minutes** - that's it!

---

## 🚀 Step-by-Step Deployment

### STEP 1: Create GitHub Account (if you don't have one)

1. Go to https://github.com
2. Click "Sign up"
3. Follow the steps

---

### STEP 2: Push Your Code to GitHub

**Open Terminal on your Mac:**

```bash
cd /Users/mohcineyassifi/Desktop/main-app-heatwave

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Heat Wave Locksmith App"

# Create repository on GitHub first, then:
git remote add origin https://github.com/YOUR_USERNAME/heatwave-locksmith.git
git branch -M main
git push -u origin main
```

**OR use GitHub Desktop (easier for beginners):**

1. Download GitHub Desktop: https://desktop.github.com
2. Install and sign in
3. Click "Add" → "Add Existing Repository"
4. Choose `/Users/mohcineyassifi/Desktop/main-app-heatwave`
5. Click "Publish repository"
6. Make it **Private** (recommended)
7. Click "Publish"

✅ **Code is now on GitHub!**

---

### STEP 3: Sign Up for Railway

1. Go to https://railway.app
2. Click "Login"
3. Choose "Login with GitHub"
4. Authorize Railway

✅ **Railway account created!**

---

### STEP 4: Create New Project

1. Click "New Project"
2. Choose "Deploy from GitHub repo"
3. Select your repository: `heatwave-locksmith`
4. Railway will detect it's a monorepo

---

### STEP 5: Deploy Backend (API)

1. **Add PostgreSQL Database:**
   - Click "+ New"
   - Choose "Database"
   - Select "PostgreSQL"
   - Wait for it to deploy (30 seconds)

2. **Deploy Backend Service:**
   - Click "+ New"
   - Choose "GitHub Repo"
   - Select your repo
   - Click "Add variables"
   
3. **Set Environment Variables:**
   
   Click "Variables" tab and add these:

   ```
   DATABASE_URL = ${{Postgres.DATABASE_URL}}
   JWT_SECRET = heatwave-locksmith-railway-secret-2024-abc123xyz
   CORS_ORIGIN = *
   PORT = 4000
   NODE_ENV = production
   ```

4. **Configure Build Settings:**
   
   Click "Settings" tab:
   - **Root Directory:** `server`
   - **Build Command:** `npm run railway:build`
   - **Start Command:** `npm run railway:start`
   - **Watch Paths:** `server/**`

5. **Deploy:**
   - Click "Deploy"
   - Wait 2-3 minutes for build

✅ **Backend deployed!** Copy the URL (looks like: `https://heatwave-api-production.up.railway.app`)

---

### STEP 6: Deploy Frontend (React App)

1. **Add Frontend Service:**
   - Click "+ New"
   - Choose "GitHub Repo"
   - Select same repo
   
2. **Set Environment Variables:**

   Click "Variables" tab and add:

   ```
   VITE_SUPABASE_PROJECT_ID = vmrxwbvbycijhqrdwkdc
   VITE_SUPABASE_PUBLISHABLE_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtcnh3YnZieWNpamhxcmR3a2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMjYyOTUsImV4cCI6MjA3MzkwMjI5NX0.T0RJUojWM_Dz5Wqk2tkTAqVrWwDr-eqQmSX4aPGQS5E
   VITE_SUPABASE_URL = https://vmrxwbvbycijhqrdwkdc.supabase.co
   VITE_API_URL = YOUR_BACKEND_URL_FROM_STEP_5
   ```

   Replace `YOUR_BACKEND_URL_FROM_STEP_5` with the backend URL you copied.

3. **Configure Build Settings:**
   
   Click "Settings" tab:
   - **Root Directory:** `/` (leave empty or just `/`)
   - **Build Command:** `npm run build`
   - **Start Command:** Leave empty (static site)
   - **Watch Paths:** `src/**`

4. **Add Static Site Settings:**
   - Click "Settings"
   - Scroll to "Networking"
   - Enable "Public Networking"
   - Click "Generate Domain"

5. **Deploy:**
   - Click "Deploy"
   - Wait 2-3 minutes

✅ **Frontend deployed!** Copy the URL (looks like: `https://heatwave-locksmith.up.railway.app`)

---

### STEP 7: Update Backend CORS

Now that you have your frontend URL, update backend CORS:

1. Go to your **Backend service**
2. Click "Variables"
3. Update `CORS_ORIGIN`:
   ```
   CORS_ORIGIN = https://your-frontend-url.up.railway.app
   ```
4. Backend will auto-redeploy

---

### STEP 8: Test Your App!

1. **Open your frontend URL** in browser
2. **Login:**
   - Email: `m.yassifi@gmail.com`
   - Password: `demo1234`

✅ **Your app is live!**

---

## 🎯 Your Live URLs

After deployment, you'll have:

- **Frontend:** `https://heatwave-locksmith.up.railway.app`
- **Backend API:** `https://heatwave-api.up.railway.app`
- **Database:** Managed by Railway (PostgreSQL)

---

## 💡 Important Notes

### Auto-Deploy
- Every time you push to GitHub, Railway auto-deploys
- No manual deployment needed!

### Monitoring
- Click on each service to see logs
- Check "Metrics" tab for usage
- Monitor your $5 credit usage

### Custom Domain (Optional)
1. Buy a domain (Namecheap, GoDaddy, etc.)
2. In Railway, click "Settings" → "Domains"
3. Add your custom domain
4. Update DNS records as shown

---

## 🔄 Update Your App

**To deploy changes:**

```bash
cd /Users/mohcineyassifi/Desktop/main-app-heatwave

# Make your changes, then:
git add .
git commit -m "Updated feature X"
git push
```

Railway auto-deploys in 2-3 minutes!

---

## 📊 Check Usage & Billing

1. Go to Railway dashboard
2. Click your project
3. Click "Usage" tab
4. See how much of your $5 credit you've used

**Typical usage for your app:** $3-5/month

---

## ❌ Troubleshooting

### Backend not starting?
1. Check logs: Click backend service → "Deployments" → Latest → "View Logs"
2. Check environment variables are set correctly
3. Make sure `DATABASE_URL` is connected to Postgres

### Frontend shows errors?
1. Check `VITE_API_URL` points to backend URL
2. Check browser console for errors (F12)
3. Make sure backend is running first

### Database connection failed?
1. Make sure PostgreSQL service is running
2. Check `DATABASE_URL` variable in backend
3. Restart backend service

### Out of credit?
1. Upgrade to Hobby plan ($5/month)
2. Or optimize your app to use less resources

---

## 🆘 Need Help?

**Check logs first:**
- Click service → "Deployments" → "View Logs"

**Common issues:**
- Wrong environment variables
- Backend URL not updated in frontend
- Database not connected

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Railway account created
- [ ] PostgreSQL database added
- [ ] Backend deployed with correct env vars
- [ ] Frontend deployed with backend URL
- [ ] CORS updated in backend
- [ ] Tested login at frontend URL
- [ ] App works correctly

---

## 🎉 Congratulations!

Your Heat Wave Locksmith app is now live on Railway!

**Benefits:**
- ✅ No server management
- ✅ Auto-deploys from GitHub
- ✅ Always-on (no sleep)
- ✅ Free PostgreSQL database
- ✅ Automatic HTTPS
- ✅ Easy to update

**Next steps:**
- Add a custom domain
- Monitor usage
- Keep building features!

---

## 📞 Support

- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway
- **GitHub Issues:** Create issues in your repo
