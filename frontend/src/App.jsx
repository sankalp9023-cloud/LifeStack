import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from '@/routes/AppRoutes';
import { SettingsProvider } from '@/context/SettingsProvider';
import '@/features/settings/data/backupAdapters';

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </SettingsProvider>
  );
}

