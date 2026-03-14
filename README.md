# badyass

Home for my online content.

## Projects

- **home/** — Personal intro page (Vue 3 + Vite), served at root
- **facet/** — 3D interactive image tiler (Three.js), served at /facet
- **wgapp/** — WhatsApp ↔ Email bridge (Baileys + Gmail API + SQLite)

## Server

DigitalOcean droplet (1GB RAM) at `167.71.143.97`.

### Swap

The server has 1GB swap configured to handle native addon compilation (e.g. `better-sqlite3` via `node-gyp`). Without it, `npm ci` gets OOM-killed.

```bash
# How it was set up (one-time)
fallocate -l 1G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Deployment

All projects use blue-green deploys: timestamped directories on the server, symlink swap. Pushes to `main` trigger GitHub Actions workflows per project.

```
/var/www/badyass.xyz/
├── home -> home-<ts>/          # static files (served at /)
├── facet -> facet-<ts>/        # static files (served at /facet)
├── wgapp -> wgapp-<ts>/        # Node.js app (managed by PM2)
└── wgapp-store/                # persistent state (SQLite, WA auth, .env)
```

