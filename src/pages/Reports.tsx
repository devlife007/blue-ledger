import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import DashboardLayout, { DashboardNavItem } from '../components/layout/DashboardLayout';
import StatCard from '../components/ui/StatCard';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonCard } from '../components/ui/Skeleton';
import ProductImages from '../components/dashboard/ProductImages';
import {
  Package,
  Users,
  MessageSquare,
  GitBranch,
  BarChart3,
  Settings,
  Bell,
  TrendingUp,
  ShoppingBag,
  Download,
} from 'lucide-react';

type ProductDoc = {
  id: string;
  companyId: string;
  name: string;
  category: string;
  price: number;
  qtyUploaded: number;
  qtySold: number;
  qtyCurrent: number;
  status: string;
  imageUrls?: string[];
  createdAt?: any;
  updatedAt?: any;
  lastSoldAt?: any;
};

type MessageDoc = {
  id: string;
  companyId: string;
  fromUid: string;
  fromName: string;
  fromEmail?: string;
  text: string;
  createdAt?: any;
};

type Period = 'today' | '7d' | '30d' | 'all';

const s = (v: unknown) => String(v ?? '').trim();

const tsMillis = (t: any) => (t?.seconds ? Number(t.seconds) * 1000 : 0);

const toDateSafe = (t: any): Date | null => {
  if (!t) return null;
  if (typeof t.toDate === 'function') return t.toDate();
  if (t instanceof Date) return t;
  return null;
};

