# badyass

Home for my online content.

## Projects

- **home/** — Personal intro page (Vue 3 + Vite), served at root
- **facet/** — 3D interactive image tiler (Three.js), served at /facet
- **swedishfind/** — Swedish Fit class finder (Vue 3 + Leaflet, scheduled crawler), served at /projects/swedishfind
- **fivefind/** — Live LE FIVE pitch availability (Vue 3 + Leaflet, nginx API proxy), served at /projects/fivefind
- **footble/** — Football player guessing game (Vue 3 + Python data pipeline), served at footble.net

## Server

DigitalOcean droplet (1GB RAM + 1GB swap) at `167.71.143.97`, Ubuntu 26.04 LTS. It also hosts recipit.me and metro-boulot.photos from their own repos.

- Set up from a fresh image with [`config/server/setup-server.sh`](config/server/setup-server.sh); state (host keys, certificates, vhosts, recip.it data) comes back with [`config/server/restore-state.sh`](config/server/restore-state.sh).
- CI deploys as the unprivileged `deploy` user; root SSH login is disabled. Only ports 22, 80 and 443 are open.
- Security updates install automatically, with a reboot at 04:30 UTC when needed. PM2 restores the backends at boot.

### Deployment

All projects use blue-green deploys: timestamped directories on the server, symlink swap. Pushes to `main` trigger GitHub Actions workflows per project (they can also be run by hand).

```
/var/www/badyass.xyz/
├── home -> home-<ts>/          # static files (served at /)
├── facet -> facet-<ts>/        # static files (served at /projects/facet)
├── swedishfind -> swedishfind-<ts>/  # static files (served at /projects/swedishfind)
├── fivefind -> fivefind-<ts>/  # static files (served at /projects/fivefind)
└── footble -> footble-<ts>/    # static files (served at footble.net)
```
