#!/bin/bash

# Application Setup Script
# Run this after uploading your app files to the server

set -e

APP_DIR="/var/www/heatwave-locksmith"

echo "🔧 Setting up Heat Wave Locksmith App..."

cd $APP_DIR

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd server
npm install

# Generate Prisma client
echo "🔨 Generating Prisma client..."
npx prisma generate

# Initialize database
echo "🗄️ Initializing database..."
npx prisma db push

cd ..

# Build frontend
echo "🏗️ Building frontend..."
npm run build

echo "✅ Application setup complete!"
echo ""
echo "Frontend built in: $APP_DIR/dist"
echo "Backend ready in: $APP_DIR/server"
