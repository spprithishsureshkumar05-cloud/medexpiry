import { Router, Response } from 'express';
import {
  loadDatabase,
  saveDatabase,
  MedicineBatch,
  calculateDaysRemaining,
  computeBatchStatus,
} from '../dataStore.ts';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// GET /api/inventory/fefo-recommendation/:medicineId
router.get('/fefo-recommendation/:medicineId', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const med = db.medicines.find((m) => m.id === req.params.medicineId);

  if (!med) {
    res.status(404).json({ error: 'Medicine not found.' });
    return;
  }

  // Active batches (non-expired, quantity > 0), sorted by earliest expiry
  const candidateBatches = db.batches
    .filter((b) => b.medicineId === med.id && b.quantity > 0)
    .map((b) => {
      const days = calculateDaysRemaining(b.expiryDate);
      return {
        ...b,
        daysRemaining: days,
        isExpired: days < 0,
      };
    })
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  const nonExpiredBatches = candidateBatches.filter((b) => !b.isExpired);
  const recommended = nonExpiredBatches.length > 0 ? nonExpiredBatches[0] : null;

  res.json({
    medicine: med.medicineName,
    recommendedBatch: recommended,
    allCandidateBatches: candidateBatches,
    recommendationNote: recommended
      ? `FEFO Protocol: Batch ${recommended.batchNumber} has the nearest expiry (${recommended.expiryDate}, ${recommended.daysRemaining} days remaining) with ${recommended.quantity} units available.`
      : 'No non-expired batches currently available for dispensing.',
  });
});

// POST /api/inventory/stock-in
router.post('/stock-in', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const {
    medicineId,
    batchNumber,
    quantity,
    manufacturingDate,
    expiryDate,
    purchasePrice,
    sellingPrice,
    supplierId,
    storageLocation,
    reason,
  } = req.body;

  if (!medicineId || !batchNumber || !quantity || !expiryDate || !supplierId) {
    res.status(400).json({ error: 'Medicine, batch number, quantity, expiry date, and supplier are required.' });
    return;
  }

  const qty = parseInt(quantity);
  if (isNaN(qty) || qty <= 0) {
    res.status(400).json({ error: 'Stock-in quantity must be greater than zero.' });
    return;
  }

  const med = db.medicines.find((m) => m.id === medicineId);
  if (!med) {
    res.status(404).json({ error: 'Medicine not found.' });
    return;
  }

  const now = new Date().toISOString();

  // Check if this batch already exists for this medicine
  let batch = db.batches.find(
    (b) => b.medicineId === medicineId && b.batchNumber.trim().toLowerCase() === batchNumber.trim().toLowerCase()
  );

  let previousQty = 0;
  let newQty = qty;

  if (batch) {
    previousQty = batch.quantity;
    newQty = previousQty + qty;
    batch.quantity = newQty;
    batch.expiryDate = expiryDate;
    if (manufacturingDate) batch.manufacturingDate = manufacturingDate;
    if (purchasePrice) batch.purchasePrice = parseFloat(purchasePrice);
    if (sellingPrice) batch.sellingPrice = parseFloat(sellingPrice);
    if (storageLocation) batch.storageLocation = storageLocation.trim();
    batch.status = computeBatchStatus(batch, med.minimumStockLevel, db.settings.warningPeriodDays);
    batch.updatedAt = now;
  } else {
    // Create new batch
    const mfgDate = manufacturingDate || new Date().toISOString().split('T')[0];
    const status = computeBatchStatus(
      { quantity: qty, expiryDate },
      med.minimumStockLevel,
      db.settings.warningPeriodDays
    );

    batch = {
      id: `btc-${Date.now()}`,
      medicineId,
      batchNumber: batchNumber.trim(),
      manufacturingDate: mfgDate,
      expiryDate,
      purchasePrice: parseFloat(purchasePrice) || 0,
      sellingPrice: parseFloat(sellingPrice) || 0,
      quantity: qty,
      supplierId,
      storageLocation: (storageLocation || 'Main Inventory Shelf').trim(),
      status,
      createdAt: now,
      updatedAt: now,
    };
    db.batches.unshift(batch);
  }

  // Create StockTransaction
  const transaction = {
    id: `tx-${Date.now()}`,
    medicineBatchId: batch.id,
    medicineName: med.medicineName,
    batchNumber: batch.batchNumber,
    transactionType: 'STOCK_IN' as const,
    quantity: qty,
    previousQuantity: previousQty,
    newQuantity: newQty,
    reason: (reason || 'Inward stock reception').trim(),
    performedBy: req.user!.id,
    performedByName: req.user!.name,
    createdAt: now,
  };
  db.transactions.unshift(transaction);

  // Audit Log
  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'STOCK_IN',
    entity: 'MedicineBatch',
    entityId: batch.id,
    oldValue: `${previousQty} units`,
    newValue: `${newQty} units (+${qty} added to Batch ${batch.batchNumber})`,
    createdAt: now,
  });

  saveDatabase();
  res.status(200).json({
    message: `Successfully received ${qty} units of ${med.medicineName}.`,
    batch,
    transaction,
  });
});

