# 🚀 Quick Deployment to Your VPS (194.163.173.165)

## Step 1: Connect to Your VPS

```bash
ssh root@194.163.173.165
```

Enter your password when prompted.

---

## Step 2: Run Setup Script

Copy and paste this entire block:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install dependencies
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

echo "✅ Server setup complete!"
```

---

## Step 3: Upload Your App Files

**From your local machine** (open a new terminal, don't close the SSH connection):

```bash
cd /Users/mohcineyassifi/Desktop/main-app-heatwave

# Upload files to VPS
scp -r * root@194.163.173.165:/var/www/heatwave-locksmith/
```

This will take a few minutes depending on your internet speed.

---

## Step 4: Configure Environment Variables

**Back on your VPS SSH connection:**

### Frontend .env
```bash
cd /var/www/heatwave-locksmith
cat > .env << 'EOF'
VITE_SUPABASE_PROJECT_ID="vmrxwbvbycijhqrdwkdc"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtcnh3YnZieWNpamhxcmR3a2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMjYyOTUsImV4cCI6MjA3MzkwMjI5NX0.T0RJUojWM_Dz5Wqk2tkTAqVrWwDr-eqQmSX4aPGQS5E"
VITE_SUPABASE_URL="https://vmrxwbvbycijhqrdwkdc.supabase.co"
EOF
```

### Backend .env
```bash
cd /var/www/heatwave-locksmith/server

# Generate a secure JWT secret
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

cat > .env << EOF
DATABASE_URL="file:/var/www/heatwave-locksmith/server/prisma/production.db"
JWT_SECRET="$JWT_SECRET"
CORS_ORIGIN="http://194.163.173.165"
PORT=4000
NODE_ENV=production
EOF

echo "✅ Environment variables configured!"
```

---

## Step 5: Build the Application

```bash
cd /var/www/heatwave-locksmith

# Install and build frontend
npm install
npm run build

# Install and build backend
cd server
npm install
npx prisma generate
npx prisma db push
npm run build

# Create logs directory
cd /var/www/heatwave-locksmith
mkdir -p logs

echo "✅ Application built successfully!"
```

---

## Step 6: Configure Nginx

```bash
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

# Enable the site
sudo ln -sf /etc/nginx/sites-available/heatwave-locksmith /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx

echo "✅ Nginx configured!"
```

---

## Step 7: Start the Application

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

## Step 8: Verify Deployment

```bash
# Check backend health
curl http://localhost:4000/health

# Check if frontend is accessible
curl http://localhost

# View logs
pm2 logs heatwave-locksmith-api --lines 50
```

---

## 🎉 Access Your App

Open your browser and go to:
**http://194.163.173.165**

Login with:
- Email: `m.yassifi@gmail.com`
- Password: `demo1234`

---

## 🔄 Updating Your App Later

When you need to update:

```bash
# On your local machine - upload new files
cd /Users/mohcineyassifi/Desktop/main-app-heatwave
scp -r * root@194.163.173.165:/var/www/heatwave-locksmith/

# On VPS - rebuild and restart
ssh root@194.163.173.165
cd /var/www/heatwave-locksmith
npm install && npm run build
cd server
npm install && npx prisma generate && npx prisma db push && npm run build
pm2 restart heatwave-locksmith-api
```

---

## 📊 Useful Commands

```bash
# View logs
pm2 logs heatwave-locksmith-api

# Restart backend
pm2 restart heatwave-locksmith-api

# Stop backend
pm2 stop heatwave-locksmith-api

# Check Nginx status
sudo systemctl status nginx

# Restart Nginx
sudo systemctl restart nginx

# Check disk space
df -h

# Monitor resources
pm2 monit
```

---

## 🆘 Troubleshooting

**Backend not starting:**
```bash
pm2 logs heatwave-locksmith-api
pm2 restart heatwave-locksmith-api
```

**Frontend not loading:**
```bash
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

**Port already in use:**
```bash
sudo lsof -i :4000
pm2 delete all
pm2 start dist/index.js --name heatwave-locksmith-api
```
