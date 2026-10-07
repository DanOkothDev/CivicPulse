# CivicPulse backend

Flask API for CivicPulse. The endpoints are defined in `openapi.yaml` (the API contract): build to match it.

## Run it

1. Start the database and Redis: `docker compose up -d`
2. Create a virtual environment and install packages:
   `python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
3. Copy settings: `cp .env.example .env`
4. Create the tables and starter data:
   `flask --app wsgi init-db` then `flask --app wsgi seed`
5. Start the server: `flask --app wsgi run`
6. Check it: open http://localhost:5000/api/v1/health (should show status ok and the PostGIS version)
7. Run the tests: `pytest`

## Folder guide

| Path | Purpose |
|---|---|
| `app/__init__.py` | App factory: builds the configured app |
| `app/config.py` | Settings read from `.env` |
| `app/extensions.py` | Shared tools: database, JWT, CORS, migrations |
| `app/models.py` | All database tables (source of truth for the schema) |
| `app/constants.py` | Roles, statuses and the allowed status moves |
| `app/errors.py` | Turns every error into the contract's error format; use `raise ApiError(code, message, status)` |
| `app/api/` | One file per group of endpoints. Register new ones in `app/api/__init__.py` |
| `app/cli.py` | `init-db` and `seed` commands |
| `docs/schema.sql` | Plain SQL version of the schema, for reading |

## The schema (8 tables)

- `users`: name, email, password hash, role (resident, verifier, authority, admin), area
- `areas`: name and optional boundary polygon
- `categories`: pothole, streetlight, drainage, garbage, water leak, public facility
- `reports`: the main table: category, status, `location`, photo, creator, assignee, duplicate info, AI suggestions
- `status_events`: one row per status change (who, when, note); used to calculate days to resolve
- `follows`: which user follows which report
- `notifications`: messages for users about reports
- `hotspots`: results of the clustering job (Teammate 3, Task 21)

## Design choices worth knowing

- **`location` is a Geography column** [a map-aware type that measures distances in real metres]. Distance queries like `ST_DWithin(location, point, 50)` mean "within 50 metres". A GiST index [a spatial search index] is created automatically so these stay fast.
- **Coordinates order:** PostGIS points are written longitude first, then latitude: `POINT(lon lat)`.
- **Duplicates:** a duplicate report stores `duplicate_of` (its parent). The parent's `report_count` counts everyone. Keep that number updated when merging or unmerging.
- **Status and role are text with a check rule**, not database enums. They are easier to change later.
- **`init-db` vs migrations:** `flask init-db` is the quick way for development. Once the schema must change without wiping data, use migrations [versioned database changes]: `flask --app wsgi db init`, `flask --app wsgi db migrate -m initial`, then add `import geoalchemy2` at the top of the generated file in `migrations/versions/`, then `flask --app wsgi db upgrade`.

## Next tasks

Task 4 (auth and roles), Task 6 (report endpoints and uploads), Task 7 (status workflow using `can_transition`).
