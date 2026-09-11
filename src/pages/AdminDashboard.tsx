import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import firebase from 'firebase/compat/app';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { ProductStatus, UserRole } from '../types';
import {
  ShoppingBag, Users, Mail, TrendingUp, BarChart3, Package, MessageSquare, GitBranch,
  Plus, Trash2, Download, ImagePlus, UploadCloud, X, Heart, RefreshCw, CheckCircle, Bell, Eye, Settings,
} from 'lucide-react';

import DashboardLayout, { DashboardNavItem } from '../components/layout/DashboardLayout';
import StatCard from '../components/ui/StatCard';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import SearchInput from '../components/ui/SearchInput';
import Badge from '../components/ui/Badge';
import { SkeletonTable, SkeletonStat, SkeletonCard } from '../components/ui/Skeleton';
import Toast from '../components/ui/Toast';
import EmptyState from '../components/ui/EmptyState';
import CopyButton from '../components/ui/CopyButton';
import ProductImages from '../components/dashboard/ProductImages';
import ImageLightbox from '../components/dashboard/ImageLightbox';
import CalendarView from '../components/dashboard/CalendarView';

type ToastType = 'success' | 'error';
type Toast = { text: string; type: ToastType } | null;
type Page = 'products' | 'workers' | 'messages';

type ProductDoc = {
  id: string; companyId: string; name: string; category: string; price: number;
  qtyUploaded: number; qtySold: number; qtyCurrent: number; status: string;
  imageUrls?: string[]; imagePublicIds?: string[]; createdBy?: string;
  createdAt?: any; updatedAt?: any; lastSoldAt?: any; lastSoldByUid?: string | null; lastSoldByName?: string | null;
};

type WorkerDoc = {
  uid: string; name: string; email: string; role: string; companyId: string; createdBy: string;
  isActive?: boolean; createdAt?: any; likedByAdmin?: boolean; likedAt?: any; likedByUid?: string | null; likedByName?: string | null;
};

type MessageDoc = {
  id: string; companyId: string; fromUid: string; fromName: string; fromEmail?: string; text: string;
  likedByAdmin?: boolean; createdAt?: any;
};

type ProductStats = {
  totalProducts: number; totalWorkers: number; totalMessages: number;
  totalStockValue: number; totalSoldValue: number; activeWorkers: number;
  lowStockProducts: number; outOfStockProducts: number;
};

const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;

const s = (v: unknown) => String(v ?? '').trim();
const toNum = (v: unknown, fallback = 0) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
};
const clampInt = (v: unknown, min: number, max: number) => {
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
};
const tsSeconds = (t: any) => (t?.seconds ? Number(t.seconds) : 0);
const tsMillis = (t: any) => (t?.seconds ? Number(t.seconds) * 1000 : 0);
const toDateSafe = (t: any): Date | null => {
  if (!t) return null;
  if (typeof t.toDate === 'function') return t.toDate();
  if (t instanceof Date) return t;
  return null;
};
const sameCalendarDay = (a: Date | null, b: Date | null) => !!a && !!b && a.toDateString() === b.toDateString();
const productTouchedOnDate = (p: ProductDoc, date: Date) =>
  sameCalendarDay(toDateSafe(p.updatedAt), date) || sameCalendarDay(toDateSafe(p.createdAt), date) || sameCalendarDay(toDateSafe(p.lastSoldAt), date);
const getLatestMessageTime = (items: MessageDoc[]) => items.reduce((max, message) => Math.max(max, tsMillis(message.createdAt)), 0);

const formatRWF = (amount: number): string =>
  new Intl.NumberFormat('rw-RW', { style: 'currency', currency: 'RWF', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount || 0);

const formatNumber = (num: number): string => new Intl.NumberFormat('en-US').format(num || 0);

const advancedSearch = <T extends Record<string, any>>(items: T[], query: string, fields: (keyof T)[]) => {
  if (!query.trim()) return items;
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return items.filter((item) =>
    terms.every((term) =>
      fields.some((field) => {
        const value = item[field];
        return typeof value === 'string' || typeof value === 'number'
          ? String(value).toLowerCase().includes(term)
          : false;
      })
    )
  );
};

const uploadImagesToCloudinary = async (files: File[]) => {
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
    throw new Error('Missing Cloudinary env: VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET');
  }
  const uploads = files.map(async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', 'products');
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error('Cloudinary upload failed. Check upload preset settings.');
    const data = await res.json();
    return { url: data.secure_url as string, publicId: data.public_id as string };
  });
  return Promise.all(uploads);
};

type ProductForm = { name: string; category: string; price: string; qty: string };
type WorkerForm = { name: string; email: string; password: string };
type ProductFilters = { minPrice: string; maxPrice: string; minStock: string; maxStock: string; category: string };

