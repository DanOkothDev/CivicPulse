import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
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
import NotFoundPage from './pages/common/NotFoundPage';
import ForbiddenPage from './pages/common/ForbiddenPage';

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
              <Route path="/faq" element={<FAQPage />} />
            </Route>

            {/* 2. Public Authentication Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* 3. Operational Application Portal Layout */}
            <Route element={<AppLayout />}>
              <Route path="/report/new" element={<ReportIssuePage />} />
              <Route path="/dashboard" element={<Navigate to="/report/new" replace />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
