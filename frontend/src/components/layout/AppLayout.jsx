import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NotificationProvider } from '../../context/NotificationContext';
import OnboardingTour from '../onboarding/OnboardingTour';
import ContextualTip from '../onboarding/ContextualTip';
import Sidebar from './Sidebar';
import TopNavigation from './TopNavigation';
import MobileNavigation from './MobileNavigation';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [manualTourOpen, setManualTourOpen] = useState(false);
  const [autoTourDismissed, setAutoTourDismissed] = useState(false);
  const { user } = useAuth();
  const previousUserRef = useRef(null);

  useEffect(() => {
    const handleOpenTour = () => setManualTourOpen(true);
    window.addEventListener('civicpulse:open-onboarding', handleOpenTour);
    return () => {
      window.removeEventListener('civicpulse:open-onboarding', handleOpenTour);
    };
  }, []);

  useEffect(() => {
    const previous = previousUserRef.current;
    if (previous?.id !== user?.id || (!previous?.product_tour_enabled && user?.product_tour_enabled)) {
      setAutoTourDismissed(false);
    }
    previousUserRef.current = user;
  }, [user]);

  const closeTour = useCallback(() => {
    setManualTourOpen(false);
    setAutoTourDismissed(true);
  }, []);

  const shouldAutoOpenTour =
    !!user && user.product_tour_enabled !== false && !user.onboarding_completed && !autoTourDismissed;

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="lg:pl-64 flex flex-col min-h-screen flex-1 pb-16 lg:pb-0">
          <TopNavigation onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
            <ContextualTip />
            <Outlet />
          </main>
        </div>

        <MobileNavigation />
        <OnboardingTour open={manualTourOpen || shouldAutoOpenTour} onClose={closeTour} />
      </div>
    </NotificationProvider>
  );
}
