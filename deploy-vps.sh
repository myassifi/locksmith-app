#!/bin/bash

# Automated VPS Deployment Script for Heat Wave Locksmith App
# VPS IP: 194.163.173.165

set -e

echo "🚀 Starting deployment to VPS..."

VPS_IP="194.163.173.165"
VPS_USER="root"
APP_DIR="/var/www/heatwave-locksmith"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Step 1: Uploading files to VPS...${NC}"
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.git' \
  --exclude '*.log' \
  --exclude '.DS_Store' \
  ./ ${VPS_USER}@${VPS_IP}:${APP_DIR}/

echo -e "${GREEN}✅ Files uploaded!${NC}"

echo -e "${BLUE}🔧 Step 2: Building and starting application on VPS...${NC}"

ssh ${VPS_USER}@${VPS_IP} << 'ENDSSH'
set -e

APP_DIR="/var/www/heatwave-locksmith"

echo "📦 Installing frontend dependencies..."
cd $APP_DIR
npm install

echo "🏗️ Building frontend..."
npm run build

echo "📦 Installing backend dependencies..."
cd $APP_DIR/server
npm install

echo "🗄️ Setting up database..."
npx prisma generate
npx prisma db push

echo "🏗️ Building backend..."
npm run build

echo "📁 Creating logs directory..."
mkdir -p $APP_DIR/logs

echo "🔄 Restarting application..."
pm2 restart heatwave-locksmith-api || pm2 start dist/index.js --name heatwave-locksmith-api
pm2 save

echo "✅ Deployment complete!"
pm2 status

ENDSSH

echo -e "${GREEN}🎉 Deployment successful!${NC}"
echo -e "${BLUE}🌐 Your app is live at: http://${VPS_IP}${NC}"
echo -e "${BLUE}📊 View logs: ssh ${VPS_USER}@${VPS_IP} 'pm2 logs heatwave-locksmith-api'${NC}"
