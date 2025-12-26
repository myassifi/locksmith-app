# 🚀 Contabo VPS Deployment Guide
## Heat Wave Locksmith App

This guide will walk you through deploying your locksmith app on Contabo VPS step by step.

---

## 📋 Prerequisites

- Contabo VPS account (you have this!)
- SSH access to your server (you'll receive credentials via email)
- Your app files ready to upload
- Basic command line knowledge

---

## 🔐 Step 1: Access Your Contabo Control Panel

1. **Log in to Contabo Control Panel:**
   - URL: https://my.contabo.com
   - Email: `heatwavelocksmith@gmail.com`
   - Password: `XCacegQ3KcfcJyq8`

2. **⚠️ IMPORTANT - Change Your Password:**
   - Click on "Customer details"
   - Change your password immediately
   - Enable Two-Factor Authentication for security

3. **Wait for Server Provisioning:**
   - You'll receive an email with SSH credentials once your server is ready
   - This usually takes a few hours
   - The email will contain:
     - Server IP address
     - SSH username (usually `root`)
     - SSH password

---

## 🖥️ Step 2: Connect to Your Server via SSH

Once you receive your server credentials:

```bash
# Connect to your server (replace with your actual IP)
ssh root@YOUR_SERVER_IP

# Enter the password from the email when prompted
```

**First time connecting:**
- You'll see a message about authenticity of host - type `yes`
- Enter the password provided in the email

---

## 🔧 Step 3: Initial Server Setup

### 3.1 Update Your Server Password

```bash
# Change root password to something secure
passwd
```

### 3.2 Create a Non-Root User (Recommended)

```bash
# Create a new user
adduser heatwave

# Add user to sudo group
usermod -aG sudo heatwave

# Switch to new user
su - heatwave
```

### 3.3 Run the Deployment Script

```bash
# Download and run the deployment script
curl -o deploy-contabo.sh https://raw.githubusercontent.com/YOUR_REPO/deploy-contabo.sh
chmod +x deploy-contabo.sh
./deploy-contabo.sh
```

**Or manually run these commands:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install other dependencies
sudo apt install -y build-essential nginx sqlite3 git

# Install PM2
sudo npm install -g pm2

# Setup firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

# Create app directory
sudo mkdir -p /var/www/heatwave-locksmith
sudo chown -R $USER:$USER /var/www/heatwave-locksmith
```

---

## 📤 Step 4: Upload Your App Files

### Option A: Using Git (Recommended)

```bash
cd /var/www/heatwave-locksmith

# Clone your repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git .

# Or if you need to setup git first:
git init
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git pull origin main
```

### Option B: Using SCP (from your local machine)

```bash
# From your local machine (not on the server)
cd /Users/mohcineyassifi/Desktop/main-app-heatwave

# Upload files to server
scp -r * root@YOUR_SERVER_IP:/var/www/heatwave-locksmith/
```

### Option C: Using SFTP Client

Use an SFTP client like FileZilla:
- Host: `sftp://YOUR_SERVER_IP`
- Username: `root` (or your user)
- Password: Your SSH password
- Port: `22`
- Upload all files to `/var/www/heatwave-locksmith/`

---

## ⚙️ Step 5: Configure Environment Variables

### 5.1 Frontend Environment Variables

```bash
cd /var/www/heatwave-locksmith

# Create .env file
nano .env
```

Add this content:
```env
VITE_SUPABASE_PROJECT_ID="vmrxwbvbycijhqrdwkdc"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtcnh3YnZieWNpamhxcmR3a2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMjYyOTUsImV4cCI6MjA3MzkwMjI5NX0.T0RJUojWM_Dz5Wqk2tkTAqVrWwDr-eqQmSX4aPGQS5E"
VITE_SUPABASE_URL="https://vmrxwbvbycijhqrdwkdc.supabase.co"
```

Save: `Ctrl + X`, then `Y`, then `Enter`

### 5.2 Backend Environment Variables

```bash
cd /var/www/heatwave-locksmith/server

# Create .env file
nano .env
```

Add this content (⚠️ **CHANGE THE JWT_SECRET**):
```env
DATABASE_URL="file:/var/www/heatwave-locksmith/server/prisma/production.db"
JWT_SECRET="CHANGE-THIS-TO-A-RANDOM-LONG-STRING-123456789"
CORS_ORIGIN="http://YOUR_SERVER_IP,https://YOUR_DOMAIN.com"
PORT=4000
NODE_ENV=production
```

**Generate a secure JWT_SECRET:**
```bash
# Run this command to generate a random secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Save: `Ctrl + X`, then `Y`, then `Enter`

---

## 🏗️ Step 6: Build and Setup the Application

```bash
cd /var/www/heatwave-locksmith

# Install frontend dependencies
npm install

# Build frontend
npm run build

# Setup backend
cd server
npm install

# Generate Prisma client
npx prisma generate

# Initialize database
npx prisma db push

# Build backend
npm run build

# Create logs directory
cd /var/www/heatwave-locksmith
mkdir -p logs
```

---

## 🌐 Step 7: Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/heatwave-locksmith
```

Add this configuration (replace `YOUR_SERVER_IP` or `YOUR_DOMAIN.com`):

```nginx
server {
    listen 80;
    server_name YOUR_SERVER_IP;  # Or your domain

    location / {
        root /var/www/heatwave-locksmith/dist;
        try_files $uri $uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /auth {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /health {
        proxy_pass http://localhost:4000;
    }

    location /uploads {
        proxy_pass http://localhost:4000;
    }

    location /socket.io {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
```

Save and enable the site:

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/heatwave-locksmith /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🚀 Step 8: Start the Application with PM2

```bash
cd /var/www/heatwave-locksmith/server

# Start the backend with PM2
pm2 start dist/index.js --name heatwave-locksmith-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command that PM2 outputs

# Check status
pm2 status
pm2 logs heatwave-locksmith-api
```

---

## ✅ Step 9: Verify Deployment

### Check if everything is running:

```bash
# Check Nginx status
sudo systemctl status nginx

# Check PM2 status
pm2 status

# Check backend health
curl http://localhost:4000/health

# Check if frontend is accessible
curl http://localhost
```

### Access your app:

Open your browser and go to:
- `http://YOUR_SERVER_IP`

### Login credentials:
- Email: `m.yassifi@gmail.com`
- Password: `demo1234`

---

## 🔒 Step 10: Setup SSL (HTTPS) - Optional but Recommended

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Certbot will automatically configure Nginx for HTTPS
# Follow the prompts and choose to redirect HTTP to HTTPS

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## 🔄 Updating Your App

When you need to update your app:

```bash
# Pull latest changes (if using Git)
cd /var/www/heatwave-locksmith
git pull origin main

# Rebuild frontend
npm install
npm run build

# Rebuild backend
cd server
npm install
npx prisma generate
npx prisma db push
npm run build

# Restart backend
pm2 restart heatwave-locksmith-api

# Reload Nginx
sudo systemctl reload nginx
```

---

## 📊 Monitoring and Logs

### View application logs:
```bash
# PM2 logs
pm2 logs heatwave-locksmith-api

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Monitor server resources:
```bash
# Check CPU and memory
htop

# Check disk space
df -h

# Check PM2 monitoring
pm2 monit
```

---

## 🆘 Troubleshooting

### Backend not starting:
```bash
# Check logs
pm2 logs heatwave-locksmith-api

# Restart backend
pm2 restart heatwave-locksmith-api

# Check if port 4000 is in use
sudo lsof -i :4000
```

### Frontend not loading:
```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Rebuild frontend
cd /var/www/heatwave-locksmith
npm run build
```

### Database issues:
```bash
cd /var/www/heatwave-locksmith/server

# Reset database
npx prisma db push --force-reset

# Check database file permissions
ls -la prisma/production.db
```

### Can't connect to server:
```bash
# Check firewall
sudo ufw status

# Make sure ports are open
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

---

## 📞 Support

If you encounter issues:

1. Check the logs first (PM2 and Nginx)
2. Verify all environment variables are set correctly
3. Ensure all services are running (Nginx, PM2)
4. Check firewall settings

---

## 🎉 Congratulations!

Your Heat Wave Locksmith app is now deployed on Contabo VPS!

**Next Steps:**
- Setup a custom domain
- Configure SSL/HTTPS
- Setup automated backups
- Monitor your application

**Important Files:**
- Frontend: `/var/www/heatwave-locksmith/dist`
- Backend: `/var/www/heatwave-locksmith/server`
- Database: `/var/www/heatwave-locksmith/server/prisma/production.db`
- Logs: `/var/www/heatwave-locksmith/logs`
- Nginx Config: `/etc/nginx/sites-available/heatwave-locksmith`
