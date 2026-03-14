#!/bin/bash
set -euo pipefail

SSH_OPTIONS="$@"
SERVER="root@167.71.143.97"
BASE_DIR="/var/www/badyass.xyz"
STORE_DIR="${BASE_DIR}/wgapp-store"

timestamp=$(date +%s)
DEPLOY_DIR="${BASE_DIR}/wgapp-${timestamp}"

echo "==> Building production dependencies locally"
npm ci --omit=dev

echo "==> Deploying wgapp-${timestamp}"

# Ensure store and deploy directories exist
ssh $SSH_OPTIONS $SERVER "mkdir -p ${STORE_DIR} ${DEPLOY_DIR}"

# Upload everything including node_modules (built on CI/local machine)
rsync -az --exclude store --exclude .env --exclude dist \
  -e "ssh $SSH_OPTIONS" \
  ./ ${SERVER}:${DEPLOY_DIR}/

# Swap symlink and restart PM2
ssh $SSH_OPTIONS $SERVER "(rm ${BASE_DIR}/wgapp 2>/dev/null || true) && ln -s ${DEPLOY_DIR} ${BASE_DIR}/wgapp && cd ${BASE_DIR}/wgapp && pm2 startOrRestart ecosystem.config.cjs --update-env"

echo "==> Deployed to ${DEPLOY_DIR}"
