import { Router, Response } from 'express';
import {
  loadDatabase,
  saveDatabase,
  MedicineBatch,
  calculateDaysRemaining,
  computeBatchStatus,
} from '../dataStore.ts';
import { requireAuth, AuthRequest, requireAdmin } from '../middleware/auth.ts';

const router = Router();

// GET /api/batches
router.get('/', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const search = ((req.query.search as string) || '').toLowerCase().trim();
  const status = (req.query.status as string) || '';
  const expiryWindow = (req.query.expiryWindow as string) || '';
  const medicineId = (req.query.medicineId as string) || '';
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  const medMap = new Map(db.medicines.map((m) => [m.id, m]));
  const supMap = new Map(db.suppliers.map((s) => [s.id, s]));

  // Enriched batch list with computed days & metadata
  const enriched = db.batches.map((b) => {
    const med = medMap.get(b.medicineId);
    const sup = supMap.get(b.supplierId);
    const days = calculateDaysRemaining(b.expiryDate);
    const minStock = med ? med.minimumStockLevel : 20;
    const computedStatus = computeBatchStatus(b, minStock, db.settings.warningPeriodDays);

    return {
      ...b,
      status: computedStatus,
      daysRemaining: days,
      isExpired: days < 0,
      isLowStock: b.quantity <= minStock && b.quantity > 0,
      medicineName: med ? med.medicineName : 'Unknown Medicine',
      genericName: med?.genericName,
      dosageForm: med?.dosageForm,
      strength: med?.strength,
      supplierName: sup ? sup.supplierName : 'Unknown Supplier',
    };
  });

  let filtered = enriched.filter((b) => {
    if (medicineId && b.medicineId !== medicineId) return false;
    if (status && b.status !== status) return false;

    if (expiryWindow) {
      if (expiryWindow === 'expired' && b.daysRemaining >= 0) return false;
      if (expiryWindow === '7d' && (b.daysRemaining < 0 || b.daysRemaining > 7)) return false;
      if (expiryWindow === '30d' && (b.daysRemaining < 0 || b.daysRemaining > 30)) return false;
      if (expiryWindow === '60d' && (b.daysRemaining < 0 || b.daysRemaining > 60)) return false;
      if (expiryWindow === '90d' && (b.daysRemaining < 0 || b.daysRemaining > 90)) return false;
      if (expiryWindow === 'safe' && b.daysRemaining <= 90) return false;
    }

    if (search) {
      const matchBatch = b.batchNumber.toLowerCase().includes(search);
      const matchMed = b.medicineName.toLowerCase().includes(search);
      const matchLoc = b.storageLocation.toLowerCase().includes(search);
      const matchSup = b.supplierName.toLowerCase().includes(search);
      return matchBatch || matchMed || matchLoc || matchSup;
    }

    return true;
  });

  // Sort by expiry date ascending (FEFO first)
  filtered.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  const total = filtered.length;
  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  res.json({
    data: paginated,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});

// GET /api/batches/:id
router.get('/:id', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const batch = db.batches.find((b) => b.id === req.params.id);

  if (!batch) {
    res.status(404).json({ error: 'Batch not found.' });
    return;
  }

  const med = db.medicines.find((m) => m.id === batch.medicineId);
  const sup = db.suppliers.find((s) => s.id === batch.supplierId);
  const days = calculateDaysRemaining(batch.expiryDate);

  const transactions = db.transactions
    .filter((t) => t.medicineBatchId === batch.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({
    batch: {
      ...batch,
      daysRemaining: days,
      isExpired: days < 0,
      medicineName: med?.medicineName,
      genericName: med?.genericName,
      strength: med?.strength,
      dosageForm: med?.dosageForm,
      supplierName: sup?.supplierName,
    },
    transactions,
  });
});

// POST /api/batches
router.post('/', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const {
    medicineId,
    batchNumber,
    manufacturingDate,
    expiryDate,
    purchasePrice,
    sellingPrice,
    quantity,
    supplierId,
    storageLocation,
  } = req.body;

  if (!medicineId || !batchNumber || !manufacturingDate || !expiryDate || !supplierId) {
    res.status(400).json({ error: 'All required batch fields must be provided.' });
    return;
  }

  const mfg = new Date(manufacturingDate);
  const exp = new Date(expiryDate);

  if (isNaN(mfg.getTime()) || isNaN(exp.getTime())) {
    res.status(400).json({ error: 'Invalid manufacturing or expiry date.' });
    return;
  }

  if (mfg >= exp) {
    res.status(400).json({ error: 'Manufacturing date cannot be later than or equal to expiry date.' });
    return;
  }

  const qty = parseInt(quantity);
  if (isNaN(qty) || qty < 0) {
    res.status(400).json({ error: 'Batch quantity must be a non-negative number.' });
    return;
  }

  const med = db.medicines.find((m) => m.id === medicineId);
  if (!med) {
    res.status(404).json({ error: 'Referenced medicine does not exist.' });
    return;
  }

  // Duplicate batch number check for the same medicine
  const duplicate = db.batches.find(
    (b) => b.medicineId === medicineId && b.batchNumber.trim().toLowerCase() === batchNumber.trim().toLowerCase()
  );
  if (duplicate) {
    res.status(409).json({ error: `Batch number '${batchNumber}' already exists for this medicine.` });
    return;
  }

  const minStock = med.minimumStockLevel || 20;
  const status = computeBatchStatus(
    { quantity: qty, expiryDate },
    minStock,
    db.settings.warningPeriodDays
  );

  const now = new Date().toISOString();
  const newBatch: MedicineBatch = {
    id: `btc-${Date.now()}`,
    medicineId,
    batchNumber: batchNumber.trim(),
    manufacturingDate,
    expiryDate,
    purchasePrice: parseFloat(purchasePrice) || 0,
    sellingPrice: parseFloat(sellingPrice) || 0,
    quantity: qty,
    supplierId,
    storageLocation: (storageLocation || 'General Storage').trim(),
    status,
    createdAt: now,
    updatedAt: now,
  };

  db.batches.unshift(newBatch);

  // Stock-in transaction
  if (qty > 0) {
    db.transactions.unshift({
      id: `tx-${Date.now()}`,
      medicineBatchId: newBatch.id,
      medicineName: med.medicineName,
      batchNumber: newBatch.batchNumber,
      transactionType: 'STOCK_IN',
      quantity: qty,
      previousQuantity: 0,
      newQuantity: qty,
      reason: 'Initial batch registration',
      performedBy: req.user!.id,
      performedByName: req.user!.name,
      createdAt: now,
    });
  }

  // Audit log
  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'BATCH_CREATED',
    entity: 'MedicineBatch',
    entityId: newBatch.id,
    oldValue: null,
    newValue: `Batch ${newBatch.batchNumber} created for ${med.medicineName} (${qty} units, exp: ${expiryDate})`,
    createdAt: now,
  });

  saveDatabase();
  res.status(201).json(newBatch);
});

