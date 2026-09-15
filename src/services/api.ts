import {
  User,
  Medicine,
  MedicineBatch,
  Supplier,
  StockTransaction,
  Notification,
  AuditLog,
  SystemSettings,
  DashboardSummary,
  DashboardCharts,
} from '../types';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('medexpiry_token');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = 'An unexpected server error occurred';
    try {
      const data = await res.json();
      errorMsg = data.error || data.message || errorMsg;
    } catch {
      errorMsg = `Server error HTTP ${res.status}`;
    }
    if (res.status === 401) {
      // Clear token on 401 if invalid
      localStorage.removeItem('medexpiry_token');
      localStorage.removeItem('medexpiry_user');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User; message: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async getMe(): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
    } finally {
      localStorage.removeItem('medexpiry_token');
      localStorage.removeItem('medexpiry_user');
    }
  },

  // Dashboard
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await fetch(`${API_BASE}/dashboard/summary`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getDashboardCharts(): Promise<DashboardCharts> {
    const res = await fetch(`${API_BASE}/dashboard/charts`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Medicines
  async getMedicines(params?: {
    search?: string;
    category?: string;
    manufacturer?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Medicine[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
    meta: { categories: string[]; manufacturers: string[] };
  }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.category) query.set('category', params.category);
    if (params?.manufacturer) query.set('manufacturer', params.manufacturer);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/medicines?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getMedicine(id: string): Promise<{
    medicine: Medicine;
    batches: MedicineBatch[];
    fefoRecommendation: {
      batchId: string;
      batchNumber: string;
      expiryDate: string;
      daysRemaining: number;
      quantity: number;
      location: string;
    } | null;
  }> {
    const res = await fetch(`${API_BASE}/medicines/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createMedicine(data: Partial<Medicine>): Promise<Medicine> {
    const res = await fetch(`${API_BASE}/medicines`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateMedicine(id: string, data: Partial<Medicine>): Promise<Medicine> {
    const res = await fetch(`${API_BASE}/medicines/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteMedicine(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/medicines/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Batches
  async getBatches(params?: {
    search?: string;
    status?: string;
    expiryWindow?: string;
    medicineId?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: MedicineBatch[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.expiryWindow) query.set('expiryWindow', params.expiryWindow);
    if (params?.medicineId) query.set('medicineId', params.medicineId);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/batches?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getBatch(id: string): Promise<{ batch: MedicineBatch; transactions: StockTransaction[] }> {
    const res = await fetch(`${API_BASE}/batches/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createBatch(data: any): Promise<MedicineBatch> {
    const res = await fetch(`${API_BASE}/batches`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateBatch(id: string, data: Partial<MedicineBatch>): Promise<MedicineBatch> {
    const res = await fetch(`${API_BASE}/batches/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteBatch(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/batches/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Inventory Operations
  async getFEFORecommendation(medicineId: string): Promise<{
    medicine: string;
    recommendedBatch: MedicineBatch | null;
    allCandidateBatches: MedicineBatch[];
    recommendationNote: string;
  }> {
    const res = await fetch(`${API_BASE}/inventory/fefo-recommendation/${medicineId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async stockIn(data: {
    medicineId: string;
    batchNumber: string;
    quantity: number;
    manufacturingDate?: string;
    expiryDate: string;
    purchasePrice: number;
    sellingPrice: number;
    supplierId: string;
    storageLocation?: string;
    reason?: string;
  }): Promise<{ message: string; batch: MedicineBatch; transaction: StockTransaction }> {
    const res = await fetch(`${API_BASE}/inventory/stock-in`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async stockOut(data: {
    medicineBatchId: string;
    quantity: number;
    reason: string;
    allowBypassFEFO?: boolean;
  }): Promise<{ message: string; batch: MedicineBatch; transaction: StockTransaction; fefoAdvisory?: string | null }> {
    const res = await fetch(`${API_BASE}/inventory/stock-out`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async disposeBatch(data: {
    medicineBatchId: string;
    disposalType: 'EXPIRED' | 'DAMAGED' | 'RECALLED';
    reason: string;
    witness?: string;
    notes?: string;
  }): Promise<{ message: string; batch: MedicineBatch; transaction: StockTransaction }> {
    const res = await fetch(`${API_BASE}/inventory/dispose`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getTransactions(params?: {
    type?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: StockTransaction[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/inventory/transactions?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Suppliers
  async getSuppliers(search?: string): Promise<Supplier[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const res = await fetch(`${API_BASE}/suppliers${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getSupplier(id: string): Promise<{ supplier: Supplier; batches: MedicineBatch[] }> {
    const res = await fetch(`${API_BASE}/suppliers/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createSupplier(data: Partial<Supplier>): Promise<Supplier> {
    const res = await fetch(`${API_BASE}/suppliers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
    const res = await fetch(`${API_BASE}/suppliers/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteSupplier(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/suppliers/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Notifications
  async getNotifications(type?: string): Promise<{
    notifications: Notification[];
    unreadCount: number;
    totalCount: number;
  }> {
    const query = type ? `?type=${encodeURIComponent(type)}` : '';
    const res = await fetch(`${API_BASE}/notifications${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async markNotificationRead(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async markAllNotificationsRead(): Promise<void> {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async deleteNotification(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/notifications/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async evaluateExpiryCheck(): Promise<{
    message: string;
    updatedBatches: number;
    newAlertsGenerated: number;
    unreadCount: number;
  }> {
    const res = await fetch(`${API_BASE}/notifications/evaluate`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Reports
  async getExpiryReport(days?: number): Promise<{
    summary: {
      totalBatches: number;
      expiredCount: number;
      within7DaysCount: number;
      within30DaysCount: number;
      within60DaysCount: number;
      within90DaysCount: number;
      estimatedLossFromExpired: number;
    };
    batches: any[];
  }> {
    const query = days !== undefined ? `?days=${days}` : '';
    const res = await fetch(`${API_BASE}/reports/expiry${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getStockReport(): Promise<{
    summary: {
      totalMedicines: number;
      totalUnits: number;
      totalValuation: number;
      lowStockCount: number;
      outOfStockCount: number;
    };
    medicines: any[];
  }> {
    const res = await fetch(`${API_BASE}/reports/stock`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getSuppliersReport(): Promise<{ suppliers: any[] }> {
    const res = await fetch(`${API_BASE}/reports/suppliers`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getStockMovementReport(params?: { from?: string; to?: string }): Promise<{
    summary: {
      totalTransactions: number;
      totalStockInUnits: number;
      totalStockOutUnits: number;
      totalDisposedUnits: number;
    };
    transactions: StockTransaction[];
  }> {
    const query = new URLSearchParams();
    if (params?.from) query.set('from', params.from);
    if (params?.to) query.set('to', params.to);
    const res = await fetch(`${API_BASE}/reports/stock-movement?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Audit Logs
  async getAuditLogs(params?: { search?: string; action?: string; page?: number; limit?: number }): Promise<{
    data: AuditLog[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.action) query.set('action', params.action);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());

    const res = await fetch(`${API_BASE}/audit-logs?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Settings
  async getSettings(): Promise<{ settings: SystemSettings }> {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async updateSettings(data: Partial<SystemSettings>): Promise<{ message: string; settings: SystemSettings }> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getUsers(): Promise<{ users: User[] }> {
    const res = await fetch(`${API_BASE}/settings/users`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createUser(data: { name: string; email: string; password: string; role: string }): Promise<User> {
    const res = await fetch(`${API_BASE}/settings/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async toggleUserStatus(id: string): Promise<{ message: string; user: User }> {
    const res = await fetch(`${API_BASE}/settings/users/${id}/toggle`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async deleteUser(id: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/settings/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};
