#!/bin/bash

SSH_OPTIONS="$@"

# Build the project
npm run build

timestamp=$(date +%s)

# Deploy to root of badyass.xyz (home directory)
scp $SSH_OPTIONS -r dist/* root@167.71.143.97:/var/www/badyass.xyz/home-${timestamp}

# Create symlink to home directory (served at root)
ssh $SSH_OPTIONS root@167.71.143.97 "(rm /var/www/badyass.xyz/home || true) && ln -s /var/www/badyass.xyz/home-${timestamp} /var/www/badyass.xyz/home"
