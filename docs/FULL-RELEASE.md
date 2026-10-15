# Full source release — October 15, 2026

The implemented local project is now published together. Stages 1–2 remain in Git history; their guides/screenshots are archived. Source publication stages 3–6 are no longer withheld, but publication is not a certification of production readiness.

## Included

- React 18/Vite/Tailwind PWA, Router 7, Zustand, Axios and Socket.io client.
- Discovery, weighted matching/filtering, four-step registration, profile editing and themes.
- Five-slot squads, leader-reviewed join requests, invitations, notification inbox and roster analysis.
- PostgreSQL/Sequelize models, two versioned migrations, strict validation and capacity/destination database constraints.
- Password authentication, JWT/cookie sessions and authenticated HTTP/socket routes.
- Persisted DM/group chat, typing, presence, unread clearing and read receipts.
- Private local screenshot uploads, decoding/re-encoding and conversation-authorized image access.
- Free template bios, rule-based roster advice and a limited local moderation blocklist.
- Optional OpenAI, S3, Redis and SMS adapters; no paid service is required for free local mode.
- Core tests, dedicated database tests, live/free-mode verification scripts and local backup/restore helper.
- Dockerfile, local Compose dependencies, env template and AWS deployment instructions.

The original development `.env`, test credentials, PostgreSQL data, uploads, backups, dependencies and builds are excluded. Never commit these files. The checked-in env example contains placeholders only.

## Run a frontend demo

```sh
npm ci
npm run dev
```

Without environment configuration, the client uses labeled fictional/demo data. This demo does not provide production authentication or deliver real messages.

## Run real local accounts and chat

1. Copy `.env.example` to `.env` and keep `FREE_MODE=true`.
2. Set a unique random `JWT_SECRET` of at least 32 characters and a working PostgreSQL `DATABASE_URL` with your own password. Do not use the example password in a shared environment.
3. Set `VITE_DEMO_MODE=false`, `CLIENT_ORIGIN=http://localhost:5173`, `VITE_API_URL=http://localhost:4000/api` and `VITE_SOCKET_URL=http://localhost:4000`.
4. Run `npm run db:migrate`.
5. Start `npm run server` and, in another terminal, `npm run dev`.
6. Register through the app. Use a second browser/account to test actual socket communication.

The Windows-only convenience helper `node scripts/local-db.mjs` can initialize an isolated local cluster using existing binaries at `D:/PostgreSQL/bin` (`POSTGRES_BIN` overrides that path). On a fresh setup, let that helper generate its own `.env`; it deliberately refuses to overwrite a file targeting another database. On other machines use your own PostgreSQL or the Compose services and configure `.env` manually. Docker Compose requires `POSTGRES_PASSWORD`; the frontend/backend run separately unless you build/run the application container yourself.

For dedicated database tests, create a separate migrated test database and set `TEST_DATABASE_URL`. Never point database integration tests at production. Follow [README](../README.md) for scripts and limitations.

## Free mode

`FREE_MODE=true` prevents OpenAI, Redis initialization and SMS request calls, and selects local image storage. Password login, PostgreSQL and one-server Socket.io still work. Template bios and roster rules are not AI. The local blocklist is limited and is not comprehensive multilingual abuse moderation.

## Hosting

GitHub holds the source; it does not execute Express/PostgreSQL/Socket.io. GitHub Pages alone cannot host the full backend. For deployment, run the application server/container with PostgreSQL, persistent private media storage and HTTPS. Optional integrations require credentials and can incur provider charges. No paid resource was provisioned during publication.

## Remaining launch work

Immediate session revocation, recovery/account management, block/report workflows, leader roster editing, per-recipient group receipts, upload cleanup, full monitoring, off-machine backups, external integrations, real-device PWA installation and public-network/load validation remain work. Issued JWTs currently expire after twelve hours; client logout does not invalidate a copied token immediately. Local test success does not remove these limitations.

Do not use the old staged browser-only account ledger as a real account migration source. Full-stack registration/login uses PostgreSQL and server-side password hashing; demo accounts remain local browser fixtures.
