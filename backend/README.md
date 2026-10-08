# CivicPulse backend

Flask API for CivicPulse. The full contract is in `openapi.yaml`: build to match it. Paste it into editor.swagger.io to browse it as documentation.

## Status

**Working now:** project setup, database schema, authentication and roles, report submission with photos, report listing with filters, following reports, status workflow with history, assignment and the authority list.
**Next:** duplicate endpoints, notifications (Task 15), job queue (Task 16) and AI hooks.

| Task | What | State |
|---|---|---|
| 2 | API contract (`openapi.yaml`) | Done |
| 3 | Flask project setup | Done |
| 4 | Authentication and roles | Done |
| 5 | PostgreSQL/PostGIS schema | Done |
| 6 | Report endpoints and photo upload | Done |
| 7 | Status workflow and history | Done |
| 14 | Assignment and authority list | Done |

## API endpoints

All paths start with `/api/v1`. Send the token on protected routes: `Authorization: Bearer <token>`.
Errors always look like `{"error": {"code": "...", "message": "...", "details": {}}}`.

### Working

| Method | Path | Who | What it does |
|---|---|---|---|
| GET | `/health` | Anyone | Checks the app, database and PostGIS |
| GET | `/categories` | Anyone | The six report categories |
| GET | `/areas` | Anyone | Areas (wards or zones) |
| POST | `/auth/register` | Anyone | Create a resident account. Returns `{token, user}` |
| POST | `/auth/login` | Anyone | Log in. Returns `{token, user}` |
| GET | `/auth/me` | Logged in | The current user |
| POST | `/reports` | Logged in | Submit a report (multipart form, see below) |
| GET | `/reports` | Logged in | List reports (filters below) |
| GET | `/reports/{id}` | Logged in | One report |
| PATCH | `/reports/{id}/status` | Verifier, authority, admin | Move a report to its next status (rules below) |
| GET | `/reports/{id}/history` | Logged in | The status trail, oldest first |
| POST | `/reports/{id}/assign` | Verifier, authority, admin | Assign a verified report to an authority user, with an optional due date |
| GET | `/users` | Verifier, authority, admin | List users. Admins can filter any `role`; others only get authority users, without emails |
| POST | `/reports/{id}/follow` | Logged in | Follow a report (safe to repeat) |
| DELETE | `/reports/{id}/follow` | Logged in | Stop following |
| GET | `/uploads/{path}` | Anyone | Serves saved photos (no `/api/v1` prefix) |

### Not built yet (in `openapi.yaml`)

| Method | Path | Task |
|---|---|---|
| GET | `/reports/{id}/duplicates`, POST `/reports/{id}/merge`, POST `/reports/{id}/unmerge` | 13, 17 |
| GET | `/notifications`, POST `/notifications/{id}/read` | 15 |
| GET | `/analytics/summary`, `/analytics/hotspots` | 21, 22 |
| PATCH | `/users/{id}/role` | Admin tools |

### Status rules

`PATCH /reports/{id}/status` with `{"status": "verified", "note": "optional"}`. Every change saves a row in `status_events`.

| Move | Who can do it |
|---|---|
| reported to verified | Verifier, admin |
| reported to rejected (a `note` with the reason is required) | Verifier, admin |
| verified to assigned | Through `POST /reports/{id}/assign` only, because it needs an assignee |
| assigned to in_progress | The assigned authority, or admin |
| in_progress to resolved | The assigned authority, or admin |

