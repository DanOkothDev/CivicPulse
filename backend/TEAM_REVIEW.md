# Backend review handoff

Scope: API routes, persistence, worker configuration, and backend contract as inspected on 2026-10-17. Findings below are code-level issues and integration gaps, not a claim that every deployment configuration was exercised.

## Findings

### P1 — AI processing is not enabled by the documented default setup

- Evidence: [docker-compose.yml](./docker-compose.yml) leaves `AI_CLASSIFIER` empty. [`.env.example`](./.env.example) also sets `AI_DUPLICATES` to an empty value; Compose's `${VAR-default}` fallback does not apply to a variable that is set but empty. The worker therefore skips classification and can skip duplicate detection in a setup copied from the example.
- Impact: report submissions succeed, but no AI category or duplicate suggestions are produced.
- Action: provide explicit defaults for the duplicate hook, document/enable the classifier only after model artifacts exist, and verify the effective worker environment in the setup instructions.

### P1 — A Redis enqueue failure permanently drops AI processing for that report

- Evidence: [app/api/reports.py](./app/api/reports.py), `create_report`, catches enqueue errors, logs them, and still returns success. It does not record a pending job or schedule another attempt. The retry policy in [app/jobqueue.py](./app/jobqueue.py) only applies after Redis accepts the job.
- Impact: reports saved during a Redis outage never receive classifier or duplicate processing unless an operator manually queues them later.
- Action: persist a recoverable processing state/outbox or provide a reliable retry/requeue path; distinguish “report saved” from “AI processing queued” in monitoring.

### P1 — Area boundaries cannot be configured, so automatic ward assignment cannot work for newly created areas

- Evidence: [app/api/reference.py](./app/api/reference.py), `create_area`, accepts only a name and creates `Area(name=name)` with a null boundary. [app/api/reports.py](./app/api/reports.py), `create_report`, assigns an area only when `ST_Covers(Area.boundary, point)` succeeds. There is no endpoint to create or update a boundary.
- Impact: newly added wards will not be inferred from report coordinates; ward analytics rely on manual report assignment.
- Action: add validated polygon input/update support and document the coordinate format, or explicitly define manual assignment as the supported workflow.

### P1 — The API contract omits an endpoint already used by the frontend

- Evidence: [app/api/workflow.py](./app/api/workflow.py) implements `PATCH /reports/{id}/area`, and the frontend calls it through its report service. The endpoint is absent from [openapi.yaml](./openapi.yaml).
- Impact: generated clients and API-contract review will not discover a live admin feature.
- Action: add the request/response, authorization, and error schemas to OpenAPI; keep the contract synchronized with route changes.

### P2 — Report address and landmark fields have no persistence/API support

- Evidence: the report model and serializer in [app/models.py](./app/models.py) and [app/api/reports.py](./app/api/reports.py) contain no address or landmark fields. The frontend collects them but the API cannot store or return them.
- Impact: user-entered location context is lost, and report search cannot match street/landmark text.
- Action: decide whether these fields are in scope; if so, persist and validate them, expose them in the API and OpenAPI, and include them in search.

### P2 — Area-filtered analytics mix ward-specific and citywide hotspot data

- Evidence: [app/api/analytics.py](./app/api/analytics.py), `summary`, filters report totals by `area_id` but always returns global `Hotspot.query.count()`. [app/api/hotspots.py](./app/api/hotspots.py) has no area filter.
- Impact: a ward-filtered dashboard can display a ward-specific incident total beside citywide hotspot results.
- Action: compute/store hotspot area association and apply the selected area consistently, or label hotspot metrics and map explicitly as citywide.

### P2 — Hotspot recomputation scales quadratically and runs synchronously

- Evidence: [app/hotspot_service.py](./app/hotspot_service.py), `_dbscan`, computes neighbors by scanning every point for each point; `recompute_hotspots` loads all canonical reports and the admin endpoint runs it inline.
- Impact: processing time and memory grow rapidly with the report history and can make admin requests time out.
- Action: move recomputation to a background job and use a spatial index/DBSCAN implementation with indexed neighborhood queries; benchmark against expected data volumes.

### P2 — Registration does not enforce database string limits

- Evidence: [app/api/auth.py](./app/api/auth.py), `register`, validates that name/email are present and email-shaped but does not enforce the model limits (`name` 120, `email` 255).
- Impact: oversized values can reach PostgreSQL and become a generic 500 instead of a validation response.
- Action: validate field lengths before insert and return field-specific 422 details.

## Validation

- The ML duplicate-detector tests passed: 11 tests.
- The backend API suite could not be validated: its database connection to local PostgreSQL was refused before the test setup could run. Start the documented PostGIS service and rerun `pytest`.
