import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import firebase from 'firebase/compat/app';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { adminNavItems, navigateToAdminPage } from '../navigation/adminNav';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { SkeletonCard } from '../components/ui/Skeleton';
import Toast from '../components/ui/Toast';
import CopyButton from '../components/ui/CopyButton';
import EmptyState from '../components/ui/EmptyState';
import {
  Building2,
  Plus,
  MapPin,
  FileText,
  Trash2,
  Users,
  UserPlus,
  FolderOpen,
  Loader2,
  X,
} from 'lucide-react';

type ToastItem = { text: string; type: 'success' | 'error' } | null;

type BranchDoc = {
  id: string;
  companyId: string;
  name: string;
  location: string;
  description?: string;
  isActive: boolean;
  createdBy: string;
  createdAt?: any;
};

type WorkerDoc = {
  uid: string;
  name: string;
  email: string;
  role: string;
  companyId: string;
  createdBy: string;
  branchId?: string;
  isActive?: boolean;
  createdAt?: any;
};

const tsSeconds = (t: any) => (t?.seconds ? Number(t.seconds) : 0);

const s = (v: unknown) => String(v ?? '').trim();

const Branches: React.FC = () => {
  const { profile, user, signOut } = useAuth();
  const companyId = useMemo(
    () => String((profile as any)?.companyId || user?.uid || '').trim(),
    [profile, user]
  );
  const adminUid = useMemo(() => String(profile?.uid || user?.uid || ''), [profile, user]);

  const [branches, setBranches] = useState<BranchDoc[]>([]);
  const [workers, setWorkers] = useState<WorkerDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', location: '', description: '' });
  const [creating, setCreating] = useState(false);

  const [showWorkersModal, setShowWorkersModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<BranchDoc | null>(null);
  const [branchWorkers, setBranchWorkers] = useState<WorkerDoc[]>([]);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedBranchForAssign, setSelectedBranchForAssign] = useState<BranchDoc | null>(null);
  const [assignWorkerId, setAssignWorkerId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const [toast, setToast] = useState<ToastItem>(null);
  const toastTimer = useRef<number | null>(null);
  const showToast = useCallback((text: string, type: 'success' | 'error') => {
    setToast({ text, type });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);

    const unsubBranches = db
      .collection('branches')
      .where('companyId', '==', companyId)
      .onSnapshot(
        (snap) => {
          const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as BranchDoc[];
          list.sort((a, b) => tsSeconds(b.createdAt) - tsSeconds(a.createdAt));
          setBranches(list);
          setLoading(false);
        },
        (err) => {
          console.error('branches stream error:', err);
          setLoading(false);
        }
      );

    const unsubWorkers = db
      .collection('users')
      .where('companyId', '==', companyId)
      .onSnapshot(
        (snap) => {
          const list = snap.docs.map((d) => d.data() as WorkerDoc);
          setWorkers(list);
        },
        (err) => {
          console.error('workers stream error:', err);
        }
      );

    return () => {
      unsubBranches();
      unsubWorkers();
    };
  }, [companyId]);

  const workerCountByBranch = useMemo(() => {
    const map: Record<string, number> = {};
    for (const w of workers) {
      if (w.branchId) {
        map[w.branchId] = (map[w.branchId] || 0) + 1;
      }
    }
    return map;
  }, [workers]);

  const unassignedWorkers = useMemo(
    () => workers.filter((w) => !w.branchId && w.role === 'worker'),
    [workers]
  );

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !adminUid) return;
    const name = createForm.name.trim();
    const location = createForm.location.trim();
    if (!name || !location) return showToast('Name and location are required.', 'error');

    setCreating(true);
    try {
      await db.collection('branches').add({
        companyId,
        name,
        location,
        description: createForm.description.trim(),
        isActive: true,
        createdBy: adminUid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      setCreateForm({ name: '', location: '', description: '' });
      setShowCreateModal(false);
      showToast('Branch created successfully.', 'success');
    } catch (err: any) {
      console.error('create branch failed:', err);
      showToast(err?.message || 'Failed to create branch.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteBranch = useCallback(
    async (branch: BranchDoc) => {
      if (!window.confirm(`Delete branch "${branch.name}"? This will not reassign workers.`)) return;
      try {
        await db.collection('branches').doc(branch.id).delete();
        showToast('Branch deleted.', 'success');
      } catch (err: any) {
        showToast(err?.message || 'Failed to delete branch.', 'error');
      }
    },
    [showToast]
  );

  const openWorkersModal = useCallback(
    (branch: BranchDoc) => {
      setSelectedBranch(branch);
      setBranchWorkers(workers.filter((w) => w.branchId === branch.id));
      setShowWorkersModal(true);
    },
    [workers]
  );

  const openAssignModal = useCallback((branch: BranchDoc) => {
    setSelectedBranchForAssign(branch);
    setAssignWorkerId('');
    setShowAssignModal(true);
  }, []);

  const handleAssignWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBranchForAssign || !assignWorkerId) return;
    setAssigning(true);
    try {
      await db.collection('users').doc(assignWorkerId).update({
        branchId: selectedBranchForAssign.id,
      });
      showToast('Worker assigned to branch.', 'success');
      setShowAssignModal(false);
    } catch (err: any) {
      showToast(err?.message || 'Failed to assign worker.', 'error');
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignWorker = useCallback(
    async (worker: WorkerDoc) => {
      if (!window.confirm(`Remove ${worker.name} from this branch?`)) return;
      try {
        await db.collection('users').doc(worker.uid).update({
          branchId: firebase.firestore.FieldValue.delete(),
        });
        showToast('Worker unassigned.', 'success');
        setBranchWorkers((prev) => prev.filter((w) => w.uid !== worker.uid));
      } catch (err: any) {
        showToast(err?.message || 'Failed to unassign worker.', 'error');
      }
    },
    [showToast]
  );

  if (profile?.role !== 'admin') {
    return (
      <DashboardLayout
        title={s((profile as any)?.companyName) || 'Company'}
        subtitle="Admin panel"
        navItems={adminNavItems}
        currentPage="branches"
        onNavigate={navigateToAdminPage}
        onSignOut={signOut}
      >
        <div className="flex h-full items-center justify-center">
          <div className="rounded-2xl bg-navy-700 p-8 text-center shadow-xl border border-line">
            <h1 className="text-2xl font-bold text-ink">Unauthorized</h1>
            <p className="mt-2 text-muted">You do not have permission to access this page.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={s((profile as any)?.companyName) || 'Company'}
      subtitle="Admin panel"
      navItems={adminNavItems}
      currentPage="branches"
      onNavigate={navigateToAdminPage}
      onSignOut={signOut}
    >
      {toast && (
        <div className="fixed right-5 top-5 z-50">
          <Toast message={toast.text} type={toast.type} onDismiss={dismissToast} />
        </div>
      )}

      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-ink">
              Branch Management
            </h1>
            <p className="mt-1 text-sm text-muted">
              Create and manage company branches, assign workers, and track locations.
            </p>
          </div>
          <Button
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            Create Branch
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : branches.length === 0 ? (
          <div className="rounded-2xl border border-line bg-navy-700 p-12">
            <EmptyState
              icon={<Building2 className="h-8 w-8" />}
              title="No branches yet"
              description="Create your first branch to start organizing workers by location."
              action={
                <Button
                  iconLeft={<Plus className="h-4 w-4" />}
                  onClick={() => setShowCreateModal(true)}
                >
                  Create Branch
                </Button>
              }
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="group rounded-2xl border border-line bg-navy-700 p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-navy-950 shadow-lg shadow-black/40">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      branch.isActive
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-white/5 text-muted'
                    }`}
                  >
                    {branch.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <h3 className="mb-1 text-lg font-bold text-ink">{branch.name}</h3>
                <div className="mb-2 flex items-center gap-1.5 text-sm text-muted">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {branch.location}
                </div>
                {branch.description && (
                  <p className="mb-4 flex items-start gap-1.5 text-sm text-muted line-clamp-2">
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {branch.description}
                  </p>
                )}

                <div className="mb-5 flex items-center gap-1.5 rounded-2xl bg-navy-800 px-3 py-2 text-sm font-medium text-muted">
                  <Users className="h-4 w-4 text-muted" />
                  {workerCountByBranch[branch.id] || 0} worker
                  {(workerCountByBranch[branch.id] || 0) !== 1 ? 's' : ''} assigned
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    iconLeft={<Users className="h-3.5 w-3.5" />}
                    onClick={() => openWorkersModal(branch)}
                  >
                    View
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    iconLeft={<UserPlus className="h-3.5 w-3.5" />}
                    onClick={() => openAssignModal(branch)}
                  >
                    Assign
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    iconLeft={<Trash2 className="h-3.5 w-3.5" />}
                    onClick={() => handleDeleteBranch(branch)}
                    className="ml-auto"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Branch"
      >
        <form onSubmit={handleCreateBranch} className="space-y-4">
          <Input
            label="Branch Name"
            placeholder="e.g. Kigali Warehouse"
            value={createForm.name}
            onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <Input
            label="Location"
            placeholder="e.g. Kigali, Rwanda"
            icon={<MapPin className="h-4 w-4" />}
            value={createForm.location}
            onChange={(e) => setCreateForm((p) => ({ ...p, location: e.target.value }))}
            required
          />
          <Input
            label="Description (optional)"
            placeholder="Short description of this branch"
            value={createForm.description}
            onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={creating} iconLeft={<Plus className="h-4 w-4" />}>
              Create Branch
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showWorkersModal}
        onClose={() => {
          setShowWorkersModal(false);
          setSelectedBranch(null);
          setBranchWorkers([]);
        }}
        title={selectedBranch ? `Workers — ${selectedBranch.name}` : 'Branch Workers'}
      >
        {branchWorkers.length === 0 ? (
          <div className="py-8 text-center">
            <EmptyState
              icon={<FolderOpen className="h-6 w-6" />}
              title="No workers assigned"
              description="Assign workers to this branch from the branch card."
            />
          </div>
        ) : (
          <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
            {branchWorkers.map((worker) => (
              <div
                key={worker.uid}
                className="flex items-center justify-between rounded-2xl border border-line bg-navy-800 p-4 transition hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand/15 text-brand text-xs font-bold ring-1 ring-brand/30 shadow-md">
                    {worker.name?.slice(0, 2).toUpperCase() || 'WK'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-ink">{worker.name}</div>
                    <div className="text-xs text-muted">{worker.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CopyButton text={worker.email} />
                  <button
                    type="button"
                    onClick={() => handleUnassignWorker(worker)}
                    className="rounded-xl p-1.5 text-muted transition hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
                    title="Unassign worker"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <Modal
        open={showAssignModal}
        onClose={() => {
          setShowAssignModal(false);
          setSelectedBranchForAssign(null);
          setAssignWorkerId('');
        }}
        title={
          selectedBranchForAssign
            ? `Assign Worker — ${selectedBranchForAssign.name}`
            : 'Assign Worker'
        }
      >
        {unassignedWorkers.length === 0 ? (
          <div className="py-8 text-center">
            <EmptyState
              icon={<Users className="h-6 w-6" />}
              title="No unassigned workers"
              description="All workers are currently assigned to branches or none are available."
            />
          </div>
        ) : (
          <form onSubmit={handleAssignWorker} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-muted">
                Select Worker
              </label>
              <select
                value={assignWorkerId}
                onChange={(e) => setAssignWorkerId(e.target.value)}
                required
                className="w-full rounded-xl border border-line bg-navy-600 px-4 py-2.5 text-sm text-ink transition-all focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                <option value="">Choose a worker...</option>
                {unassignedWorkers.map((w) => (
                  <option key={w.uid} value={w.uid}>
                    {w.name} ({w.email})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" type="button" onClick={() => setShowAssignModal(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={assigning}
                iconLeft={<UserPlus className="h-4 w-4" />}
                disabled={!assignWorkerId}
              >
                Assign Worker
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </DashboardLayout>
  );
};

export default Branches;
