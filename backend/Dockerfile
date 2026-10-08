# Runs the background worker on Linux (the queue library cannot run its worker on Windows).
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONPATH=/app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["rq", "worker", "default", "--url", "redis://redis:6379/0"]
