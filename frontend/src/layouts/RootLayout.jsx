import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import TopNavbar from '@/components/navigation/TopNavbar';
import SettingsPage from '@/pages/Settings';
import useStudyReminders from '@/features/settings/hooks/useStudyReminders';

export default function RootLayout() {
  const [profileDialogSection, setProfileDialogSection] = useState(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const backgroundClass = pathname === '/' || pathname.startsWith('/dashboard')
    ? 'dashboard-shell'
    : pathname.startsWith('/projects')
      ? 'projects-shell'
      : pathname.startsWith('/tasks')
        ? 'tasks-shell'
        : '';
  useStudyReminders();

  useEffect(() => {
    if (!profileDialogSection) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setProfileDialogSection(null);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [profileDialogSection]);

  return (
    <div className={`app-shell ${backgroundClass} relative h-screen min-h-[100dvh] w-full bg-space-950 text-slate-100 flex flex-col overflow-hidden select-none`}>
      {/* Top Application Bar */}
      <TopNavbar
        onOpenProfileDialog={setProfileDialogSection}
        profileMenuOpen={profileMenuOpen}
        setProfileMenuOpen={setProfileMenuOpen}
      />

      {/* Main Viewport Content Area */}
      <div className="relative flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden md:flex-row">
        <main className="relative flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
      </div>
      {profileDialogSection && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-space-950/35 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setProfileDialogSection(null);
          }}
        >
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Profile and settings panel"
            className="h-full w-full overflow-y-auto border-l border-slate-700/70 bg-space-950/95 shadow-2xl md:w-[min(42vw,36rem)]"
          >
            <SettingsPage
              dialogMode
              dialogSection={profileDialogSection}
              onClose={() => setProfileDialogSection(null)}
              onBackToMenu={() => {
                setProfileDialogSection(null);
                setProfileMenuOpen(true);
              }}
            />
          </aside>
        </div>
      )}
    </div>
  );
}

