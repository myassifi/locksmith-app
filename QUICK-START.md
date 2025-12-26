# 🚀 Quick Start Guide - Contabo Deployment

## What You Have

✅ **Contabo Account Created**
- Control Panel: https://my.contabo.com
- Email: `heatwavelocksmith@gmail.com`
- Password: `XCacegQ3KcfcJyq8`

⏳ **Waiting For:**
- Server provisioning (you'll get an email with SSH credentials)
- Usually takes a few hours

---

## What to Do Right Now

### 1. Secure Your Account (Do This First!)

1. Go to https://my.contabo.com
2. Login with the credentials above
3. Click "Customer details"
4. **Change your password immediately**
5. **Enable Two-Factor Authentication**

### 2. Wait for Server Email

You'll receive an email titled something like "Your Contabo Server is Ready" with:
- Server IP address (e.g., 123.456.789.012)
- SSH username (usually `root`)
- SSH password

### 3. Once You Get the Email

**Follow the complete guide:** `CONTABO-DEPLOYMENT-GUIDE.md`

Or quick steps:

```bash
# 1. Connect to your server
ssh root@YOUR_SERVER_IP

# 2. Update system and install Node.js
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential nginx sqlite3 git

# 3. Install PM2
sudo npm install -g pm2

# 4. Create app directory
sudo mkdir -p /var/www/heatwave-locksmith
cd /var/www/heatwave-locksmith

# 5. Upload your app files (use SCP, SFTP, or Git)

# 6. Setup and build
npm install
npm run build
cd server
npm install
npx prisma generate
npx prisma db push
npm run build

# 7. Configure Nginx (see full guide)

# 8. Start with PM2
pm2 start dist/index.js --name heatwave-locksmith-api
pm2 save
pm2 startup
```

---

## Files Created for You

📄 **CONTABO-DEPLOYMENT-GUIDE.md** - Complete step-by-step guide (READ THIS!)
📄 **deploy-contabo.sh** - Automated server setup script
📄 **setup-app.sh** - Automated app installation script
📄 **nginx-config.conf** - Nginx configuration template
📄 **ecosystem.config.js** - PM2 configuration
📄 **.env.production** - Frontend environment template
📄 **server/.env.production** - Backend environment template

---

## Need Help?

1. Read the full guide: `CONTABO-DEPLOYMENT-GUIDE.md`
2. Check troubleshooting section in the guide
3. All commands are provided step-by-step

---

## Timeline

- **Now:** Secure your Contabo account
- **Few hours:** Wait for server provisioning email
- **30-60 min:** Follow deployment guide to setup server
- **Done:** Your app is live!

---

## Important Notes

⚠️ **Change the JWT_SECRET** in `server/.env` before deploying
⚠️ **Update CORS_ORIGIN** with your actual domain/IP
⚠️ **Setup SSL/HTTPS** after initial deployment (instructions in guide)
⚠️ **Backup your database** regularly

---

## Your App Login

Once deployed, login with:
- Email: `m.yassifi@gmail.com`
- Password: `demo1234`

(You can change this in Settings after logging in)
