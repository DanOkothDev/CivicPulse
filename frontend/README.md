# CivicPulse Frontend

Modern, mobile-responsive citizen infrastructure intelligence & municipal operations platform built with React, Vite, Tailwind CSS, Leaflet, and Lucide Icons.

## Features

- **12 Dedicated Application Screens**:
  - **Authentication**: Login (with gov passkey SSO, remember me, resolution velocity telemetry) and Resident Registration.
  - **Resident Experience**: Resident Dashboard (KPI metrics, trust score, watchlist), Report Issue (Camera capture, EXIF metadata, live GPS lock, interactive pin-dropping map), Community Map (colored status markers, filtering, details drawer), Report Details (high-res photo, status audit trail timeline, geographic snapshot), Resident Profile, and Notifications feed (telemetric dispatch alerts, priority badges, and mini-map).
  - **Operations & Oversight**: Verifier Queue (pending queue, AI duplicate suggestions comparison, verify, merge, split, reject dialogs), Authority Desk (assigned task progression, SLA tracking, status transitions), Admin Dashboard (users, role assignments, category taxonomy, ward management), and Analytics Dashboard (DBSCAN hotspot clustering, status & category charts, ward open issue metrics).
- **20 Shared Components**:
  - Sidebar, Top Navigation, Mobile Navigation, Report Card, Status Badge, Statistic Card, Data Table, Search Bar, Filters, Pagination, Timeline, Image Upload Component, Map Component, Charts, Modal, Toast, Loading Skeleton, Empty State, Confirmation Dialog, 404 Page, and 403 Page.
- **Backend API Integration**:
  - Uses the Flask API for authentication, reports, reference data, notifications, and analytics. There is no offline mock-data fallback.
  - JWT bearer tokens are sent with authenticated requests. Backend errors and connection failures are shown instead of being replaced with sample data.

## Setup & Running

Start the backend first using the **Run it** steps in [`backend/README.md`](../backend/README.md). Its API and database health endpoint is `http://localhost:5000/api/v1/health`.

Then start the frontend in a second terminal:

```bash
# From the frontend directory
npm install
npm run dev
```

Vite serves the frontend at `http://localhost:5173` and proxies `/api` and `/uploads` to `http://localhost:5000`. The landing page displays whether the API, database, and PostGIS connection passed the backend health check.

To point the frontend at a different API, set `VITE_API_BASE_URL` in `frontend/.env.local`, for example:

```dotenv
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

Create resident accounts through **Register**. Create verifier, authority, and admin test accounts with the backend's `flask --app wsgi create-user` command; the frontend no longer has demo accounts or role switching. Staff analytics and operational pages use backend role authorization. Admin role changes, categories, and areas are persisted through the API; profile editing and notification-preference endpoints are not part of the current backend contract.
