> **New contributor?** Read the [setup and review guide](docs/reader-guide.md) to distinguish the browser demo, full-stack setup, and production-readiness checks.

# SquadUp — Esports Team Finder

Mobile-first React 18 / Vite / Tailwind v4 PWA with Express, Sequelize PostgreSQL, authenticated Socket.io chat, Redis adapter, S3 uploads, and OpenAI services. Dark and light themes, player discovery, weighted matching, four-step registration, player profiles, squad creation, five-slot rosters, seven-day invites, squad analysis, and direct/squad chat are implemented.

**Full source release — October 15, 2026.** All implemented local application source is now included, replacing the earlier frontend-only publication stages. This is source publication to GitHub, not a hosted production deployment. Public-launch gaps are listed below. The default client can run as a labeled browser-only demo; configure PostgreSQL and `VITE_DEMO_MODE=false` for real local accounts and chat.

Screenshots and the guides for the earlier [Stage 1](docs/STAGE1.md) and [Stage 2](docs/STAGE2.md) releases are retained as history. The current app includes additional squad, messaging and backend features. See [release notes](docs/FULL-RELEASE.md) for scope, setup and verification.

## Current local setup — stages 1 through 9

The original development workspace uses a separate, password-protected PostgreSQL cluster on `127.0.0.1:55432`, initialized with the existing Windows PostgreSQL tools. The original PostgreSQL service and its data are unchanged. App data uses `squadup`; integration tests use `squadup_test`. Connection credentials and the JWT secret live in ignored `.env` and are not published. A new clone contains no pre-existing database or accounts; initialize your own environment using the full-stack instructions below.

After restarting the PC, start the local database and app with:

```powershell
node scripts/local-db.mjs
npm run db:migrate
npm run server
```

In a second terminal, run `npm run dev` and open **http://localhost:5173**. The database helper defaults to `D:/PostgreSQL/bin`; set `POSTGRES_BIN` if the installed binaries move. The existing `4173` preview is not the configured live client origin.

The live verification script creates three local QA accounts and stores generated test credentials in ignored `.local/test-accounts.json`. These credentials are not in the repository; no SMS is sent. You can also create your own account through registration.

Stages completed locally: real database migrations and constraints; registration/login/session verification; persisted direct/group messaging, typing, presence, read receipts, and reconnect tests; leader-approved join requests and invitation acceptance/rejection with a notification inbox; and full editing of profile, game, role, rank, schedule, device, social links, and self-reported stats.

Re-run live verification with `node scripts/verify-live.mjs` while the API is running. This creates labeled local test squads and retains them in the development database. Run `node --env-file=.env --test server/tests/database.integration.js` for the dedicated test database suite.

The next free local stages are also implemented: (6) private screenshot storage with image decoding and WebP re-encoding; (7) template bio generation and rule-based roster analysis; (8) the approved React Router upgrade to 7.18.4, with zero audit findings at its original verification; (9) local backup/restore verification and production PWA shell checks. No paid services or cloud resources were activated. These implementations are included in this full source release.

`FREE_MODE=true` disables OpenAI, Redis and SMS provider calls, and uses local screenshots even if optional provider credentials are present. Password login remains available. Template bios and roster rules are explicitly labeled; they do not use an AI model. Chat moderation uses a limited local blocklist.

Run `node scripts/verify-free.mjs` to check free-mode guards and authenticated screenshot delivery. Uploaded JPG/PNG/WebP files must be under 5 MB and 16 megapixels; images are decoded, stripped of metadata and re-encoded. Private files live under ignored `.local/uploads` (100 MB per player, 500 MB total). Viewing requires conversation access; attachment references alone do not provide access. Abandoned uploads count toward the quota; automated cleanup is not implemented.

Run `node scripts/backup-local.mjs` with app writes paused to back up PostgreSQL and local screenshots into ignored `.local/backups`. It verifies recovery in a new disposable database, compares six table counts, checks referenced attachment files and removes only that temporary database. It never restores over the live database. This copy is not protection against losing the whole PC; keep another private copy elsewhere. The helper is restricted to a local database named `squadup`.

## Local preview

```powershell
npm ci
npm run dev
```

Open http://localhost:5173. With no environment file, the client defaults to a **labeled local demo**. Sample players are fictional; messages, squad changes, and sample bio generation stay on this browser. Demo invitation links only work in the same browser. Demo credentials are locally hashed for convenience, not a production authentication mechanism. Never use real passwords in the demo. Demo mode never calls the backend.

## Run the full stack

1. Copy `.env.example` to `.env`. Set a unique `JWT_SECRET` (at least 32 characters), `DATABASE_URL`, and `VITE_DEMO_MODE=false`.
2. Start PostgreSQL 16 and optionally Redis. `compose.yaml` provides local services: set `POSTGRES_PASSWORD`, then run `docker compose up -d`. Match that password in `DATABASE_URL`. The Docker engine must be running.
3. Run `npm run db:migrate`. Migrations are versioned, transactional, and advisory-locked; startup never uses schema alteration. New schema changes should be added as explicit migrations.
4. Optional local seed: set `SEED_PASSWORD` (at least 12 characters), then run `npm run db:seed`. Seed never runs automatically and refuses production environments.
5. Run `npm run server` in one terminal and `npm run dev` in another. Restart Vite after changing client environment variables.
6. Keep `FREE_MODE=true` for the current local workflow. Optionally set it to `false` and configure `OPENAI_API_KEY` for GPT-4o-mini bios, roster advice, and `omni-moderation-latest`. Without an enabled client, bios use templates, squad analysis uses labeled deterministic rules, and chat uses its local blocklist.
7. Optional external integration, with free mode off: set `REDIS_URL`, `OTP_PROVIDER_URL`, and `OTP_PROVIDER_TOKEN` to enable phone OTP. The provider must accept a POST with `{phone, code}` and bearer authentication. Codes expire after five minutes, are HMAC-hashed, and are atomically limited to five attempts. Password login works independently.
8. Optional external integration, with free mode off: set `S3_BUCKET`, `AWS_REGION`, and an IAM role for screenshot uploads. The bucket stays private; signed reads require conversation access. Configure S3 CORS to allow your exact client origin and PUT with Content-Type. That separate S3 flow still requires external verification and server-side image inspection.

