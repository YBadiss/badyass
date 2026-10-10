# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Monorepo for badyass.xyz and related side projects. Each top-level folder is an independent project with its own `package.json`, deploy script, and GitHub Actions workflow. There is no root-level build.

| Folder | What | Stack | Served at |
|---|---|---|---|
| `home/` | Personal site: projects, write-ups, poems | Vue 3 + vite-ssg | `badyass.xyz/` |
| `facet/` | 3D interactive image tiler | Three.js + GSAP + Webpack | `badyass.xyz/projects/facet` |
| `swedishfind/` | Swedish Fit class finder (map + filters), fed by a scheduled crawler | Vue 3 + TS + Leaflet, cheerio crawler | `badyass.xyz/projects/swedishfind` |
| `fivefind/` | Live search for free LE FIVE 5-a-side pitches (map + list), fetched on demand | Vue 3 + TS + Leaflet, nginx API proxy | `badyass.xyz/projects/fivefind` |
| `footble/` | Football player guessing game | Vue 3 + TS + PrimeVue, Python data pipeline | `footble.net` (`badyass.xyz/footble` redirects) |
| `wgapp/` | WhatsApp ↔ Email bridge (long-running service) | Node + TS, Baileys, Gmail API, SQLite, PM2 | no HTTP endpoint |
| `config/` | nginx vhost for badyass.xyz + its deploy script | nginx | — |

## Commands

Run commands from inside the project folder. All Node projects use Node 20 and `npm ci`.

- **home**, **swedishfind**, **fivefind**, **footble**: `npm run dev`, `npm run build`, `npm run lint`, `npm run format`, `npm run deploy`
- **swedishfind** crawlers: `npm run crawlLocations`, `npm run crawlClasses` (they write to `public/*.json`)
- **facet**: `npm start` (dev server on :8080), `npm run build`, `npm run deploy`
- **wgapp**: `npm run dev` (tsx watch), `npm run build` (type-check only), `npm test` (vitest), `npm run deploy`
- **footble/scripting**: Python pipeline managed with `uv`; scripts `00_…` → `06_…` run in order and produce `footble/public/*.json`. See `footble/scripting/README.md`.

In CI, `npm run deploy` is the only deploy path. Avoid running it locally unless asked, because it pushes straight to production.

## Projects

### home
- `public/content.json` holds the personal info, social links and `publicationSections`. The **Projects** section is edited by hand there; add an entry when a new project ships. (`public/projects/<slug>/meta.json` files exist alongside it.)
- The **Write Ups** and **Poems** sections are regenerated automatically by a Vite plugin in `vite.config.js`. The plugin reads `src/content/{write-ups,poems}/<slug>/meta.json` and copies their non-md/json assets to `public/content/`. To add one, create a folder with `meta.json` + `article.md` (+ `images/`). Don't edit those sections in `content.json` by hand.
- `src/router.js` generates `/write-ups/<slug>` and `/poems/<slug>` routes from the same `meta.json` globs. `ArticleView.vue` renders the markdown.
- Built with `vite-ssg`, so the output is static, pre-rendered HTML.

### facet
- `src/app.js` is the entry point. It loads `assets/config.json`, sets up the Renderer and ZoomController, and handles click detection (a 5px threshold separates clicks from drags).
- `src/renderer.js` sets up the Three.js scene and blocks (`GLOBAL_HEIGHT_MULTIPLIER` = 0.75). The other modules are `tileSplitter.js`, `hoverAnimation.js` and `zoomController.js`.
- `assets/config.json` sets `gridSize` (e.g. `"4x4"`) and `blocks[]`, each with `id`, `height`, `color`, `title`, and `sides` `[front, back, top, side]`.

### swedishfind (reference pattern for crawled-data projects)
- `crawler/*.ts` scrape swedishfit.fr with cheerio and write `public/locations.json` and `public/classes.json`. Those JSON files are committed to git.
- The `crawl-swedishfind.yml` cron (`25,55 * * * *`, `TZ=Europe/Paris`) runs the crawlers and commits as `github-actions[bot]` with the `SWEDISHFIND_PUSH_TOKEN` secret. That push triggers `deploy-swedishfind.yml`. This explains the many `chore: update swedishfind generated files` commits.
- The frontend loads the JSON at runtime. Its components are `FilterSection`, `MapView` (Leaflet), `ClassList` and `ClassCard`.
- `vite.config.ts` sets `base: "/projects/swedishfind/"`.

