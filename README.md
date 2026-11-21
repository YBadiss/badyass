# badyass

Home for my online content.

## Projects

- **home/** — Personal intro page (Vue 3 + Vite), served at root
- **facet/** — 3D interactive image tiler (Three.js), served at /facet
- **swedishfind/** — Swedish Fit class finder (Vue 3 + Leaflet, scheduled crawler), served at /projects/swedishfind
- **fivefind/** — Live LE FIVE pitch availability (Vue 3 + Leaflet, nginx API proxy), served at /projects/fivefind
- **footble/** — Football player guessing game (Vue 3 + Python data pipeline), served at footble.net

## Server

DigitalOcean droplet (1GB RAM) at `167.71.143.97`.

### Swap

The server has 1GB swap configured so `npm ci` / builds on the box don't get OOM-killed.

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
├── facet -> facet-<ts>/        # static files (served at /projects/facet)
├── swedishfind -> swedishfind-<ts>/  # static files (served at /projects/swedishfind)
├── fivefind -> fivefind-<ts>/  # static files (served at /projects/fivefind)
└── footble -> footble-<ts>/    # static files (served at footble.net)
```

