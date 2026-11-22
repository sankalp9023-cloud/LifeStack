import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from '@/routes/AppRoutes';
import { SettingsProvider } from '@/context/SettingsProvider';
import { AuthProvider } from '@/context/AuthContext';
import '@/features/settings/data/backupAdapters';

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </SettingsProvider>
  );
}

