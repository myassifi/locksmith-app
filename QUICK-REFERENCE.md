# 📋 Quick Reference Card

## 🔗 Your Server Info
- **IP Address:** 194.163.173.165
- **Username:** root
- **App URL:** http://194.163.173.165

## 🔑 Login Credentials
- **Email:** m.yassifi@gmail.com
- **Password:** demo1234

---

## 🚀 Two Ways to Deploy

### Option 1: Automated (Easiest!)

**Step 1:** Connect to server
```bash
ssh root@194.163.173.165
```

**Step 2:** Download and run script
```bash
curl -o auto-deploy.sh https://raw.githubusercontent.com/YOUR_REPO/auto-deploy.sh
chmod +x auto-deploy.sh
./auto-deploy.sh
```

**Step 3:** When prompted, upload files from your Mac (in NEW terminal):
```bash
cd /Users/mohcineyassifi/Desktop/main-app-heatwave
scp -r * root@194.163.173.165:/var/www/heatwave-locksmith/
```

**Done!** Visit http://194.163.173.165

---

### Option 2: Manual (Step-by-step)

See `BEGINNER-DEPLOY-GUIDE.md` for detailed instructions.

---

## 📊 Common Commands

### Connect to Server
```bash
ssh root@194.163.173.165
```

### Check App Status
```bash
pm2 status
```

### View Logs
```bash
pm2 logs heatwave-api
```

### Restart App
```bash
pm2 restart heatwave-api
```

### Restart Web Server
```bash
systemctl restart nginx
```

### Check if App is Running
```bash
curl http://localhost:4000/health
```

---

## 🔄 Update Your App

**From your Mac:**
```bash
cd /Users/mohcineyassifi/Desktop/main-app-heatwave
scp -r * root@194.163.173.165:/var/www/heatwave-locksmith/
```

**On the server:**
```bash
cd /var/www/heatwave-locksmith
npm run build
cd server
npm run build
pm2 restart heatwave-api
```

---

## ❌ Quick Fixes

### App not loading?
```bash
pm2 restart heatwave-api
systemctl restart nginx
```

### Check what's wrong?
```bash
pm2 logs heatwave-api
```

### Reset database?
```bash
cd /var/www/heatwave-locksmith/server
npx prisma db push --force-reset
pm2 restart heatwave-api
```

---

## 📁 Important Locations

- **App folder:** `/var/www/heatwave-locksmith`
- **Frontend:** `/var/www/heatwave-locksmith/dist`
- **Backend:** `/var/www/heatwave-locksmith/server`
- **Database:** `/var/www/heatwave-locksmith/server/prisma/production.db`
- **Nginx config:** `/etc/nginx/sites-available/heatwave-locksmith`

---

## 📞 Troubleshooting Steps

1. Check logs: `pm2 logs heatwave-api`
2. Restart app: `pm2 restart heatwave-api`
3. Restart nginx: `systemctl restart nginx`
4. Check firewall: `ufw status`
5. Test backend: `curl http://localhost:4000/health`

---

## 🎯 Quick Start Checklist

- [ ] Connect via SSH
- [ ] Run deployment script OR follow manual guide
- [ ] Upload app files
- [ ] Visit http://194.163.173.165
- [ ] Login and test

---

**Need detailed help?** See `BEGINNER-DEPLOY-GUIDE.md`
