# CiteSight Plan: Railway-First, Easy Deployment

## Summary
Build CiteSight as a standalone monorepo at:

`/Users/sachin.rastogi/My Drive/Codebase/CiteSight`

Deploy to Railway with **3 services** and **Dockerfiles**:
1. `web` (Next.js)
2. `api` (Express + Prisma)
3. `worker` (Python background jobs)

Use Railway-managed `Postgres` and `Redis` plugins for minimal ops.

## Railway Deployment Architecture
1. One Railway project: `citesight-prod`.
2. Services:
1. `citesight-web`
2. `citesight-api`
3. `citesight-worker`
4. Plugins:
1. `Postgres`
2. `Redis`
5. Networking:
1. `web` calls internal `api` via Railway private URL.
2. `api` and `worker` share `DATABASE_URL` and `REDIS_URL`.

## Repo Layout (Railway-Friendly)
1. `apps/web` with dedicated `Dockerfile`.
2. `apps/api` with dedicated `Dockerfile`.
3. `workers` with dedicated `Dockerfile`.
4. `infra/railway` containing:
1. `README.md` deploy guide
2. env var matrix
3. healthcheck expectations
4. optional `railway.json` templates per service.

## 12 Modules (unchanged functional scope)
1. Auth & Multi-Workspace Core
2. Workspace Onboarding
3. Query Generation & Prompt Library
4. AI Query Tracking Engine
5. Citation Extraction & Normalization
6. Visibility Scoring & Share-of-Voice
7. Opportunity Finder
8. AEO Content Generator
9. Content Grid (Ops UI)
10. Workflow Engine
11. Integrations
12. Analytics & Knowledge Base

## Railway-Specific Implementation Requirements

### Service Contracts
1. `web`:
1. `PORT` from Railway.
2. `NEXT_PUBLIC_API_BASE_URL` points to `api` public URL.
2. `api`:
1. expose `/api/health`.
2. run `prisma migrate deploy` during startup/release command.
3. `worker`:
1. consume queue continuously.
2. expose lightweight `/health` HTTP endpoint for Railway checks.

### Docker Standardization
1. Multi-stage Dockerfiles for smaller images.
2. Pin Node and Python major versions.
3. Use non-root user in runtime stages.
4. Add `.dockerignore` per service.

### Env Var Model
1. Shared:
1. `NODE_ENV=production`
2. `LOG_LEVEL`
3. `DATABASE_URL`
4. `REDIS_URL`
2. API:
1. `JWT_ACCESS_SECRET`
2. `JWT_REFRESH_SECRET`
3. `CORS_ORIGIN` (web URL)
4. provider keys (OpenAI/Anthropic/etc.)
3. Web:
1. `NEXT_PUBLIC_API_BASE_URL`
4. Worker:
1. `WORKER_CONCURRENCY`
2. `QUEUE_POLL_INTERVAL_MS`

### Migrations & Release Safety
1. Release command for API: `prisma migrate deploy`.
2. Startup blocks until DB connectivity passes.
3. Worker startup retries with exponential backoff for Redis/DB readiness.

### Queue & Reliability
1. Redis-backed job queue with retry + dead-letter tables.
2. Idempotency keys on scan/collect jobs.
3. Job status table visible in admin UI (module 9/10 ops).

## CI/CD Plan (Railway-Compatible)
1. GitHub-connected deployments per service.
2. Branch envs:
1. `main -> production`
2. `develop -> staging`
3. CI checks before deploy:
1. typecheck
2. unit/integration/component tests
3. docker build smoke for all three services.

## Implementation Phases (Railway-Aware)
1. Phase 1:
1. scaffold monorepo + Dockerfiles + Railway env matrix.
2. implement Modules 1-4.
2. Phase 2:
1. implement Modules 5-7.
2. queue/worker hardening.
3. Phase 3:
1. implement Modules 8-10.
2. add operational dashboards.
4. Phase 4:
1. implement Modules 11-12.
2. finalize integrations and analytics.
5. Phase 5:
1. production hardening and rollout playbooks.

## Public Interfaces / Additions
1. Health endpoints:
1. `GET /api/health` (api)
2. `GET /health` (worker)
2. Admin ops endpoints:
1. `GET /api/admin/jobs`
2. `POST /api/admin/jobs/:id/retry`
3. Shared domain types:
1. `JobStatus`, `RetryPolicy`, `DeploymentEnv`.

## Test & Acceptance Criteria
1. Unit:
1. scoring, extraction, workflow logic.
2. Integration:
1. all module endpoints with auth/error variants.
2. DB + queue interactions (mocked external providers).
3. Component:
1. tracking matrix, opportunity board, content grid.
4. E2E:
1. onboarding -> query -> run -> citations -> opportunity -> draft.
5. Railway readiness checks:
1. all services boot from clean environment.
2. migrations run without manual intervention.
3. healthchecks remain green after deploy.
4. smoke test verifies web->api connectivity.

## Defaults Chosen
1. Railway topology: 3 services (`web`, `api`, `worker`).
2. Build system: Dockerfiles.
3. Managed data stores: Railway Postgres + Redis.
4. Daily query scans initially.
5. Provider-agnostic adapter architecture.
