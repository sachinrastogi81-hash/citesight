# Railway Deployment Guide

## Project Topology
- citesight-web (Next.js)
- citesight-api (Express + Prisma)
- citesight-worker (Python)
- Postgres plugin
- Redis plugin

## Service Setup
1. Create one Railway project named `citesight-prod`.
2. Add Postgres + Redis plugins.
3. Create 3 services from this repo and set their root directories:
   - web: `apps/web`
   - api: `apps/api`
   - worker: `workers`
4. Use Dockerfile builds for each service.

## Healthchecks
- API: `/api/health`
- Worker: `/health`
- Web: `/`

## Required Environment Variables
### Shared
- `NODE_ENV=production`
- `LOG_LEVEL=info`
- `DATABASE_URL`
- `REDIS_URL`

### API
- `PORT=4000`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGIN`
- `OPENAI_API_KEY` (optional)
- `ANTHROPIC_API_KEY` (optional)

### Web
- `PORT=3000`
- `NEXT_PUBLIC_API_BASE_URL` (public API URL)

### Worker
- `PORT=8081`
- `WORKER_CONCURRENCY=2`
- `QUEUE_POLL_INTERVAL_MS=1500`

## Railway Release Command
Set API release command to:
`npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma`

## Staging/Production Branching
- `develop` -> staging environment
- `main` -> production environment
