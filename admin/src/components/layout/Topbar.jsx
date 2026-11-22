import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, ChevronDown, CircleUser, KeyRound, LogOut, Menu, Settings, Sparkles } from 'lucide-react';
import { ROLE_LABELS } from '../../lib/constants';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { avatarGradient, cn, initials } from '../../lib/utils';

const LABELS = [
  { match: /^\/events\//, label: 'Event studio' },
  { match: /^\/ushers/, label: 'Gate accounts' },
  { match: /^\/gate-logs/, label: 'Gate logs' },
  { match: /^\/organizers/, label: 'Organizers' },
  { match: /^\/audit-logs/, label: 'Audit logs' },
  { match: /^\/account/, label: 'My account' },
  { match: /^\/admin\/settings/, label: 'Global settings' },
  { match: /^\/settings/, label: 'Settings' },
  { match: /^\//, label: 'Overview' },
];

export default function Topbar({ onMenu }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const label = LABELS.find((item) => item.match.test(location.pathname))?.label ?? 'Workspace';
  const isSuperAdmin = user?.role === 'super_admin';
  const settingsPath = isSuperAdmin ? '/admin/settings' : '/settings';

  useEffect(() => {
    const onPointerDown = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const today = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/75 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button type="button" onClick={onMenu} className="icon-btn lg:hidden" aria-label="Open navigation">
          <Menu className="h-4 w-4" />
        </button>

        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="hidden text-slate-600 sm:inline">Fahari</span>
          <span className="hidden text-slate-700 sm:inline">/</span>
          <span className="truncate font-semibold text-slate-200">{label}</span>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="hidden items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-slate-400 md:inline-flex">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                'bg-emerald-400',
                'animate-pulse-soft',
              )}
            />
            Live API connected
          </span>
          <span className="hidden text-xs text-slate-500 lg:block">{today}</span>

          <button
            type="button"
            onClick={() => toast.info('You are all caught up', 'No new gate alerts or invitations need attention.')}
            className="icon-btn relative"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent-400 ring-2 ring-ink-950" />
          </button>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] py-1.5 pl-1.5 pr-2 transition hover:border-white/15 hover:bg-white/[0.06]"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br text-[10px] font-bold text-white',
                  avatarGradient(user?.name),
                )}
              >
                {initials(user?.name)}
              </span>
              <span className="hidden max-w-[110px] truncate text-xs font-semibold text-slate-300 sm:block">
                {user?.name?.split(' ')[0]}
              </span>
              <ChevronDown className={cn('h-3.5 w-3.5 text-slate-500 transition', menuOpen && 'rotate-180')} />
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-12 w-64 animate-scale-in overflow-hidden rounded-2xl border border-white/10 bg-ink-850 p-1.5 shadow-card"
              >
                <div className="border-b border-white/[0.06] px-3 py-3">
                  <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
                  <p className="truncate text-xs text-slate-500">{user?.email}</p>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-accent-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-300">
                    <Sparkles className="h-2.5 w-2.5" />
                    {ROLE_LABELS[user?.role] ?? user?.role}
                  </span>
                </div>
                <Link
                  to={settingsPath}
                  className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                  role="menuitem"
                >
                  <Settings className="h-4 w-4 text-slate-500" />
                  {isSuperAdmin ? 'Global settings' : 'Workspace settings'}
                </Link>
                {isSuperAdmin ? (
                  <Link
                    to="/account"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                    role="menuitem"
                  >
                    <CircleUser className="h-4 w-4 text-slate-500" />
                    My account
                  </Link>
                ) : null}
                <Link
                  to="/change-password"
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.05] hover:text-white"
                  role="menuitem"
                >
                  <KeyRound className="h-4 w-4 text-slate-500" />
                  Change password
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-slate-300 transition hover:bg-rose-500/10 hover:text-rose-300"
                  role="menuitem"
                >
                  <LogOut className="h-4 w-4 text-slate-500" />
                  Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
