# 🚀 BEGINNER'S GUIDE: Deploy Your Locksmith App to Contabo VPS

**Simple step-by-step instructions for beginners**

Your server IP: **194.163.173.165**

---

## 📝 What You'll Do

1. Connect to your server
2. Install required software
3. Upload your app
4. Start everything
5. Access your app online

**Time needed:** About 30-45 minutes

---

## STEP 1: Connect to Your Server

### On Mac (you have Mac):

1. **Open Terminal** (press `Cmd + Space`, type "Terminal", press Enter)

2. **Connect to your server:**
   ```bash
   ssh root@194.163.173.165
   ```

3. **Type your password** when asked (you won't see it while typing - that's normal!)

4. **First time?** Type `yes` when asked about authenticity

✅ **You're in!** You should see something like `root@vml2990200:~#`

---

## STEP 2: Install Required Software

**Just copy and paste these commands one by one:**

### Update the server:
```bash
apt update && apt upgrade -y
```
⏱️ This takes 2-5 minutes. Wait for it to finish.

### Install Node.js (needed to run your app):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```
⏱️ Takes 1-2 minutes.

### Install other tools:
```bash
apt install -y build-essential nginx git
```
⏱️ Takes 1-2 minutes.

### Install PM2 (keeps your app running):
```bash
npm install -g pm2
```
⏱️ Takes 30 seconds.

### Setup firewall (security):
```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```
⏱️ Takes 5 seconds.

✅ **Software installed!**

---

## STEP 3: Create App Folder

```bash
mkdir -p /var/www/heatwave-locksmith
cd /var/www/heatwave-locksmith
```

✅ **Folder created!**

---

## STEP 4: Upload Your App Files

### Option A: Using SCP (Easiest for beginners)

**Open a NEW Terminal window on your Mac** (don't close the server connection):

```bash
cd /Users/mohcineyassifi/Desktop/main-app-heatwave
scp -r * root@194.163.173.165:/var/www/heatwave-locksmith/
```

Enter your password when asked.

⏱️ This takes 5-10 minutes depending on your internet speed.

✅ **Files uploaded!**

---

## STEP 5: Setup Environment Variables

**Go back to your server Terminal window.**

### Frontend environment:
```bash
cd /var/www/heatwave-locksmith
nano .env
```

**Copy and paste this exactly:**
```
VITE_SUPABASE_PROJECT_ID="vmrxwbvbycijhqrdwkdc"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtcnh3YnZieWNpamhxcmR3a2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMjYyOTUsImV4cCI6MjA3MzkwMjI5NX0.T0RJUojWM_Dz5Wqk2tkTAqVrWwDr-eqQmSX4aPGQS5E"
VITE_SUPABASE_URL="https://vmrxwbvbycijhqrdwkdc.supabase.co"
```

**Save the file:**
- Press `Ctrl + X`
- Press `Y`
- Press `Enter`

### Backend environment:
```bash
cd /var/www/heatwave-locksmith/server
nano .env
```

**Copy and paste this exactly:**
```
DATABASE_URL="file:/var/www/heatwave-locksmith/server/prisma/production.db"
JWT_SECRET="heatwave-locksmith-super-secret-key-2024-production-abc123xyz789"
CORS_ORIGIN="http://194.163.173.165"
PORT=4000
NODE_ENV=production
```

**Save the file:**
- Press `Ctrl + X`
- Press `Y`
- Press `Enter`

✅ **Environment setup complete!**

---

## STEP 6: Build Your App

### Build frontend:
```bash
cd /var/www/heatwave-locksmith
npm install
```
⏱️ Takes 3-5 minutes.

```bash
npm run build
```
⏱️ Takes 1-2 minutes.

### Build backend:
```bash
cd /var/www/heatwave-locksmith/server
npm install
```
⏱️ Takes 2-3 minutes.

```bash
npx prisma generate
npx prisma db push
npm run build
```
⏱️ Takes 1 minute.

✅ **App built successfully!**

---

## STEP 7: Setup Nginx (Web Server)

```bash
nano /etc/nginx/sites-available/heatwave-locksmith
```

**Copy and paste this exactly:**
```nginx
server {
    listen 80;
    server_name 194.163.173.165;

    location / {
        root /var/www/heatwave-locksmith/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /auth {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }

    location /health {
        proxy_pass http://localhost:4000;
    }

    location /socket.io {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

**Save:** `Ctrl + X`, then `Y`, then `Enter`

### Enable the site:
```bash
ln -s /etc/nginx/sites-available/heatwave-locksmith /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

✅ **Web server configured!**

---

## STEP 8: Start Your App

```bash
cd /var/www/heatwave-locksmith/server
pm2 start dist/index.js --name heatwave-api
pm2 save
pm2 startup
```

**Copy and run the command that PM2 shows you** (it will be a long command starting with `sudo`)

✅ **App is running!**

---

## STEP 9: Test Your App

### Check if backend is running:
```bash
curl http://localhost:4000/health
```

You should see: `{"status":"ok"}`

### Check if frontend is accessible:
```bash
curl http://localhost
```

You should see HTML code.

✅ **Everything is working!**

---

## 🎉 ACCESS YOUR APP

**Open your browser and go to:**

```
http://194.163.173.165
```

**Login with:**
- Email: `m.yassifi@gmail.com`
- Password: `demo1234`

---

## 📊 Useful Commands

### Check if app is running:
```bash
pm2 status
```

### View app logs:
```bash
pm2 logs heatwave-api
```

### Restart app:
```bash
pm2 restart heatwave-api
```

### Stop app:
```bash
pm2 stop heatwave-api
```

### Check web server:
```bash
systemctl status nginx
```

---

## 🔄 Update Your App Later

When you make changes to your app:

```bash
# 1. Upload new files (from your Mac)
cd /Users/mohcineyassifi/Desktop/main-app-heatwave
scp -r * root@194.163.173.165:/var/www/heatwave-locksmith/

# 2. Rebuild (on server)
cd /var/www/heatwave-locksmith
npm run build
cd server
npm run build

# 3. Restart
pm2 restart heatwave-api
systemctl reload nginx
```

---

## ❌ Troubleshooting

### App not loading?
```bash
# Check logs
pm2 logs heatwave-api

# Restart everything
pm2 restart heatwave-api
systemctl restart nginx
```

### Can't connect to server?
```bash
# Check firewall
ufw status
ufw allow 80/tcp
```

### Database error?
```bash
cd /var/www/heatwave-locksmith/server
npx prisma db push --force-reset
pm2 restart heatwave-api
```

---

## 🆘 Need Help?

1. **Check logs first:** `pm2 logs heatwave-api`
2. **Restart app:** `pm2 restart heatwave-api`
3. **Restart web server:** `systemctl restart nginx`

---

## ✅ Checklist

- [ ] Connected to server via SSH
- [ ] Installed Node.js, Nginx, PM2
- [ ] Uploaded app files
- [ ] Created .env files
- [ ] Built frontend and backend
- [ ] Configured Nginx
- [ ] Started app with PM2
- [ ] Tested at http://194.163.173.165
- [ ] Successfully logged in

---

**🎉 Congratulations! Your locksmith app is live!**
