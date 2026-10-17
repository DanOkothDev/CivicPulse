# Backend review handoff

Scope: API routes, persistence, worker configuration, and backend contract as inspected on 2026-10-17. Findings below are code-level issues and integration gaps, not a claim that every deployment configuration was exercised.

## Findings

### Addressed — duplicate suggestions now have a Compose default; classifier stays opt-in

- Change: [docker-compose.yml](./docker-compose.yml) uses an empty-aware default for `AI_DUPLICATES`, and [`.env.example`](./.env.example) enables the repository duplicate detector. `AI_CLASSIFIER` remains opt-in because the trained model artifacts are not shipped.
- Follow-up: configure the classifier only after the ML model is available.

### Addressed — Redis enqueue failure attempts inline work and leaves a manual retry path

- Change: [app/api/reports.py](./app/api/reports.py) now attempts report processing inline if enqueueing fails; if that also fails, it logs the report id and `process-reports <id>` recovery command.
- Limitation: inline fallback can increase request latency during Redis outages; durable outbox processing remains a future improvement.

### Addressed — area polygons can be created, updated, and read through the API

- Change: [app/api/reference.py](./app/api/reference.py) accepts validated GeoJSON Polygon boundaries on area creation and `PATCH /areas/{id}`; `GET /areas` returns boundaries. Report submission can now map reports into configured areas.

### Addressed — report-area endpoint and new area/report API fields are in OpenAPI

- Change: [openapi.yaml](./openapi.yaml) now describes the existing admin `PATCH /reports/{id}/area` route, area-boundary operations, and report location context fields.

### Addressed — report address and landmark are persisted, returned, and searchable

- Change: nullable columns, API validation/serialization, address/landmark search, and the additive migration [`docs/migrations/20261017_report_context.sql`](./docs/migrations/20261017_report_context.sql) are in place. `flask init-db` also adds the columns to local existing schemas.

### Addressed — analytics can scope hotspot counts and results by area

- Change: summary counts and `GET /analytics/hotspots?area_id=...` now select hotspots whose centers lie inside the configured area boundary.
- Note: callers must pass `area_id` to the hotspot list endpoint when they need a scoped result.

### Partially addressed — hotspot neighborhood lookup uses a spatial hash

- Change: [app/hotspot_service.py](./app/hotspot_service.py) uses 3D spherical spatial buckets to restrict exact-distance checks to nearby cells, preserving DBSCAN distance semantics without an added dependency.
- Limitation: recomputation is still synchronous to preserve the existing admin endpoint's immediate result contract. Consider background execution if measured workloads approach request timeouts.

### Addressed — registration validates stored name and email lengths

- Change: [app/api/auth.py](./app/api/auth.py) rejects names over 120 and emails over 255 characters with field-specific 422 details.

## Validation

- `compileall` passed for `app/` and `tests/`.
- The DB-independent hotspot and polygon-input tests passed: 11 tests.
- DB-backed API regression tests were added but not run because the local PostgreSQL service was unavailable. Apply the report-context migration, start PostGIS, then run `pytest`.