### fivefind (reference pattern for live third-party data)
- No crawler and no stored data: the browser calls LE FIVE's unofficial public API on each search. `src/lefive.ts` has the API client, types, a 2-minute in-memory cache, a concurrency pool, and timezone helpers. Centres are in `Europe/Paris`, except La Réunion (`Indian/Reunion`).
- The API only sends CORS headers for `https://www.lefive.fr`, so the app calls same-origin paths, `/projects/fivefind/api/centers` and `/projects/fivefind/api/slots`. A proxy forwards them with `Origin: https://www.lefive.fr`: in dev it's `server.proxy` in `vite.config.ts`, in prod it's the matching `location =` blocks in `config/nginx-config`, which are rate-limited and GET/POST-only. The two must stay in sync.
- One `allFields` request runs per (centre, day), capped at 60 per search (`MAX_REQUESTS` in `App.vue`). Capacity is fixed at 10, because the API returns an error object for any other value. Durations 60/90/120 are always fetched and then filtered on the client.
- `src/slots.ts` groups the flat slots by centre, then start time, then duration, then pitch. `SearchSection` (centres/days/times) triggers a fetch; `FilterSection` (duration, pitch type, max price per player, filmed) filters instantly. `MapView` and `SlotList` render the result.
- Booking links (`bookingUrl` in `src/lefive.ts`) open `lefive.fr/reservations/slots?center=<id>&date=DD-MM-YYYY`. lefive.fr reliably applies `center` only. `date` is read by one of its widgets but was not honoured in practice, so the UI must not promise the right day without the extension. Both params survive the login redirect. A `#fivefind?center=…&start=<UTC ISO>` hash is added for the extension.
- `extension/` is a Manifest V3 Chrome extension, with no build step and loaded unpacked:
  - `fivefind.js` marks FiveFind pages with `data-fivefind-extension="<version>"` on `<html>`; the app reads this in `src/extension.ts`.
  - `lefive.js` runs in lefive.fr's main world. It saves the hash target in sessionStorage so it survives login, then on the slots page narrows the list to that start time via `$nuxt.$store.dispatch('sessionStorage/setTimeRange')` and the page's own `getSlotsMobile()`. It depends on lefive.fr internals, so expect breakage when they redeploy.
  - `npm run bundle:extension` (run automatically before `dev` and `build`) zips it to `public/fivefind-extension.zip`, which is gitignored. `ExtensionBanner.vue` offers the download when the extension is missing or older than `extension/manifest.json`. **Bump the manifest `version` whenever the extension changes.**
- The API is documented in `docs/lefive-api.md`, with a reference Python CLI (`docs/lefive_slots.py`) and an example response (`docs/examples/`). Remember: `startingDate` is local time mislabelled `+00:00`, so always use `startingDateZuluTime`.

### footble
- The game reads static JSON (`public/clubs.json`, `players.json`, `top_players.json`) produced by the Python pipeline in `scripting/`.
- It has its own nginx vhost in `footble/config/nginx-config`, deployed by `deploy-footble-config.yml`.

### wgapp (reference pattern for long-running services)
- Uses a ports/adapters layout: `src/ports.ts` holds the interfaces, `src/adapters/` holds `baileys.ts` and `gmail-api.ts`, and `src/bridge.ts` holds the logic. Config is validated with zod (`src/config.ts`), and the SQLite DB code is in `src/db.ts`.
- Tests in `test/` replay recorded fixtures (`test/fixtures/`, `test/helpers/replay-*.ts`).
- Runs under PM2 via `ecosystem.config.cjs`. Persistent state (SQLite, WA auth, `.env`) lives in `/var/www/badyass.xyz/wgapp-store/` and is kept outside the deploy directory.
- `patches/` holds a patch-package patch for Baileys, applied on `postinstall`.
- See `wgapp/README.md` and `wgapp/PLAN.md`.

## Deployment

- **Server:** a DigitalOcean droplet (1GB RAM + 1GB swap) at `167.71.143.97`, accessed as `root`. Memory is tight, so keep long-running processes small.
- **CI:** each project has `.github/workflows/deploy-<project>.yml`, triggered on push to `main` with paths filtered to `<project>/**`. It loads the `SSH_DEPLOY_KEY` secret through `webfactory/ssh-agent`, then runs `npm ci && npm run build && npm run deploy`.
- **Blue-green deploy:** `deploy.sh` copies the build to `/var/www/badyass.xyz/<project>-<timestamp>/` and swaps the `<project>` symlink to point at it. `cleanup_deploys.sh` then keeps only the last 2 timestamped directories. Static projects use scp. wgapp uses rsync, then `npm ci --omit=dev` on the server and `pm2 startOrRestart`.
- **nginx:** `config/nginx-config` is the badyass.xyz vhost. Each static sub-app gets a block like this:
  ```nginx
  location ^~ /projects/<name> {
      alias /var/www/badyass.xyz/<name>;
      try_files $uri $uri/ /projects/<name>/index.html;
  }
  ```
  and its Vite `base` must be `/projects/<name>/`. Pushing to `config/**` runs `config/deploy.sh`, which uploads the file, runs `nginx -t` (rolling back if it fails) and reloads nginx.

```
/var/www/badyass.xyz/
├── home -> home-<ts>/                 # /
├── facet -> facet-<ts>/               # /projects/facet
├── swedishfind -> swedishfind-<ts>/   # /projects/swedishfind
├── fivefind -> fivefind-<ts>/         # /projects/fivefind
├── footble -> footble-<ts>/           # footble.net
├── wgapp -> wgapp-<ts>/               # PM2 process
└── wgapp-store/                       # wgapp persistent state
```

## Adding a new project

1. Create `<name>/` by copying the closest existing project. Copy `swedishfind/` for a static site with crawled data, `fivefind/` for a static site that queries a third-party API live, or `wgapp/` for a long-running service.
2. Add `deploy.sh` and `cleanup_deploys.sh`, replacing the project name inside them.
3. Add `.github/workflows/deploy-<name>.yml`, plus a crawl workflow if the project needs scheduled data.
4. Add a `location ^~ /projects/<name>` block to `config/nginx-config`, and set Vite `base` to match.
5. Add a project entry in `home/public/content.json`, and optionally `home/public/projects/<name>/meta.json`.
6. Update the table at the top of this file and the root `README.md`.

## Conventions

- Commit messages use Conventional Commits (`feat:`, `fix:`, `chore:`), optionally scoped, e.g. `feat(wgapp): …`.
- Newer projects use TypeScript, ESLint 9 flat config, and Prettier (`.prettierrc` per project).
