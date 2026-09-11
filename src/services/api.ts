import type { UserProfile, Product, Worker, Branch, Message } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function getAuthHeaders(): Promise<HeadersInit> {
  const user = (await import('../firebase')).default.auth().currentUser;
  const token = user ? await user.getIdToken() : '';
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

interface ApiErrorBody {
  error?: string;
  message?: string;
}

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...headers,
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body: ApiErrorBody = await response.json();
      if (body?.error) message = body.error;
      else if (body?.message) message = body.message;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return (await response.json()) as T;
}

async function uploadRequest<T>(path: string, formData: FormData): Promise<T> {
  const headers = await getAuthHeaders();
  const { 'Content-Type': _contentType, ...restHeaders } = headers as Record<string, string>;
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: restHeaders,
    body: formData,
  });

  if (!response.ok) {
    let message = `Upload failed with status ${response.status}`;
    try {
      const body: ApiErrorBody = await response.json();
      if (body?.error) message = body.error;
      else if (body?.message) message = body.message;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export interface ProductListResponse {
  products: Product[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface AuthEnvelope {
  success: boolean;
  user?: UserProfile | null;
  company?: { companyId: string; companyName: string };
  requiresProfile?: boolean;
  message?: string;
}

const unwrapUser = (data: AuthEnvelope): UserProfile => {
  if (!data?.user) {
    throw new Error(data?.message || 'User profile not found');
  }
  return data.user;
};

export const authApi = {
  getProfile: async (): Promise<UserProfile> =>
    unwrapUser(await apiRequest<AuthEnvelope>('/auth/profile')),
  updateProfile: async (data: Partial<UserProfile>): Promise<UserProfile> =>
    unwrapUser(
      await apiRequest<AuthEnvelope>('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(data),
      })
    ),
  registerProfile: async (data: any): Promise<UserProfile> =>
    unwrapUser(
      await apiRequest<AuthEnvelope>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      })
    ),
};

export const productsApi = {
  list: (params?: { search?: string; category?: string; minPrice?: number; maxPrice?: number; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.category) query.set('category', params.category);
    if (params?.minPrice !== undefined) query.set('minPrice', String(params.minPrice));
    if (params?.maxPrice !== undefined) query.set('maxPrice', String(params.maxPrice));
    if (params?.page !== undefined) query.set('page', String(params.page));
    if (params?.limit !== undefined) query.set('limit', String(params.limit));
    const qs = query.toString();
    return apiRequest<ProductListResponse>(`/products${qs ? `?${qs}` : ''}`);
  },
  create: (formData: FormData) => uploadRequest<Product>('/products', formData),
  update: (id: string, data: any) =>
    apiRequest<Product>(`/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiRequest<void>(`/products/${id}`, { method: 'DELETE' }),
  restock: (id: string, qty: number) =>
    apiRequest<Product>(`/products/${id}/restock`, { method: 'POST', body: JSON.stringify({ qty }) }),
  sell: (id: string, qty: number) =>
    apiRequest<Product>(`/products/${id}/sell`, { method: 'POST', body: JSON.stringify({ qty }) }),
  uploadImages: (formData: FormData) => uploadRequest<{ imageUrls: string[]; imagePublicIds: string[] }>('/upload/images', formData),
};

export const workersApi = {
  list: () => apiRequest<Worker[]>('/workers'),
  create: (data: { name: string; email: string; password: string }) =>
    apiRequest<Worker>('/workers', { method: 'POST', body: JSON.stringify(data) }),
  delete: (uid: string) => apiRequest<void>(`/workers/${uid}`, { method: 'DELETE' }),
  assignBranch: (uid: string, branchId: string) =>
    apiRequest<Worker>(`/workers/${uid}/branch`, { method: 'PUT', body: JSON.stringify({ branchId }) }),
};

export const branchesApi = {
  list: () => apiRequest<Branch[]>('/branches'),
  create: (data: { name: string; location: string; description?: string }) =>
    apiRequest<Branch>('/branches', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    apiRequest<Branch>(`/branches/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiRequest<void>(`/branches/${id}`, { method: 'DELETE' }),
  getWorkers: (id: string) => apiRequest<Worker[]>(`/branches/${id}/workers`),
};

export const messagesApi = {
  list: () => apiRequest<Message[]>('/messages'),
  send: (text: string) =>
    apiRequest<Message>('/messages', { method: 'POST', body: JSON.stringify({ text }) }),
  delete: (id: string) => apiRequest<void>(`/messages/${id}`, { method: 'DELETE' }),
  toggleLike: (id: string) =>
    apiRequest<Message>(`/messages/${id}/like`, { method: 'POST' }),
};
