import { NavLink } from 'react-router-dom';
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleUser,
  Clock,
  LayoutDashboard,
  Lock,
  LogOut,
  ScanLine,
  ScrollText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import Brand from '../Brand';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../lib/constants';
import { avatarGradient, cn, initials } from '../../lib/utils';

const NAV_BY_ROLE = {
  super_admin: [
    { to: '/', label: 'Platform overview', icon: LayoutDashboard, end: true },
    { to: '/organizers', label: 'Organizers', icon: Users },
    { to: '/reports', label: 'Reports', icon: BarChart3 },
    { to: '/audit-logs', label: 'Audit logs', icon: ScrollText },
    { to: '/account', label: 'My account', icon: CircleUser },
    { to: '/admin/settings', label: 'Global settings', icon: SlidersHorizontal },
  ],
  organizer: [
    { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/ushers', label: 'Gate accounts', icon: Users },
    { to: '/usher-shifts', label: 'Usher shifts', icon: Clock },
    { to: '/gate-logs', label: 'Gate logs', icon: ScanLine },
    { to: '/settings', label: 'Settings', icon: Settings },
  ],
};

function NavItem({ item, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition',
          isActive
            ? 'bg-gradient-to-r from-accent-500/20 to-accent-500/[0.04] text-white'
            : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-100',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent-400 transition-all',
              isActive ? 'opacity-100' : 'opacity-0',
            )}
          />
          <Icon className={cn('h-[18px] w-[18px] transition', isActive ? 'text-accent-300' : 'text-slate-500 group-hover:text-slate-300')} />
          <span>{item.label}</span>
          {item.badge ? (
            <span className="ml-auto rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-slate-400">
              {item.badge}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const role = user?.role ?? 'organizer';
  const isSuperAdmin = role === 'super_admin';
  const navItems = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.organizer;
  const WorkspaceIcon = isSuperAdmin ? ShieldCheck : CalendarDays;
  const workspaceTitle = isSuperAdmin ? 'Fahari platform' : `${user?.name?.split(' ')[0] || 'Organizer'}'s workspace`;
  const workspaceSubtitle = isSuperAdmin ? 'Super admin · global scope' : 'Organizer workspace';

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pb-6 pt-6">
        <Brand />
        <button type="button" onClick={onClose} className="icon-btn lg:hidden" aria-label="Close navigation">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4">
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
          <WorkspaceIcon className="h-4 w-4 text-accent-300" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-200">{workspaceTitle}</p>
            <p className="truncate text-[10px] text-slate-500">{workspaceSubtitle}</p>
          </div>
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-400/10 text-emerald-300">
            <ShieldCheck className="h-3 w-3" />
          </span>
        </div>
      </div>

      <nav className="mt-6 flex-1 space-y-1 overflow-y-auto px-4">
        <p className="mb-2 px-3 text-[9px] font-bold uppercase tracking-[0.24em] text-slate-600">
          {isSuperAdmin ? 'Platform' : 'Workspace'}
        </p>
        {navItems.map((item) => (
          <NavItem key={item.to} item={item} onNavigate={onClose} />
        ))}

        {isSuperAdmin ? (
          <div className="mt-7 rounded-2xl border border-accent-400/15 bg-gradient-to-b from-accent-500/[0.12] to-transparent p-4">
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent-400/20 bg-accent-500/15 text-accent-300">
                <Lock className="h-4 w-4" />
              </span>
              <Sparkles className="h-4 w-4 text-gold/70" />
            </div>
            <p className="mt-3 text-sm font-semibold text-white">Guest privacy</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              Organizer guest data, QR tokens, and gate scans are blocked for platform admins.
            </p>
            <NavLink
              to="/audit-logs"
              onClick={onClose}
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-accent-300 transition hover:text-accent-200"
            >
              Review audit trail
              <ArrowUpRight className="h-3 w-3" />
            </NavLink>
          </div>
        ) : (
          <div className="mt-7 rounded-2xl border border-accent-400/15 bg-gradient-to-b from-accent-500/[0.12] to-transparent p-4">
            <div className="flex items-center justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent-400/20 bg-accent-500/15 text-accent-300">
                <ScanLine className="h-4 w-4" />
              </span>
              <Sparkles className="h-4 w-4 text-gold/70" />
            </div>
            <p className="mt-3 text-sm font-semibold text-white">Gate scanner</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              Create an usher account inside any event, then sign in to the Expo scanner with it.
            </p>
            <NavLink
              to="/ushers"
              onClick={onClose}
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-accent-300 transition hover:text-accent-200"
            >
              Create gate accounts
              <ArrowUpRight className="h-3 w-3" />
            </NavLink>
          </div>
        )}
      </nav>

      <div className="px-4 pb-5 pt-4">
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] p-2.5">
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-bold text-white',
              avatarGradient(user?.name),
            )}
          >
            {initials(user?.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-200">{user?.name}</p>
            <p className="truncate text-[10px] text-slate-500">{ROLE_LABELS[user?.role] ?? user?.role}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-rose-300"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] border-r border-white/[0.06] bg-ink-900/95 backdrop-blur-xl lg:block">
        {content}
      </aside>

      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          open ? 'pointer-events-auto' : 'pointer-events-none',
        )}
        aria-hidden={!open}
      >
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onClose}
          className={cn(
            'absolute inset-0 bg-ink-950/80 backdrop-blur-sm transition-opacity duration-300',
            open ? 'opacity-100' : 'opacity-0',
          )}
        />
        <aside
          className={cn(
            'absolute inset-y-0 left-0 w-[284px] border-r border-white/10 bg-ink-900 shadow-2xl transition-transform duration-300',
            open ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {content}
        </aside>
      </div>
    </>
  );
}
