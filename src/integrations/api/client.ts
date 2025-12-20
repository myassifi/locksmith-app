const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
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
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || 'Request failed');
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

  // Inventory
  async getInventory() {
    return this.request<any[]>('/api/inventory');
  }

  async createInventoryItem(data: any) {
    return this.request<any>('/api/inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInventoryItem(id: string, data: any) {
    return this.request<any>(`/api/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
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
