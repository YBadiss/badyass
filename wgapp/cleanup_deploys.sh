#!/bin/bash
set -euo pipefail

SSH_OPTIONS="$@"
SERVER="root@167.71.143.97"
BASE_DIR="/var/www/badyass.xyz"
KEEP=3

echo "==> Cleaning old wgapp deployments (keeping last ${KEEP})"

# List wgapp-* dirs sorted oldest first, remove all but the last $KEEP
ssh $SSH_OPTIONS $SERVER "
  cd ${BASE_DIR} &&
  ls -d wgapp-[0-9]* 2>/dev/null | sort -n | head -n -${KEEP} | while read dir; do
    echo \"Removing \${dir}\"
    rm -rf \"\${dir}\"
  done
"

echo "==> Cleanup done"
