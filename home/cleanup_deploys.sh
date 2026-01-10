#!/bin/bash

SSH_OPTIONS="$@"

# Clean up old deployments, keeping only the last 2
ssh $SSH_OPTIONS root@167.71.143.97 '
  cd /var/www/badyass.xyz
  
  # List all home-* directories (excluding the symlink), sort by timestamp, and remove all but the last 2
  ls -d home-* 2>/dev/null | sort -t- -k2 -n | head -n -2 | while read dir; do
    echo "Removing old deployment: $dir"
    rm -rf "$dir"
  done
'

