import { useState, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  ChevronRight,
  Menu,
  X,
  CalendarDays,
} from 'lucide-react';
import Avatar from '../ui/Avatar';

const defaultNavItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Products', href: '/dashboard/products', icon: Package },
  { label: 'Workers', href: '/dashboard/workers', icon: Users },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
}

export interface DashboardNavItem {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
}

interface BaseDashboardLayoutProps {
  children: ReactNode;
  userName?: string;
  userAvatar?: string;
}

interface FlexibleDashboardLayoutProps extends BaseDashboardLayoutProps {
  title?: string;
  subtitle?: string;
  navItems?: DashboardNavItem[];
  currentPage?: string;
  onNavigate?: (page: string) => void;
  onSignOut?: () => void;
  unreadCount?: number;
}

type DashboardLayoutProps = FlexibleDashboardLayoutProps;

export default function DashboardLayout({
  children,
  userName = 'User',
  userAvatar,
  title,
  subtitle,
  navItems,
  currentPage,
  onNavigate,
  onSignOut,
  unreadCount = 0,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const isFlexible = Boolean(navItems);

  if (isFlexible && title && currentPage && onNavigate && onSignOut) {
    const activeLabel =
      navItems?.find((item) => item.id === currentPage)?.label || 'Dashboard';

    return (
      <div className="flex min-h-screen bg-navy-900 text-ink">
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-navy-950/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`
            fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-navy-800 border-r border-line
            transition-transform duration-300 ease-out lg:static lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="relative overflow-hidden border-b border-line">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-brand/5 blur-3xl" />
            <div className="relative flex h-24 items-center gap-3.5 px-6">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/95 p-1.5 ring-1 ring-line shadow-lg shadow-black/40">
                <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
              </div>
              <div className="min-w-0 leading-tight">
                <div className="truncate text-base font-extrabold text-ink">{title}</div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-xs font-medium text-muted">{subtitle}</span>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="ml-auto lg:hidden p-2 rounded-xl text-muted hover:text-ink hover:bg-white/10 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-5">
            <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-widest text-muted">
              Menu
            </div>
            <div className="space-y-1.5">
              {navItems.map((item) => {
                const isMessages = item.id === 'messages';
                const showBadge = isMessages && unreadCount > 0;
                const active = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSidebarOpen(false);
                      onNavigate(item.id);
                    }}
                    className={`
                      group relative flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold
                      transition-all duration-200 cursor-pointer
                      ${
                        active
                          ? 'bg-brand text-navy-950 shadow-lg shadow-black/40'
                          : 'text-muted hover:bg-white/5 hover:text-ink'
                      }
                    `}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-navy-950/40" />
                    )}
                    <span className="relative shrink-0">
                      <item.icon className="h-5 w-5" />
                      {showBadge && (
                        <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-navy-800" />
                      )}
                    </span>
                    <span className="flex-1 text-left">{item.label}</span>
                    {showBadge && (
                      <span
                        className={`grid min-w-6 place-items-center rounded-full px-2 py-0.5 text-xs font-bold ${
                          active ? 'bg-navy-950 text-brand' : 'bg-red-500 text-white'
                        }`}
                      >
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-line p-4">
            <button
              onClick={onSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 px-4 py-3 text-sm font-semibold text-ink transition-all cursor-pointer hover:bg-red-500/15 hover:text-red-300"
            >
              <LogOut className="h-5 w-5" />
              Sign out
            </button>
          </div>
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-line bg-navy-900/80 backdrop-blur-xl px-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-xl text-muted hover:bg-white/5 cursor-pointer"
              >
                <Menu className="h-5 w-5" />
              </button>
              <ChevronRight className="hidden h-4 w-4 text-line lg:block" />
              <div className="text-sm font-bold text-ink">{activeLabel}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-muted ring-1 ring-line md:flex">
                <CalendarDays className="h-3.5 w-3.5" />
                {new Date().toLocaleDateString('en-GB', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => onNavigate('messages')}
                  className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-400 ring-1 ring-red-500/30 transition-colors hover:bg-red-500/25 cursor-pointer"
                >
                  <span className="mr-1 inline-flex h-2 w-2 rounded-full bg-red-400" />
                  {unreadCount > 99 ? '99+' : unreadCount} new message{unreadCount > 1 ? 's' : ''}
                </button>
              )}
              <div className="flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400 ring-1 ring-emerald-500/30">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Realtime
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div>{children}</div>
          </main>
        </div>
      </div>
    );
  }

  const breadcrumb = location.pathname
    .split('/')
    .filter(Boolean)
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1));

  return (
    <div className="flex h-screen bg-navy-900 overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy-800 border-r border-line
          transition-transform duration-300 ease-out lg:static lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex h-16 items-center justify-between px-5 border-b border-line">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-xl bg-white/95 p-1 ring-1 ring-line">
              <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
            </div>
            <span className="text-lg font-bold tracking-tight text-ink">
              New Generation <span className="text-brand">Hardware</span>
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-lg text-muted hover:text-ink hover:bg-white/5 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {defaultNavItems.map((item) => {
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200
                  ${active
                    ? 'bg-brand text-navy-950 font-bold'
                    : 'text-muted hover:bg-white/5 hover:text-ink'
                  }
                `}
              >
                <item.icon className={`h-5 w-5 ${active ? 'text-navy-950' : ''}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line p-3">
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer">
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center justify-between border-b border-line bg-navy-900/80 backdrop-blur-xl px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-muted hover:bg-white/5 cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted">
              {breadcrumb.map((seg, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
                  <span className={i === breadcrumb.length - 1 ? 'text-ink font-medium' : ''}>
                    {seg}
                  </span>
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-xl text-muted hover:text-ink hover:bg-white/5 transition-colors cursor-pointer">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>
            <div className="hidden sm:block h-6 w-px bg-line" />
            <div className="hidden sm:flex items-center gap-2.5">
              <Avatar src={userAvatar} name={userName} size="sm" />
              <span className="text-sm font-medium text-ink">{userName}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}