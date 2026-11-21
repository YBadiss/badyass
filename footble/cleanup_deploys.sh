#!/bin/bash
# Keeps only the 2 most recent footble-<timestamp> deploy directories on the droplet.
set -euo pipefail

SERVER="${DEPLOY_USER:-root}@${DEPLOY_HOST:-167.71.143.97}"

ssh "$SERVER" 'cd /var/www/badyass.xyz && ls -d footble-[0-9]* 2>/dev/null | sort -t- -k2 -n | head -n -2 | xargs -r -t rm -rf --'
