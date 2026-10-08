"""The job queue: the API drops slow work onto a Redis list, a separate worker process picks it up.
(Named jobqueue because `queue` is already a Python standard-library module.)"""
from flask import current_app
from redis import Redis
from rq import Queue, Retry


def get_redis():
    return Redis.from_url(current_app.config['REDIS_URL'], socket_connect_timeout=2, socket_timeout=5)


def get_queue():
    return Queue(current_app.config['QUEUE_NAME'], connection=get_redis())


def enqueue(func, *args):
    """QUEUE_MODE=redis: put the job on the queue (a worker runs it, retrying up to 3 times).
    QUEUE_MODE=inline: run it right now inside the request (handy when no worker is running)."""
    if current_app.config['QUEUE_MODE'] == 'inline':
        return func(*args)
    return get_queue().enqueue(
        func, *args, retry=Retry(max=3, interval=[10, 60, 300]),
        job_timeout=300, result_ttl=3600, failure_ttl=7 * 24 * 3600)


def queue_info():
    """Shown by /health so you can see at a glance whether jobs are flowing."""
    info = {'mode': current_app.config['QUEUE_MODE']}
    if info['mode'] == 'redis':
        try:
            from rq import Worker
            queue = get_queue()
            info.update(pending=queue.count, failed=queue.failed_job_registry.count,
                        workers=len(Worker.all(queue=queue)))
        except Exception:
            info['error'] = 'Redis is not reachable'
    return info
