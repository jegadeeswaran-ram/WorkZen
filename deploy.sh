#!/bin/bash
# ============================================================
# WorkZen ERP — Hostinger Deployment Script
# Server: 88.222.211.181  Domain: workzen.redonix.in
# Usage: bash deploy.sh
# ============================================================

set -e
APP_DIR="$HOME/workzen"

echo "========================================"
echo "  WorkZen ERP — Deploy"
echo "========================================"

cd "$APP_DIR"

# 1. Pull latest code
echo "[1/7] Pulling latest code..."
git pull origin master

# 2. Install dependencies (skip devDeps in production)
echo "[2/7] Installing dependencies..."
npm install --production=false

# 3. Generate Prisma client
echo "[3/7] Generating Prisma client..."
cd packages/database
npx prisma generate
cd "$APP_DIR"

# 4. Run database migrations
echo "[4/7] Running database migrations..."
cd packages/database
npx prisma migrate deploy
cd "$APP_DIR"

# 5. Build API
echo "[5/7] Building API..."
cd apps/api
npm run build
cd "$APP_DIR"

# 6. Build Next.js web
echo "[6/7] Building Web..."
cd apps/web
npm run build
# Copy standalone static files
cp -r .next/static .next/standalone/apps/web/.next/static
cp -r public .next/standalone/apps/web/public 2>/dev/null || true
cd "$APP_DIR"

# 7. Restart PM2 processes
echo "[7/7] Restarting PM2..."
if pm2 list | grep -q "workzen-api"; then
  pm2 reload ecosystem.config.js --env production
else
  pm2 start ecosystem.config.js --env production
fi
pm2 save

echo ""
echo "✔ Deployment complete!"
echo "  API  → http://127.0.0.1:3001"
echo "  Web  → http://127.0.0.1:3000"
echo "  Live → https://workzen.redonix.in"
echo ""
pm2 status
