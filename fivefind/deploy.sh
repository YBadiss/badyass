#!/bin/bash

SSH_OPTIONS="$@"

# Build the project
npm run build

timestamp=$(date +%s)

# Create target directory with proper permissions
ssh $SSH_OPTIONS root@167.71.143.97 "mkdir -p /var/www/badyass.xyz/fivefind-${timestamp} && chmod 755 /var/www/badyass.xyz/fivefind-${timestamp}"

# Deploy the built files
scp $SSH_OPTIONS -r dist/* root@167.71.143.97:/var/www/badyass.xyz/fivefind-${timestamp}/

# Create a new symlink
ssh $SSH_OPTIONS root@167.71.143.97 "(rm /var/www/badyass.xyz/fivefind || true) && ln -s /var/www/badyass.xyz/fivefind-${timestamp} /var/www/badyass.xyz/fivefind"
