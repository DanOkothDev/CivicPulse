import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import AppLayout from './components/layout/AppLayout';

// Public Pages & Layout (Task 9)
import PublicLayout from './components/layout/PublicLayout';
import LandingPage from './pages/public/LandingPage';
import AboutPage from './pages/public/AboutPage';
import FAQPage from './pages/public/FAQPage';

// Auth Pages (Task 9)
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

// Report Form Screen (Task 10)
import ReportIssuePage from './pages/resident/ReportIssuePage';

// Community Map Screen (Task 11)
import CommunityMapPage from './pages/resident/CommunityMapPage';

// Verifier Screen (Task 17)
import VerifierDashboardPage from './pages/verifier/VerifierDashboardPage';

import NotFoundPage from './pages/common/NotFoundPage';
import ForbiddenPage from './pages/common/ForbiddenPage';

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
              <Route path="/map" element={<CommunityMapPage />} />
              <Route path="/faq" element={<FAQPage />} />
            </Route>

            {/* 2. Public Authentication Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* 3. Operational Application Portal Layout */}
            <Route element={<AppLayout />}>
              <Route path="/report/new" element={<ReportIssuePage />} />
              <Route path="/community-map" element={<CommunityMapPage />} />
              
              {/* Verifier Screens (Guarded to verifier & admin) */}
              <Route
                path="/verifier/queue"
                element={
                  <RoleRoute roles={['verifier', 'admin']}>
                    <VerifierDashboardPage />
                  </RoleRoute>
                }
              />

              <Route path="/dashboard" element={<Navigate to="/verifier/queue" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
