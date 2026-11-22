import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  GraduationCap,
  FolderKanban,
  CheckSquare,
  ChevronDown,
  CircleUserRound,
  LogOut,
  Trash2,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';

const SETTINGS_LINKS = [
  ['general', 'General'],
  ['appearance', 'Appearance'],
  ['notifications', 'Notifications'],
  ['modules', 'Modules'],
  ['privacy', 'Privacy'],
  ['data', 'Data management'],
  ['system', 'System information'],
];

export default function TopNavbar({ onOpenProfileDialog, profileMenuOpen, setProfileMenuOpen }) {
  const profileMenuRef = useRef(null);

  useEffect(() => {
    if (!profileMenuOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) setProfileMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setProfileMenuOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [profileMenuOpen]);

  const navItems = [
    { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: LayoutDashboard },
    { label: 'Study', path: ROUTES.STUDY, icon: GraduationCap },
    { label: 'Projects', path: ROUTES.PROJECTS, icon: FolderKanban },
    { label: 'Tasks', path: ROUTES.TASKS, icon: CheckSquare },
  ];

  const openProfileDialog = (section) => {
    setProfileMenuOpen(false);
    onOpenProfileDialog(section);
  };

  return (
    <header className="relative z-40 flex w-full items-center justify-center border-0 bg-transparent px-4 py-2.5">
      <nav className="hud-nav px-1.5 py-1 flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              aria-label={item.label}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-1.5 text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-red-500/10 text-red-200 border border-red-400/50 shadow-[0_0_12px_rgba(255,45,85,0.18)]'
                    : 'text-blue-200/70 hover:text-blue-100 hover:bg-blue-950/30 border border-transparent'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="nav-item-label">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="absolute right-4 sm:right-6">
        <div className="relative" ref={profileMenuRef}>
          <button
            type="button"
            aria-label="Open profile menu"
            aria-expanded={profileMenuOpen}
            aria-haspopup="true"
            onClick={() => setProfileMenuOpen((open) => !open)}
            className="flex items-center gap-1.5 rounded-full p-1 text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-gradient-to-tr from-blue-400 to-red-600 text-[11px] font-semibold text-white shadow-sm">
              S
            </span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${profileMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {profileMenuOpen && (
            <div className="profile-menu absolute right-0 top-full z-50 mt-2 max-h-[calc(100vh-5rem)] w-72 overflow-y-auto rounded-xl p-2">
              <button
                type="button"
                onClick={() => openProfileDialog('profile')}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-100 hover:bg-slate-800"
              >
                <CircleUserRound className="h-4 w-4 text-cyan-300" />
                <span>Profile</span>
              </button>

              <div className="my-2 border-t border-slate-800" />
              <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">Settings</p>
              <nav aria-label="Settings" className="flex flex-col">
                {SETTINGS_LINKS.map(([section, label]) => (
                  <button
                    key={section}
                    type="button"
                    onClick={() => openProfileDialog(section)}
                    className="rounded-md px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                  >
                    {label}
                  </button>
                ))}
              </nav>

              <div className="my-2 border-t border-slate-800" />
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => openProfileDialog('logout')}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
                <button
                  type="button"
                  onClick={() => openProfileDialog('deleteAccount')}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-red-300 hover:bg-red-950/40"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete account
                </button>
                <p className="px-3 pb-1 text-[11px] text-slate-500">Account actions are unavailable in this local-only app.</p>
              </div>

              <div className="my-2 border-t border-slate-800" />
              <div className="space-y-2 px-3 py-2">
                <p className="text-sm font-medium text-slate-200">LifeStack</p>
                <p className="text-xs text-slate-400">Made for Sam</p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                  <button
                    type="button"
                    onClick={() => openProfileDialog('terms')}
                    className="text-left hover:text-slate-300"
                  >
                    Terms &amp; Conditions
                  </button>
                  <button
                    type="button"
                    onClick={() => openProfileDialog('privacy')}
                    className="text-cyan-400 hover:text-cyan-300 hover:underline"
                  >
                    Privacy
                  </button>
                  <button
                    type="button"
                    onClick={() => openProfileDialog('about')}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    About
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

