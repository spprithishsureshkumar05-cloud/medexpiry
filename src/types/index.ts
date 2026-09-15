export type Role = 'ADMIN' | 'STAFF';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BatchStatus = 'AVAILABLE' | 'LOW_STOCK' | 'EXPIRING_SOON' | 'EXPIRED' | 'OUT_OF_STOCK' | 'RECALLED';

export interface Medicine {
  id: string;
  medicineName: string;
  genericName: string;
  brandName: string;
  category: string;
  dosageForm: string;
  strength: string;
  manufacturer: string;
  description: string;
  minimumStockLevel: number;
  createdAt: string;
  updatedAt: string;
  totalStock?: number;
  batchCount?: number;
  expiredCount?: number;
  expiringSoonCount?: number;
  isLowStock?: boolean;
  isOutOfStock?: boolean;
  fefoRecommendedBatch?: {
    id: string;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
  } | null;
}

export interface MedicineBatch {
  id: string;
  medicineId: string;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  supplierId: string;
  storageLocation: string;
  status: BatchStatus;
  createdAt: string;
  updatedAt: string;
  daysRemaining?: number;
  isExpired?: boolean;
  isLowStock?: boolean;
  medicineName?: string;
  genericName?: string;
  strength?: string;
  dosageForm?: string;
  supplierName?: string;
}

export interface Supplier {
  id: string;
  supplierName: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  licenseNumber: string;
  createdAt: string;
  updatedAt: string;
  medicineCount?: number;
  totalBatches?: number;
  activeBatchesCount?: number;
  expiredBatchesCount?: number;
  totalInventoryValue?: number;
}

export type TransactionType = 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'RETURN' | 'DAMAGED' | 'EXPIRED' | 'RECALLED';

export interface StockTransaction {
  id: string;
  medicineBatchId: string;
  medicineName?: string;
  batchNumber?: string;
  transactionType: TransactionType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  performedBy: string;
  performedByName?: string;
  createdAt: string;
}

export type NotificationType = 'EXPIRY_ALERT' | 'EXPIRED_ALERT' | 'LOW_STOCK' | 'SYSTEM_ALERT';

export interface Notification {
  id: string;
  userId?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  relatedBatchId?: string | null;
  isRead: boolean;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityType?: string;
  entityId: string;
  oldValue?: string | null;
  newValue?: string | null;
  details?: any;
  ipAddress?: string;
  createdAt: string;
}

export interface SystemSettings {
  warningPeriodDays: number;
  criticalPeriodDays: number;
  mediumPeriodDays: number;
  autoRunJobHours: number;
  pharmacyName: string;
  pharmacyAddress: string;
  licenseNo: string;
  expiryAlertDays?: number[];
  defaultLowStockThreshold?: number;
  enableEmailAlerts?: boolean;
  fefoStrictEnforce?: boolean;
  evaluationFrequencyHours?: number;
}

export interface DashboardSummary {
  cards: {
    totalMedicines: number;
    totalStock: number;
    expiringSoon: number;
    expired: number;
    lowStock: number;
    outOfStock: number;
    totalInventoryCost: number;
    totalRetailValue: number;
  };
  urgentAlerts: Array<{
    id: string;
    medicineName: string;
    batchNumber: string;
    expiryDate: string;
    daysRemaining: number;
    quantity: number;
    type: 'EXPIRED' | 'CRITICAL_EXPIRY' | 'LOW_STOCK';
  }>;
}

export interface DashboardCharts {
  expiryStatusDistribution: Array<{ name: string; value: number; fill: string }>;
  expiryTimeline: Array<{ range: string; count: number; color: string }>;
  categoryStock: Array<{ category: string; quantity: number }>;
  topMedicines: Array<{ name: string; quantity: number; form: string }>;
  monthlyMovement: Array<{ month: string; stockIn: number; stockOut: number }>;
}
