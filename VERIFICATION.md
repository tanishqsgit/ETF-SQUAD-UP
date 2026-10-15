# Verification record

## Full source publication — October 15, 2026

- Fresh `npm ci` in the publishing checkout completed. `npm audit` reported zero known vulnerabilities.
- Fourteen core tests, the backend/shared syntax check and production frontend/PWA build passed in the publishing checkout.
- Published migration code ran successfully against the isolated local development database; the dedicated database integration suite passed capacity, uniqueness, destination and authorization checks.
- Live verification using the publishing checkout's server/scripts passed registration, login, cookie restoration, profile editing, filtering, squad leader approvals, invitations, DM/group persistence, typing, presence, reconnect, moderation, expired-token and unauthorized-room checks. Sample local DM latency was 29 ms with only the local blocklist.
- Free-mode verification passed template bios, paid-service guards, valid and invalid upload handling, private WebP image delivery, unauthorized image rejection and upload ownership enforcement.
- Git and Docker exclusions were tightened to omit local env files, databases, backups, uploads, generated builds and dependencies. Only sanitized source, docs and historical screenshots are included.
- New commits use the verified public account ID for `tanishqsgit` and its documented ID-based GitHub no-reply format. Earlier commits/history are preserved.
- No cloud resources or live public hosting were provisioned. Container execution, external integrations, immediate token revocation, device installation and production readiness are not claimed. Historical Stage 1/2 screenshots remain labeled as historical.

## Completed

- Production client build, including PWA manifest, precached shell, self-hosted fonts, and 192/512 PNG icons.
- Eleven Node tests: compatibility weights and edge cases, roster analysis, phone normalization, underage and privilege-field rejection, message destination validation, DM room determinism, session cookie parsing, and asynchronous message serialization.
- Backend/shared JavaScript syntax check and API route module import.
- Local HTTP readiness (`http://localhost:5173` returns 200).
- Browser UI: role filtering yields only the sniper; selecting iOS keeps that player; Connect/Message opens the corresponding room; submitted demo message appears in history.
- Browser UI: squad creation leads to a five-slot roster with the creator as leader; deterministic analysis reports missing IGL/sniper; invitation generation shows a shareable local URL and expiry countdown.
- Responsive: 360px mobile, 1440px desktop, and 3840px desktop browser checks completed. Discovery and directory show no horizontal overflow at 360px; the app also renders without horizontal overflow at 3840px. Small phones use full-width player cards and larger stats/touch targets. Mobile profile renders its stats and setup cards correctly.
- Light theme toggles successfully in the mobile browser; dark theme is restored for handoff.
- The initial demo build was reviewed at `http://localhost:4173/`; its screenshot is saved at `artifacts/squadup-desktop.jpg`. The current live database-connected client is at `http://localhost:5173/`.

## Local stages 1–5 verification — October 13, 2026

- A separate PostgreSQL 18 cluster was initialized with SCRAM authentication and loopback-only listening on port 55432. Existing PostgreSQL service data was preserved.
- Development and dedicated test DB migrations passed. The database suite passed capacity-trigger, pairing uniqueness, destination-constraint, and unauthorized squad access checks.
- Live API/socket verification passed with three local QA users: registration, password login, cookie session restoration, full profile edits, privilege/underage rejection, filtering, leader approval/rejection, invitation inbox/rejection/acceptance/replay rejection, persisted DM/group messages, unread clearing and read receipts, typing, presence, reconnect, moderation blocking, expired JWT rejection, and unauthorized room rejection.
- Latest local DM acknowledgement/receipt sample was 14 ms using only the local blocklist. This is not an internet or AI-moderated latency benchmark.
- Browser verification passed real login and full profile editor saving; bio/device changes survived a reload through PostgreSQL. Live UI is at `http://localhost:5173`.
- Live Notifications panel renders authenticated squad activity. Final live profile screenshot is `artifacts/live-profile.jpg`.
- Eleven core Node tests and the production frontend build passed. GitHub's separate publishing checkout remains unchanged.
- PC idle display/sleep previously used three-minute timeouts. Applied and read back: plugged-in display/sleep Never; battery display 15 minutes/sleep 30 minutes; screensaver disabled. This addresses idle blanking, not an unverified graphics/hardware fault.

## Not verified against external services

- The original system PostgreSQL administrator credentials remain unchanged. Verification uses the separate local development cluster; AWS/RDS deployment is not verified.
- OpenAI, S3, Redis, SMS, and AWS deployment require credentials/infrastructure. Their adapters are implemented, but no successful external integration is claimed. Live multi-user sockets were verified locally.
- Chat latency has not been benchmarked. AI moderation can exceed sub-second delivery.
- React Router was upgraded to 7.18.4 with user approval. Both full and production-only audits reported zero known vulnerabilities on October 13, 2026. Sequelize's transitive UUID dependency uses compatible UUID 11.

## Free local stages 6–9 — October 13, 2026

- Fourteen Node tests passed, including private-reference traversal rejection, actual image type checks, corrupt/mislabeled/oversized image rejection and template bio length/content.
- Production PWA build, backend/shared syntax checks, dedicated PostgreSQL integration suite and existing three-user API/socket verification all passed after the Router upgrade. Latest sampled local DM latency was 6 ms (local blocklist only).
- `scripts/verify-free.mjs` passed against the live API: free capabilities, template bios, disabled SMS/S3-presign paths, valid uploads, invalid/spoofed/corrupt/oversized upload rejection, WebP conversion, socket image delivery, authorized sender/recipient reads, outsider/no-session rejection and another user's upload reuse rejection.
- Browser verified the template generation label, generated bio saving/reloading through PostgreSQL, navigation to chat and an authenticated local image rendering with natural width 64. No horizontal overflow was seen in that narrow mobile chat view.
- The production preview was loaded on temporary port 4180, reloaded to activate the PWA, stopped, and confirmed unreachable using a direct HTTP request. A browser reload still rendered the precached app shell. API requests and live chat are not supported offline. The preview's cross-origin API configuration was deliberately not used as a full-stack production test. The temporary preview tab was closed afterward.
- `scripts/backup-local.mjs` created a PostgreSQL/media backup and successfully restored to a generated disposable database, compared row counts for six tables and verified the saved local screenshot reference. The verification database was removed; original development data was preserved. Backup/media consistency requires writes to be paused; no scheduled or off-machine backups were set up.
- Free mode is enabled locally. No cloud resources were created, no paid credentials were activated and no GitHub push was performed.

See README.md and deploy/AWS.md for configuration, launch gaps, and integration steps.
