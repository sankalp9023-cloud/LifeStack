import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import TopNavbar from '@/components/navigation/TopNavbar';
import SettingsPage from '@/pages/Settings';
import useStudyReminders from '@/features/settings/hooks/useStudyReminders';

export default function RootLayout() {
  const [profileDialogSection, setProfileDialogSection] = useState(null);
  useStudyReminders();
  return (
    <div className="app-shell relative min-h-screen bg-space-950 text-slate-100 flex flex-col overflow-x-hidden select-none">
      {/* Top Application Bar */}
      <TopNavbar onOpenProfileDialog={setProfileDialogSection} />

      {/* Main Viewport Content Area */}
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <Outlet />
        </main>
        {profileDialogSection && (
          <aside
            aria-label="Profile and settings panel"
            className="h-[45vh] w-full shrink-0 overflow-y-auto border-t border-slate-700 bg-space-950 md:h-auto md:w-[min(42vw,36rem)] md:border-l md:border-t-0"
          >
            <SettingsPage
              dialogMode
              dialogSection={profileDialogSection}
              onClose={() => setProfileDialogSection(null)}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

