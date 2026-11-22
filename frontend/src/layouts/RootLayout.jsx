import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import TopNavbar from '@/components/navigation/TopNavbar';
import SettingsPage from '@/pages/Settings';
import useStudyReminders from '@/features/settings/hooks/useStudyReminders';
import { ROUTES } from '@/constants/routes';

const PROFILE_SECTIONS = new Set([
  'profile', 'appearance', 'notifications', 'modules', 'system',
  'terms', 'about', 'logout', 'deleteAccount',
]);

export default function RootLayout() {
  const [profileDialogSection, setProfileDialogSection] = useState(null);
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const backgroundClass = pathname === '/' || pathname.startsWith('/dashboard')
    ? 'dashboard-shell'
    : pathname.startsWith('/projects')
      ? 'projects-shell'
      : pathname.startsWith('/tasks')
        ? 'tasks-shell'
        : '';
  useStudyReminders();

  useEffect(() => {
    if (pathname !== ROUTES.SETTINGS) return;
    const requestedSection = new URLSearchParams(search).get('section');
    setProfileDialogSection(
      requestedSection && PROFILE_SECTIONS.has(requestedSection)
        ? requestedSection
        : 'profile',
    );
    navigate(ROUTES.DASHBOARD, { replace: true });
  }, [navigate, pathname, search]);

  useEffect(() => {
    if (!profileDialogSection) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setProfileDialogSection(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [profileDialogSection]);

  return (
    <div className={`app-shell ${backgroundClass} relative h-screen min-h-[100dvh] w-full text-slate-100 flex flex-col overflow-hidden select-none`}>
      {/* Top Application Bar */}
      <TopNavbar
        onOpenProfileDialog={setProfileDialogSection}
      />

      {/* Main Viewport Content Area */}
      <div className="relative flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden md:flex-row">
        <main className="relative flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
          {pathname === ROUTES.SETTINGS ? null : <Outlet />}
        </main>
      </div>
      {profileDialogSection && (
        <div
          className="profile-settings-backdrop fixed inset-0 z-50 flex items-stretch justify-end p-3 sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setProfileDialogSection(null);
          }}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Profile and settings panel"
            className="profile-menu h-full w-full overflow-y-auto rounded-2xl border border-slate-700/70 shadow-2xl md:w-[min(34vw,30rem)]"
          >
            <SettingsPage
              dialogMode
              dialogSection={profileDialogSection}
              onClose={() => setProfileDialogSection(null)}
              onNavigateSection={setProfileDialogSection}
            />
          </aside>
        </div>
      )}
    </div>
  );
}

