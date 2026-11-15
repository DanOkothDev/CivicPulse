#!/bin/sh
set -e

gunicorn --bind 0.0.0.0:8000 --workers 1 --timeout 300 wsgi:app &
API_PID=$!

rq worker default --worker-class rq.SimpleWorker --with-scheduler --url "$REDIS_URL" &
WORKER_PID=$!

cleanup() {
    kill "$API_PID" "$WORKER_PID" 2>/dev/null || true
    wait 2>/dev/null || true
}
trap cleanup TERM INT

while kill -0 "$API_PID" 2>/dev/null && kill -0 "$WORKER_PID" 2>/dev/null; do
    sleep 5
done

cleanup
exit 1
