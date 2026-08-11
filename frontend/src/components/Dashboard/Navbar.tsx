import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Sun,
  Moon,
  ChevronDown,
  Search,
  Bell,
  User as UserIcon,
  Settings as SettingsIcon,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface NavbarProps {
  onMenuClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [query, setQuery] = useState('');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      navigate(`/students?q=${encodeURIComponent(trimmed)}`);
    }
  };

  const initials = (user?.full_name || user?.username || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 dark:border-navy-700 dark:bg-navy-900 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-2 text-navy-500 hover:bg-slate-100 dark:text-navy-300 dark:hover:bg-navy-700 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="hidden truncate text-sm font-semibold text-navy-500 dark:text-navy-300 md:block">
          UTAS Social Network Analysis
        </h1>
      </div>

      <form onSubmit={handleSearch} className="hidden max-w-sm flex-1 sm:block">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search students by name or ID..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-navy-900 placeholder:text-slate-400 transition-colors focus:border-[#1E3A8A] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]/15 dark:border-navy-600 dark:bg-navy-800 dark:text-white dark:placeholder:text-navy-500 dark:focus:bg-navy-800"
          />
        </div>
      </form>

      <div className="flex shrink-0 items-center gap-1.5">
        {user?.role === 'admin' && (
          <button
            onClick={() => navigate('/users')}
            className="flex items-center gap-1.5 rounded-lg border border-[#1E3A8A]/20 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#1E3A8A] transition-colors hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
          >
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Admin Panel</span>
          </button>
        )}

        <button
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          className="rounded-lg p-2 text-navy-500 transition-colors hover:bg-slate-100 dark:text-navy-300 dark:hover:bg-navy-700"
          aria-label="Toggle theme"
        >
          {resolvedTheme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowNotifications((v) => !v)}
            className="rounded-lg p-2 text-navy-500 transition-colors hover:bg-slate-100 dark:text-navy-300 dark:hover:bg-navy-700"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
              <div className="absolute right-0 z-20 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-navy-700 dark:bg-navy-800">
                <div className="border-b border-slate-100 px-4 py-3 dark:border-navy-700">
                  <p className="text-sm font-semibold text-navy-900 dark:text-white">Notifications</p>
                </div>
                <p className="px-4 py-8 text-center text-sm text-slate-400 dark:text-navy-400">
                  No new notifications
                </p>
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="flex items-center gap-2 rounded-lg py-1.5 pl-1.5 pr-2.5 transition-colors hover:bg-slate-100 dark:hover:bg-navy-700"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E3A8A] text-xs font-semibold text-white">
              {initials}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium leading-tight text-navy-900 dark:text-white">
                {user?.full_name || user?.username}
              </p>
              <p className="text-[11px] capitalize leading-tight text-slate-400 dark:text-navy-400">{user?.role}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg dark:border-navy-700 dark:bg-navy-800">
                <button
                  onClick={() => {
                    navigate('/profile');
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-navy-700 hover:bg-slate-50 dark:text-navy-200 dark:hover:bg-navy-700"
                >
                  <UserIcon className="h-4 w-4" /> Profile
                </button>
                <button
                  onClick={() => {
                    navigate('/settings');
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-navy-700 hover:bg-slate-50 dark:text-navy-200 dark:hover:bg-navy-700"
                >
                  <SettingsIcon className="h-4 w-4" /> Settings
                </button>
                <hr className="my-1.5 border-slate-100 dark:border-navy-700" />
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
