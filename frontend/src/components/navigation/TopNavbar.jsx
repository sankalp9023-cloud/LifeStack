import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  FolderKanban,
  CheckSquare,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import useSettings from '@/features/settings/hooks/useSettings';
import { useAuth } from '@/context/AuthContext';

export default function TopNavbar({ onOpenProfileDialog }) {
  const { settings } = useSettings();
  const { user } = useAuth();
  const displayName = user?.name || user?.email || settings.profile.displayName;
  const initial = displayName.trim().charAt(0).toUpperCase();

  const navItems = [
    { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { label: 'Study', path: ROUTES.STUDY, icon: GraduationCap },
    { label: 'Projects', path: ROUTES.PROJECTS, icon: FolderKanban },
    { label: 'Tasks', path: ROUTES.TASKS, icon: CheckSquare },
  ];

  return (
    <header className="relative z-40 flex w-full items-center justify-center border-0 bg-transparent px-4 py-2.5">
      <nav className="hud-nav flex items-center gap-1 px-1.5 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              aria-label={item.label}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-1.5 text-xs font-medium transition-all duration-200 hud-nav-link${isActive ? ' is-active' : ''}`
              }
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="nav-item-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <button
        type="button"
        aria-label={`Open ${displayName} profile`}
        onClick={() => onOpenProfileDialog('profile')}
        className="profile-avatar absolute right-4 flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border text-sm font-semibold transition sm:right-6"
      >
        {initial}
      </button>
    </header>
  );
}
