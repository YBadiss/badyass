#!/bin/bash

SSH_OPTIONS="$@"

# Build the project
npm run build

timestamp=$(date +%s)

# Create target directory with proper permissions
ssh $SSH_OPTIONS root@167.71.143.97 "mkdir -p /var/www/badyass.xyz/swedishfind-${timestamp} && chmod 755 /var/www/badyass.xyz/swedishfind-${timestamp}"

# Deploy the project
scp $SSH_OPTIONS -r dist/* root@167.71.143.97:/var/www/badyass.xyz/swedishfind-${timestamp}/
scp $SSH_OPTIONS package*.json root@167.71.143.97:/var/www/badyass.xyz/swedishfind-${timestamp}/

# Install dependencies
ssh $SSH_OPTIONS root@167.71.143.97 "cd /var/www/badyass.xyz/swedishfind-${timestamp} && npm i --omit=dev"

# Create a new symlink
ssh $SSH_OPTIONS root@167.71.143.97 "(rm /var/www/badyass.xyz/swedishfind || true) && ln -s /var/www/badyass.xyz/swedishfind-${timestamp} /var/www/badyass.xyz/swedishfind"