interface ProductsSectionProps {
  filteredProducts: ProductDoc[];
  loadingProducts: boolean;
  stats: ProductStats;
  selectedDate: Date | null;
  productForm: ProductForm;
  setProductForm: (p: React.SetStateAction<ProductForm>) => void;
  savingProduct: boolean;
  productImages: File[];
  imagePreviews: string[];
  addProduct: (e: React.FormEvent) => void;
  handleImageSelect: (files: FileList | null) => void;
  removeImage: (index: number) => void;
  restockById: Record<string, number>;
  updateRestock: (id: string, raw: string) => void;
  restockingId: string | null;
  restock: (p: ProductDoc) => void;
  deleteProduct: (id: string) => void;
  onSearch: (q: string) => void;
  searchMode: 'basic' | 'advanced';
  setSearchMode: (m: React.SetStateAction<'basic' | 'advanced'>) => void;
  advancedSearchFilters: ProductFilters;
  setAdvancedSearchFilters: (f: React.SetStateAction<ProductFilters>) => void;
  clearFilters: () => void;
  exportData: () => void;
  onSelectDate: (date: Date | null) => void;
}

const ProductsSection: React.FC<ProductsSectionProps> = ({
  filteredProducts, loadingProducts, stats, selectedDate, productForm, setProductForm, savingProduct,
  productImages, imagePreviews, addProduct, handleImageSelect, removeImage, restockById, updateRestock,
  restockingId, restock, deleteProduct, onSearch, searchMode, setSearchMode,
  advancedSearchFilters, setAdvancedSearchFilters, clearFilters, exportData, onSelectDate,
}) => {
  const statCards = [
    { label: 'Total Products', value: formatNumber(stats.totalProducts), icon: <ShoppingBag className="h-5 w-5" />, gradient: 'from-brand to-amber-500' },
    { label: 'Active Workers', value: formatNumber(stats.activeWorkers), icon: <Users className="h-5 w-5" />, gradient: 'from-emerald-500 to-teal-600' },
    { label: 'Messages', value: formatNumber(stats.totalMessages), icon: <Mail className="h-5 w-5" />, gradient: 'from-rose-500 to-pink-600' },
    { label: 'Sold Value', value: formatRWF(stats.totalSoldValue), icon: <TrendingUp className="h-5 w-5" />, gradient: 'from-emerald-500 to-green-600' },
    { label: 'Stock Value', value: formatRWF(stats.totalStockValue), icon: <BarChart3 className="h-5 w-5" />, gradient: 'from-amber-500 to-orange-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Products</h1>
          <p className="mt-1 text-sm text-muted">Upload multiple product photos, manage stock, and see Firestore live changes.</p>
        </div>
        <Button variant="secondary" iconLeft={<Download className="h-4 w-4" />} onClick={exportData}>Export</Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {loadingProducts
          ? Array.from({ length: 5 }).map((_, i) => <SkeletonStat key={i} />)
          : statCards.map((c) => <StatCard key={c.label} icon={c.icon} iconGradient={c.gradient} label={c.label} value={c.value} live />)}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand/10 text-brand"><ImagePlus className="h-6 w-6" /></div>
            <div>
              <h2 className="text-lg font-semibold text-ink">Add New Product</h2>
              <p className="text-sm text-muted">Cloudinary stores images; Firestore stores product details and image URLs.</p>
            </div>
          </div>

          <form onSubmit={addProduct} className="space-y-5">
            <label className="group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-line bg-navy-800 p-8 text-center transition hover:border-brand hover:shadow-lg">
              <UploadCloud className="mb-2 h-10 w-10 text-brand" />
              <span className="text-sm font-semibold text-ink">Click to upload product images</span>
              <span className="mt-1 text-xs text-muted">PNG, JPG, WEBP • up to 8 images</span>
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageSelect(e.target.files)} />
              {productImages.length > 0 && <span className="mt-2 rounded-full bg-brand px-3 py-1 text-xs font-bold text-navy-950">{productImages.length} selected</span>}
            </label>

            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {imagePreviews.map((src, index) => (
                  <div key={src} className="group relative overflow-hidden rounded-2xl border border-line">
                    <img src={src} alt={`Preview ${index + 1}`} className="h-28 w-full object-cover" />
                    <button type="button" onClick={() => removeImage(index)} className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white opacity-0 transition group-hover:opacity-100"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input placeholder="Product name" value={productForm.name} onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))} required />
              <Input placeholder="Category" value={productForm.category} onChange={(e) => setProductForm((p) => ({ ...p, category: e.target.value }))} required />
              <Input type="number" min="0" placeholder="Price (RWF)" value={productForm.price} onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))} required />
              <Input type="number" min="0" placeholder="Quantity" value={productForm.qty} onChange={(e) => setProductForm((p) => ({ ...p, qty: e.target.value }))} required />
            </div>

            <Button type="submit" loading={savingProduct} className="w-full" size="lg" iconLeft={!savingProduct ? <Plus className="h-5 w-5" /> : undefined}>
              {savingProduct ? 'Uploading...' : 'Add Product'}
            </Button>
          </form>
        </Card>

        <div className="flex flex-col items-center gap-3">
          <CalendarView selected={selectedDate} onSelect={onSelectDate} />
          {selectedDate && <span className="text-sm text-muted">Showing activity for {selectedDate.toLocaleDateString()}</span>}
        </div>
      </div>

      <Card className="shadow-sm">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-lg font-semibold text-ink">Search & Filter</h2>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSearchMode(searchMode === 'basic' ? 'advanced' : 'basic')}>{searchMode === 'basic' ? 'Advanced' : 'Basic'}</Button>
            <Button variant="danger" size="sm" onClick={clearFilters}>Clear</Button>
          </div>
        </div>
        <SearchInput onSearch={onSearch} placeholder="Search products by name, category, status..." />
        {searchMode === 'advanced' && (
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            {(['minPrice', 'maxPrice', 'minStock', 'maxStock', 'category'] as const).map((key) => (
              <Input key={key} type={key === 'category' ? 'text' : 'number'} placeholder={key} value={advancedSearchFilters[key]} onChange={(e) => setAdvancedSearchFilters((p) => ({ ...p, [key]: e.target.value }))} />
            ))}
          </div>
        )}
      </Card>

      <Card padding="none" className="overflow-hidden shadow-sm">
        <div className="flex flex-col gap-3 border-b border-line bg-navy-800 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Product Inventory</h2>
            {selectedDate && <p className="text-sm text-muted">Showing products changed, created, or sold on {selectedDate.toLocaleDateString()}</p>}
          </div>
          <div className="flex gap-2">
            <Badge variant="warning">Low: {stats.lowStockProducts}</Badge>
            <Badge variant="danger">Out: {stats.outOfStockProducts}</Badge>
          </div>
        </div>

        <div className="overflow-x-auto">
          {loadingProducts ? (
            <div className="p-6"><SkeletonTable rows={5} /></div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState icon={<Package className="h-8 w-8" />} title="No products found" description="Try a different search, or clear the date filter to see all products." />
          ) : (
            <table className="w-full">
              <thead className="text-left text-xs font-medium text-muted">
                <tr><th className="px-6 py-4">Product</th><th className="px-6 py-4">Price</th><th className="px-6 py-4">Stock</th><th className="px-6 py-4">Sold</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-white/5">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-20 shrink-0"><ProductImages images={product.imageUrls || []} productName={product.name} /></div>
                        <div>
                          <div className="font-semibold text-ink">{product.name}</div>
                          <div className="text-sm text-muted">{product.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-ink">{formatRWF(product.price)}</div>
                      <div className="text-xs text-muted">Value: {formatRWF(product.price * product.qtyCurrent)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold">{formatNumber(product.qtyCurrent)}</div>
                      <div className="text-xs text-muted">of {formatNumber(product.qtyUploaded)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold">{formatNumber(product.qtySold)}</div>
                      <div className="text-xs text-emerald-400">{formatRWF(product.price * product.qtySold)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={product.status === ProductStatus.AVAILABLE ? (product.qtyCurrent < 10 ? 'warning' : 'success') : 'danger'}>
                        {product.status}{product.qtyCurrent < 10 && product.qtyCurrent > 0 ? ' Low' : ''}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Input type="number" min={1} value={restockById[product.id] ?? 1} onChange={(e) => updateRestock(product.id, e.target.value)} className="w-20" />
                        <Button variant="secondary" size="sm" onClick={() => restock(product)} disabled={restockingId === product.id} iconLeft={<RefreshCw className="h-4 w-4" />}>Restock</Button>
                        <Button variant="danger" size="sm" onClick={() => deleteProduct(product.id)} iconLeft={<Trash2 className="h-4 w-4" />} aria-label="Delete product">{''}</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
};

interface WorkersSectionProps {
  filteredWorkers: WorkerDoc[];
  workers: WorkerDoc[];
  loadingWorkers: boolean;
  workerForm: WorkerForm;
  setWorkerForm: (f: React.SetStateAction<WorkerForm>) => void;
  creatingWorker: boolean;
  createWorker: (e: React.FormEvent) => void;
  deleteWorkerDoc: (uid: string) => void;
  onSearch: (q: string) => void;
}

const WorkersSection: React.FC<WorkersSectionProps> = ({
  filteredWorkers, workers, loadingWorkers, workerForm, setWorkerForm, creatingWorker, createWorker, deleteWorkerDoc, onSearch,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Workers</h1>
        <p className="mt-1 text-sm text-muted">Create, manage, and search workers in your company.</p>
      </div>

      <Card className="shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-ink">Add Worker</h2>
        <form onSubmit={createWorker} className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <Input placeholder="Name" value={workerForm.name} onChange={(e) => setWorkerForm((p) => ({ ...p, name: e.target.value }))} required />
          <Input type="email" placeholder="Email" value={workerForm.email} onChange={(e) => setWorkerForm((p) => ({ ...p, email: e.target.value }))} required />
          <Input type="password" placeholder="Password" value={workerForm.password} onChange={(e) => setWorkerForm((p) => ({ ...p, password: e.target.value }))} required />
          <Button type="submit" loading={creatingWorker} iconLeft={!creatingWorker ? <Plus className="h-4 w-4" /> : undefined}>
            {creatingWorker ? 'Creating...' : 'Create Worker'}
          </Button>
        </form>
      </Card>

      <Card className="shadow-sm">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-ink">Worker List</h2>
            <p className="text-sm text-muted">Showing {filteredWorkers.length} of {workers.length} workers</p>
          </div>
          <div className="w-full lg:max-w-md"><SearchInput onSearch={onSearch} placeholder="Search worker by name, email, or role..." /></div>
        </div>

        <div className="overflow-x-auto">
          {loadingWorkers ? (
            <SkeletonTable rows={5} />
          ) : filteredWorkers.length === 0 ? (
            <EmptyState icon={<Users className="h-8 w-8" />} title="No workers found" description="Create a worker above or adjust your search." />
          ) : (
            <table className="w-full">
              <thead className="text-left text-xs font-medium text-muted">
                <tr><th className="px-6 py-4">Name</th><th className="px-6 py-4">Email</th><th className="px-6 py-4">Role</th><th className="px-6 py-4">Status</th><th className="px-6 py-4">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredWorkers.map((w) => (
                  <tr key={w.uid} className="hover:bg-white/5">
                    <td className="px-6 py-4 font-semibold text-ink">{w.name}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-muted">{w.email}</span>
                        <CopyButton text={w.email} />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted">{w.role}</td>
                    <td className="px-6 py-4"><Badge variant={w.isActive === false ? 'danger' : 'success'}>{w.isActive === false ? 'Inactive' : 'Active'}</Badge></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => { window.location.hash = `#/admin/workers/${w.uid}`; }} iconLeft={<Eye className="h-4 w-4" />}>View</Button>
                        <Button variant="danger" size="sm" onClick={() => deleteWorkerDoc(w.uid)} iconLeft={<Trash2 className="h-4 w-4" />} aria-label="Delete worker">{''}</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
};

interface MessagesSectionProps {
  filteredMessages: MessageDoc[];
  loadingMessages: boolean;
  toggleMessageLike: (message: MessageDoc) => void;
  deleteMessage: (id: string) => void;
  onSearch: (q: string) => void;
}

const MessagesSection: React.FC<MessagesSectionProps> = ({
  filteredMessages, loadingMessages, toggleMessageLike, deleteMessage, onSearch,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Worker Messages</h1>
          <p className="mt-1 text-sm text-muted">All messages sent by workers in your company appear here instantly.</p>
        </div>
        <Badge variant="info" className="px-4 py-2 text-sm">
          <MessageSquare className="mr-1.5 h-4 w-4" />
          {filteredMessages.length} message{filteredMessages.length === 1 ? '' : 's'}
        </Badge>
      </div>

      <Card className="shadow-sm"><SearchInput onSearch={onSearch} placeholder="Search by worker name, email, or message..." /></Card>

      {loadingMessages ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
      ) : filteredMessages.length === 0 ? (
        <Card className="shadow-sm">
          <EmptyState icon={<MessageSquare className="h-8 w-8" />} title="No worker messages yet" description="When workers send messages, they will show here without refreshing." />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredMessages.map((m) => (
            <Card key={m.id} hover className="shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-sm font-bold text-navy-950 shadow-lg">
                    {s(m.fromName).slice(0, 2).toUpperCase() || 'WK'}
                  </div>
                  <div>
                    <div className="font-semibold text-ink">{m.fromName || 'Worker'}</div>
                    <div className="text-sm text-muted">{m.fromEmail || 'No email'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={m.likedByAdmin ? 'danger' : 'ghost'}
                    size="sm"
                    onClick={() => toggleMessageLike(m)}
                    title={m.likedByAdmin ? 'Remove like' : 'Like message'}
                    iconLeft={<Heart className={`h-4 w-4 ${m.likedByAdmin ? 'fill-current' : ''}`} />}
                    aria-label={m.likedByAdmin ? 'Remove like' : 'Like message'}
                  >{''}</Button>
                  <Button variant="ghost" size="sm" onClick={() => deleteMessage(m.id)} title="Delete message" iconLeft={<Trash2 className="h-4 w-4" />} aria-label="Delete message">{''}</Button>
                </div>
              </div>
              <p className="whitespace-pre-wrap rounded-2xl bg-navy-800 p-4 text-sm leading-6 text-ink/80">{m.text}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-muted">
                <span>{m.likedByAdmin ? 'Liked by admin' : 'Company: ' + m.companyId}</span>
                <span>{m.createdAt?.toDate?.()?.toLocaleString() || 'Just now'}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminDashboard: React.FC = () => {
  const { profile, signOut } = useAuth();
  const [currentPage, setCurrentPage] = useState<Page>('products');
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'basic' | 'advanced'>('basic');
  const [advancedSearchFilters, setAdvancedSearchFilters] = useState({ minPrice: '', maxPrice: '', minStock: '', maxStock: '', category: '' });

  const adminUid = profile?.uid || '';
  const companyId = useMemo(() => s((profile as any)?.companyId || profile?.uid), [profile]);
  const companyName = useMemo(() => s((profile as any)?.companyName) || 'Company', [profile]);
  const adminName = useMemo(() => s(profile?.name) || 'Admin', [profile?.name]);

  const [toast, setToast] = useState<Toast>(null);
  const toastTimer = useRef<number | null>(null);
  const showToast = useCallback((text: string, type: ToastType) => {
    setToast({ text, type });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 3500);
  }, []);

  const [products, setProducts] = useState<ProductDoc[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [productForm, setProductForm] = useState({ name: '', category: '', price: '', qty: '1' });
  const [productImages, setProductImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [savingProduct, setSavingProduct] = useState(false);
  const [restockById, setRestockById] = useState<Record<string, number>>({});
  const [restockingId, setRestockingId] = useState<string | null>(null);

  const [workers, setWorkers] = useState<WorkerDoc[]>([]);
  const [loadingWorkers, setLoadingWorkers] = useState(true);
  const [workerForm, setWorkerForm] = useState({ name: '', email: '', password: '' });
  const [creatingWorker, setCreatingWorker] = useState(false);

  const [messages, setMessages] = useState<MessageDoc[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const messageSeenStorageKey = useMemo(() => `admin:${adminUid || 'unknown'}:${companyId || 'unknown'}:lastSeenMessagesAt`, [adminUid, companyId]);
  const [lastSeenMessagesAt, setLastSeenMessagesAt] = useState(0);
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number; title: string } | null>(null);
  const [credentialModal, setCredentialModal] = useState<{ name: string; email: string; password: string } | null>(null);

  const openImageLightbox = useCallback((urls: string[] = [], title: string, index = 0) => {
    if (!urls.length) return;
    setLightbox({ urls, title, index: Math.max(0, Math.min(index, urls.length - 1)) });
  }, []);

  const closeImageLightbox = useCallback(() => setLightbox(null), []);
  const showPrevImage = useCallback(() => {
    setLightbox((prev) => prev ? { ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length } : prev);
  }, []);
  const showNextImage = useCallback(() => {
    setLightbox((prev) => prev ? { ...prev, index: (prev.index + 1) % prev.urls.length } : prev);
  }, []);

  const dashboardStats = useMemo(() => {
    const visibleProducts = selectedDate ? products.filter((p) => productTouchedOnDate(p, selectedDate)) : products;
    const visibleMessages = selectedDate ? messages.filter((m) => sameCalendarDay(toDateSafe(m.createdAt), selectedDate)) : messages;
    const totalProducts = visibleProducts.length;
    const totalWorkers = workers.length;
    const totalMessages = visibleMessages.length;
    const totalStockValue = visibleProducts.reduce((sum, p) => sum + p.price * p.qtyCurrent, 0);
    const totalSoldValue = visibleProducts.reduce((sum, p) => sum + p.price * p.qtySold, 0);
    const activeWorkers = workers.filter((w) => w.isActive !== false).length;
    const lowStockProducts = visibleProducts.filter((p) => p.qtyCurrent < 10 && p.qtyCurrent > 0).length;
    const outOfStockProducts = visibleProducts.filter((p) => p.qtyCurrent === 0).length;
    return { totalProducts, totalWorkers, totalMessages, totalStockValue, totalSoldValue, activeWorkers, lowStockProducts, outOfStockProducts };
  }, [products, workers, messages, selectedDate]);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];
    if (selectedDate) filtered = filtered.filter((p) => productTouchedOnDate(p, selectedDate));
    const { minPrice, maxPrice, minStock, maxStock, category } = advancedSearchFilters;
    if (minPrice) filtered = filtered.filter((p) => p.price >= toNum(minPrice));
    if (maxPrice) filtered = filtered.filter((p) => p.price <= toNum(maxPrice));
    if (minStock) filtered = filtered.filter((p) => p.qtyCurrent >= toNum(minStock));
    if (maxStock) filtered = filtered.filter((p) => p.qtyCurrent <= toNum(maxStock));
    if (category) filtered = filtered.filter((p) => p.category.toLowerCase().includes(category.toLowerCase()));
    if (searchQuery) filtered = advancedSearch(filtered, searchQuery, ['name', 'category', 'status']);
    return filtered;
  }, [products, selectedDate, searchQuery, advancedSearchFilters]);

  const filteredWorkers = useMemo(() => (searchQuery ? advancedSearch(workers, searchQuery, ['name', 'email', 'role']) : workers), [workers, searchQuery]);
  const filteredMessages = useMemo(() => {
    let filtered = [...messages];
    if (selectedDate) filtered = filtered.filter((m) => sameCalendarDay(toDateSafe(m.createdAt), selectedDate));
    if (searchQuery) filtered = advancedSearch(filtered, searchQuery, ['fromName', 'fromEmail', 'text']);
    return filtered;
  }, [messages, selectedDate, searchQuery]);

  const latestMessageTime = useMemo(() => getLatestMessageTime(messages), [messages]);
  const unreadMessagesCount = useMemo(() => currentPage === 'messages' ? 0 : messages.filter((message) => tsMillis(message.createdAt) > lastSeenMessagesAt).length, [currentPage, lastSeenMessagesAt, messages]);

  const markMessagesAsSeen = useCallback(() => {
    const seenAt = latestMessageTime || Date.now();
    setLastSeenMessagesAt(seenAt);
    try { window.localStorage.setItem(messageSeenStorageKey, String(seenAt)); } catch {}
  }, [latestMessageTime, messageSeenStorageKey]);

  const handleNavClick = useCallback((page: Page) => {
    setCurrentPage(page);
    setSearchQuery('');
    if (page === 'messages') markMessagesAsSeen();
  }, [markMessagesAsSeen]);

  useEffect(() => {
    try { setLastSeenMessagesAt(Number(window.localStorage.getItem(messageSeenStorageKey) || 0)); }
    catch { setLastSeenMessagesAt(0); }
  }, [messageSeenStorageKey]);

  useEffect(() => {
    if (currentPage === 'messages' && messages.length) markMessagesAsSeen();
  }, [currentPage, messages.length, markMessagesAsSeen]);

  useEffect(() => {
    return () => imagePreviews.forEach((url) => URL.revokeObjectURL(url));
  }, [imagePreviews]);

  useEffect(() => {
    if (!adminUid || !companyId) return;

    setLoadingProducts(true);
    const unsubProducts = db.collection('products').where('companyId', '==', companyId).onSnapshot(
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ProductDoc[];
        list.sort((a, b) => tsSeconds(b.updatedAt) - tsSeconds(a.updatedAt));
        setProducts(list);
        setRestockById((prev) => {
          const next = { ...prev };
          for (const p of list) if (next[p.id] === undefined) next[p.id] = 1;
          return next;
        });
        setLoadingProducts(false);
      },
      (err) => { console.error('products stream error:', err); setLoadingProducts(false); }
    );

    setLoadingWorkers(true);
    const unsubWorkers = db.collection('users').where('role', '==', UserRole.WORKER).where('companyId', '==', companyId).where('createdBy', '==', adminUid).onSnapshot(
      (snap) => {
        const list = snap.docs.map((d) => d.data() as WorkerDoc);
        list.sort((a, b) => tsSeconds(b.createdAt) - tsSeconds(a.createdAt));
        setWorkers(list);
        setLoadingWorkers(false);
      },
      (err) => { console.error('workers stream error:', err); setLoadingWorkers(false); }
    );

    setLoadingMessages(true);
    const unsubMessages = db.collection('messages').where('companyId', '==', companyId).onSnapshot(
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as MessageDoc[];
        list.sort((a, b) => tsSeconds(b.createdAt) - tsSeconds(a.createdAt));
        setMessages(list.slice(0, 200));
        setLoadingMessages(false);
      },
      (err) => {
        console.error('messages stream error:', err);
        setLoadingMessages(false);
        showToast('Unable to load worker messages. Check Firestore rules and companyId.', 'error');
      }
    );

    return () => {
      unsubProducts();
      unsubWorkers();
      unsubMessages();
    };
  }, [adminUid, companyId, showToast]);

  const handleImageSelect = (files: FileList | null) => {
    const selected = Array.from(files || []).filter((file) => file.type.startsWith('image/'));
    const merged = [...productImages, ...selected].slice(0, 8);
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setProductImages(merged);
    setImagePreviews(merged.map((file) => URL.createObjectURL(file)));
  };

  const removeImage = (index: number) => {
    const next = productImages.filter((_, i) => i !== index);
    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
    setProductImages(next);
    setImagePreviews(next.map((file) => URL.createObjectURL(file)));
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUid || !companyId) return;
    const name = s(productForm.name);
    const category = s(productForm.category);
    if (!name || !category) return showToast('Fill product name and category.', 'error');

    setSavingProduct(true);
    setToast(null);
    try {
      const qty = Math.max(0, Math.floor(toNum(productForm.qty, 0)));
      const uploaded = productImages.length ? await uploadImagesToCloudinary(productImages) : [];
      await db.collection('products').add({
        companyId, name, category,
        price: Math.max(0, toNum(productForm.price, 0)),
        qtyUploaded: qty, qtySold: 0, qtyCurrent: qty,
        status: qty === 0 ? ProductStatus.SOLD : ProductStatus.AVAILABLE,
        imageUrls: uploaded.map((img) => img.url),
        imagePublicIds: uploaded.map((img) => img.publicId),
        createdBy: adminUid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastSoldAt: null, lastSoldByUid: null, lastSoldByName: null,
      });
      setProductForm({ name: '', category: '', price: '', qty: '1' });
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setProductImages([]);
      setImagePreviews([]);
      showToast('Product added with images', 'success');
    } catch (err: any) {
      console.error('add product failed:', err);
      showToast(err?.message || 'Failed to add product.', 'error');
    } finally {
      setSavingProduct(false);
    }
  };

  const deleteProduct = useCallback(async (id: string) => {
    if (!window.confirm('Delete product?')) return;
    try {
      await db.collection('products').doc(id).delete();
      showToast('Product deleted', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Delete failed.', 'error');
    }
  }, [showToast]);

  const updateRestock = useCallback((id: string, raw: string) => setRestockById((p) => ({ ...p, [id]: clampInt(raw, 1, 1000000) })), []);

  const restock = useCallback(async (p: ProductDoc) => {
    const add = clampInt(restockById[p.id] ?? 1, 1, 1000000);
    setRestockingId(p.id);
    try {
      await db.runTransaction(async (tx) => {
        const ref = db.collection('products').doc(p.id);
        const snap = await tx.get(ref);
        if (!snap.exists) throw new Error('Not found.');
        const cur = snap.data() as any;
        if (String(cur.companyId) !== String(companyId)) throw new Error('Not your company.');
        const nextUploaded = Number(cur.qtyUploaded ?? 0) + add;
        const nextCurrent = Number(cur.qtyCurrent ?? 0) + add;
        tx.update(ref, {
          qtyUploaded: nextUploaded, qtyCurrent: nextCurrent,
          status: nextCurrent === 0 ? ProductStatus.SOLD : ProductStatus.AVAILABLE,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      });
      showToast(`Restocked +${add}`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Restock failed.', 'error');
    } finally {
      setRestockingId(null);
    }
  }, [companyId, restockById, showToast]);

  const deleteMessage = useCallback(async (id: string) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await db.collection('messages').doc(id).delete();
      showToast('Message deleted', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Delete message failed.', 'error');
    }
  }, [showToast]);

  const toggleMessageLike = useCallback(async (message: MessageDoc) => {
    try {
      await db.collection('messages').doc(message.id).update({
        likedByAdmin: !message.likedByAdmin,
        likedAt: !message.likedByAdmin ? firebase.firestore.FieldValue.serverTimestamp() : null,
        likedByUid: !message.likedByAdmin ? adminUid : null,
        likedByName: !message.likedByAdmin ? adminName : null,
      });
      showToast(!message.likedByAdmin ? 'Message liked' : 'Like removed', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Failed to update message like.', 'error');
    }
  }, [adminUid, adminName, showToast]);

  const createWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.uid || !companyId) return;
    const name = s(workerForm.name);
    const email = s(workerForm.email);
    const password = workerForm.password;
    if (!name || !email || !password) return showToast('Fill worker name/email/password.', 'error');

    setCreatingWorker(true);
    const defaultApp = firebase.apps[0];
    const options = (defaultApp?.options || {}) as any;
    let secondaryApp: firebase.app.App | null = null;
    try {
      secondaryApp = firebase.initializeApp(options, `WorkerCreator_${Date.now()}`);
      const cred = await secondaryApp.auth().createUserWithEmailAndPassword(email, password);
      const user = cred.user;
      if (!user) throw new Error('Worker auth not created.');
      await db.collection('users').doc(user.uid).set({
        uid: user.uid, name, email,
        role: UserRole.WORKER, companyId, createdBy: adminUid, isActive: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      showToast(`Worker created: ${name}`, 'success');
      setCredentialModal({ name, email, password });
      setWorkerForm({ name: '', email: '', password: '' });
      await secondaryApp.auth().signOut();
    } catch (err: any) {
      showToast(err?.message || 'Worker create failed.', 'error');
    } finally {
      try { if (secondaryApp) await secondaryApp.delete(); } catch {}
      setCreatingWorker(false);
    }
  };

  const deleteWorkerDoc = useCallback(async (uid: string) => {
    if (!window.confirm('Delete this worker Firestore profile?')) return;
    try {
      await db.collection('users').doc(uid).delete();
      showToast('Worker removed', 'success');
    } catch (err: any) {
      showToast(err?.message || 'Delete worker failed.', 'error');
    }
  }, [showToast]);

  const exportData = useCallback(() => {
    const data = currentPage === 'products'
      ? filteredProducts.map((p) => ({ Name: p.name, Category: p.category, Price: p.price, Stock: p.qtyCurrent, Sold: p.qtySold, Images: p.imageUrls?.join(' | ') || '' }))
      : currentPage === 'workers'
      ? filteredWorkers.map((w) => ({ Name: w.name, Email: w.email, Role: w.role, Status: w.isActive === false ? 'Inactive' : 'Active' }))
      : filteredMessages.map((m) => ({ From: m.fromName, Email: m.fromEmail, Message: m.text }));
    if (!data.length) return showToast('No data to export', 'error');
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map((row: any) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentPage}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${data.length} records`, 'success');
  }, [currentPage, filteredProducts, filteredWorkers, filteredMessages, showToast]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setAdvancedSearchFilters({ minPrice: '', maxPrice: '', minStock: '', maxStock: '', category: '' });
  }, []);

  const handleDateSelect = useCallback((date: Date | null) => setSelectedDate(date), []);

  if (profile?.role !== UserRole.ADMIN) {
    return (
      <div className="grid min-h-screen place-items-center bg-navy-800">
        <Card className="max-w-md text-center shadow-xl">
          <h1 className="text-2xl font-bold text-ink">Unauthorized</h1>
          <p className="mt-2 text-muted">You do not have permission to access this page.</p>
        </Card>
      </div>
    );
  }

  const navItems: DashboardNavItem[] = [
    { id: 'products', label: 'Products', icon: Package },
    { id: 'workers', label: 'Workers', icon: Users },
    { id: 'messages', label: 'Messages', icon: MessageSquare },
    { id: 'branches', label: 'Branches', icon: GitBranch },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'activity', label: 'Activity', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleNavigate = useCallback((page: string) => {
    if (page === 'branches' || page === 'reports' || page === 'activity' || page === 'settings') {
      window.location.hash = '#/admin/' + page;
      return;
    }
    handleNavClick(page as Page);
  }, [handleNavClick]);

  return (
    <DashboardLayout
      title={companyName}
      subtitle="Admin Panel"
      navItems={navItems}
      currentPage={currentPage}
      onNavigate={handleNavigate}
      onSignOut={signOut}
      unreadCount={unreadMessagesCount}
    >
      {toast && (
        <div className="fixed right-5 top-5 z-[70]">
          <Toast message={toast.text} type={toast.type} onDismiss={() => setToast(null)} />
        </div>
      )}

      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-line bg-gradient-to-r from-navy-850 via-navy-750 to-navy-700 p-6 text-ink shadow-lg shadow-black/40 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-brand">Administration</div>
          <h1 className="mt-1 text-2xl font-black tracking-tight">
            Bonjour, {adminName} 👋
          </h1>
          <p className="mt-1 text-sm text-ink/70">
            {companyName} · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/5 px-4 py-2.5 backdrop-blur-sm">
            <div className="text-[10px] font-bold uppercase tracking-widest text-brand">Role</div>
            <div className="text-sm font-bold">Administrateur</div>
          </div>
          <div className="hidden rounded-xl bg-white/5 px-4 py-2.5 backdrop-blur-sm sm:block">
            <div className="text-[10px] font-bold uppercase tracking-widest text-brand">Status</div>
            <div className="flex items-center gap-1.5 text-sm font-bold">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Opérationnel
            </div>
          </div>
        </div>
      </div>

      {lightbox && (
        <ImageLightbox images={lightbox.urls} initialIndex={lightbox.index} open={true} onClose={closeImageLightbox} />
      )}

      {credentialModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-navy-950/70 p-4 backdrop-blur-sm" onClick={() => setCredentialModal(null)}>
          <div className="w-full max-w-md rounded-3xl border border-line bg-navy-700 p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand text-navy-950 shadow-lg shadow-black/40">
                <CheckCircle className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-bold text-ink">Worker created!</h3>
              <p className="mt-1 text-sm text-muted">
                Share these credentials with <span className="font-semibold text-ink/80">{credentialModal.name}</span> to let them sign in.
              </p>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl bg-navy-800 p-4 ring-1 ring-line">
                <div className="text-xs font-medium uppercase tracking-wide text-muted">Email</div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-sm font-semibold text-ink">{credentialModal.email}</span>
                  <CopyButton text={credentialModal.email} />
                </div>
              </div>
              <div className="rounded-2xl bg-navy-800 p-4 ring-1 ring-line">
                <div className="text-xs font-medium uppercase tracking-wide text-muted">Password</div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-sm font-semibold text-ink">{credentialModal.password}</span>
                  <CopyButton text={credentialModal.password} />
                </div>
              </div>
            </div>

            <Button
              className="mt-6 w-full"
              onClick={() => setCredentialModal(null)}
              iconLeft={<CheckCircle className="h-4 w-4" />}
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {currentPage === 'products' && (
        <ProductsSection
          filteredProducts={filteredProducts}
          loadingProducts={loadingProducts}
          stats={dashboardStats}
          selectedDate={selectedDate}
          productForm={productForm}
          setProductForm={setProductForm}
          savingProduct={savingProduct}
          productImages={productImages}
          imagePreviews={imagePreviews}
          addProduct={addProduct}
          handleImageSelect={handleImageSelect}
          removeImage={removeImage}
          restockById={restockById}
          updateRestock={updateRestock}
          restockingId={restockingId}
          restock={restock}
          deleteProduct={deleteProduct}
          onSearch={setSearchQuery}
          searchMode={searchMode}
          setSearchMode={setSearchMode}
          advancedSearchFilters={advancedSearchFilters}
          setAdvancedSearchFilters={setAdvancedSearchFilters}
          clearFilters={clearFilters}
          exportData={exportData}
          onSelectDate={handleDateSelect}
        />
      )}

      {currentPage === 'workers' && (
        <WorkersSection
          filteredWorkers={filteredWorkers}
          workers={workers}
          loadingWorkers={loadingWorkers}
          workerForm={workerForm}
          setWorkerForm={setWorkerForm}
          creatingWorker={creatingWorker}
          createWorker={createWorker}
          deleteWorkerDoc={deleteWorkerDoc}
          onSearch={setSearchQuery}
        />
      )}

      {currentPage === 'messages' && (
        <MessagesSection
          filteredMessages={filteredMessages}
          loadingMessages={loadingMessages}
          toggleMessageLike={toggleMessageLike}
          deleteMessage={deleteMessage}
          onSearch={setSearchQuery}
        />
      )}
    </DashboardLayout>
  );
};

export default AdminDashboard;