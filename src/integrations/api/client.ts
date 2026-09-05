const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:4000');

type AnyRecord = Record<string, any>;

export const AUTH_TOKEN_EVENT = 'auth_token_changed';

function resolveImageUrl(raw: unknown): string | undefined {
  if (!raw || typeof raw !== 'string') return undefined;
  const url = raw.trim();
  if (!url) return undefined;

  // If the API returns a relative upload path, resolve it against API_URL in dev.
  if (url.startsWith('/')) {
    return `${API_URL}${url}`;
  }

  // Avoid mixed-content (http image on https page).
  if (typeof window !== 'undefined' && window.location?.protocol === 'https:' && url.startsWith('http://')) {
    return `https://${url.slice('http://'.length)}`;
  }

  return url;
}

function mapInventoryToApi(data: AnyRecord): AnyRecord {
  const mapped: AnyRecord = { ...data };

  if (mapped.item_name !== undefined && mapped.itemName === undefined) {
    mapped.itemName = mapped.item_name;
    delete mapped.item_name;
  }
  if (mapped.key_type !== undefined && mapped.keyType === undefined) {
    mapped.keyType = mapped.key_type;
    delete mapped.key_type;
  }
  if (mapped.fcc_id !== undefined && mapped.fccId === undefined) {
    mapped.fccId = mapped.fcc_id;
    delete mapped.fcc_id;
  }
  if (mapped.low_stock_threshold !== undefined && mapped.lowStockThreshold === undefined) {
    mapped.lowStockThreshold = mapped.low_stock_threshold;
    delete mapped.low_stock_threshold;
  }
  if (mapped.year_from !== undefined && mapped.yearFrom === undefined) {
    mapped.yearFrom = mapped.year_from;
    delete mapped.year_from;
  }
  if (mapped.year_to !== undefined && mapped.yearTo === undefined) {
    mapped.yearTo = mapped.year_to;
    delete mapped.year_to;
  }
  if (mapped.image_url !== undefined && mapped.imageUrl === undefined) {
    mapped.imageUrl = mapped.image_url;
    delete mapped.image_url;
  }

  return mapped;
}

function mapInventoryFromApi(item: AnyRecord): AnyRecord {
  if (!item || typeof item !== 'object') return item;
  return {
    ...item,
    item_name: item.itemName ?? item.item_name,
    key_type: item.keyType ?? item.key_type,
    fcc_id: item.fccId ?? item.fcc_id,
    low_stock_threshold: item.lowStockThreshold ?? item.low_stock_threshold,
    year_from: item.yearFrom ?? item.year_from,
    year_to: item.yearTo ?? item.year_to,
    image_url: resolveImageUrl(item.imageUrl ?? item.image_url),
    created_at: item.createdAt ?? item.created_at,
  };
}

class ApiClient {
  private token: string | null = null;
  private pendingMutations = new Map<string, string>();
  private inventoryVersions = new Map<string, number>();
  private jobVersions = new Map<string, number>();

  constructor() {
    this.token = localStorage.getItem('auth_token');
    window.addEventListener('storage', event => { if (event.key === 'auth_token') this.setToken(event.newValue); });
  }

  setToken(token: string | null, user?: unknown) {
    const prevToken = this.token;
    this.token = token;
    if (prevToken !== token) {
      this.pendingMutations.clear();
      this.inventoryVersions.clear();
      this.jobVersions.clear();
    }
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }

