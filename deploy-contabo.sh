#!/bin/bash

# Contabo VPS Deployment Script for Heat Wave Locksmith App
# This script automates the deployment process on a fresh Ubuntu server

set -e  # Exit on any error

echo "🚀 Starting Heat Wave Locksmith App Deployment..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install build essentials (needed for some npm packages)
echo "📦 Installing build essentials..."
sudo apt install -y build-essential

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt install -y nginx

# Install PM2 globally for process management
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install Git if not already installed
echo "📦 Installing Git..."
sudo apt install -y git

# Create app directory
echo "📁 Creating app directory..."
sudo mkdir -p /var/www/heatwave-locksmith
sudo chown -R $USER:$USER /var/www/heatwave-locksmith

# Clone or setup your app (you'll need to do this manually or via git)
echo "📥 App directory ready at /var/www/heatwave-locksmith"
echo "   You'll need to upload your app files here"

# Install SQLite (for the database)
echo "📦 Installing SQLite..."
sudo apt install -y sqlite3

# Setup firewall
echo "🔥 Configuring firewall..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 4000/tcp  # Backend API (optional, can be removed after nginx setup)
sudo ufw --force enable

echo "✅ Base system setup complete!"
echo ""
echo "Next steps:"
echo "1. Upload your app files to /var/www/heatwave-locksmith"
echo "2. Configure environment variables"
echo "3. Install dependencies and build the app"
echo "4. Configure Nginx"
echo "5. Start the application with PM2"
