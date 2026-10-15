# AWS deployment guide

The repository includes a production container, versioned DB bootstrap migration, local Compose services, and health endpoint. These instructions describe the target deployment; they do not claim that resources are provisioned.

## Recommended topology

Use the same HTTPS origin for the SPA, `/api/*`, and `/socket.io/*` to preserve SameSite session-cookie semantics. Put an Application Load Balancer in front of EC2 or ECS. A CloudFront distribution may route immutable `/assets/*` and PWA files from the app or a static S3 origin, while routing `/api/*` and `/socket.io/*` to the ALB. Disable caching on APIs/socket traffic and forward required Origin, Authorization, and cookie headers. Enable WebSocket upgrade forwarding. If running multiple app instances with polling, configure stickiness and the Redis adapter.

## Configure infrastructure

1. Choose ap-south-1 (Mumbai) initially. Create private DB/Redis subnets and security groups allowing only the application security group. Never expose database or cache ports publicly.
2. Provision RDS PostgreSQL 16. Set `DATABASE_URL`, `DATABASE_SSL=true`, automated backups, and the appropriate AWS RDS certificate chain through `NODE_EXTRA_CA_CERTS`. TLS certificate verification remains enabled.
3. Run one migration job: `npm run db:migrate`, with the same DB secrets. Do not run development seed on RDS production.
4. Choose EC2 t3.small or ECS Fargate. Run the Docker image on port 4000 as its non-root user. Use an instance/task IAM role, Secrets Manager or SSM Parameter Store for secrets, and ALB health checks against `/api/health`. Ensure HTTP proxy behavior matches Express's one trusted proxy setting, or explicitly adapt it to your topology.
5. Create a private S3 bucket. Enable Block Public Access, encryption, lifecycle rules, and a least-privilege IAM policy for `s3:PutObject`/`s3:GetObject` on the chat prefix. Set CORS to your exact HTTPS origin, PUT method, and Content-Type header. Signed reads last five minutes; signed writes last two minutes.
6. Optional ElastiCache Redis: configure TLS and credentials with a `rediss://` URL. Set `REDIS_URL` for Socket.io fanout and OTP storage. API rate limiting is process-local; for multiple replicas add an external rate-limit store or edge/WAF limits. Presence spans all sockets via Redis.
7. Set a strong `JWT_SECRET`, `CLIENT_ORIGIN`, `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-4o-mini`, and optional SMS provider settings. Redis is required for OTP. Never put these values in VITE variables.
8. Configure Route 53 and ACM certificates. CloudFront certificates use the region CloudFront requires; ALB certificates use the ALB region. Redirect HTTP to HTTPS. Use SPA fallback only for frontend paths, never mask API errors.
9. Cache hashed static assets with long immutable lifetimes; keep `index.html`, `sw.js`, and the manifest fresh. The service worker precaches only the app shell and never caches API/chat responses. Offline users can open the shell; live search/chat still require connectivity.

## Before public launch

Run a dedicated PostgreSQL integration suite, a staging end-to-end pass with two real accounts, concurrent join attempts, replayed/expired invites, expired tokens, moderation failures, and private image authorization. Measure P50/P95 chat delivery with AI moderation enabled; a moderation call can exceed the requested sub-second delivery target. Adopt asynchronous moderation only after defining explicit product behavior for abusive messages.

Enable CloudWatch logs/alarms, application error reporting, CPU/memory/DB connection monitoring, and cost budgets. Test restoration from backups. AWS sizes and Free Tier eligibility are inputs from the brief, not a verified current pricing promise; confirm account eligibility and regional availability before provisioning.
