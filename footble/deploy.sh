#!/bin/bash

SSH_OPTIONS="$@"

# Build the project
npm run build

timestamp=$(date +%s)

# Deploy the project
scp $SSH_OPTIONS -r dist/* root@167.71.143.97:/var/www/badyass.xyz/footble-${timestamp}
scp $SSH_OPTIONS package*.json root@167.71.143.97:/var/www/badyass.xyz/footble-${timestamp}/

# Install dependencies
ssh $SSH_OPTIONS root@167.71.143.97 "cd /var/www/badyass.xyz/footble-${timestamp} && npm i --omit=dev"

# Create a new symlink
ssh $SSH_OPTIONS root@167.71.143.97 "(rm /var/www/badyass.xyz/footble || true) && ln -s /var/www/badyass.xyz/footble-${timestamp} /var/www/badyass.xyz/facet"
