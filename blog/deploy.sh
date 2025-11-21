#!/bin/bash

SSH_OPTIONS="$@"

# Build the project
npm run build

timestamp=$(date +%s)

# Create target directory with proper permissions
ssh $SSH_OPTIONS root@167.71.143.97 "mkdir -p /var/www/badyass.xyz/blog-${timestamp} && chmod 755 /var/www/badyass.xyz/blog-${timestamp}"

# Deploy to root of badyass.xyz (blog directory)
scp $SSH_OPTIONS -r dist/* root@167.71.143.97:/var/www/badyass.xyz/blog-${timestamp}/

# Create symlink to blog directory (served at root)
ssh $SSH_OPTIONS root@167.71.143.97 "(rm /var/www/badyass.xyz/blog || true) && ln -s /var/www/badyass.xyz/blog-${timestamp} /var/www/badyass.xyz/blog"