// POST /api/inventory/stock-out
router.post('/stock-out', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const { medicineBatchId, quantity, reason, allowBypassFEFO } = req.body;

  if (!medicineBatchId || !quantity) {
    res.status(400).json({ error: 'Batch ID and stock-out quantity are required.' });
    return;
  }

  const qty = parseInt(quantity);
  if (isNaN(qty) || qty <= 0) {
    res.status(400).json({ error: 'Stock-out quantity must be a positive number.' });
    return;
  }

  const batch = db.batches.find((b) => b.id === medicineBatchId);
  if (!batch) {
    res.status(404).json({ error: 'Specified batch not found.' });
    return;
  }

  const med = db.medicines.find((m) => m.id === batch.medicineId);
  const daysRemaining = calculateDaysRemaining(batch.expiryDate);

  // Medical Safety & Inventory rule: Prevent expired medicines from normal sale/stock-out
  if (daysRemaining < 0) {
    res.status(400).json({
      error: `Safety Alert: Batch ${batch.batchNumber} has expired on ${batch.expiryDate}. It cannot be dispensed for clinical sale. Please use the Expired Stock Management section to record disposal.`,
    });
    return;
  }

  // Prevent quantity from becoming negative
  if (qty > batch.quantity) {
    res.status(400).json({
      error: `Insufficient stock: Requested ${qty} units, but Batch ${batch.batchNumber} only contains ${batch.quantity} units.`,
    });
    return;
  }

  // FEFO check & recommendation notification
  const otherBatches = db.batches
    .filter(
      (b) =>
        b.medicineId === batch.medicineId &&
        b.id !== batch.id &&
        b.quantity > 0 &&
        calculateDaysRemaining(b.expiryDate) >= 0
    )
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  let fefoWarning: string | null = null;
  if (otherBatches.length > 0) {
    const earliest = otherBatches[0];
    const earliestExp = new Date(earliest.expiryDate).getTime();
    const currentExp = new Date(batch.expiryDate).getTime();

    if (earliestExp < currentExp && !allowBypassFEFO) {
      fefoWarning = `FEFO Advisory: Batch ${earliest.batchNumber} expires sooner (${earliest.expiryDate}) than the selected batch (${batch.expiryDate}).`;
    }
  }

  const now = new Date().toISOString();
  const prevQty = batch.quantity;
  const newQty = prevQty - qty;

  batch.quantity = newQty;
  batch.status = computeBatchStatus(batch, med?.minimumStockLevel || 20, db.settings.warningPeriodDays);
  batch.updatedAt = now;

  const transaction = {
    id: `tx-${Date.now()}`,
    medicineBatchId: batch.id,
    medicineName: med ? med.medicineName : 'Unknown',
    batchNumber: batch.batchNumber,
    transactionType: 'STOCK_OUT' as const,
    quantity: qty,
    previousQuantity: prevQty,
    newQuantity: newQty,
    reason: (reason || 'Prescription sale').trim(),
    performedBy: req.user!.id,
    performedByName: req.user!.name,
    createdAt: now,
  };
  db.transactions.unshift(transaction);

  // Audit log
  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'STOCK_OUT',
    entity: 'MedicineBatch',
    entityId: batch.id,
    oldValue: `${prevQty} units`,
    newValue: `${newQty} units (-${qty} dispensed from Batch ${batch.batchNumber})`,
    createdAt: now,
  });

  saveDatabase();

  res.json({
    message: `Successfully dispensed ${qty} units from Batch ${batch.batchNumber}. Remaining: ${newQty}.`,
    batch,
    transaction,
    fefoAdvisory: fefoWarning,
  });
});

