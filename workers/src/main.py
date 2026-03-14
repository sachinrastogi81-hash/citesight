import json
import os
import socket
import threading
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

import psycopg2
import redis

REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
DATABASE_URL = os.getenv('DATABASE_URL', '')
WORKER_CONCURRENCY = int(os.getenv('WORKER_CONCURRENCY', '2'))
QUEUE_POLL_INTERVAL_MS = int(os.getenv('QUEUE_POLL_INTERVAL_MS', '1500'))
PORT = int(os.getenv('PORT', '8081'))

health_state = {'status': 'starting', 'last_error': None}


def wait_for_dependencies(max_attempts: int = 20) -> tuple[redis.Redis, psycopg2.extensions.connection]:
    attempt = 0
    while attempt < max_attempts:
        attempt += 1
        try:
            r = redis.from_url(REDIS_URL)
            r.ping()
            conn = psycopg2.connect(DATABASE_URL)
            with conn.cursor() as cur:
                cur.execute('SELECT 1')
                cur.fetchone()
            return r, conn
        except Exception as exc:
            backoff = min(30, 0.5 * (2 ** attempt))
            health_state['last_error'] = str(exc)
            time.sleep(backoff)
    raise RuntimeError('Worker dependency bootstrap failed')


class HealthHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != '/health':
            self.send_response(404)
            self.end_headers()
            return
        payload = json.dumps(health_state).encode('utf-8')
        status = 200 if health_state['status'] == 'ok' else 503
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def start_health_server():
    server = HTTPServer(('0.0.0.0', PORT), HealthHandler)
    server.serve_forever()


def process_queue(r: redis.Redis):
    queue_name = 'citesight-worker-queue'
    while True:
        item = r.lpop(queue_name)
        if item:
            print(f'processed job: {item.decode("utf-8")}')
        time.sleep(QUEUE_POLL_INTERVAL_MS / 1000)


def main():
    threading.Thread(target=start_health_server, daemon=True).start()
    try:
        r, _conn = wait_for_dependencies()
        health_state['status'] = 'ok'
        for _ in range(WORKER_CONCURRENCY):
            threading.Thread(target=process_queue, args=(r,), daemon=True).start()
        while True:
            time.sleep(5)
    except Exception as exc:
        health_state['status'] = 'degraded'
        health_state['last_error'] = str(exc)
        print(f'worker failed: {exc}')
        raise


if __name__ == '__main__':
    main()
