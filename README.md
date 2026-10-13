# SquadUp — Esports Team Finder

A mobile-first PWA for connecting competitive mobile gamers in India, starting with Free Fire and designed to expand to BGMI and CODM.

## Current source release: stage 1

This repository is being published in reviewable stages from an implementation developed locally. This first stage contains a working project foundation:

- React 18 with Vite
- Tailwind CSS v4 and the cyan/navy design tokens
- Persistent dark/light themes using an isolated Zustand store
- A responsive starter screen
- PWA manifest, app-shell service worker, and install icons
- Self-hosted fonts and a reproducible npm lockfile

Player discovery, registration, squad management, and chat are not included in this source release yet. The feature cards describe the intended product direction.

## Run locally

Requires Node.js 22 or later.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite.

## Production build

```sh
npm run build
npm run preview
```

The build generates `dist/`, the PWA manifest, and a service worker. Service-worker behavior is available in the production preview or HTTPS deployment; development mode does not enable offline caching.

The base path defaults to `/`. For a future GitHub Pages project deployment, set `VITE_BASE_PATH=/ETF-SQUAD-UP/` before building. This commit prepares the source; it does not enable a hosted Pages deployment.

## Source release plan

1. Project foundation — current stage
2. Discovery, filters, profiles, and registration frontend
3. Squad roster, invitations, and analysis interface
4. PostgreSQL models, authentication, and API routes
5. Socket.io messaging, presence, and media integration
6. Tests, hardening, and deployment documentation

Each stage will have clear commit descriptions and actual commit dates. Backend services and external integrations require their own environment configuration when published.

## Validation

The foundation is checked with `npm ci` and `npm run build`. No live backend, database, SMS, or AI integration is claimed in this stage.
