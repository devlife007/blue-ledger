import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import firebase from 'firebase/compat/app';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import DashboardLayout, { DashboardNavItem } from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Toast from '../components/ui/Toast';
import CopyButton from '../components/ui/CopyButton';
import {
  Package,
  Users,
  MessageSquare,
  GitBranch,
  BarChart3,
  Settings as SettingsIcon,
  Bell,
  Save,
  LogOut,
  Mail,
  Building2,
} from 'lucide-react';

type ToastItem = { text: string; type: 'success' | 'error' } | null;

type BranchDoc = {
  id: string;
  companyId: string;
  name: string;
  location: string;
  isActive: boolean;
};

type WorkerDoc = {
  uid: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  isActive?: boolean;
};

const s = (v: unknown) => String(v ?? '').trim();

const tsSeconds = (t: any) => (t?.seconds ? Number(t.seconds) : 0);

const NAV: DashboardNavItem[] = [
  { id: 'products', label: 'Products', icon: Package },
  { id: 'workers', label: 'Workers', icon: Users },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'branches', label: 'Branches', icon: GitBranch },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'activity', label: 'Activity', icon: Bell },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

const handleNavigate = (page: string) => {
  if (page === 'branches') { window.location.hash = '#/admin/branches'; return; }
  if (page === 'reports') { window.location.hash = '#/admin/reports'; return; }
  if (page === 'activity') { window.location.hash = '#/admin/activity'; return; }
  if (page === 'settings') { window.location.hash = '#/admin/settings'; return; }
  window.location.hash = `#/admin/${page}`;
};

const Settings: React.FC = () => {
  const { profile, user, signOut } = useAuth();
  const companyId = useMemo(() => s((profile as any)?.companyId || user?.uid || ''), [profile, user]);
  const adminUid = useMemo(() => s(profile?.uid || user?.uid || ''), [profile, user]);
  const companyName = useMemo(() => s((profile as any)?.companyName) || 'Company', [profile]);

  const [companyNameInput, setCompanyNameInput] = useState(companyName);
  const [saving, setSaving] = useState(false);
  const [branches, setBranches] = useState<BranchDoc[]>([]);
  const [workerCount, setWorkerCount] = useState(0);
  const [toast, setToast] = useState<ToastItem>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    setCompanyNameInput(companyName);
  }, [companyName]);

  useEffect(() => {
    if (!companyId) return;

    const unsubBranches = db
      .collection('branches')
      .where('companyId', '==', companyId)
      .onSnapshot(
        (snap) => {
          const list = snap.docs.map(
            (d) => ({ id: d.id, ...(d.data() as any) }) as BranchDoc
          );
          list.sort((a, b) => tsSeconds(b.createdAt) - tsSeconds(a.createdAt));
          setBranches(list);
        },
        (err) => {
          console.error('settings branches stream error:', err);
        }
      );

    const unsubWorkers = db
      .collection('users')
      .where('companyId', '==', companyId)
      .where('role', '==', 'worker')
      .onSnapshot(
        (snap) => {
          setWorkerCount(snap.size);
        },
        (err) => {
          console.error('settings workers stream error:', err);
        }
      );

    return () => {
      unsubBranches();
      unsubWorkers();
    };
  }, [companyId]);

  const handleSaveCompany = async () => {
    const name = companyNameInput.trim();
    if (!name) return showToast('Company name cannot be empty.', 'error');
    setSaving(true);
    try {
      await db.collection('companies').doc(companyId).update({ companyName: name });
      await db.collection('users').doc(adminUid).update({ companyName: name });
      showToast('Company profile updated.', 'success');
    } catch (err: any) {
      console.error('save company failed:', err);
      showToast(err?.message || 'Failed to update company.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const ownerEmail = s(user?.email || profile?.email || '');

  if (profile?.role !== 'admin') {
    return (
      <DashboardLayout
        title={s((profile as any)?.companyName) || 'Company'}
        subtitle="Admin panel"
        navItems={NAV}
        currentPage="settings"
        onNavigate={handleNavigate}
        onSignOut={signOut}
      >
        <div className="flex h-full items-center justify-center">
          <Card className="max-w-md text-center border border-line">
            <h1 className="text-2xl font-bold text-ink">Unauthorized</h1>
            <p className="mt-2 text-muted">You do not have permission to access this page.</p>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={companyName}
      subtitle="Admin panel"
      navItems={NAV}
      currentPage="settings"
      onNavigate={handleNavigate}
      onSignOut={signOut}
    >
      {toast && (
        <div className="fixed right-5 top-5 z-50">
          <Toast message={toast.text} type={toast.type} onDismiss={dismissToast} />
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">Settings</h1>
          <p className="mt-1 text-sm text-muted">
            Manage your company profile and account details.
          </p>
        </div>

        <Card border className="shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-ink">Company Profile</h2>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Input
                label="Company Name"
                value={companyNameInput}
                onChange={(e) => setCompanyNameInput(e.target.value)}
                placeholder="Your company name"
              />
            </div>
            <Button
              iconLeft={<Save className="h-4 w-4" />}
              onClick={handleSaveCompany}
              loading={saving}
            >
              Save
            </Button>
          </div>
        </Card>

        <Card border className="shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-ink">Company Info</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-navy-800 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted">
                <Mail className="h-4 w-4" />
                Owner Email
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-ink">{ownerEmail || 'N/A'}</span>
                {ownerEmail && <CopyButton text={ownerEmail} />}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-navy-800 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted">
                <Building2 className="h-4 w-4" />
                Company ID
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-ink">{companyId}</span>
                <CopyButton text={companyId} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-navy-800 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted">
                <Users className="h-4 w-4" />
                Account Role
              </div>
              <Badge variant="info">Administrator</Badge>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-navy-800 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted">
                <Users className="h-4 w-4" />
                Workers
              </div>
              <span className="text-sm font-medium text-ink">{workerCount}</span>
            </div>
          </div>
        </Card>

        <Card border className="shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink">Branches</h2>
            <Button
              variant="ghost"
              size="sm"
              iconLeft={<GitBranch className="h-4 w-4" />}
              onClick={() => { window.location.hash = '#/admin/branches'; }}
            >
              Manage Branches
            </Button>
          </div>
          {branches.length === 0 ? (
            <p className="text-sm text-muted">No branches created yet.</p>
          ) : (
            <div className="divide-y divide-line">
              {branches.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-ink">{b.name}</div>
                    <div className="text-xs text-muted">{b.location}</div>
                  </div>
                  <Badge variant={b.isActive ? 'success' : 'danger'}>
                    {b.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="border border-red-500/30 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-red-400">Danger Zone</h2>
          <Button
            variant="danger"
            iconLeft={<LogOut className="h-4 w-4" />}
            onClick={signOut}
          >
            Sign out of this device
          </Button>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Settings;
