import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import firebase from 'firebase/compat/app';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import DashboardLayout, { DashboardNavItem } from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import CopyButton from '../components/ui/CopyButton';
import Toast from '../components/ui/Toast';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonCard } from '../components/ui/Skeleton';
import {
  Package,
  Users,
  MessageSquare,
  GitBranch,
  BarChart3,
  Settings,
  Bell,
  ArrowLeft,
  Power,
  Trash2,
  Heart,
  MapPin,
} from 'lucide-react';

type WorkerDoc = {
  uid: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  createdBy?: string;
  branchId?: string;
  isActive?: boolean;
  companyName?: string;
  createdAt?: any;
};

type BranchDoc = {
  id: string;
  companyId: string;
  name: string;
  location: string;
  isActive: boolean;
};

type MessageDoc = {
  id: string;
  companyId: string;
  fromUid: string;
  fromName: string;
  fromEmail?: string;
  text: string;
  likedByAdmin?: boolean;
  createdAt?: any;
};

type ToastItem = { text: string; type: 'success' | 'error' } | null;

const s = (v: unknown) => String(v ?? '').trim();

const tsMillis = (t: any) => (t?.seconds ? Number(t.seconds) * 1000 : 0);

const toDateSafe = (t: any): Date | null => {
  if (!t) return null;
  if (typeof t.toDate === 'function') return t.toDate();
  if (t instanceof Date) return t;
  return null;
};

const NAV: DashboardNavItem[] = [
  { id: 'products', label: 'Products', icon: Package },
  { id: 'workers', label: 'Workers', icon: Users },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'branches', label: 'Branches', icon: GitBranch },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'activity', label: 'Activity', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const handleNavigate = (page: string) => {
  if (page === 'branches') { window.location.hash = '#/admin/branches'; return; }
  if (page === 'reports') { window.location.hash = '#/admin/reports'; return; }
  if (page === 'activity') { window.location.hash = '#/admin/activity'; return; }
  if (page === 'settings') { window.location.hash = '#/admin/settings'; return; }
  window.location.hash = `#/admin/${page}`;
};