// PUT /api/batches/:id
router.put('/:id', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const index = db.batches.findIndex((b) => b.id === req.params.id);

  if (index === -1) {
    res.status(404).json({ error: 'Batch not found.' });
    return;
  }

  const existing = db.batches[index];
  const { storageLocation, purchasePrice, sellingPrice, supplierId, expiryDate, manufacturingDate } = req.body;

  const now = new Date().toISOString();
  const updated: MedicineBatch = {
    ...existing,
    storageLocation: storageLocation !== undefined ? storageLocation.trim() : existing.storageLocation,
    purchasePrice: purchasePrice !== undefined ? parseFloat(purchasePrice) : existing.purchasePrice,
    sellingPrice: sellingPrice !== undefined ? parseFloat(sellingPrice) : existing.sellingPrice,
    supplierId: supplierId || existing.supplierId,
    expiryDate: expiryDate || existing.expiryDate,
    manufacturingDate: manufacturingDate || existing.manufacturingDate,
    updatedAt: now,
  };

  const med = db.medicines.find((m) => m.id === updated.medicineId);
  updated.status = computeBatchStatus(
    updated,
    med?.minimumStockLevel || 20,
    db.settings.warningPeriodDays
  );

  db.batches[index] = updated;

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'BATCH_UPDATED',
    entity: 'MedicineBatch',
    entityId: updated.id,
    oldValue: `Location: ${existing.storageLocation}, Exp: ${existing.expiryDate}`,
    newValue: `Location: ${updated.storageLocation}, Exp: ${updated.expiryDate}`,
    createdAt: now,
  });

  saveDatabase();
  res.json(updated);
});

// DELETE /api/batches/:id (Admin only)
router.delete('/:id', requireAuth, requireAdmin, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const batch = db.batches.find((b) => b.id === req.params.id);

  if (!batch) {
    res.status(404).json({ error: 'Batch not found.' });
    return;
  }

  db.batches = db.batches.filter((b) => b.id !== req.params.id);

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'BATCH_DELETED',
    entity: 'MedicineBatch',
    entityId: batch.id,
    oldValue: `Batch: ${batch.batchNumber}`,
    newValue: null,
    createdAt: new Date().toISOString(),
  });

  saveDatabase();
  res.json({ message: 'Batch successfully removed.' });
});

export default router;
