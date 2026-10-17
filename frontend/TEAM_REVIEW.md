# Frontend review handoff

Scope: route coverage, forms, API use, operational dashboards, and shared navigation as inspected on 2026-10-17.

## Findings

### P1 — Resident follow controls cannot reliably unfollow

- Evidence: [src/pages/resident/MyReportsPage.jsx](./src/pages/resident/MyReportsPage.jsx) and [src/pages/resident/ResidentDashboardPage.jsx](./src/pages/resident/ResidentDashboardPage.jsx) call `api.reports.toggleFollow(id)` without the current `is_following` value. [src/services/api.js](./src/services/api.js) chooses follow versus unfollow from that value.
- Impact: these controls always take the “follow” path; an already-followed report cannot be unfollowed from those screens.
- Action: pass each report's `is_following` value and label the action as follow/unfollow (or share the implementation used in Report Details).

### P1 — Authority work queue is truncated before filtering

- Evidence: [src/pages/authority/AuthorityDashboardPage.jsx](./src/pages/authority/AuthorityDashboardPage.jsx) requests the default report page and then filters the returned first 50 rows for the current authority's assignments.
- Impact: assigned work older than the newest 50 reports is invisible, even though the backend supports pagination.
- Action: add a server-side `assigned_to` filter and page through its results, or fetch every page before filtering. Show loading/error/empty states based on the full result.

### P1 — Lists and dashboard counts silently stop at the first API page

- Evidence: resident, verifier, admin, map, and authority screens call report/user list APIs without page controls; the API defaults to 50 rows. The shared [src/components/ui/Pagination.jsx](./src/components/ui/Pagination.jsx) is not used by any page. The user-list endpoint also needs total/page metadata before that UI can paginate it.
- Impact: queue contents, report lists, and counts are incomplete once there are more than 50 matching rows. Several KPI counts are based on the loaded subset.
- Action: wire the shared pagination component to API `page`, `per_page`, and `total`, or implement explicit “load more”; ensure counts use server totals rather than the current page.

### P1 — Report address and landmark inputs are discarded

- Evidence: [src/pages/resident/ReportIssuePage.jsx](./src/pages/resident/ReportIssuePage.jsx) collects `address` and `landmark`, but submission only appends category, coordinates, description, and photo. The backend has no fields for the two values.
- Impact: entered location details disappear after submit; the report detail view's optional `landmark` display cannot be populated.
- Action: coordinate with backend on fields and validation, send them on submit, and render the stored values in details and relevant search.

### P2 — The profile and password recovery UI expose unfinished routes/actions

- Evidence: [src/pages/auth/LoginPage.jsx](./src/pages/auth/LoginPage.jsx) links to `/forgot-password`, but [src/App.jsx](./src/App.jsx) has no such route. The login page's `rememberMe` state is not used by submission or token storage. The profile Settings tab in [src/pages/resident/ResidentProfilePage.jsx](./src/pages/resident/ResidentProfilePage.jsx) explicitly says editing/preferences are unavailable; there are no corresponding API methods. [README.md](./README.md) also advertises government passkey SSO, which is not implemented in the login page.
- Impact: password recovery ends at 404, remember-me has no behavior, and settings appears actionable without a connected feature.
- Action: implement the routes/API or remove/disable the controls and correct the README claims. Treat these as intentionally deferred if that is the agreed scope.

### P2 — Notification badge becomes stale during a session

- Evidence: [src/components/layout/TopNavigation.jsx](./src/components/layout/TopNavigation.jsx) fetches unread count only when `user` changes. [src/pages/resident/NotificationsPage.jsx](./src/pages/resident/NotificationsPage.jsx) marks notifications read without updating the shared navigation state.
- Impact: the bell can continue showing an unread badge after all notifications were read, until a reload or remount.
- Action: centralize unread count in shared context or refresh it after read actions and on a defined polling/focus policy.

### P2 — Analytics API features and status values are only partly represented in the dashboard

- Evidence: [src/services/api.js](./src/services/api.js) exposes trends, category, and status endpoints, but [src/pages/analytics/AnalyticsDashboardPage.jsx](./src/pages/analytics/AnalyticsDashboardPage.jsx) only loads summary, hotspots, and areas. Its status chart omits `rejected`. The selected area filters the summary, but hotspot results are loaded without an area.
- Impact: daily trend data is not shown; rejected cases are missing from the status visualization; the area selector appears to filter hotspot results when it does not.
- Action: wire the trends/categories/statuses endpoints where needed, include every status, and make the area scope explicit and consistent (coordinate hotspot filtering with backend).

### P3 — Production JavaScript bundle exceeds the build warning threshold

- Evidence: `npm run build` succeeds, but Vite reports the minified JS chunk is over 500 kB.
- Impact: slower initial download/parse, especially on mobile connections.
- Action: lazy-load route pages and review vendor chunking; retain the warning threshold as a signal rather than suppressing it.

## Validation

- `npm run build` succeeded. Vite emitted the chunk-size warning described above.
