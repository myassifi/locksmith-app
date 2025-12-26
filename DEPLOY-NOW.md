# 🚀 Deploy NOW - Quick Commands

Your server is ready! Follow these commands to deploy in ~30 minutes.

**Server IP:** `194.163.173.165`

---

## Step 1: Connect to Your Server

```bash
ssh root@194.163.173.165
```

Enter your password when prompted.

---

## Step 2: Initial Server Setup (5 minutes)

Copy and paste these commands one by one:

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install dependencies
apt install -y build-essential nginx sqlite3 git

# Install PM2
npm install -g pm2

# Setup firewall
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Create app directory
mkdir -p /var/www/heatwave-locksmith
```

---

## Step 3: Upload Your App Files

### Option A: From Your Mac (Recommended)

Open a **NEW terminal window** on your Mac (don't close the SSH session):

```bash
cd /Users/mohcineyassifi/Desktop/main-app-heatwave

# Upload all files
scp -r * root@194.163.173.165:/var/www/heatwave-locksmith/
```

This will take a few minutes depending on your internet speed.

### Option B: Using Git

If your code is on GitHub:

```bash
cd /var/www/heatwave-locksmith
git clone YOUR_GITHUB_REPO_URL .
```

---

## Step 4: Setup Environment Variables

Back in your SSH session:

```bash
cd /var/www/heatwave-locksmith

# Create frontend .env
cat > .env << 'EOF'
VITE_SUPABASE_PROJECT_ID="vmrxwbvbycijhqrdwkdc"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtcnh3YnZieWNpamhxcmR3a2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMjYyOTUsImV4cCI6MjA3MzkwMjI5NX0.T0RJUojWM_Dz5Wqk2tkTAqVrWwDr-eqQmSX4aPGQS5E"
VITE_SUPABASE_URL="https://vmrxwbvbycijhqrdwkdc.supabase.co"
EOF

# Generate a secure JWT secret
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# Create backend .env
cat > server/.env << EOF
DATABASE_URL="file:/var/www/heatwave-locksmith/server/prisma/production.db"
JWT_SECRET="$JWT_SECRET"
CORS_ORIGIN="http://194.163.173.165,https://194.163.173.165"
PORT=4000
NODE_ENV=production
EOF

echo "✅ Environment variables configured!"
```

---

## Step 5: Build the Application (10 minutes)

```bash
cd /var/www/heatwave-locksmith

# Install and build frontend
npm install
npm run build

# Install and setup backend
cd server
npm install
npx prisma generate
npx prisma db push
npm run build

# Create logs directory
cd ..
mkdir -p logs

echo "✅ Application built successfully!"
```

---

## Step 6: Configure Nginx (2 minutes)

```bash
# Create Nginx configuration
cat > /etc/nginx/sites-available/heatwave-locksmith << 'EOF'
server {
    listen 80;
    server_name 194.163.173.165;

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
EOF

# Enable site
ln -sf /etc/nginx/sites-available/heatwave-locksmith /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t
systemctl restart nginx

echo "✅ Nginx configured!"
```

---

## Step 7: Start the Application (1 minute)

```bash
cd /var/www/heatwave-locksmith/server

# Start backend with PM2
pm2 start dist/index.js --name heatwave-locksmith-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Copy and run the command that PM2 outputs

# Check status
pm2 status

echo "✅ Application is running!"
```

---

## Step 8: Verify Everything Works

```bash
# Check backend health
curl http://localhost:4000/health

# Check if frontend is accessible
curl http://localhost

# View logs
pm2 logs heatwave-locksmith-api --lines 20
```

---

## 🎉 You're Done!

Open your browser and go to:

**http://194.163.173.165**

### Login Credentials:
- **Email:** `m.yassifi@gmail.com`
- **Password:** `demo1234`

---

## Useful Commands

### View Logs
```bash
pm2 logs heatwave-locksmith-api
```

### Restart Backend
```bash
pm2 restart heatwave-locksmith-api
```

### Check Status
```bash
pm2 status
systemctl status nginx
```

### Update App (After Making Changes)
```bash
cd /var/www/heatwave-locksmith
git pull  # or upload new files
npm run build
cd server
npm run build
pm2 restart heatwave-locksmith-api
```

---

## Setup SSL (Optional - Recommended)

```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain if you have one)
# For now, you can skip this and use HTTP
# certbot --nginx -d yourdomain.com
```

---

## Troubleshooting

**Backend not starting?**
```bash
pm2 logs heatwave-locksmith-api
cd /var/www/heatwave-locksmith/server
cat .env  # Check environment variables
```

**Frontend not loading?**
```bash
systemctl status nginx
tail -f /var/log/nginx/error.log
```

**Need to rebuild?**
```bash
cd /var/www/heatwave-locksmith
npm run build
systemctl reload nginx
```

---

## 🆘 Need Help?

Check the full guide: `CONTABO-DEPLOYMENT-GUIDE.md`
