import fs from 'fs';
import path from 'path';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'ADMIN' | 'STAFF';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Medicine {
  id: string;
  medicineName: string;
  genericName: string;
  brandName: string;
  category: string;
  dosageForm: string; // Tablet, Capsule, Syrup, Injection, Cream, Ointment, Drops, Inhaler
  strength: string;
  manufacturer: string;
  description: string;
  minimumStockLevel: number;
  createdAt: string;
  updatedAt: string;
}

export type BatchStatus = 'AVAILABLE' | 'LOW_STOCK' | 'EXPIRING_SOON' | 'EXPIRED' | 'OUT_OF_STOCK' | 'RECALLED';

export interface MedicineBatch {
  id: string;
  medicineId: string;
  batchNumber: string;
  manufacturingDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD
  purchasePrice: number;
  sellingPrice: number;
  quantity: number;
  supplierId: string;
  storageLocation: string;
  status: BatchStatus;
  createdAt: string;
  updatedAt: string;
  // Computed helpers for response:
  daysRemaining?: number;
  isExpired?: boolean;
  isLowStock?: boolean;
  medicineName?: string;
  supplierName?: string;
  dosageForm?: string;
  strength?: string;
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
  performedBy: string; // User ID
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
  entityId: string;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
}

export interface SystemSettings {
  warningPeriodDays: number; // default 90
  criticalPeriodDays: number; // default 7
  mediumPeriodDays: number; // default 30
  autoRunJobHours: number;
  pharmacyName: string;
  pharmacyAddress: string;
  licenseNo: string;
}

