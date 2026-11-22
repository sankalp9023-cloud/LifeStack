import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import RootLayout from '@/layouts/RootLayout';
import DashboardPage from '@/pages/Dashboard';
import StudyPage from '@/pages/Study';
import ProjectsPage from '@/pages/Projects';
import SettingsPage from '@/pages/Settings';
import TasksPage from '@/pages/Tasks';
import AuthPage from '@/pages/Auth';
import useSettings from '@/features/settings/hooks/useSettings';

function DefaultLandingPage() {
  const { settings } = useSettings();
  const landingPage = settings.general.defaultLandingPage;
  if (landingPage === ROUTES.DASHBOARD) return <DashboardPage />;
  return <Navigate to={landingPage} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path={ROUTES.LOGIN} element={<AuthPage mode="login" />} />
      <Route path={ROUTES.SIGNUP} element={<AuthPage mode="signup" />} />
      <Route element={<RootLayout />}>
        <Route path="/" element={<DefaultLandingPage />} />
        <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
        <Route path={ROUTES.STUDY} element={<StudyPage />} />
        <Route path={ROUTES.PROJECTS} element={<ProjectsPage />} />
        <Route path={ROUTES.TASKS} element={<TasksPage />} />
        <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

