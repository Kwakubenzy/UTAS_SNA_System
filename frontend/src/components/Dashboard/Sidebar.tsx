import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Link2,
  BarChart3,
  Share2,
  FileText,
  Target,
  UserCog,
  Settings as SettingsIcon,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRIMARY_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/connections', label: 'Connections', icon: Link2 },
  { to: '/analysis', label: 'Analysis', icon: BarChart3 },
  { to: '/network', label: 'Network Graph', icon: Share2 },
  { to: '/reports', label: 'Reports', icon: FileText },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const isCampaignManager = user?.role === 'campaign_manager';

  const linkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3.5 rounded-lg px-4 py-3 text-[15px] font-medium transition-colors ${
      isActive
        ? 'bg-[#9FE870] text-[#163300]'
        : 'text-[#D3F0B5] hover:bg-[#234A0C] hover:text-white'
    }`;

  const handleLogout = async () => {
    onClose();
    await logout();
    navigate('/login');
  };

  const content = (
    <div className="flex h-full flex-col bg-[#163300]">
      <div className="flex items-center justify-between border-b border-[#2A5210] px-5 py-5">
        <div className="flex items-center gap-2.5">
          <img src="/utas-logo.png" alt="UTAS logo" className="h-8 w-8 object-contain" />
          <div>
            <p className="text-sm font-bold leading-tight text-white">UTAS SNA</p>
            <p className="text-[11px] leading-tight text-[#9CC873]">Analytics Platform</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-1 text-[#D3F0B5] hover:bg-[#234A0C] lg:hidden">
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3.5 py-5">
        <p className="px-4 pb-2.5 pt-1 text-xs font-semibold uppercase tracking-wider text-[#8AB562]">Main</p>
        {PRIMARY_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={linkClasses} onClick={onClose}>
            <Icon className="h-5 w-5 shrink-0" />
            {label}
          </NavLink>
        ))}

        {(isCampaignManager || isAdmin) && (
          <>
            <p className="px-4 pb-2.5 pt-6 text-xs font-semibold uppercase tracking-wider text-[#8AB562]">
              Campaigns
            </p>
            <NavLink to="/campaigns" className={linkClasses} onClick={onClose}>
              <Target className="h-5 w-5 shrink-0" />
              Campaigns
            </NavLink>
          </>
        )}

        {isAdmin && (
          <>
            <p className="px-4 pb-2.5 pt-6 text-xs font-semibold uppercase tracking-wider text-[#8AB562]">
              Administration
            </p>
            <NavLink to="/users" className={linkClasses} onClick={onClose}>
              <UserCog className="h-5 w-5 shrink-0" />
              Users
            </NavLink>
          </>
        )}
      </nav>

      <div className="space-y-1.5 border-t border-[#2A5210] px-3.5 py-5">
        <NavLink to="/settings" className={linkClasses} onClick={onClose}>
          <SettingsIcon className="h-5 w-5 shrink-0" />
          Settings
        </NavLink>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3.5 rounded-lg px-4 py-3 text-[15px] font-medium text-[#D3F0B5] transition-colors hover:bg-[#234A0C] hover:text-white"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Logout
        </button>
        <p className="px-4 pt-3 text-xs text-[#8AB562]">UTAS SNA System &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Fixed desktop sidebar */}
      <aside className="hidden w-72 shrink-0 lg:block">{content}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={onClose} />
          <aside className="absolute inset-y-0 left-0 w-72 shadow-xl">{content}</aside>
        </div>
      )}
    </>
  );
};