export interface DatabaseState {
  users: User[];
  medicines: Medicine[];
  batches: MedicineBatch[];
  suppliers: Supplier[];
  transactions: StockTransaction[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  settings: SystemSettings;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'medexpiry.json');

// In-memory cache
let state: DatabaseState | null = null;

export function calculateDaysRemaining(expiryDateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDateStr);
  exp.setHours(0, 0, 0, 0);
  const diffTime = exp.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function computeBatchStatus(
  batch: { quantity: number; expiryDate: string },
  minStockLevel: number = 20,
  warningPeriodDays: number = 90
): BatchStatus {
  const days = calculateDaysRemaining(batch.expiryDate);

  if (days < 0) {
    return 'EXPIRED';
  }
  if (batch.quantity <= 0) {
    return 'OUT_OF_STOCK';
  }
  if (days <= warningPeriodDays) {
    return 'EXPIRING_SOON';
  }
  if (batch.quantity <= minStockLevel) {
    return 'LOW_STOCK';
  }
  return 'AVAILABLE';
}

function getInitialSeedData(): DatabaseState {
  const now = new Date().toISOString();

  const users: User[] = [
    {
      id: 'usr-admin-1',
      name: 'Dr. Sarah Jenkins (Chief Pharmacist)',
      email: 'admin@medexpiry.com',
      // Password hash for 'admin123'
      passwordHash: '$2a$10$tZ8GqQ0b0hFw9n8UfW3CKe.N774cSm2q0E251yI3c2q7L3x7F9G2u',
      role: 'ADMIN',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'usr-staff-1',
      name: 'Marcus Vance (Pharmacy Technician)',
      email: 'staff@medexpiry.com',
      // Password hash for 'staff123'
      passwordHash: '$2a$10$tZ8GqQ0b0hFw9n8UfW3CKe.N774cSm2q0E251yI3c2q7L3x7F9G2u',
      role: 'STAFF',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const suppliers: Supplier[] = [
    {
      id: 'sup-1',
      supplierName: 'PharmaCare Logistics Ltd.',
      contactPerson: 'David Ross',
      phone: '+1 (555) 234-5678',
      email: 'orders@pharmacare.example.com',
      address: '742 Evergreen Terrace, Sector 4, Metro Medical Park',
      licenseNumber: 'WDL-2024-8849',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'sup-2',
      supplierName: 'Apex Med Distribution',
      contactPerson: 'Elena Rostova',
      phone: '+1 (555) 345-6789',
      email: 'sales@apexmed.example.com',
      address: '100 Industrial Parkway, Suite 12, West Health District',
      licenseNumber: 'WDL-2023-7120',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'sup-3',
      supplierName: 'BioHealth Global Therapeutics',
      contactPerson: 'Dr. Tariq Al-Mansoor',
      phone: '+1 (555) 456-7890',
      email: 'tariq@biohealth.example.com',
      address: '45 Science Park Drive, Innovation Corridor',
      licenseNumber: 'WDL-2025-9921',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'sup-4',
      supplierName: 'CureWell Pharmaceuticals',
      contactPerson: 'Mei-Ling Chen',
      phone: '+1 (555) 567-8901',
      email: 'contact@curewell.example.com',
      address: '88 Harbor Boulevard, North Bay Pharma Depot',
      licenseNumber: 'WDL-2022-6341',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'sup-5',
      supplierName: 'Lifeline Medical Supplies Co.',
      contactPerson: 'Arthur Pendelton',
      phone: '+1 (555) 678-9012',
      email: 'arthur@lifelinemed.example.com',
      address: '22 Elm Street, Central Medical Plaza',
      licenseNumber: 'WDL-2025-4509',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const medicines: Medicine[] = [
    {
      id: 'med-1',
      medicineName: 'Paracetamol 500mg',
      genericName: 'Acetaminophen',
      brandName: 'Panadol / Calpol',
      category: 'Analgesics & Antipyretics',
      dosageForm: 'Tablet',
      strength: '500 mg',
      manufacturer: 'GSK Consumer Healthcare',
      description: 'Used for mild-to-moderate pain and reduction of fever in adults and children.',
      minimumStockLevel: 50,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'med-2',
      medicineName: 'Amoxicillin Clavulanate 625mg',
      genericName: 'Amoxicillin + Clavulanic Acid',
      brandName: 'Augmentin',
      category: 'Antibiotics',
      dosageForm: 'Tablet',
      strength: '500 mg / 125 mg',
      manufacturer: 'Sandoz Pharmaceuticals',
      description: 'Broad-spectrum beta-lactam antibacterial for respiratory, ENT, and skin infections.',
      minimumStockLevel: 30,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'med-3',
      medicineName: 'Metformin Hydrochloride 500mg',
      genericName: 'Metformin HCl',
      brandName: 'Glucophage',
      category: 'Antidiabetics',
      dosageForm: 'Tablet',
      strength: '500 mg',
      manufacturer: 'Merck Healthcare',
      description: 'First-line biguanide anti-hyperglycemic oral medication for Type 2 diabetes mellitus.',
      minimumStockLevel: 40,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'med-4',
      medicineName: 'Amlodipine Besylate 5mg',
      genericName: 'Amlodipine',
      brandName: 'Norvasc',
      category: 'Cardiovascular',
      dosageForm: 'Tablet',
      strength: '5 mg',
      manufacturer: 'Pfizer Inc.',
      description: 'Calcium channel blocker prescribed for hypertension and coronary artery disease.',
      minimumStockLevel: 35,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'med-5',
      medicineName: 'Omeprazole 20mg Delayed-Release',
      genericName: 'Omeprazole',
      brandName: 'Prilosec',
      category: 'Gastrointestinal',
      dosageForm: 'Capsule',
      strength: '20 mg',
      manufacturer: 'AstraZeneca',
      description: 'Proton pump inhibitor (PPI) treating GERD, peptic ulcers, and acid reflux.',
      minimumStockLevel: 45,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'med-6',
      medicineName: 'Azithromycin 500mg',
      genericName: 'Azithromycin',
      brandName: 'Zithromax',
      category: 'Antibiotics',
      dosageForm: 'Tablet',
      strength: '500 mg',
      manufacturer: 'Pfizer Inc.',
      description: 'Macrolide antibiotic active against various bacterial respiratory tract infections.',
      minimumStockLevel: 25,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'med-7',
      medicineName: 'Cetirizine Hydrochloride 10mg',
      genericName: 'Cetirizine HCl',
      brandName: 'Zyrtec',
      category: 'Antihistamines',
      dosageForm: 'Tablet',
      strength: '10 mg',
      manufacturer: 'Johnson & Johnson',
      description: 'Second-generation non-sedating antihistamine for allergic rhinitis and chronic urticaria.',
      minimumStockLevel: 30,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'med-8',
      medicineName: 'Salbutamol Inhaler 100mcg',
      genericName: 'Albuterol Sulfate',
      brandName: 'Ventolin HFA',
      category: 'Respiratory',
      dosageForm: 'Inhaler',
      strength: '100 mcg/dose',
      manufacturer: 'GSK Respiratory',
      description: 'Short-acting beta2-adrenergic bronchodilator for relief of acute bronchospasm in asthma.',
      minimumStockLevel: 20,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'med-9',
      medicineName: 'Atorvastatin Calcium 20mg',
      genericName: 'Atorvastatin',
      brandName: 'Lipitor',
      category: 'Cardiovascular',
      dosageForm: 'Tablet',
      strength: '20 mg',
      manufacturer: 'Viatris Healthcare',
      description: 'HMG-CoA reductase inhibitor (statin) for hyperlipidemia and cardiovascular risk reduction.',
      minimumStockLevel: 40,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'med-10',
      medicineName: 'Ciprofloxacin Eye/Ear Drops 0.3%',
      genericName: 'Ciprofloxacin',
      brandName: 'Ciloxan',
      category: 'Ophthalmic & Otic',
      dosageForm: 'Drops',
      strength: '0.3% w/v',
      manufacturer: 'Alcon Laboratories',
      description: 'Fluoroquinolone anti-infective topical drops for corneal ulcers and bacterial conjunctivitis.',
      minimumStockLevel: 15,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'med-11',
      medicineName: 'Hydrocortisone Cream 1%',
      genericName: 'Hydrocortisone',
      brandName: 'Cortaid',
      category: 'Dermatological',
      dosageForm: 'Cream',
      strength: '1% w/w',
      manufacturer: 'Bayer Healthcare',
      description: 'Low-potency topical corticosteroid for dermatitis, eczema, and pruritus relief.',
      minimumStockLevel: 20,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'med-12',
      medicineName: 'Ibuprofen Suspension 100mg/5ml',
      genericName: 'Ibuprofen',
      brandName: 'Advil Pediatric / Nurofen',
      category: 'Analgesics & Antipyretics',
      dosageForm: 'Syrup',
      strength: '100 mg / 5 ml',
      manufacturer: 'Reckitt Benckiser',
      description: 'Pediatric NSAID oral suspension for fever reduction and anti-inflammatory relief.',
      minimumStockLevel: 25,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'med-13',
      medicineName: 'Insulin Glargine 100 IU/ml Solostar',
      genericName: 'Insulin Glargine',
      brandName: 'Lantus',
      category: 'Antidiabetics',
      dosageForm: 'Injection',
      strength: '100 IU / ml (3 ml)',
      manufacturer: 'Sanofi-Aventis',
      description: 'Long-acting basal human insulin analog indicated for glycemic control in diabetes.',
      minimumStockLevel: 15,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'med-14',
      medicineName: 'Pantoprazole Injection 40mg',
      genericName: 'Pantoprazole Sodium',
      brandName: 'Protonix IV',
      category: 'Gastrointestinal',
      dosageForm: 'Injection',
      strength: '40 mg lyophilized vial',
      manufacturer: 'Sun Pharma',
      description: 'Intravenous PPI for short-term hospital management of acute upper GI bleed.',
      minimumStockLevel: 10,
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Batches configured carefully relative to Sept 2026:
  // Current date is around 2026-09-14:
  // - Expired: 2026-08-10, 2026-08-28
  // - Expiring in 5 days (Critical): 2026-09-19
  // - Expiring in 20 days (High): 2026-10-04
  // - Expiring in 55 days (Medium): 2026-11-08
  // - Safe: 2027-03-15, 2027-09-20, 2028-01-10
  // - Low stock: 6 units
  // - Out of stock: 0 units
  const batches: MedicineBatch[] = [
    // Paracetamol 500mg: Multiple batches showcasing FEFO
    {
      id: 'btc-1',
      medicineId: 'med-1',
      batchNumber: 'PARA-2026-A1',
      manufacturingDate: '2025-09-10',
      expiryDate: '2026-09-19', // ~5 days remaining! CRITICAL
      purchasePrice: 1.20,
      sellingPrice: 2.50,
      quantity: 85,
      supplierId: 'sup-1',
      storageLocation: 'Shelf A-01 (Front Tier)',
      status: 'EXPIRING_SOON',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'btc-2',
      medicineId: 'med-1',
      batchNumber: 'PARA-2026-B2',
      manufacturingDate: '2026-02-01',
      expiryDate: '2027-04-15', // Safe
      purchasePrice: 1.25,
      sellingPrice: 2.50,
      quantity: 420,
      supplierId: 'sup-1',
      storageLocation: 'Shelf A-02',
      status: 'AVAILABLE',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'btc-3',
      medicineId: 'med-1',
      batchNumber: 'PARA-2025-X0',
      manufacturingDate: '2024-08-01',
      expiryDate: '2026-08-15', // EXPIRED 30 days ago
      purchasePrice: 1.15,
      sellingPrice: 2.50,
      quantity: 14,
      supplierId: 'sup-1',
      storageLocation: 'Quarantine Bay Q-1',
      status: 'EXPIRED',
      createdAt: now,
      updatedAt: now,
    },

    // Amoxicillin Clavulanate 625mg
    {
      id: 'btc-4',
      medicineId: 'med-2',
      batchNumber: 'AMOX-8841',
      manufacturingDate: '2025-10-15',
      expiryDate: '2026-10-04', // ~20 days remaining! HIGH alert
      purchasePrice: 8.50,
      sellingPrice: 15.00,
      quantity: 45,
      supplierId: 'sup-2',
      storageLocation: 'Shelf B-04',
      status: 'EXPIRING_SOON',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'btc-5',
      medicineId: 'med-2',
      batchNumber: 'AMOX-9022',
      manufacturingDate: '2026-03-10',
      expiryDate: '2027-08-30', // Safe
      purchasePrice: 8.70,
      sellingPrice: 15.50,
      quantity: 180,
      supplierId: 'sup-2',
      storageLocation: 'Shelf B-05',
      status: 'AVAILABLE',
      createdAt: now,
      updatedAt: now,
    },

    // Metformin 500mg
    {
      id: 'btc-6',
      medicineId: 'med-3',
      batchNumber: 'MET-5509',
      manufacturingDate: '2025-11-20',
      expiryDate: '2026-11-10', // ~57 days remaining! MEDIUM alert
      purchasePrice: 2.10,
      sellingPrice: 4.80,
      quantity: 60,
      supplierId: 'sup-3',
      storageLocation: 'Shelf C-01',
      status: 'EXPIRING_SOON',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'btc-7',
      medicineId: 'med-3',
      batchNumber: 'MET-6014',
      manufacturingDate: '2026-04-01',
      expiryDate: '2028-02-28', // Safe
      purchasePrice: 2.15,
      sellingPrice: 4.80,
      quantity: 350,
      supplierId: 'sup-3',
      storageLocation: 'Shelf C-02',
      status: 'AVAILABLE',
      createdAt: now,
      updatedAt: now,
    },

    // Amlodipine 5mg: Low stock demo!
    {
      id: 'btc-8',
      medicineId: 'med-4',
      batchNumber: 'AML-3312',
      manufacturingDate: '2025-08-10',
      expiryDate: '2027-05-15',
      purchasePrice: 1.80,
      sellingPrice: 3.60,
      quantity: 8, // Below min stock 35!
      supplierId: 'sup-2',
      storageLocation: 'Shelf C-09',
      status: 'LOW_STOCK',
      createdAt: now,
      updatedAt: now,
    },

    // Omeprazole 20mg
    {
      id: 'btc-9',
      medicineId: 'med-5',
      batchNumber: 'OME-7721',
      manufacturingDate: '2025-06-01',
      expiryDate: '2026-08-30', // EXPIRED ~15 days ago
      purchasePrice: 3.40,
      sellingPrice: 7.20,
      quantity: 25,
      supplierId: 'sup-4',
      storageLocation: 'Quarantine Bay Q-2',
      status: 'EXPIRED',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'btc-10',
      medicineId: 'med-5',
      batchNumber: 'OME-8104',
      manufacturingDate: '2026-01-15',
      expiryDate: '2027-06-20',
      purchasePrice: 3.50,
      sellingPrice: 7.50,
      quantity: 190,
      supplierId: 'sup-4',
      storageLocation: 'Shelf D-02',
      status: 'AVAILABLE',
      createdAt: now,
      updatedAt: now,
    },

    // Azithromycin 500mg: Out of stock batch & active batch
    {
      id: 'btc-11',
      medicineId: 'med-6',
      batchNumber: 'AZI-4401',
      manufacturingDate: '2025-07-15',
      expiryDate: '2027-01-10',
      purchasePrice: 6.00,
      sellingPrice: 12.00,
      quantity: 0, // OUT OF STOCK
      supplierId: 'sup-2',
      storageLocation: 'Shelf B-01',
      status: 'OUT_OF_STOCK',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'btc-12',
      medicineId: 'med-6',
      batchNumber: 'AZI-4920',
      manufacturingDate: '2026-03-01',
      expiryDate: '2027-11-20',
      purchasePrice: 6.20,
      sellingPrice: 12.50,
      quantity: 75,
      supplierId: 'sup-2',
      storageLocation: 'Shelf B-02',
      status: 'AVAILABLE',
      createdAt: now,
      updatedAt: now,
    },

    // Cetirizine 10mg
    {
      id: 'btc-13',
      medicineId: 'med-7',
      batchNumber: 'CET-1102',
      manufacturingDate: '2025-10-01',
      expiryDate: '2026-10-25', // ~41 days remaining
      purchasePrice: 1.10,
      sellingPrice: 3.00,
      quantity: 110,
      supplierId: 'sup-5',
      storageLocation: 'Shelf E-01',
      status: 'EXPIRING_SOON',
      createdAt: now,
      updatedAt: now,
    },

    // Salbutamol Inhaler 100mcg: Low stock
    {
      id: 'btc-14',
      medicineId: 'med-8',
      batchNumber: 'SAL-9910',
      manufacturingDate: '2025-12-05',
      expiryDate: '2027-07-10',
      purchasePrice: 9.50,
      sellingPrice: 18.00,
      quantity: 5, // Below min stock 20
      supplierId: 'sup-1',
      storageLocation: 'Shelf A-06',
      status: 'LOW_STOCK',
      createdAt: now,
      updatedAt: now,
    },

    // Atorvastatin 20mg
    {
      id: 'btc-15',
      medicineId: 'med-9',
      batchNumber: 'ATOR-6601',
      manufacturingDate: '2026-02-14',
      expiryDate: '2028-02-14',
      purchasePrice: 4.20,
      sellingPrice: 8.90,
      quantity: 210,
      supplierId: 'sup-3',
      storageLocation: 'Shelf C-07',
      status: 'AVAILABLE',
      createdAt: now,
      updatedAt: now,
    },

    // Ciprofloxacin Drops: Expired
    {
      id: 'btc-16',
      medicineId: 'med-10',
      batchNumber: 'CIP-2025-Z',
      manufacturingDate: '2024-09-01',
      expiryDate: '2026-09-01', // Expired 13 days ago
      purchasePrice: 3.00,
      sellingPrice: 6.50,
      quantity: 8,
      supplierId: 'sup-4',
      storageLocation: 'Quarantine Bay Q-1',
      status: 'EXPIRED',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'btc-17',
      medicineId: 'med-10',
      batchNumber: 'CIP-2026-N',
      manufacturingDate: '2026-04-01',
      expiryDate: '2027-10-01',
      purchasePrice: 3.10,
      sellingPrice: 6.50,
      quantity: 45,
      supplierId: 'sup-4',
      storageLocation: 'Shelf E-05',
      status: 'AVAILABLE',
      createdAt: now,
      updatedAt: now,
    },

    // Hydrocortisone Cream 1%
    {
      id: 'btc-18',
      medicineId: 'med-11',
      batchNumber: 'HYD-5021',
      manufacturingDate: '2026-01-20',
      expiryDate: '2027-12-30',
      purchasePrice: 2.80,
      sellingPrice: 5.50,
      quantity: 65,
      supplierId: 'sup-5',
      storageLocation: 'Shelf D-08',
      status: 'AVAILABLE',
      createdAt: now,
      updatedAt: now,
    },

    // Ibuprofen Syrup
    {
      id: 'btc-19',
      medicineId: 'med-12',
      batchNumber: 'IBU-9099',
      manufacturingDate: '2025-11-01',
      expiryDate: '2026-11-28', // ~75 days remaining
      purchasePrice: 3.20,
      sellingPrice: 6.80,
      quantity: 40,
      supplierId: 'sup-1',
      storageLocation: 'Shelf A-09',
      status: 'EXPIRING_SOON',
      createdAt: now,
      updatedAt: now,
    },

    // Insulin Glargine Solostar (Cold storage / Fridge!)
    {
      id: 'btc-20',
      medicineId: 'med-13',
      batchNumber: 'INS-SOLO-1',
      manufacturingDate: '2026-02-01',
      expiryDate: '2027-02-01',
      purchasePrice: 22.00,
      sellingPrice: 38.00,
      quantity: 18,
      supplierId: 'sup-3',
      storageLocation: 'Refrigerator #2 (2°C - 8°C)',
      status: 'AVAILABLE',
      createdAt: now,
      updatedAt: now,
    },

    // Pantoprazole Injection
    {
      id: 'btc-21',
      medicineId: 'med-14',
      batchNumber: 'PAN-IV-78',
      manufacturingDate: '2025-12-10',
      expiryDate: '2027-06-15',
      purchasePrice: 4.50,
      sellingPrice: 9.00,
      quantity: 3, // LOW STOCK (< 10)
      supplierId: 'sup-4',
      storageLocation: 'Emergency Injectables Cabinet E-1',
      status: 'LOW_STOCK',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const transactions: StockTransaction[] = [
    {
      id: 'tx-1',
      medicineBatchId: 'btc-1',
      medicineName: 'Paracetamol 500mg',
      batchNumber: 'PARA-2026-A1',
      transactionType: 'STOCK_IN',
      quantity: 100,
      previousQuantity: 0,
      newQuantity: 100,
      reason: 'Initial shipment reception from PharmaCare',
      performedBy: 'usr-admin-1',
      performedByName: 'Dr. Sarah Jenkins',
      createdAt: '2026-08-01T09:00:00.000Z',
    },
    {
      id: 'tx-2',
      medicineBatchId: 'btc-1',
      medicineName: 'Paracetamol 500mg',
      batchNumber: 'PARA-2026-A1',
      transactionType: 'STOCK_OUT',
      quantity: 15,
      previousQuantity: 100,
      newQuantity: 85,
      reason: 'Outpatient pharmacy dispensary dispensing',
      performedBy: 'usr-staff-1',
      performedByName: 'Marcus Vance',
      createdAt: '2026-09-02T14:30:00.000Z',
    },
    {
      id: 'tx-3',
      medicineBatchId: 'btc-4',
      medicineName: 'Amoxicillin Clavulanate 625mg',
      batchNumber: 'AMOX-8841',
      transactionType: 'STOCK_IN',
      quantity: 60,
      previousQuantity: 0,
      newQuantity: 60,
      reason: 'Monthly inventory replenishment',
      performedBy: 'usr-admin-1',
      performedByName: 'Dr. Sarah Jenkins',
      createdAt: '2026-08-15T11:15:00.000Z',
    },
    {
      id: 'tx-4',
      medicineBatchId: 'btc-4',
      medicineName: 'Amoxicillin Clavulanate 625mg',
      batchNumber: 'AMOX-8841',
      transactionType: 'STOCK_OUT',
      quantity: 15,
      previousQuantity: 60,
      newQuantity: 45,
      reason: 'Prescription dispensing FEFO protocol',
      performedBy: 'usr-staff-1',
      performedByName: 'Marcus Vance',
      createdAt: '2026-09-08T16:20:00.000Z',
    },
  ];

  const notifications: Notification[] = [
    {
      id: 'notif-1',
      userId: null,
      title: '🚨 Paracetamol 500mg Expired Batch Alert',
      message: 'Batch PARA-2025-X0 (14 units) expired on 2026-08-15. Move to Quarantine Bay and schedule pharmaceutical safe disposal.',
      type: 'EXPIRED_ALERT',
      relatedBatchId: 'btc-3',
      isRead: false,
      priority: 'CRITICAL',
      createdAt: '2026-09-14T08:00:00.000Z',
    },
    {
      id: 'notif-2',
      userId: null,
      title: '⚠️ Urgent: Paracetamol 500mg Expiring in 5 Days',
      message: 'Batch PARA-2026-A1 expires on 2026-09-19. Ensure FEFO dispensing or initiate supplier credit return.',
      type: 'EXPIRY_ALERT',
      relatedBatchId: 'btc-1',
      isRead: false,
      priority: 'HIGH',
      createdAt: '2026-09-14T08:00:00.000Z',
    },
    {
      id: 'notif-3',
      userId: null,
      title: '⚠️ Expiry Warning: Amoxicillin Clavulanate 625mg',
      message: 'Batch AMOX-8841 expires on 2026-10-04 (20 days remaining). Prioritize dispensing via FEFO.',
      type: 'EXPIRY_ALERT',
      relatedBatchId: 'btc-4',
      isRead: false,
      priority: 'MEDIUM',
      createdAt: '2026-09-14T08:00:00.000Z',
    },
    {
      id: 'notif-4',
      userId: null,
      title: '📉 Low Stock Warning: Amlodipine Besylate 5mg',
      message: 'Current stock (8 units) is below minimum safety threshold (35 units). Reorder recommended.',
      type: 'LOW_STOCK',
      relatedBatchId: 'btc-8',
      isRead: true,
      priority: 'HIGH',
      createdAt: '2026-09-13T10:00:00.000Z',
    },
    {
      id: 'notif-5',
      userId: null,
      title: '🚨 Ciprofloxacin Drops Expired',
      message: 'Batch CIP-2025-Z (8 units) expired on 2026-09-01. Immediately removed from active dispensing.',
      type: 'EXPIRED_ALERT',
      relatedBatchId: 'btc-16',
      isRead: false,
      priority: 'CRITICAL',
      createdAt: '2026-09-14T08:00:00.000Z',
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'aud-1',
      userId: 'usr-admin-1',
      userName: 'Dr. Sarah Jenkins',
      action: 'SYSTEM_INITIALIZATION',
      entity: 'System',
      entityId: 'medexpiry-sys',
      oldValue: null,
      newValue: 'Initialized MedExpiry inventory database with master catalogs and security profiles',
      createdAt: '2026-08-01T08:00:00.000Z',
    },
    {
      id: 'aud-2',
      userId: 'usr-admin-1',
      userName: 'Dr. Sarah Jenkins',
      action: 'STOCK_IN',
      entity: 'MedicineBatch',
      entityId: 'btc-1',
      oldValue: '0 units',
      newValue: '100 units (Batch PARA-2026-A1)',
      createdAt: '2026-08-01T09:00:00.000Z',
    },
    {
      id: 'aud-3',
      userId: 'usr-staff-1',
      userName: 'Marcus Vance',
      action: 'STOCK_OUT',
      entity: 'MedicineBatch',
      entityId: 'btc-1',
      oldValue: '100 units',
      newValue: '85 units (Dispensed 15 units)',
      createdAt: '2026-09-02T14:30:00.000Z',
    },
    {
      id: 'aud-4',
      userId: 'usr-admin-1',
      userName: 'Dr. Sarah Jenkins',
      action: 'BATCH_QUARANTINED',
      entity: 'MedicineBatch',
      entityId: 'btc-3',
      oldValue: 'Status: AVAILABLE',
      newValue: 'Status: EXPIRED (Moved to Quarantine Bay Q-1)',
      createdAt: '2026-09-03T10:15:00.000Z',
    },
  ];

  const settings: SystemSettings = {
    warningPeriodDays: 90,
    criticalPeriodDays: 7,
    mediumPeriodDays: 30,
    autoRunJobHours: 24,
    pharmacyName: 'St. Jude Central Hospital & Pharmacy',
    pharmacyAddress: '400 Healthcare Boulevard, Suite 100, Metro City',
    licenseNo: 'PHARM-LIC-2026-0941',
  };

  return {
    users,
    medicines,
    batches,
    suppliers,
    transactions,
    notifications,
    auditLogs,
    settings,
  };
}

export function loadDatabase(): DatabaseState {
  if (state) return state;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      state = JSON.parse(content);
      return state!;
    }
  } catch (err) {
    console.error('Error reading medexpiry data file, falling back to seed:', err);
  }

  // Fallback to fresh seed
  state = getInitialSeedData();
  saveDatabase();
  return state;
}

export function saveDatabase(): void {
  if (!state) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save medexpiry data file:', err);
  }
}

// Recalculates statuses and regenerates notifications
export function runExpiryAndStockEvaluation(): { updatedBatches: number; newAlerts: number } {
  const db = loadDatabase();
  let updatedBatches = 0;
  let newAlerts = 0;
  const now = new Date().toISOString();

  const medMap = new Map<string, Medicine>(db.medicines.map((m) => [m.id, m]));

  for (const b of db.batches) {
    const med = medMap.get(b.medicineId);
    const minStock = med ? med.minimumStockLevel : 20;
    const oldStatus = b.status;
    const newStatus = computeBatchStatus(b, minStock, db.settings.warningPeriodDays);

    if (newStatus !== oldStatus) {
      b.status = newStatus;
      b.updatedAt = now;
      updatedBatches++;
    }

    const daysRemaining = calculateDaysRemaining(b.expiryDate);

    // Create notifications if needed, avoiding duplicates
    if (daysRemaining < 0) {
      const exists = db.notifications.some(
        (n) => n.relatedBatchId === b.id && n.type === 'EXPIRED_ALERT'
      );
      if (!exists) {
        db.notifications.unshift({
          id: `notif-exp-${Date.now()}-${b.id}`,
          userId: null,
          title: `🚨 ${med?.medicineName || 'Medicine'} Expired`,
          message: `Batch ${b.batchNumber} (${b.quantity} units) has expired. Remove immediately from saleable inventory.`,
          type: 'EXPIRED_ALERT',
          relatedBatchId: b.id,
          isRead: false,
          priority: 'CRITICAL',
          createdAt: now,
        });
        newAlerts++;
      }
    } else if (daysRemaining <= db.settings.warningPeriodDays) {
      const priority =
        daysRemaining <= db.settings.criticalPeriodDays
          ? 'HIGH'
          : daysRemaining <= db.settings.mediumPeriodDays
          ? 'MEDIUM'
          : 'LOW';

      const exists = db.notifications.some(
        (n) =>
          n.relatedBatchId === b.id &&
          n.type === 'EXPIRY_ALERT' &&
          n.priority === priority
      );

      if (!exists) {
        db.notifications.unshift({
          id: `notif-exp-${Date.now()}-${b.id}`,
          userId: null,
          title: `⚠️ ${med?.medicineName || 'Medicine'} Expiring Soon`,
          message: `Batch ${b.batchNumber} expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Apply FEFO dispensing.`,
          type: 'EXPIRY_ALERT',
          relatedBatchId: b.id,
          isRead: false,
          priority: priority as any,
          createdAt: now,
        });
        newAlerts++;
      }
    }

    // Low stock notification
    if (b.quantity <= minStock && b.quantity > 0) {
      const exists = db.notifications.some(
        (n) => n.relatedBatchId === b.id && n.type === 'LOW_STOCK'
      );
      if (!exists) {
        db.notifications.unshift({
          id: `notif-low-${Date.now()}-${b.id}`,
          userId: null,
          title: `📉 ${med?.medicineName || 'Medicine'} Low Stock Alert`,
          message: `Batch ${b.batchNumber} has only ${b.quantity} units remaining (below threshold of ${minStock}).`,
          type: 'LOW_STOCK',
          relatedBatchId: b.id,
          isRead: false,
          priority: 'HIGH',
          createdAt: now,
        });
        newAlerts++;
      }
    }
  }

  if (updatedBatches > 0 || newAlerts > 0) {
    saveDatabase();
  }

  return { updatedBatches, newAlerts };
}
