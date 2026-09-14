import { Package, Users, MessageSquare, GitBranch, BarChart3, Bell, Settings } from 'lucide-react';
import { DashboardNavItem } from '../components/layout/DashboardLayout';

export type AdminPage =
  | 'products'
  | 'workers'
  | 'messages'
  | 'branches'
  | 'reports'
  | 'activity'
  | 'settings';

export const adminNavItems: DashboardNavItem[] = [
  { id: 'products', label: 'Products', icon: Package },
  { id: 'workers', label: 'Workers', icon: Users },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'branches', label: 'Branches', icon: GitBranch },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'activity', label: 'Activity', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const TAB_PAGES: AdminPage[] = ['products', 'workers', 'messages'];

/**
 * Single source of truth for admin navigation.
 * - Branches / Reports / Activity / Settings are real hash routes.
 * - Products / Workers / Messages are tabs inside the AdminDashboard page,
 *   so we jump back to `#/admin`. The dashboard always opens on Products.
 * Never builds a hash for a route that doesn't exist (that would bounce the
 * user to the auth page via the catch-all).
 */
export function navigateToAdminPage(page: string) {
  if (TAB_PAGES.includes(page as AdminPage)) {
    window.location.hash = '#/admin';
  } else {
    window.location.hash = `#/admin/${page}`;
  }
}

export function isTabPage(page: string): page is 'products' | 'workers' | 'messages' {
  return TAB_PAGES.includes(page as AdminPage);
}

/** Initial tab for the AdminDashboard when arriving at `#/admin`. */
export function initialAdminTab(): 'products' | 'workers' | 'messages' {
  return 'products';
}