// POST /api/inventory/dispose (for Expired Medicines Management)
router.post('/dispose', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const { medicineBatchId, disposalType, reason, witness, notes } = req.body;

  if (!medicineBatchId) {
    res.status(400).json({ error: 'Batch ID is required.' });
    return;
  }

  const batch = db.batches.find((b) => b.id === medicineBatchId);
  if (!batch) {
    res.status(404).json({ error: 'Batch not found.' });
    return;
  }

  const med = db.medicines.find((m) => m.id === batch.medicineId);
  const disposedQty = batch.quantity;
  const now = new Date().toISOString();

  const prevQty = batch.quantity;
  batch.quantity = 0;
  batch.status = 'OUT_OF_STOCK';
  batch.updatedAt = now;

  const type: 'EXPIRED' | 'DAMAGED' | 'RECALLED' =
    disposalType === 'DAMAGED' ? 'DAMAGED' : disposalType === 'RECALLED' ? 'RECALLED' : 'EXPIRED';

  const transaction = {
    id: `tx-${Date.now()}`,
    medicineBatchId: batch.id,
    medicineName: med?.medicineName || 'Medicine',
    batchNumber: batch.batchNumber,
    transactionType: type,
    quantity: disposedQty,
    previousQuantity: prevQty,
    newQuantity: 0,
    reason: `Disposal (${type}): ${reason || 'Pharmaceutical bio-waste protocol'}. Witness: ${witness || 'N/A'}. Notes: ${notes || 'None'}`,
    performedBy: req.user!.id,
    performedByName: req.user!.name,
    createdAt: now,
  };
  db.transactions.unshift(transaction);

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: req.user!.id,
    userName: req.user!.name,
    action: `BATCH_DISPOSED_${type}`,
    entity: 'MedicineBatch',
    entityId: batch.id,
    oldValue: `${prevQty} units`,
    newValue: `0 units (Disposed via certified waste protocol)`,
    createdAt: now,
  });

  saveDatabase();

  res.json({
    message: `Batch ${batch.batchNumber} successfully recorded as disposed (${disposedQty} units removed).`,
    batch,
    transaction,
  });
});

// GET /api/inventory/transactions
router.get('/transactions', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const transactionType = (req.query.type as string) || '';
  const search = ((req.query.search as string) || '').toLowerCase().trim();
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  let filtered = db.transactions.filter((tx) => {
    if (transactionType && tx.transactionType !== transactionType) return false;
    if (search) {
      const matchMed = (tx.medicineName || '').toLowerCase().includes(search);
      const matchBatch = (tx.batchNumber || '').toLowerCase().includes(search);
      const matchReason = (tx.reason || '').toLowerCase().includes(search);
      const matchUser = (tx.performedByName || '').toLowerCase().includes(search);
      return matchMed || matchBatch || matchReason || matchUser;
    }
    return true;
  });

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

export default router;