const formatRWF = (amount: number): string =>
  new Intl.NumberFormat('rw-RW', {
    style: 'currency',
    currency: 'RWF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);

const formatNumber = (num: number): string => new Intl.NumberFormat('en-US').format(num || 0);

const startOfDay = (d: Date) => {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
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

const Reports: React.FC = () => {
  const { profile, user, signOut } = useAuth();
  const companyId = useMemo(() => s((profile as any)?.companyId || user?.uid || ''), [profile, user]);
  const companyName = useMemo(() => s((profile as any)?.companyName) || 'Company', [profile]);

  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('all');

  useEffect(() => {
    if (!companyId) return;
    setLoading(true);

    const unsubProducts = db
      .collection('products')
      .where('companyId', '==', companyId)
      .onSnapshot(
        (snap) => {
          const list = snap.docs.map(
            (d) => ({ id: d.id, ...(d.data() as any) }) as ProductDoc
          );
          setProducts(list);
          setLoading(false);
        },
        (err) => {
          console.error('reports products stream error:', err);
          setLoading(false);
        }
      );

    const unsubMessages = db
      .collection('messages')
      .where('companyId', '==', companyId)
      .onSnapshot(
        (snap) => {
          const list = snap.docs.map(
            (d) => ({ id: d.id, ...(d.data() as any) }) as MessageDoc
          );
          list.sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt));
          setMessages(list);
          setLoading(false);
        },
        (err) => {
          console.error('reports messages stream error:', err);
          setLoading(false);
        }
      );

    return () => {
      unsubProducts();
      unsubMessages();
    };
  }, [companyId]);

  const stats = useMemo(() => {
    const now = Date.now();
    const windowMs =
      period === 'today'
        ? now - startOfDay(new Date()).getTime()
        : period === '7d'
        ? 7 * 24 * 60 * 60 * 1000
        : period === '30d'
        ? 30 * 24 * 60 * 60 * 1000
        : Infinity;

    const inWindow = (t: any): boolean => {
      if (windowMs === Infinity) return true;
      const d = toDateSafe(t);
      if (!d) return false;
      return now - d.getTime() <= windowMs;
    };

    const periodProducts = products.filter(
      (p) => inWindow(p.createdAt) || inWindow(p.updatedAt) || inWindow(p.lastSoldAt)
    );
    const periodMessages = messages.filter((m) => inWindow(m.createdAt));

    const totalProducts = periodProducts.length;
    const unitsSold = periodProducts.reduce((sum, p) => sum + (p.qtySold || 0), 0);
    const salesValue = periodProducts.reduce(
      (sum, p) => sum + (p.price || 0) * (p.qtySold || 0),
      0
    );
    const stockValue = products.reduce(
      (sum, p) => sum + (p.price || 0) * (p.qtyCurrent || 0),
      0
    );
    const lowStock = products.filter(
      (p) => p.qtyCurrent > 0 && p.qtyCurrent < 10
    );
    const outOfStock = products.filter((p) => p.qtyCurrent === 0);

    return { totalProducts, unitsSold, salesValue, stockValue, periodMessages, lowStock, outOfStock };
  }, [products, messages, period]);

  const bestSellers = useMemo(
    () =>
      [...products]
        .sort((a, b) => (b.qtySold || 0) - (a.qtySold || 0))
        .slice(0, 10),
    [products]
  );

  const exportCsv = () => {
    if (!bestSellers.length) return;
    const headers = ['Name', 'Category', 'Price', 'Qty Sold', 'Revenue'];
    const rows = bestSellers.map((p) => [
      p.name,
      p.category,
      String(p.price),
      String(p.qtySold || 0),
      String((p.price || 0) * (p.qtySold || 0)),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `best-sellers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (profile?.role !== 'admin') {
    return (
      <DashboardLayout
        title={s((profile as any)?.companyName) || 'Company'}
        subtitle="Admin panel"
        navItems={NAV}
        currentPage="reports"
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

  const periodPills: { key: Period; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: '7d' },
    { key: '30d', label: '30d' },
    { key: 'all', label: 'All' },
  ];

  return (
    <DashboardLayout
      title={companyName}
      subtitle="Admin panel"
      navItems={NAV}
      currentPage="reports"
      onNavigate={handleNavigate}
      onSignOut={signOut}
    >
      <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-ink">Reports & Analytics</h1>
            <p className="mt-1 text-sm text-muted">
              Overview of your company's product performance and activity.
            </p>
          </div>
          <div className="inline-flex rounded-xl border border-line bg-navy-800 p-1">
            {periodPills.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                  period === p.key
                    ? 'bg-brand text-navy-950 font-bold'
                    : 'text-muted hover:bg-white/5'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : products.length === 0 ? (
          <Card className="border border-line">
            <EmptyState
              icon={<Package className="h-8 w-8" />}
              title="No products yet"
              description="Add products to start seeing reports and analytics."
            />
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={<Package className="h-5 w-5" />}
                iconGradient="from-brand to-amber-500"
                label="Total Products"
                value={formatNumber(stats.totalProducts)}
              />
              <StatCard
                icon={<ShoppingBag className="h-5 w-5" />}
                iconGradient="from-emerald-500 to-teal-600"
                label="Units Sold"
                value={formatNumber(stats.unitsSold)}
              />
              <StatCard
                icon={<TrendingUp className="h-5 w-5" />}
                iconGradient="from-emerald-500 to-green-600"
                label="Sales Value"
                value={formatRWF(stats.salesValue)}
              />
              <StatCard
                icon={<BarChart3 className="h-5 w-5" />}
                iconGradient="from-amber-500 to-orange-600"
                label="Stock Value"
                value={formatRWF(stats.stockValue)}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
              <Card border className="shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-ink">Best Sellers</h2>
                  <Button
                    variant="secondary"
                    size="sm"
                    iconLeft={<Download className="h-4 w-4" />}
                    onClick={exportCsv}
                  >
                    Export CSV
                  </Button>
                </div>
                {bestSellers.length === 0 ? (
                  <p className="text-sm text-muted">No sales recorded yet.</p>
                ) : (
                  <div className="divide-y divide-line">
                    {bestSellers.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-3 py-3">
                        <span className="w-6 text-center text-xs font-bold text-muted">
                          {i + 1}
                        </span>
                        {p.imageUrls && p.imageUrls.length > 0 ? (
                          <div className="w-12 shrink-0">
                            <ProductImages images={p.imageUrls} productName={p.name} />
                          </div>
                        ) : (
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-navy-800 text-brand ring-1 ring-line">
                            <Package className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-ink">{p.name}</div>
                          <div className="text-xs text-muted">{p.category}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-brand">
                            {formatRWF((p.price || 0) * (p.qtySold || 0))}
                          </div>
                          <div className="text-xs text-muted">{formatNumber(p.qtySold || 0)} sold</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card border className="shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-ink">Stock Alerts</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="warning">Low Stock</Badge>
                      <span className="text-xs text-muted">(&lt;10 units)</span>
                    </div>
                    {stats.lowStock.length === 0 ? (
                      <p className="text-sm text-muted">No low stock items.</p>
                    ) : (
                      <div className="divide-y divide-line">
                        {stats.lowStock.map((p) => (
                          <div key={p.id} className="py-2">
                            <div className="text-sm font-medium text-ink">{p.name}</div>
                            <div className="text-xs text-muted">
                              {p.category} · {formatNumber(p.qtyCurrent)} left
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Badge variant="danger">Out of Stock</Badge>
                    </div>
                    {stats.outOfStock.length === 0 ? (
                      <p className="text-sm text-muted">No out of stock items.</p>
                    ) : (
                      <div className="divide-y divide-line">
                        {stats.outOfStock.map((p) => (
                          <div key={p.id} className="py-2">
                            <div className="text-sm font-medium text-ink">{p.name}</div>
                            <div className="text-xs text-muted">{p.category}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Reports;
