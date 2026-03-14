| Variable | web | api | worker | Notes |
|---|---|---|---|---|
| NODE_ENV | Y | Y | Y | production |
| LOG_LEVEL | N | Y | N | api logging level |
| DATABASE_URL | N | Y | Y | shared postgres |
| REDIS_URL | N | Y | Y | shared redis |
| PORT | Y | Y | Y | railway runtime port |
| NEXT_PUBLIC_API_BASE_URL | Y | N | N | web->api |
| JWT_ACCESS_SECRET | N | Y | N | auth |
| JWT_REFRESH_SECRET | N | Y | N | auth |
| CORS_ORIGIN | N | Y | N | frontend URL |
| WORKER_CONCURRENCY | N | N | Y | worker threads |
| QUEUE_POLL_INTERVAL_MS | N | N | Y | polling interval |
