# CiteSight

Railway-first AEO platform monorepo.

## Services
- apps/web: Next.js frontend
- apps/api: Express + Prisma API
- workers: Python queue worker + health service

## Quick Start
1. Copy env files from examples.
2. Run `npm install`.
3. Run `npm run dev`.

## Local Without Docker

Prereqs:
- Node.js 20+
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

From the repo root:

```bash
npm install
npm run local:setup
npm run dev:local
```

If ports `3000` or `4000` are already in use:

```bash
npm run dev:local:alt
```

This starts:
- Web: http://localhost:3002
- API: http://localhost:4002

Open:
- Web: http://localhost:3000
- API health: http://localhost:4000/api/health

Notes:
- `local:setup` copies `apps/api/.env.example` and `apps/web/.env.example` to `.env` files if missing.
- Update `apps/api/.env` with your own secrets and optional Azure OpenAI values.

## Railway
See `infra/railway/README.md`.

## Local with Docker Compose

From the repo root:

```bash
docker compose up --build
```

Open:
- Web: http://localhost:3001
- API health: http://localhost:4001/api/health
- Worker health: http://localhost:8081/health

Stop:

```bash
docker compose down
```

To wipe DB volume:

```bash
docker compose down -v
```
