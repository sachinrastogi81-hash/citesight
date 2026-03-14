# Healthcheck Expectations

- Web returns `200` at `/`.
- API returns `200` or `503` at `/api/health` with JSON payload including `service: api`.
- Worker returns `200` at `/health` when dependencies are reachable.

If worker cannot connect to Redis/Postgres, `/health` returns `503` with `last_error`.
