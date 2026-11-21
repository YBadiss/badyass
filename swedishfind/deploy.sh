#!/bin/bash
# Uploads the already-built dist/ to the droplet and swaps the live symlink.
# CI builds in an earlier step, before the SSH key is loaded; run `npm run build` first if deploying by hand.
set -euo pipefail

SERVER="${DEPLOY_USER:-root}@${DEPLOY_HOST:-167.71.143.97}"
BASE=/var/www/badyass.xyz
NAME=swedishfind
timestamp=$(date +%s)

[ -d dist ] || { echo "dist/ not found: run npm run build first" >&2; exit 1; }

ssh "$SERVER" "mkdir -p $BASE/$NAME-$timestamp && chmod 755 $BASE/$NAME-$timestamp"
scp -r dist/* "$SERVER:$BASE/$NAME-$timestamp/"
ssh "$SERVER" "ln -sfn $BASE/$NAME-$timestamp $BASE/$NAME"
