#!/bin/bash

# 🚀 Automated Deployment Script for Heat Wave Locksmith App
# This script automates the entire deployment process on Contabo VPS

set -e  # Exit on any error

echo "🚀 Starting Heat Wave Locksmith App Deployment..."
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/var/www/heatwave-locksmith"
SERVER_IP="194.163.173.165"

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Update System
print_info "Step 1/10: Updating system packages..."
apt update && apt upgrade -y
print_success "System updated!"
echo ""

# Step 2: Install Node.js
print_info "Step 2/10: Installing Node.js 20.x..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    print_success "Node.js installed! Version: $(node -v)"
else
    print_success "Node.js already installed! Version: $(node -v)"
fi
echo ""

# Step 3: Install Dependencies
print_info "Step 3/10: Installing required packages..."
apt install -y build-essential nginx git sqlite3
print_success "Dependencies installed!"
echo ""

# Step 4: Install PM2
print_info "Step 4/10: Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    print_success "PM2 installed!"
else
    print_success "PM2 already installed!"
fi
echo ""

# Step 5: Setup Firewall
print_info "Step 5/10: Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
print_success "Firewall configured!"
echo ""

# Step 6: Create App Directory
print_info "Step 6/10: Creating application directory..."
mkdir -p $APP_DIR
cd $APP_DIR
print_success "Directory created: $APP_DIR"
echo ""

# Step 7: Setup Environment Variables
print_info "Step 7/10: Creating environment files..."

# Frontend .env
cat > $APP_DIR/.env << 'EOF'
VITE_SUPABASE_PROJECT_ID="vmrxwbvbycijhqrdwkdc"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtcnh3YnZieWNpamhxcmR3a2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMjYyOTUsImV4cCI6MjA3MzkwMjI5NX0.T0RJUojWM_Dz5Wqk2tkTAqVrWwDr-eqQmSX4aPGQS5E"
VITE_SUPABASE_URL="https://vmrxwbvbycijhqrdwkdc.supabase.co"
EOF

# Backend .env
mkdir -p $APP_DIR/server
cat > $APP_DIR/server/.env << 'EOF'
DATABASE_URL="file:/var/www/heatwave-locksmith/server/prisma/production.db"
JWT_SECRET="heatwave-locksmith-super-secret-key-2024-production-abc123xyz789"
CORS_ORIGIN="http://194.163.173.165"
PORT=4000
NODE_ENV=production
EOF

print_success "Environment files created!"
echo ""

print_info "⚠️  IMPORTANT: You need to upload your app files now!"
echo ""
echo "From your Mac, run this command in a NEW terminal:"
echo ""
echo "  cd /Users/mohcineyassifi/Desktop/main-app-heatwave"
echo "  scp -r * root@194.163.173.165:/var/www/heatwave-locksmith/"
echo ""
read -p "Press ENTER after you've uploaded the files..."
echo ""

# Step 8: Build Application
print_info "Step 8/10: Building application..."

# Build frontend
print_info "Building frontend..."
cd $APP_DIR
npm install
npm run build
print_success "Frontend built!"

# Build backend
print_info "Building backend..."
cd $APP_DIR/server
npm install
npx prisma generate
npx prisma db push
npm run build
print_success "Backend built!"
echo ""

# Step 9: Configure Nginx
print_info "Step 9/10: Configuring Nginx..."

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
print_success "Nginx configured and running!"
echo ""

# Step 10: Start Application
print_info "Step 10/10: Starting application with PM2..."

cd $APP_DIR/server

# Stop existing instance if running
pm2 delete heatwave-api 2>/dev/null || true

# Start new instance
pm2 start dist/index.js --name heatwave-api
pm2 save
pm2 startup systemd -u root --hp /root

print_success "Application started!"
echo ""

# Verification
print_info "Verifying deployment..."
sleep 3

# Check backend
if curl -s http://localhost:4000/health | grep -q "ok"; then
    print_success "Backend is running!"
else
    print_error "Backend health check failed!"
fi

# Check frontend
if curl -s http://localhost | grep -q "html"; then
    print_success "Frontend is accessible!"
else
    print_error "Frontend check failed!"
fi

echo ""
echo "=================================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "=================================================="
echo ""
echo "Your app is now live at: http://194.163.173.165"
echo ""
echo "Login credentials:"
echo "  Email: m.yassifi@gmail.com"
echo "  Password: demo1234"
echo ""
echo "Useful commands:"
echo "  pm2 status          - Check app status"
echo "  pm2 logs heatwave-api - View logs"
echo "  pm2 restart heatwave-api - Restart app"
echo ""
print_success "Deployment successful!"