## Verification

```powershell
npm test
npm run build
npm audit
```

Tests cover matching weights, rank/age edge cases, roster warnings, phone validation, age/privilege validation, message destination invariants, deterministic DM rooms, and cookie parsing. PostgreSQL integration tests can be run with `TEST_DATABASE_URL=... node --test server/tests/database.integration.js` against a **dedicated empty test database**, after its migrations. The tests create and roll back their own data. UI QA is recorded in `VERIFICATION.md`.

## API overview

All API errors have `{success:false,error:"Message"}`. Protected endpoints require a bearer JWT or the HttpOnly session cookie. Public player responses exclude phone, email, and password hashes. JWTs live for twelve hours and use fixed issuer/audience and HS256. Cookies use SameSite Strict and Secure in production. Request origins are checked on writes. Socket sessions disconnect at JWT expiry.

- `POST /api/auth/register`, `/login`, `/otp/request`, `/otp/verify`, `/logout`; `GET /api/auth/me`
- `GET /api/players?q=&role=&rank=&time=&device=&game=&online=&page=`; `GET /api/players/:id`; `PATCH /api/players/me`
- `GET/POST /api/squads`; `GET /api/squads/:id`; `POST /api/squads/:id/join` submits a leader-reviewed request; `/invites`, `/analyze`
- `GET /api/notifications`; `PATCH /api/join-requests/:id` accepts or rejects a pending request; `POST /api/invites/:id/reject`
- `POST /api/invites/:code/accept`; `POST /api/ai/bio`
- `GET /api/conversations`; `GET /api/messages?receiverId=...` or `?squadId=...`, optional `before` cursor (50 messages per page)
- `GET /api/capabilities`; `POST /api/uploads/local` (multipart field `image`); `GET /api/uploads/content/:id` (message ID, authenticated)
- `POST /api/uploads/presign` (S3 mode); `GET /api/uploads/view?messageId=...`
- `GET /api/health`

Socket events: `join_room`, `leave_room`, `send_message`, `typing`, `update_status`, `read_messages`, with acknowledgement objects. Server events: `message`, `message_notification`, `typing`, `presence`, `read_receipt`, `inbox_updated`. Direct rooms sort UUIDs; squad rooms require active membership. Messages are persisted before emission. Validation and per-socket throttling apply. Redis supports multiple Socket.io instances; use sticky routing when retaining HTTP long polling.

Matching: 40% role, 30% schedule (Jaccard intersection/union), 20% rank, 10% age. Age deducts ten points per year beyond a four-year gap. Rank order is Bronze → Silver → Gold → Platinum → Diamond → Heroic → Master → Grandmaster. Stats are self-reported; verification is server-controlled.

## Production deployment

Build the container with `docker build -t squadup .`. It serves both the SPA and API on port 4000; use `CLIENT_ORIGIN=https://your-domain` with HTTPS termination. Client API defaults to `/api` in the container; Socket.io defaults to same origin. Inject environment secrets at runtime, never in the image or client bundle. Run migrations as a separate release step before starting the application. For local image storage, mount persistent storage at `/app/.local/uploads`, writable by the container's `node` user; images otherwise disappear when the container is replaced. `.dockerignore` excludes local databases, backups, env files and uploads from the build context. Container deployment itself has not been verified in this release.

See `deploy/AWS.md` for EC2/ECS, RDS, S3, Redis, CloudFront, DNS, and launch requirements. No cloud resources have been provisioned. Sub-second chat depends on network and moderation latency; it is **not benchmarked or guaranteed**. This is an implementation ready for review and deployment configuration, not a certification of production readiness.

## Remaining launch work

- Provision and verify public hosting, production credentials, monitoring, HTTPS and off-machine disaster recovery. Optional AWS, SMS, S3, OpenAI and Redis adapters still need external verification. Benchmark Socket.io across intended Indian regions and test moderation behavior in the supported languages.
- Extend image byte inspection to the optional S3 flow and add abandoned-upload cleanup. Local screenshots already verify actual bytes, decode dimensions and re-encode WebP.
- Add refresh-token revocation if immediate logout across devices is required; existing issued JWTs expire after twelve hours.
- Add account recovery, block/report tools, leader roster editing, and persistent per-recipient group read receipts if needed. Open-squad join requests now require leader approval; targeted invitations can be accepted or rejected from Notifications.
- Review legal/privacy requirements and third-party image licensing for a public launch. Replace sample avatar URLs with uploaded assets.
- React Router was upgraded to 7.18.4 with the user's approval. `npm audit` reported zero known vulnerabilities on October 13, 2026; keep reviewing dependency updates.

## Implementation references

The AI integration follows the official [GPT-4o-mini model documentation](https://developers.openai.com/api/docs/models/gpt-4o-mini) and [moderation API reference](https://developers.openai.com/api/reference/typescript/resources/moderations/methods/create). Styling uses the official [Tailwind v4 Vite integration](https://tailwindcss.com/docs/installation/using-vite).