const WorkerDetails: React.FC = () => {
  const { uid = '' } = useParams<{ uid: string }>();
  const { profile, user, signOut } = useAuth();
  const companyId = useMemo(() => s((profile as any)?.companyId || user?.uid || ''), [profile, user]);
  const companyName = useMemo(() => s((profile as any)?.companyName) || 'Company', [profile]);

  const [worker, setWorker] = useState<WorkerDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<BranchDoc[]>([]);
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [toast, setToast] = useState<ToastItem>(null);
  const toastTimer = useRef<number | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const unsubWorker = db.collection('users').doc(uid).onSnapshot(
      (doc) => {
        if (doc.exists) {
          setWorker({ uid: doc.id, ...(doc.data() as any) } as WorkerDoc);
        } else {
          setWorker(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('worker stream error:', err);
        setLoading(false);
      }
    );

    let unsubBranches: (() => void) | undefined;
    let unsubMessages: (() => void) | undefined;

    if (companyId) {
      unsubBranches = db
        .collection('branches')
        .where('companyId', '==', companyId)
        .onSnapshot(
          (snap) => {
            const list = snap.docs.map(
              (d) => ({ id: d.id, ...(d.data() as any) }) as BranchDoc
            );
            setBranches(list);
          },
          (err) => {
            console.error('worker branches stream error:', err);
          }
        );

      unsubMessages = db
        .collection('messages')
        .where('companyId', '==', companyId)
        .where('fromUid', '==', uid)
        .limit(8)
        .onSnapshot(
          (snap) => {
            const list = snap.docs.map(
              (d) => ({ id: d.id, ...(d.data() as any) }) as MessageDoc
            );
            list.sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt));
            setMessages(list);
          },
          (err) => {
            console.error('worker messages stream error:', err);
          }
        );
    }

    return () => {
      unsubWorker();
      if (unsubBranches) unsubBranches();
      if (unsubMessages) unsubMessages();
    };
  }, [uid, companyId]);

  const branch = useMemo(
    () => branches.find((b) => b.id === worker?.branchId) || null,
    [branches, worker]
  );

  const handleToggleActive = async () => {
    if (!worker) return;
    try {
      await db.collection('users').doc(worker.uid).update({
        isActive: !worker.isActive,
      });
      showToast(
        worker.isActive ? 'Worker deactivated.' : 'Worker activated.',
        'success'
      );
    } catch (err: any) {
      console.error('toggle active failed:', err);
      showToast(err?.message || 'Failed to update worker status.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!worker) return;
    if (!window.confirm(`Delete worker "${worker.name}"? This cannot be undone.`)) return;
    try {
      await db.collection('users').doc(worker.uid).delete();
      showToast('Worker deleted.', 'success');
      window.location.hash = '#/admin/workers';
    } catch (err: any) {
      console.error('delete worker failed:', err);
      showToast(err?.message || 'Failed to delete worker.', 'error');
    }
  };

  if (profile?.role !== 'admin') {
    return (
      <DashboardLayout
        title={s((profile as any)?.companyName) || 'Company'}
        subtitle="Admin panel"
        navItems={NAV}
        currentPage="workers"
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
      currentPage="workers"
      onNavigate={handleNavigate}
      onSignOut={signOut}
    >
      {toast && (
        <div className="fixed right-5 top-5 z-50">
          <Toast message={toast.text} type={toast.type} onDismiss={dismissToast} />
        </div>
      )}

      <div className="space-y-6">
        <Button
          variant="secondary"
          size="sm"
          iconLeft={<ArrowLeft className="h-4 w-4" />}
          onClick={() => { window.location.hash = '#/admin/workers'; }}
        >
          Back to Workers
        </Button>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : !worker ? (
          <Card border className="shadow-sm">
            <EmptyState
              icon={<Users className="h-8 w-8" />}
              title="Worker not found"
              description="This worker profile does not exist or has been removed."
              action={
                <Button
                  variant="secondary"
                  iconLeft={<ArrowLeft className="h-4 w-4" />}
                  onClick={() => { window.location.hash = '#/admin/workers'; }}
                >
                  Back to Workers
                </Button>
              }
            />
          </Card>
        ) : (
          <>
            <Card border className="shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Avatar name={worker.name} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-2xl font-bold text-ink">{worker.name}</h1>
                    <Badge variant="info">{worker.role}</Badge>
                    <Badge variant={worker.isActive === false ? 'danger' : 'success'}>
                      {worker.isActive === false ? 'Inactive' : 'Active'}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5 text-sm text-muted">
                      <span className="truncate">{worker.email}</span>
                      <CopyButton text={worker.email} />
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted">
                    <span className="font-mono">ID: {worker.uid}</span>
                    {worker.createdAt && (
                      <span>
                        Created: {toDateSafe(worker.createdAt)?.toLocaleDateString() || 'N/A'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card border className="shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-ink">Actions</h2>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="secondary"
                    iconLeft={<Power className="h-4 w-4" />}
                    onClick={handleToggleActive}
                  >
                    {worker.isActive === false ? 'Activate' : 'Deactivate'}
                  </Button>
                  <Button
                    variant="danger"
                    iconLeft={<Trash2 className="h-4 w-4" />}
                    onClick={handleDelete}
                  >
                    Delete Worker
                  </Button>
                </div>
              </Card>

              <Card border className="shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-ink">Branch Info</h2>
                {branch ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-ink">
                      <MapPin className="h-4 w-4 text-brand" />
                      <span className="font-semibold">{branch.name}</span>
                    </div>
                    <p className="text-sm text-muted">{branch.location}</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted">Unassigned</p>
                    <p className="mt-1 text-xs text-muted/70">
                      This worker has not been assigned to a branch.
                    </p>
                  </div>
                )}
              </Card>
            </div>

            <Card border className="shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-ink">Recent Messages</h2>
              {messages.length === 0 ? (
                <EmptyState
                  icon={<MessageSquare className="h-6 w-6" />}
                  title="No messages"
                  description="This worker hasn't sent any messages yet."
                />
              ) : (
                <div className="divide-y divide-line">
                  {messages.map((m) => (
                    <div key={m.id} className="flex items-start gap-3 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-pre-line text-sm text-ink/80">{m.text}</p>
                        <div className="mt-1.5 flex items-center gap-3 text-xs text-muted">
                          <span>
                            {toDateSafe(m.createdAt)?.toLocaleString() || 'Just now'}
                          </span>
                        </div>
                      </div>
                      {m.likedByAdmin && (
                        <Heart className="h-4 w-4 shrink-0 fill-current text-pink-400 mt-0.5" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default WorkerDetails;
