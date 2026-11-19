import React, { createContext, useContext, useEffect } from 'react';
import useSettings from '@/features/settings/hooks/useSettings';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const value = useSettings();
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dataset.theme = value.settings.appearance.theme;
    root.dataset.accent = value.settings.appearance.accentColor;
    root.dataset.density = value.settings.appearance.density;
    root.dataset.appMode = value.settings.applicationMode;
    root.style.colorScheme = value.settings.appearance.theme === 'system'
      ? 'light dark'
      : value.settings.appearance.theme;
  }, [value.settings]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext() {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettingsContext must be used within SettingsProvider.');
  return value;
}

