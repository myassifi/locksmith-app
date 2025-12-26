# ⚡ Quick Deploy Guide - VPS 194.163.173.165

## First Time Setup (Run Once)

### 1. Connect to VPS and run setup:

```bash
ssh root@194.163.173.165
```

Then paste this entire block:

```bash
# System setup
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential nginx sqlite3 git
sudo npm install -g pm2

# Firewall
sudo ufw allow 22/tcp && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
sudo ufw --force enable

# App directory
sudo mkdir -p /var/www/heatwave-locksmith
sudo chown -R $USER:$USER /var/www/heatwave-locksmith

# Configure Nginx
sudo tee /etc/nginx/sites-available/heatwave-locksmith > /dev/null << 'EOF'
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

sudo ln -sf /etc/nginx/sites-available/heatwave-locksmith /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

echo "✅ Server setup complete!"
```

### 2. Set environment variables on VPS:

```bash
# Frontend .env
cd /var/www/heatwave-locksmith
cat > .env << 'EOF'
VITE_SUPABASE_PROJECT_ID="vmrxwbvbycijhqrdwkdc"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtcnh3YnZieWNpamhxcmR3a2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMjYyOTUsImV4cCI6MjA3MzkwMjI5NX0.T0RJUojWM_Dz5Wqk2tkTAqVrWwDr-eqQmSX4aPGQS5E"
VITE_SUPABASE_URL="https://vmrxwbvbycijhqrdwkdc.supabase.co"
EOF

# Backend .env
cd /var/www/heatwave-locksmith/server
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
cat > .env << EOF
DATABASE_URL="file:/var/www/heatwave-locksmith/server/prisma/production.db"
JWT_SECRET="$JWT_SECRET"
CORS_ORIGIN="http://194.163.173.165"
PORT=4000
NODE_ENV=production
EOF

echo "✅ Environment configured!"
```

---

## Deploy App (First Time or Updates)

### Option A: Automated Script (Recommended)

From your local machine:

```bash
cd /Users/mohcineyassifi/Desktop/main-app-heatwave
chmod +x deploy-vps.sh
./deploy-vps.sh
```

### Option B: Manual Deploy

```bash
# 1. Upload files from local machine
cd /Users/mohcineyassifi/Desktop/main-app-heatwave
scp -r * root@194.163.173.165:/var/www/heatwave-locksmith/

# 2. SSH to VPS and build
ssh root@194.163.173.165

cd /var/www/heatwave-locksmith
npm install && npm run build

cd server
npm install && npx prisma generate && npx prisma db push && npm run build

cd /var/www/heatwave-locksmith
mkdir -p logs

pm2 restart heatwave-locksmith-api || pm2 start server/dist/index.js --name heatwave-locksmith-api
pm2 save
pm2 startup  # Run the command it outputs
```

---

## Access Your App

🌐 **http://194.163.173.165**

**Login:**
- Email: `m.yassifi@gmail.com`
- Password: `demo1234`

---

## Quick Commands

```bash
# View logs
ssh root@194.163.173.165 'pm2 logs heatwave-locksmith-api'

# Restart app
ssh root@194.163.173.165 'pm2 restart heatwave-locksmith-api'

# Check status
ssh root@194.163.173.165 'pm2 status'

# Check health
curl http://194.163.173.165/health
```
