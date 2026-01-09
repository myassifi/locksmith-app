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

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    const prevToken = this.token;
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }

    if (prevToken !== token && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(AUTH_TOKEN_EVENT, { detail: { token } }));
    }
  }

  getToken() {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const isFormData = options.body instanceof FormData;
    const buildHeaders = (withAuth: boolean): HeadersInit => {
      const headers: any = {
        ...(withAuth && this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...options.headers,
      };
      
      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }
      
      return headers;
    };

    const doFetch = (withAuth: boolean) =>
      fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: buildHeaders(withAuth),
      });

    const response = await doFetch(true);

    // If token is stale/invalid, clear it so the UI can re-auth.
    if (response.status === 401 && this.token) {
      this.setToken(null);
    }

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      let message = 'Request failed';

      if (bodyText) {
        try {
          const parsed = JSON.parse(bodyText);
          message = parsed?.error || parsed?.message || message;
        } catch {
          message = bodyText;
        }
      }

      const err = new Error(message);
      (err as any).status = response.status;
      throw err;
    }

    return response.json();
  }

  // Auth
  async signup(email: string, password: string, businessName?: string) {
    const data = await this.request<{ user: any; token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, businessName }),
    });
    this.setToken(data.token);
    return data;
  }

  async login(email: string, password: string) {
    const data = await this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  async updateProfile(data: { businessName?: string; phone?: string; address?: string; password?: string }) {
    return this.request<any>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
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
      body: JSON.stringify(mapInventoryToApi(data)),
    });
    return mapInventoryFromApi(updated);
  }

  async deleteInventoryItem(id: string) {
    return this.request<any>(`/api/inventory/${id}`, {
      method: 'DELETE',
    });
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
    return this.request<any[]>('/api/jobs');
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
      body: JSON.stringify(data),
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
