import React, { useEffect, useMemo, useRef, useState } from 'react';
import firebase from 'firebase/compat/app';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ProductStatus, UserRole } from '../types';
import { Package, MessageSquare, Send, Trash2, Heart, User, Search, Building2, LogOut, CheckCircle } from 'lucide-react';

import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import SearchInput from '../components/ui/SearchInput';
import Badge from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import Toast from '../components/ui/Toast';
import EmptyState from '../components/ui/EmptyState';
import Avatar from '../components/ui/Avatar';
import ImageLightbox from '../components/dashboard/ImageLightbox';
import ProductImages from '../components/dashboard/ProductImages';

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
  updatedAt?: any;
};

type MessageDoc = {
  id: string;
  companyId: string;
  fromUid: string;
  fromName: string;
  fromEmail?: string;
  text: string;
  createdAt?: any;
  likedByAdmin?: boolean;
  likedAt?: any;
  likedByUid?: string | null;
  likedByName?: string | null;
};

type ViewType = 'products' | 'messages';

const formatRWF = (amount: number): string =>
  new Intl.NumberFormat('rw-RW', {
    style: 'currency',
    currency: 'RWF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);

const formatNumber = (num: number): string => new Intl.NumberFormat('en-US').format(num || 0);

const clampInt = (v: unknown, min: number, max: number) => {
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
};

const s = (v: unknown) => String(v ?? '').trim();
const tsSeconds = (t: any) => (t?.seconds ? Number(t.seconds) : 0);

const WorkerDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [currentView, setCurrentView] = useState<ViewType>('products');

  const companyId = useMemo(() => s((profile as any)?.companyId), [profile]);
  const workerName = useMemo(() => s(profile?.name) || 'Worker', [profile?.name]);
  const workerEmail = useMemo(() => s(profile?.email) || s(firebase.auth().currentUser?.email) || '', [profile?.email]);
  const companyName = useMemo(() => s((profile as any)?.companyName) || 'Company', [profile]);

  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [qtyById, setQtyById] = useState<Record<string, number>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState('');

  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [loadingChat, setLoadingChat] = useState(true);
  const [chatText, setChatText] = useState('');
  const [sending, setSending] = useState(false);
  const [messageSearch, setMessageSearch] = useState('');

  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number; title: string } | null>(null);

  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  const showToast = (text: string, ok: boolean) => {
    setToast({ text, ok });
  };

  const openImageLightbox = (urls: string[] = [], title: string, index = 0) => {
    if (!urls.length) return;
    setLightbox({ urls, title, index: Math.max(0, Math.min(index, urls.length - 1)) });
  };

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();
    if (!q) return products;
    return products.filter((p) =>
      [p.name, p.category, p.status].some((value) => String(value || '').toLowerCase().includes(q))
    );
  }, [products, productSearch]);

  const filteredMessages = useMemo(() => {
    const q = messageSearch.toLowerCase().trim();
    if (!q) return messages;
    return messages.filter((m) =>
      [m.text, m.fromName, m.fromEmail, m.likedByAdmin ? 'liked admin liked' : ''].some((value) =>
        String(value || '').toLowerCase().includes(q)
      )
    );
  }, [messages, messageSearch]);

  const dashboardStats = useMemo(() => {
    const totalProducts = products.length;
    const availableProducts = products.filter((p) => p.status === ProductStatus.AVAILABLE).length;
    const totalStockValue = products.reduce((sum, p) => sum + p.price * p.qtyCurrent, 0);
    const totalSoldToday = products.reduce((sum, p) => {
      const today = new Date().toDateString();
      const lastSold = p.updatedAt?.toDate?.();
      return sum + (lastSold?.toDateString() === today ? p.qtySold : 0);
    }, 0);
    const lowStockProducts = products.filter((p) => p.qtyCurrent < 10 && p.qtyCurrent > 0).length;
    const outOfStockProducts = products.filter((p) => p.qtyCurrent === 0).length;
    const likedMessages = messages.filter((m) => m.likedByAdmin === true).length;

    return { totalProducts, availableProducts, totalStockValue, totalSoldToday, lowStockProducts, outOfStockProducts, likedMessages };
  }, [products, messages]);

  useEffect(() => {
    if (!profile?.uid || !companyId) return;

    setLoadingProducts(true);
    const unsub = db.collection('products').where('companyId', '==', companyId).onSnapshot(
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ProductDoc[];

        list.sort((a, b) => {
          const av = String(a.status) === 'available' ? 0 : 1;
          const bv = String(b.status) === 'available' ? 0 : 1;
          if (av !== bv) return av - bv;
          return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
        });

        setProducts(list);
        setQtyById((prev) => {
          const next = { ...prev };
          for (const p of list) if (next[p.id] === undefined) next[p.id] = 1;
          return next;
        });
        setLoadingProducts(false);
      },
      (err) => {
        console.error('products stream error:', err);
        setLoadingProducts(false);
      }
    );

    return () => unsub();
  }, [profile?.uid, companyId]);

  useEffect(() => {
    if (!profile?.uid || !companyId) return;

    setLoadingChat(true);

    const unsub = db
      .collection('messages')
      .where('companyId', '==', companyId)
      .where('fromUid', '==', profile.uid)
      .onSnapshot(
        (snap) => {
          const mine = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as any) })) as MessageDoc[];

          mine.sort((a, b) => tsSeconds(b.createdAt) - tsSeconds(a.createdAt));

          setMessages(mine);
          setLoadingChat(false);
        },
      (err) => {
        console.error('chat stream error:', err);
        showToast('Unable to load messages. Check Firestore rules/companyId.', false);
        setLoadingChat(false);
      }
    );

    return () => unsub();
  }, [profile?.uid, companyId]);

  const updateQty = (productId: string, raw: string, max: number) => {
    setQtyById((p) => ({ ...p, [productId]: clampInt(raw, 1, max) }));
  };

  const sellUnits = async (p: ProductDoc) => {
    if (!profile?.uid) return;
    if (!companyId) return showToast('Missing companyId in worker profile.', false);
    if (!workerEmail) return showToast('Missing email in worker profile.', false);

    const max = Math.max(1, Number(p.qtyCurrent ?? 0));
    const units = clampInt(qtyById[p.id] ?? 1, 1, max);
    setBusyId(p.id);

    try {
      await db.runTransaction(async (tx) => {
        const ref = db.collection('products').doc(p.id);
        const snap = await tx.get(ref);

        if (!snap.exists) throw new Error('Product not found.');

        const cur = snap.data() as any;
        if (String(cur.companyId) !== String(companyId)) throw new Error('Not your company.');

        const currentQty = Number(cur.qtyCurrent ?? 0);
        const currentSold = Number(cur.qtySold ?? 0);
        const uploaded = Number(cur.qtyUploaded ?? 0);

        if (units > currentQty) throw new Error(`Only ${currentQty} left.`);

        const nextCurrent = currentQty - units;
        const nextSold = currentSold + units;

        tx.update(ref, {
          qtyCurrent: nextCurrent,
          qtySold: nextSold,
          status: nextCurrent === 0 ? ProductStatus.SOLD : ProductStatus.AVAILABLE,
          lastSoldByUid: profile.uid,
          lastSoldByName: workerName,
          lastSoldAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          qtyUploaded: uploaded,
        });
      });

      showToast(`Sold ${units} unit(s) successfully`, true);
    } catch (err: any) {
      console.error('sell failed:', err);
      showToast(err?.message || 'Sell failed.', false);
    } finally {
      setBusyId(null);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid || !companyId) return;

    const text = s(chatText);
    if (!text) return;

    setSending(true);

    try {
      await db.collection('messages').add({
        companyId,
        fromUid: profile.uid,
        fromName: workerName,
        fromEmail: workerEmail || '',
        text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        likedByAdmin: false,
        likedAt: null,
        likedByUid: null,
        likedByName: null,
      });

      setChatText('');
      showToast('Message sent to admin', true);
    } catch (err: any) {
      console.error('send message failed:', err);
      showToast(err?.message || 'Failed to send message.', false);
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (id: string) => {
    if (!window.confirm('Delete this message?')) return;

    try {
      await db.collection('messages').doc(id).delete();
      showToast('Message deleted', true);
    } catch (err: any) {
      console.error('delete message failed:', err);
      showToast(err?.message || 'Delete message failed.', false);
    }
  };

  if (profile?.role !== UserRole.WORKER) {
    return (
      <div className="grid min-h-screen place-items-center bg-navy-900">
        <Card hover className="text-center max-w-sm">
          <EmptyState
            icon={<LogOut className="h-8 w-8 text-red-400" />}
            title="Unauthorized Access"
            description="You do not have permission to access this dashboard."
          />
        </Card>
      </div>
    );
  }

  const DashboardStats = (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <StatCard
        icon={<Package className="h-5 w-5" />}
        iconGradient="from-blue-500 to-indigo-600"
        label="Available Products"
        value={formatNumber(dashboardStats.availableProducts)}
        subtitle={`Total: ${dashboardStats.totalProducts}`}
        live
      />
      <StatCard
        icon={<CheckCircle className="h-5 w-5" />}
        iconGradient="from-amber-500 to-orange-600"
        label="Sold Today"
        value={formatNumber(dashboardStats.totalSoldToday)}
        subtitle="Daily sales"
        live
      />
      <StatCard
        icon={<Heart className="h-5 w-5" />}
        iconGradient="from-pink-500 to-rose-600"
        label="Admin Likes"
        value={formatNumber(dashboardStats.likedMessages)}
        subtitle="Liked messages"
        live
      />
    </div>
  );

  const ProductsView = (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-ink">Products</h1>
          <p className="mt-1 text-muted">Sell products and view image-based inventory in real time.</p>
        </div>
        <Badge variant="info">Worker</Badge>
      </div>

      {DashboardStats}

      <Card>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink">Product Inventory</h2>
            <p className="text-sm text-muted">Every product can display multiple photos uploaded by admin.</p>
          </div>
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-2xl border border-line bg-navy-600 py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-muted/60 outline-none transition-all duration-200 focus:border-brand focus:ring-2 focus:ring-brand/20"
            />
          </div>
        </div>

        {loadingProducts ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <EmptyState
            icon={<Package className="h-8 w-8" />}
            title="No products found"
            description="Products will appear here once your admin adds them."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredProducts.map((p) => {
              const max = Math.max(1, Number(p.qtyCurrent ?? 0));
              const canSell = Number(p.qtyCurrent ?? 0) > 0 && String(p.status) === 'available';
              const stockValue = p.price * p.qtyCurrent;

              return (
                <Card key={p.id} variant="gradient" hover>
                  <div className="flex gap-4">
                    <div className="w-20 h-20 shrink-0">
                      <ProductImages images={p.imageUrls || []} productName={p.name} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="truncate text-lg font-bold text-ink">{p.name}</h3>
                          <p className="text-sm text-muted">{p.category}</p>
                        </div>
                        <Badge variant={p.status === ProductStatus.AVAILABLE ? (p.qtyCurrent < 10 ? 'warning' : 'success') : 'danger'}>
                          {p.status}{p.qtyCurrent < 10 && p.qtyCurrent > 0 ? ' Low' : ''}
                        </Badge>
                      </div>
                      <div className="mt-3 text-xl font-black text-brand">{formatRWF(p.price)}</div>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <div className="rounded-2xl bg-navy-800 p-3 ring-1 ring-line">
                      <div className="text-xs text-muted">In stock</div>
                      <div className="font-bold text-ink">{formatNumber(p.qtyCurrent)}</div>
                    </div>
                    <div className="rounded-2xl bg-navy-800 p-3 ring-1 ring-line">
                      <div className="text-xs text-muted">Sold</div>
                      <div className="font-bold text-ink">{formatNumber(p.qtySold)}</div>
                    </div>
                    <div className="rounded-2xl bg-navy-800 p-3 ring-1 ring-line">
                      <div className="text-xs text-muted">Value</div>
                      <div className="truncate font-bold text-emerald-400">{formatRWF(stockValue)}</div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="flex flex-1 items-center gap-2 rounded-2xl bg-navy-800 p-2 ring-1 ring-line">
                      <Input
                        type="number"
                        min={1}
                        max={max}
                        disabled={!canSell}
                        value={qtyById[p.id] ?? 1}
                        onChange={(e) => updateQty(p.id, e.target.value, max)}
                        className="border-0 bg-transparent text-center font-bold"
                      />
                      <span className="whitespace-nowrap text-xs text-muted">Max {formatNumber(max)}</span>
                    </div>
                    <Button
                      disabled={!canSell}
                      loading={busyId === p.id}
                      onClick={() => sellUnits(p)}
                      variant={canSell ? 'primary' : 'secondary'}
                    >
                      Confirm Sale
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );

  const MessagesView = (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-ink">Messages</h1>
          <p className="mt-1 text-muted">Communicate with your company admin.</p>
        </div>
        <Badge variant="default" className="gap-1.5">
          <Heart className="h-3.5 w-3.5 fill-pink-500 text-pink-500" />
          {dashboardStats.likedMessages} liked by admin
        </Badge>
      </div>

      {DashboardStats}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-navy-950 shadow-lg shadow-black/40">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-ink">New Message</h2>
                <p className="text-sm text-muted">Send a message to your admin.</p>
              </div>
            </div>

            <form onSubmit={sendMessage} className="space-y-4">
              <textarea
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder="Type your message here..."
                className="h-44 w-full resize-none rounded-2xl border border-line bg-navy-600 px-5 py-4 text-sm text-ink placeholder:text-muted/60 outline-none transition-all duration-200 focus:border-brand focus:ring-2 focus:ring-brand/20"
                maxLength={800}
              />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted">
                  <CheckCircle className="h-4 w-4 text-emerald-400" /> Messages are delivered instantly
                </span>
                <Button
                  type="submit"
                  disabled={!s(chatText)}
                  loading={sending}
                  iconLeft={<Send className="h-4 w-4" />}
                >
                  Send Message
                </Button>
              </div>
            </form>
          </Card>
        </div>

        <Card>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Recent Messages</h2>
            <Badge variant="info">{filteredMessages.length}</Badge>
          </div>

          <SearchInput
            onSearch={setMessageSearch}
            placeholder="Search messages..."
            className="mb-4"
          />

          <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
            {loadingChat ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filteredMessages.length === 0 ? (
              <EmptyState
                icon={<MessageSquare className="h-8 w-8" />}
                title="No messages found"
                description="Send a message to get started."
              />
            ) : (
              filteredMessages.map((m) => (
                <Card
                  key={m.id}
                  hover
                  className={m.likedByAdmin ? 'ring-1 ring-pink-500/40 bg-gradient-to-br from-pink-500/10 to-rose-500/10' : ''}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar
                        name={m.fromName}
                        size="sm"
                        className={m.likedByAdmin ? 'ring-pink-500/40' : ''}
                      />
                      <div>
                        <div className="font-semibold text-ink text-sm">You</div>
                        <div className="text-xs text-muted">{m.fromEmail}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-navy-700 px-2.5 py-1 text-[10px] font-medium text-muted shadow-sm">
                        {m.createdAt?.toDate?.()?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Now'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMessage(m.id)}
                        className="!p-1.5 text-red-400 hover:text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <p className="whitespace-pre-wrap text-sm text-ink/80 pl-[42px]">{m.text}</p>

                  {m.likedByAdmin === true && (
                    <div className="mt-3 ml-[42px] rounded-2xl border border-pink-500/30 bg-navy-900/80 p-3">
                      <div className="inline-flex items-center gap-2 rounded-full bg-pink-500/15 px-3 py-1.5 text-xs font-bold text-pink-400">
                        <Heart className="h-4 w-4 fill-current" />
                        Admin liked this message
                      </div>
                      <div className="mt-1 text-[11px] text-pink-500">
                        {m.likedByName ? `Liked by ${m.likedByName}` : 'Liked by admin'}
                        {m.likedAt?.toDate?.() ? ` \u00B7 ${m.likedAt.toDate().toLocaleString()}` : ''}
                      </div>
                    </div>
                  )}

                  <div className="mt-2 pl-[42px] text-xs text-muted">
                    {m.createdAt?.toDate?.()?.toLocaleDateString() || 'Today'}
                  </div>
                </Card>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-navy-900 pb-14 text-ink">
      {toast && (
        <div className="fixed right-5 top-5 z-50">
          <Toast
            message={toast.text}
            type={toast.ok ? 'success' : 'error'}
            onDismiss={() => setToast(null)}
          />
        </div>
      )}

      <nav className="sticky top-0 z-30 border-b border-line bg-navy-900/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand p-2.5 text-navy-950 shadow-lg shadow-black/40">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-ink">{companyName}</div>
              <div className="text-xs text-muted">Worker Dashboard</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Avatar name={workerName} size="sm" />
            <button
              onClick={signOut}
              className="rounded-2xl bg-white/5 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut className="mr-1 inline h-4 w-4" /> Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 pt-6">
        <div className="mb-6 rounded-2xl border border-line bg-navy-800 p-1.5">
          <div className="flex gap-1.5">
            <button
              onClick={() => setCurrentView('products')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                currentView === 'products'
                  ? 'bg-brand text-navy-950 shadow-md shadow-black/40'
                  : 'text-muted hover:bg-white/5'
              }`}
            >
              <Package className="h-4 w-4" /> Products
            </button>
            <button
              onClick={() => setCurrentView('messages')}
              className={`relative flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                currentView === 'messages'
                  ? 'bg-brand text-navy-950 shadow-md shadow-black/40'
                  : 'text-muted hover:bg-white/5'
              }`}
            >
              <MessageSquare className="h-4 w-4" /> Messages
              {dashboardStats.likedMessages > 0 && (
                <span className="ml-1 rounded-full bg-pink-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {dashboardStats.likedMessages}
                </span>
              )}
            </button>
          </div>
        </div>

        {currentView === 'products' ? ProductsView : MessagesView}
      </div>

      {lightbox && (
        <ImageLightbox
          images={lightbox.urls}
          initialIndex={lightbox.index}
          open={true}
          onClose={() => setLightbox(null)}
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 border-t border-line bg-navy-900/80 backdrop-blur-xl px-6 py-2.5">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Connected
          </div>
          <div className="font-mono">{companyId?.slice(0, 12)}...</div>
        </div>
      </div>
    </div>
  );
};

export default WorkerDashboard;
