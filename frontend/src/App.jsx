import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import AppLayout from './components/layout/AppLayout';

// Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ResidentDashboardPage from './pages/resident/ResidentDashboardPage';
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

// Role Guard Component
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
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Main Application Layout */}
            <Route path="/" element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<ResidentDashboardPage />} />
              <Route path="report/new" element={<ReportIssuePage />} />
              <Route path="map" element={<CommunityMapPage />} />
              <Route path="reports/:id" element={<ReportDetailsPage />} />
              <Route path="my-reports" element={<ResidentDashboardPage />} />
              <Route path="profile" element={<ResidentProfilePage />} />
              <Route path="notifications" element={<NotificationsPage />} />

              {/* Verifier Operations */}
              <Route
                path="verifier/queue"
                element={
                  <RoleRoute roles={['verifier', 'admin']}>
                    <VerifierDashboardPage />
                  </RoleRoute>
                }
              />

              {/* Authority Desk */}
              <Route
                path="authority/assigned"
                element={
                  <RoleRoute roles={['authority', 'admin']}>
                    <AuthorityDashboardPage />
                  </RoleRoute>
                }
              />

              {/* City Administration */}
              <Route
                path="admin"
                element={
                  <RoleRoute roles={['admin']}>
                    <AdminDashboardPage />
                  </RoleRoute>
                }
              />

              {/* Analytics & Hotspots */}
              <Route
                path="analytics"
                element={
                  <RoleRoute roles={['authority', 'admin', 'verifier', 'resident']}>
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