    if ((prevToken !== token || user) && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(AUTH_TOKEN_EVENT, { detail: { token, user } }));
    }
  }

  getToken() {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const requestToken = this.token;
    const headers = new Headers(options.headers);
    if (requestToken) headers.set('Authorization', `Bearer ${requestToken}`);
    const isFormData = options.body instanceof FormData;
    if (!isFormData) headers.set('Content-Type', 'application/json');
    const mutation = endpoint.startsWith('/api/') && !isFormData && ['POST', 'PUT', 'DELETE'].includes(options.method || 'GET');
    const fingerprint = JSON.stringify([requestToken, options.method, endpoint, options.body]);
    if (mutation) {
      const key = this.pendingMutations.get(fingerprint) || crypto.randomUUID();
      this.pendingMutations.set(fingerprint, key);
      headers.set('Idempotency-Key', key);
    }
    let response: Response | undefined;
    for (let attempt = 0; attempt < (mutation ? 2 : 1); attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), isFormData ? 60000 : 20000);
      try {
        response = await fetch(`${API_URL}${endpoint}`, { ...options, headers, signal: options.signal || controller.signal });
        break;
      } catch (error) {
        if (attempt === (mutation ? 1 : 0)) throw new Error(mutation ? 'Connection interrupted. Retry the same change safely; it will not be applied twice.' : 'Unable to connect. Please try again.');
      } finally { clearTimeout(timeout); }
    }
    if (!response) throw new Error('Unable to connect');
    if (response.status === 401 && requestToken && this.token === requestToken) this.setToken(null);
    if (!response.ok) {
      if (mutation && response.status >= 400 && response.status < 500) this.pendingMutations.delete(fingerprint);
      const body = await response.json().catch(() => ({}));
      throw Object.assign(new Error(body.error || 'Request failed. Please try again.'), { status: response.status });
    }
    const result = response.status === 204 ? undefined : await response.json();
    if (mutation) this.pendingMutations.delete(fingerprint);
    return result as T;
  }

  // Auth
  async signup(email: string, password: string, businessName?: string) {
    const data = await this.request<{ user: any; token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, businessName }),
    });
    this.setToken(data.token, data.user);
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token, data.user);
    return data;
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  async updateProfile(data: { businessName?: string; phone?: string; address?: string; password?: string }) {
    const user = await this.request<any>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (user.token) this.setToken(user.token, user);
    return user;
  }

  logout() {
    this.setToken(null);
  }

  // Upload
  async uploadImage(file: File) {
    const formData = new FormData();
    formData.append('image', file);
    return this.request<{ url: string }>('/api/upload', {
      method: 'POST',
      body: formData,
    });
  }

  // Invoice
  async importInvoice(file: File) {
    const formData = new FormData();
    formData.append('invoice', file);
    return this.request<{
      success: boolean;
      supplier: string;
      items: any[];
      totalItems: number;
      totalValue: number;
    }>('/api/invoice/import-invoice', {
      method: 'POST',
      body: formData,
    });
  }

  async bulkAddInvoiceItems(items: any[]) {
    return this.request<{ success: boolean; message: string; results: any[] }>('/api/invoice/bulk-add', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  }

  // Inventory
  async getInventory() {
    const items = await this.request<any[]>('/api/inventory');
    for (const item of items) this.inventoryVersions.set(item.id, item.version);
    return (items || []).map(mapInventoryFromApi);
  }

  async createInventoryItem(data: any) {
    const created = await this.request<any>('/api/inventory', {
      method: 'POST',
      body: JSON.stringify(mapInventoryToApi(data)),
    });
    return mapInventoryFromApi(created);
  }

  async updateInventoryItem(id: string, data: any) {
    const updated = await this.request<any>(`/api/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ expectedVersion: this.inventoryVersions.get(id), ...mapInventoryToApi(data) }),
    });
    this.inventoryVersions.set(id, updated.version);
    return mapInventoryFromApi(updated);
  }

  async deleteInventoryItem(id: string) {
    return this.request<any>(`/api/inventory/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkUpdateInventory(data: { ids: string[]; action: string; quantity?: number; supplier?: string; lowStockThreshold?: number; versions?: Record<string, number> }) {
    return this.request<{ success: boolean; count: number }>('/api/inventory/bulk', { method: 'POST', body: JSON.stringify(data) });
  }

  // Customers
  async getCustomers() {
    return this.request<any[]>('/api/customers');
  }

  async createCustomer(data: any) {
    return this.request<any>('/api/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(id: string, data: any) {
    return this.request<any>(`/api/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCustomer(id: string) {
    return this.request<any>(`/api/customers/${id}`, {
      method: 'DELETE',
    });
  }

  // Jobs
  async getJobs() {
    const jobs = await this.request<any[]>('/api/jobs');
    for (const job of jobs) this.jobVersions.set(job.id, job.version);
    return jobs;
  }

  async createJob(data: any) {
    return this.request<any>('/api/jobs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateJob(id: string, data: any) {
    return this.request<any>(`/api/jobs/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ expectedVersion: this.jobVersions.get(id), ...data }),
    });
  }

  async deleteJob(id: string) {
    return this.request<any>(`/api/jobs/${id}`, {
      method: 'DELETE',
    });
  }

  // Subscription
  async getSubscription() {
    return this.request<any>('/api/subscription');
  }
}

export const api = new ApiClient();