**Assigning:** `POST /reports/{id}/assign` with `{"assignee_id": 7, "due_date": "2026-10-20"}` (the date is optional and can't be in the past). The assignee must be an authority user. A report that is assigned but not started can be reassigned with the same call; once work starts (`in_progress`) it can't (409 `cannot_reassign`).

`rejected` and `resolved` are final. Errors: 409 `invalid_transition` (the response lists the allowed next statuses), 409 `use_assign_endpoint`, 409 `is_duplicate` (a merged report must be updated through its parent), 403 `forbidden` or `not_assignee`, 422 for a missing reason or unknown status.

### Examples

**Register or log in** (JSON):
```json
POST /api/v1/auth/register
{"name": "Dan", "email": "dan@example.com", "password": "at-least-8-chars", "area_id": 1}
```
Registering always creates a **resident**; any `role` sent is ignored.

**Submit a report** (`multipart/form-data` [a request format that carries a file plus normal form fields]):

| Field | Required | Notes |
|---|---|---|
| `category_id` | Yes | From `GET /categories` |
| `lat`, `lon` | Yes | Latitude -90 to 90, longitude -180 to 180 |
| `photo` | Yes | JPEG or PNG, max 5 MB. The file contents are checked, not the name |
| `description` | No | Up to 500 characters |

The report starts as `reported` and gets its first status event. If an area has a boundary drawn, the report is placed in that area automatically.

**List reports** (query parameters, all optional): `bbox` (`min_lon,min_lat,max_lon,max_lat`), `category_id`, `status`, `area_id`, `mine=true`, `following=true`, `include_duplicates=true`, `page`, `per_page` (default 50, max 200). Duplicates are hidden by default and counted in their parent's `report_count`. The response is `{items, page, per_page, total}`.

## Run it

Use Python 3.12 or 3.13. Commands are for Windows PowerShell.

1. Start the database and Redis (Docker Desktop must be running): `docker compose up -d`
2. Create a virtual environment and install packages:
   `python -m venv venv`, then `.\venv\Scripts\Activate.ps1`, then `pip install -r requirements.txt`
3. Copy settings: `Copy-Item .env.example .env`
4. Put strong secrets in `.env`. Run `python -c "import secrets; print(secrets.token_hex(32))"` twice and use the results for `SECRET_KEY` and `JWT_SECRET_KEY`.
5. Create the tables and starter data: `flask --app wsgi init-db` then `flask --app wsgi seed`
6. Create your first admin: `flask --app wsgi create-user --name "Your Name" --email you@example.com --role admin`
7. Start the server: `flask --app wsgi run`
8. Check it: open http://localhost:5000/api/v1/health (should show `"status": "ok"` and the PostGIS version)
9. Run the tests: `pytest` (38 tests; they need the database running and seeded)

Keep the `SQLAlchemy==2.0.54` pin in `requirements.txt`: newer versions break GeoAlchemy2.

## Folder guide

| Path | Purpose |
|---|---|
| `app/__init__.py` | App factory: builds the configured app |
| `app/config.py` | Settings read from `.env` |
| `app/extensions.py` | Shared tools: database, JWT, CORS, migrations |
| `app/models.py` | All database tables (source of truth for the schema) |
| `app/constants.py` | Roles, statuses and the allowed status moves |
| `app/errors.py` | Turns every error into the contract format. Use `raise ApiError(code, message, status)` |
| `app/auth_utils.py` | `@login_required`, `@roles_required(...)` and `current_user()` |
| `app/storage.py` | Checks and saves uploaded photos |
| `app/status_flow.py` | `change_status()`: the one place where status rules are enforced. Notifications (Task 15) hook in here |
| `app/api/` | One file per group of endpoints: `auth`, `reports`, `workflow`, `users`, `reference`, `health`, `media`. Register new ones in `app/api/__init__.py` |
| `app/cli.py` | `init-db`, `seed` and `create-user` commands |
| `docs/schema.sql` | Plain SQL version of the schema, for reading |
| `tests/` | Automated tests. Test users and reports clean up after themselves |
| `uploads/` | Saved photos (created automatically, not committed to git) |

## Protecting routes

```python
from app.auth_utils import login_required, roles_required, current_user

@bp.post('/reports/<int:id>/status')
@roles_required('verifier', 'authority', 'admin')   # 401 if not logged in, 403 if wrong role
def change_status(id):
    user = current_user()
    ...
```

Roles: `resident`, `verifier`, `authority`, `admin`. The role is read from the database on every request, so role changes apply immediately.

## The schema (8 tables)

- `users`: name, email, password hash, role, area
- `areas`: name and optional boundary polygon
- `categories`: Pothole, Streetlight, Drainage, Garbage, Water leak, Public facility (ids 1 to 6)
- `reports`: category, status, `location`, photo, creator, assignee, duplicate info, AI suggestions
- `status_events`: one row per status change (who, when, note), used to calculate days to resolve
- `follows`: which user follows which report
- `notifications`: messages for users about reports
- `hotspots`: results of the clustering job

Statuses: `reported`, `verified`, `rejected`, `assigned`, `in_progress`, `resolved`.

## Design choices worth knowing

- **`location` is a Geography column** [a map-aware type that measures distances in real metres]. Queries like `ST_DWithin(location, point, 50)` mean "within 50 metres". A spatial index is created automatically so they stay fast.
- **Coordinate order:** PostGIS points are written longitude first: `POINT(lon lat)`. The API's `location` object uses `{lat, lon}`.
- **Duplicates:** a duplicate report stores `duplicate_of` (its parent). The parent's `report_count` counts everyone. Keep that number updated when merging or unmerging.
- **Status and role are text with a check rule**, not database enums, so they are easier to change later.
- **Photos** are saved under a random name in `uploads/reports/`. The path is stored in `photo_path` and the API returns a full `photo_url`.
- **`init-db` vs migrations:** `flask init-db` is the quick way for development. When the schema must change without wiping data, use migrations [versioned database changes]: `flask --app wsgi db init`, `flask --app wsgi db migrate -m initial`, then add `import geoalchemy2` at the top of the generated file in `migrations/versions/`, then `flask --app wsgi db upgrade`.

## For teammates

- **Frontend:** build against `openapi.yaml`. Log in, store the token, send it as `Authorization: Bearer <token>`. Photos load from `photo_url`.
- **AI and data:** write seed data using category names to look up ids, not hardcoded numbers. `photo_path` cannot be empty. Write coordinates longitude first.