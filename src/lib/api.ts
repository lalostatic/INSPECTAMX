/// <reference types="vite/client" />

const API_URL = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || '/api';

interface FetchOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('inspectamx_token', token);
    } else {
      localStorage.removeItem('inspectamx_token');
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    return localStorage.getItem('inspectamx_token');
  }

  private async request<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.setToken(null);
      window.location.href = '/login';
      throw new Error('No autenticado');
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Error ${response.status}`);
    }

    return data as T;
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  async upload(path: string, formData: FormData): Promise<unknown> {
    const token = this.getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
    return data;
  }
}

export const api = new ApiClient();

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: import('./types').User; expires_at: string }>('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get<{ user: import('./types').User }>('/auth/me'),
};

// Tenants
export const tenantsApi = {
  list: () => api.get<{ tenants: import('./types').Tenant[] }>('/tenants'),
  get: (id: string) => api.get<{ tenant: import('./types').Tenant; branches: import('./types').Branch[]; users: import('./types').User[] }>(`/tenants/${id}`),
  create: (data: {
    name: string; slug: string; plan?: string;
    adminEmail: string; adminName: string; adminPassword: string;
  }) => api.post('/tenants', data),
  update: (id: string, data: Partial<import('./types').Tenant>) => api.put(`/tenants/${id}`, data),
  delete: (id: string) => api.delete(`/tenants/${id}`),
  suspend: (id: string) => api.post(`/tenants/${id}/suspend`),
  activate: (id: string) => api.post(`/tenants/${id}/activate`),
};

// Inspections
export const inspectionsApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<{ inspections: import('./types').Inspection[]; pagination: import('./types').Pagination }>(`/inspections${qs}`);
  },
  get: (id: string) => api.get<{
    inspection: import('./types').Inspection;
    points: import('./types').InspectionPoint[];
    media: import('./types').InspectionMedia[];
  }>(`/inspections/${id}`),
  create: (data: Partial<import('./types').Inspection>) => api.post<{ inspection: import('./types').Inspection }>('/inspections', data),
  update: (id: string, data: Partial<import('./types').Inspection>) => api.put(`/inspections/${id}`, data),
  delete: (id: string) => api.delete(`/inspections/${id}`),
  start: (id: string) => api.post(`/inspections/${id}/start`),
  complete: (id: string) => api.post(`/inspections/${id}/complete`),
  approve: (id: string) => api.post(`/inspections/${id}/approve`),
  reject: (id: string) => api.post(`/inspections/${id}/reject`),
  addPoint: (id: string, data: Partial<import('./types').InspectionPoint>) => api.post(`/inspections/${id}/points`, data),
  getPoints: (id: string) => api.get<{ points: import('./types').InspectionPoint[] }>(`/inspections/${id}/points`),
  addMedia: (id: string, data: { type: string; filename?: string; offline_id?: string }) =>
    api.post<{ media_id: string; r2_key: string }>(`/inspections/${id}/media`, data),
  getMedia: (id: string) => api.get<{ media: import('./types').InspectionMedia[] }>(`/inspections/${id}/media`),
};

// Containers
export const containersApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<{ containers: import('./types').Container[]; pagination: import('./types').Pagination }>(`/containers${qs}`);
  },
  get: (id: string) => api.get<{
    container: import('./types').Container;
    movements: import('./types').ContainerMovement[];
    inspections: import('./types').Inspection[];
  }>(`/containers/${id}`),
  create: (data: Partial<import('./types').Container>) => api.post<{ container_id: string }>('/containers', data),
  update: (id: string, data: Partial<import('./types').Container>) => api.put(`/containers/${id}`, data),
  delete: (id: string) => api.delete(`/containers/${id}`),
  recordMovement: (id: string, data: Partial<import('./types').ContainerMovement>) =>
    api.post(`/containers/${id}/movement`, data),
  getMovements: (id: string) => api.get<{ movements: import('./types').ContainerMovement[] }>(`/containers/${id}/movement`),
  stats: () => api.get<{ stats: Record<string, number> }>('/containers/stats'),
};

// Work Orders
export const workOrdersApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<{ work_orders: import('./types').WorkOrder[]; pagination: import('./types').Pagination }>(`/mr${qs}`);
  },
  get: (id: string) => api.get<{
    work_order: import('./types').WorkOrder;
    items: import('./types').WorkOrderItem[];
    media: unknown[];
  }>(`/mr/${id}`),
  create: (data: Partial<import('./types').WorkOrder>) => api.post<{ work_order_id: string; folio: string }>('/mr', data),
  update: (id: string, data: Partial<import('./types').WorkOrder>) => api.put(`/mr/${id}`, data),
  delete: (id: string) => api.delete(`/mr/${id}`),
  start: (id: string) => api.post(`/mr/${id}/start`),
  complete: (id: string, laborHours?: number) => api.post(`/mr/${id}/complete`, { labor_hours: laborHours }),
  cancel: (id: string) => api.post(`/mr/${id}/cancel`),
  addItem: (id: string, data: Partial<import('./types').WorkOrderItem>) => api.post(`/mr/${id}/items`, data),
  stats: () => api.get<{ stats: Record<string, number | null> }>('/mr/stats'),
};

// Inventory
export const inventoryApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<{ supplies: import('./types').Supply[]; pagination: import('./types').Pagination }>(`/inventory${qs}`);
  },
  get: (id: string) => api.get<{ supply: import('./types').Supply; movements: import('./types').SupplyMovement[] }>(`/inventory/${id}`),
  create: (data: Partial<import('./types').Supply>) => api.post<{ supply_id: string }>('/inventory', data),
  update: (id: string, data: Partial<import('./types').Supply>) => api.put(`/inventory/${id}`, data),
  delete: (id: string) => api.delete(`/inventory/${id}`),
  recordMovement: (id: string, data: { movement_type: string; quantity: number; notes?: string; reference_id?: string }) =>
    api.post(`/inventory/${id}/movement`, data),
  movements: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return api.get<{ movements: import('./types').SupplyMovement[] }>(`/inventory/movements${qs}`);
  },
  alerts: () => api.get<{ alerts: import('./types').Supply[]; count: number }>('/inventory/alerts'),
};

// Reports
export const reportsApi = {
  dashboard: (period?: string) => api.get<import('./types').DashboardStats>(`/reports/dashboard${period ? '?period=' + period : ''}`),
  inspections: (from?: string, to?: string) => {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    return api.get<{ inspections: import('./types').Inspection[] }>(`/reports/inspections?${qs}`);
  },
  mr: (from?: string, to?: string) => {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    return api.get<{ work_orders: import('./types').WorkOrder[] }>(`/reports/mr?${qs}`);
  },
  inventory: () => api.get('/reports/inventory'),
  containers: () => api.get('/reports/containers'),
  kpis: () => api.get('/reports/kpis'),
};

// Users
export const usersApi = {
  list: () => api.get<{ users: import('./types').User[] }>('/users'),
  create: (data: { email: string; name: string; role: string; password: string; branch_id?: string }) =>
    api.post<{ user_id: string }>('/users', data),
  update: (id: string, data: Partial<import('./types').User>) => api.put(`/users/${id}`, data),
};

// Catalog
export const catalogApi = {
  equipmentTypes: () => api.get<{ equipment_types: import('./types').CatalogItem[] }>('/catalog/equipment-types'),
  damageTypes: () => api.get<{ damage_types: import('./types').DamageType[] }>('/catalog/damage-types'),
  inspectionTypes: () => api.get<{ inspection_types: import('./types').CatalogItem[] }>('/catalog/inspection-types'),
  branches: () => api.get<{ branches: import('./types').Branch[] }>('/catalog/branches'),
};

// Dev
export const devApi = {
  stats: () => api.get('/dev/stats'),
};

// Tasks
export const tasksApi = {
  list: () => api.get<{ tasks: import('./types').Task[] }>('/tasks'),
  create: (data: Partial<import('./types').Task>) => api.post<{ task_id: string }>('/tasks', data),
};

// Media upload
export const uploadMedia = async (
  entityType: string,
  entityId: string,
  file: File
): Promise<{ r2_key: string; url: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('entity_type', entityType);
  formData.append('entity_id', entityId);

  return api.upload('/media/upload', formData) as Promise<{ r2_key: string; url: string }>;
};
