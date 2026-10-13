import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import AppLayout from './components/layout/AppLayout';

// Public Pages & Layout
import PublicLayout from './components/layout/PublicLayout';
import LandingPage from './pages/public/LandingPage';
import AboutPage from './pages/public/AboutPage';
import FAQPage from './pages/public/FAQPage';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Portal Screens
import ResidentDashboardPage from './pages/resident/ResidentDashboardPage';
import MyReportsPage from './pages/resident/MyReportsPage';
import ReportIssuePage from './pages/resident/ReportIssuePage';
import CommunityMapPage from './pages/resident/CommunityMapPage';
import ReportDetailsPage from './pages/resident/ReportDetailsPage';
import ResidentProfilePage from './pages/resident/ResidentProfilePage';
import NotificationsPage from './pages/resident/NotificationsPage';
import VerifierDashboardPage from './pages/verifier/VerifierDashboardPage';
import AuthorityDashboardPage from './pages/authority/AuthorityDashboardPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AnalyticsDashboardPage from './pages/analytics/AnalyticsDashboardPage';
import NotFoundPage from './pages/common/NotFoundPage';
import ForbiddenPage from './pages/common/ForbiddenPage';

function RequireAuthentication({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">
        Checking your CivicPulse session...
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function RoleRoute({ roles = [], children }) {
  const { role } = useAuth();
  if (roles.length > 0 && !roles.includes(role)) {
    return <ForbiddenPage requiredRole={roles.join(' or ')} />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            {/* 1. Public Pages (Shared Public Navbar & Layout) */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route
                path="/map"
                element={
                  <RequireAuthentication>
                    <CommunityMapPage />
                  </RequireAuthentication>
                }
              />
              <Route path="/faq" element={<FAQPage />} />
            </Route>

            {/* 2. Public Authentication Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* 3. Operational Application Portal Layout */}
            <Route
              element={
                <RequireAuthentication>
                  <AppLayout />
                </RequireAuthentication>
              }
            >
              {/* Resident Screens */}
              <Route path="/dashboard" element={<ResidentDashboardPage />} />
              <Route path="/report/new" element={<ReportIssuePage />} />
              <Route path="/reports/:id" element={<ReportDetailsPage />} />
              <Route path="/my-reports" element={<MyReportsPage />} />
              <Route path="/community-map" element={<CommunityMapPage />} />
              <Route path="/profile" element={<ResidentProfilePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />

              {/* Verifier Screens (Guarded to verifier & admin) */}
              <Route
                path="/verifier/queue"
                element={
                  <RoleRoute roles={['verifier', 'admin']}>
                    <VerifierDashboardPage />
                  </RoleRoute>
                }
              />

              {/* Authority Screens (Guarded to authority & admin) */}
              <Route
                path="/authority/assigned"
                element={
                  <RoleRoute roles={['authority', 'admin']}>
                    <AuthorityDashboardPage />
                  </RoleRoute>
                }
              />

              {/* Admin Screens (Guarded strictly to admin) */}
              <Route
                path="/admin"
                element={
                  <RoleRoute roles={['admin']}>
                    <AdminDashboardPage />
                  </RoleRoute>
                }
              />

              {/* Analytics & Hotspots */}
              <Route
                path="/analytics"
                element={
                  <RoleRoute roles={['authority', 'admin']}>
                    <AnalyticsDashboardPage />
                  </RoleRoute>
                }
              />

              {/* 404 & 403 Fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
