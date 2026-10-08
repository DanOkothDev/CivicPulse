# CivicPulse Frontend

Modern, mobile-responsive citizen infrastructure intelligence & municipal operations platform built with React, Vite, Tailwind CSS, Leaflet, and Lucide Icons.

## Features

- **12 Dedicated Application Screens**:
  - **Authentication**: Login (with gov passkey SSO, remember me, resolution velocity telemetry) and Resident Registration.
  - **Resident Experience**: Resident Dashboard (KPI metrics, trust score, watchlist), Report Issue (Camera capture, EXIF metadata, live GPS lock, interactive pin-dropping map), Community Map (colored status markers, filtering, details drawer), Report Details (high-res photo, status audit trail timeline, geographic snapshot), Resident Profile, and Notifications feed (telemetric dispatch alerts, priority badges, and mini-map).
  - **Operations & Oversight**: Verifier Queue (pending queue, AI duplicate suggestions comparison, verify, merge, split, reject dialogs), Authority Desk (assigned task progression, SLA tracking, status transitions), Admin Dashboard (users, role assignments, category taxonomy, ward management), and Analytics Dashboard (DBSCAN hotspot clustering, status & category charts, ward open issue metrics).
- **20 Shared Components**:
  - Sidebar, Top Navigation, Mobile Navigation, Report Card, Status Badge, Statistic Card, Data Table, Search Bar, Filters, Pagination, Timeline, Image Upload Component, Map Component, Charts, Modal, Toast, Loading Skeleton, Empty State, Confirmation Dialog, 404 Page, and 403 Page.
- **Dual Mode API Integration**:
  - Seamlessly connects to Flask API (`http://localhost:5000/api/v1`) with JWT bearer tokens.
  - Automatically falls back to local storage mock store when backend is offline so all 12 screens are testable and interactive right out of the box.

## Setup & Running

From the `frontend` directory:

```bash
# 1. Install dependencies
npm install

# 2. Start local development server (runs on http://localhost:3000)
npm run dev

# 3. Build for production
npm run build
```

## Quick Role Preview

When running the application, click on the role badge in the top navigation bar (`Resident`, `Verifier`, `Authority`, or `Admin`) to immediately switch views and test role-restricted permissions.
