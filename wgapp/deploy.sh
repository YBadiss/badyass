#!/bin/bash
set -euo pipefail

SSH_OPTIONS="$@"
SERVER="root@167.71.143.97"
BASE_DIR="/var/www/badyass.xyz"
STORE_DIR="${BASE_DIR}/wgapp-store"

timestamp=$(date +%s)
DEPLOY_DIR="${BASE_DIR}/wgapp-${timestamp}"

echo "==> Deploying wgapp-${timestamp}"

# Ensure store and deploy directories exist
ssh $SSH_OPTIONS $SERVER "mkdir -p ${STORE_DIR} ${DEPLOY_DIR}"

# Upload source files (no node_modules, no store, no .env)
rsync -az --exclude node_modules --exclude store --exclude .env --exclude dist \
  -e "ssh $SSH_OPTIONS" \
  ./ ${SERVER}:${DEPLOY_DIR}/

# Install production dependencies on server
ssh $SSH_OPTIONS $SERVER "cd ${DEPLOY_DIR} && npm ci --omit=dev"

# Swap symlink and restart PM2
ssh $SSH_OPTIONS $SERVER "(rm ${BASE_DIR}/wgapp 2>/dev/null || true) && ln -s ${DEPLOY_DIR} ${BASE_DIR}/wgapp && cd ${BASE_DIR}/wgapp && pm2 startOrRestart ecosystem.config.cjs --update-env"

echo "==> Deployed to ${DEPLOY_DIR}"
