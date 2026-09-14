import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import { adminNavItems, navigateToAdminPage } from '../navigation/adminNav';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonCard } from '../components/ui/Skeleton';
import {
  Package,
  MessageSquare,
  Bell,
} from 'lucide-react';

type ProductDoc = {
  id: string;
  companyId: string;
  name: string;
  category: string;
  price: number;
  qtySold: number;
  qtyCurrent: number;
  updatedAt?: any;
  lastSoldAt?: any;
  createdAt?: any;
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

type FeedEvent = {
  id: string;
  type: 'message' | 'product';
  icon: typeof MessageSquare;
  title: string;
  detail: string;
  date: Date;
};

type FeedFilter = 'all' | 'messages' | 'products';

const s = (v: unknown) => String(v ?? '').trim();

const tsMillis = (t: any) => (t?.seconds ? Number(t.seconds) * 1000 : 0);

const toDateSafe = (t: any): Date | null => {
  if (!t) return null;
  if (typeof t.toDate === 'function') return t.toDate();
  if (t instanceof Date) return t;
  return null;
};

const Activity: React.FC = () => {
  const { profile, user, signOut } = useAuth();
  const companyId = useMemo(() => s((profile as any)?.companyId || user?.uid || ''), [profile, user]);
  const companyName = useMemo(() => s((profile as any)?.companyName) || 'Company', [profile]);

  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');

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
          console.error('activity products stream error:', err);
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
          console.error('activity messages stream error:', err);
          setLoading(false);
        }
      );

    return () => {
      unsubProducts();
      unsubMessages();
    };
  }, [companyId]);

  const notifications = useMemo(() => {
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return messages
      .filter((m) => m.likedByAdmin !== true && now - tsMillis(m.createdAt) <= sevenDays)
      .sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt))
      .slice(0, 5);
  }, [messages]);

  const feed = useMemo(() => {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const events: FeedEvent[] = [];

    for (const m of messages) {
      const d = toDateSafe(m.createdAt);
      if (d) {
        events.push({
          id: `msg-${m.id}`,
          type: 'message',
          icon: MessageSquare,
          title: `${m.fromName || 'Worker'} sent a message`,
          detail: m.text,
          date: d,
        });
      }
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    for (const p of products) {
      const lastSold = toDateSafe(p.lastSoldAt);
      const updated = toDateSafe(p.updatedAt);

      if (lastSold && lastSold.getTime() >= todayStart.getTime()) {
        events.push({
          id: `sold-${p.id}`,
          type: 'product',
          icon: Package,
          title: `Sold: ${p.name}`,
          detail: p.category,
          date: lastSold,
        });
      } else if (updated && now - updated.getTime() <= thirtyDays) {
        events.push({
          id: `upd-${p.id}`,
          type: 'product',
          icon: Package,
          title: `${p.name} updated`,
          detail: p.category,
          date: updated,
        });
      }
    }

    events.sort((a, b) => b.date.getTime() - a.date.getTime());
    return events.slice(0, 50);
  }, [products, messages]);

  const filteredFeed = useMemo(() => {
    if (feedFilter === 'messages') return feed.filter((e) => e.type === 'message');
    if (feedFilter === 'products') return feed.filter((e) => e.type === 'product');
    return feed;
  }, [feed, feedFilter]);

  const filterPills: { key: FeedFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'messages', label: 'Messages' },
    { key: 'products', label: 'Products' },
  ];

  if (profile?.role !== 'admin') {
    return (
      <DashboardLayout
        title={s((profile as any)?.companyName) || 'Company'}
        subtitle="Admin panel"
        navItems={adminNavItems}
        currentPage="activity"
        onNavigate={navigateToAdminPage}
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
      navItems={adminNavItems}
      currentPage="activity"
      onNavigate={navigateToAdminPage}
      onSignOut={signOut}
    >
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-ink">Activity</h1>
          <p className="mt-1 text-sm text-muted">
            Real-time feed of messages and product changes across your company.
          </p>
        </div>

        {notifications.length > 0 && (
          <Card border className="shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <Bell className="h-5 w-5 text-brand" />
              <h2 className="text-lg font-semibold text-ink">Notifications</h2>
              <Badge variant="info">{notifications.length}</Badge>
            </div>
            <div className="divide-y divide-line">
              {notifications.map((m) => (
                <div key={m.id} className="flex items-center gap-3 py-3 border-l-2 border-brand pl-4 -ml-1">
                  <Avatar name={m.fromName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-ink line-clamp-1">
                      {m.fromName} sent a message
                    </div>
                    <div className="text-xs text-muted line-clamp-1">{m.text}</div>
                  </div>
                  <span className="shrink-0 text-xs text-muted">
                    {toDateSafe(m.createdAt)?.toLocaleString() || ''}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="inline-flex rounded-xl border border-line bg-navy-800 p-1">
          {filterPills.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setFeedFilter(p.key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                feedFilter === p.key
                  ? 'bg-brand text-navy-950 font-bold'
                  : 'text-muted hover:bg-white/5'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredFeed.length === 0 ? (
          <Card border className="shadow-sm">
            <EmptyState
              icon={<Bell className="h-8 w-8" />}
              title="No activity yet"
              description="Activity from messages and product changes will appear here."
            />
          </Card>
        ) : (
          <Card padding="none" className="overflow-hidden border border-line shadow-sm">
            <div className="divide-y divide-line">
              {filteredFeed.map((event) => {
                const Icon = event.icon;
                return (
                  <div key={event.id} className="flex items-start gap-4 px-6 py-4">
                    <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-navy-800 text-brand ring-1 ring-line">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-ink">{event.title}</div>
                      <div className="mt-0.5 text-xs text-muted whitespace-pre-line line-clamp-2">
                        {event.detail}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-muted">
                      {event.date.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Activity;
