# Runs the background worker on Linux (the queue library cannot run its worker on Windows).
FROM python:3.12-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONPATH=/app
COPY requirements.txt requirements-ml.txt ./
RUN pip install --no-cache-dir -r requirements.txt
# The AI libraries are large (a few GB), so they are optional: build with INSTALL_ML=1 to include them.
ARG INSTALL_ML=0
RUN if [ "$INSTALL_ML" = "1" ]; then pip install --no-cache-dir -r requirements-ml.txt; fi
COPY . .
# SimpleWorker runs jobs inside one process, so the AI model is loaded once and reused for every job.
CMD ["rq", "worker", "default", "--worker-class", "rq.SimpleWorker", "--url", "redis://redis:6379/0"]