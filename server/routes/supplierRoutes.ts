import { Router, Response } from 'express';
import { loadDatabase, saveDatabase, Supplier, calculateDaysRemaining } from '../dataStore.ts';
import { requireAuth, AuthRequest, requireAdmin } from '../middleware/auth.ts';

const router = Router();

// GET /api/suppliers
router.get('/', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const search = ((req.query.search as string) || '').toLowerCase().trim();

  let filtered = db.suppliers.filter((s) => {
    if (search) {
      const matchName = s.supplierName.toLowerCase().includes(search);
      const matchPerson = s.contactPerson.toLowerCase().includes(search);
      const matchEmail = s.email.toLowerCase().includes(search);
      const matchLicense = s.licenseNumber.toLowerCase().includes(search);
      return matchName || matchPerson || matchEmail || matchLicense;
    }
    return true;
  });

  const enriched = filtered.map((sup) => {
    const batches = db.batches.filter((b) => b.supplierId === sup.id);
    const uniqueMedIds = new Set(batches.map((b) => b.medicineId));
    const activeBatches = batches.filter(
      (b) => b.quantity > 0 && calculateDaysRemaining(b.expiryDate) >= 0
    );
    const expiredBatches = batches.filter(
      (b) => calculateDaysRemaining(b.expiryDate) < 0
    );
    const totalInventoryValue = batches.reduce(
      (sum, b) => sum + b.quantity * b.purchasePrice,
      0
    );

    return {
      ...sup,
      medicineCount: uniqueMedIds.size,
      totalBatches: batches.length,
      activeBatchesCount: activeBatches.length,
      expiredBatchesCount: expiredBatches.length,
      totalInventoryValue,
    };
  });

  res.json(enriched);
});

// GET /api/suppliers/:id
router.get('/:id', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const supplier = db.suppliers.find((s) => s.id === req.params.id);

  if (!supplier) {
    res.status(404).json({ error: 'Supplier not found.' });
    return;
  }

  const medMap = new Map(db.medicines.map((m) => [m.id, m]));
  const batches = db.batches
    .filter((b) => b.supplierId === supplier.id)
    .map((b) => {
      const med = medMap.get(b.medicineId);
      const days = calculateDaysRemaining(b.expiryDate);
      return {
        ...b,
        medicineName: med?.medicineName,
        strength: med?.strength,
        dosageForm: med?.dosageForm,
        daysRemaining: days,
        isExpired: days < 0,
      };
    })
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  res.json({
    supplier,
    batches,
    totalBatches: batches.length,
    activeBatchesCount: batches.filter((b) => !b.isExpired && b.quantity > 0).length,
    expiredBatchesCount: batches.filter((b) => b.isExpired).length,
  });
});

// POST /api/suppliers
router.post('/', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const { supplierName, contactPerson, phone, email, address, licenseNumber } = req.body;

  if (!supplierName || !contactPerson || !phone || !email) {
    res.status(400).json({ error: 'Supplier name, contact person, phone, and email are required.' });
    return;
  }

  const now = new Date().toISOString();
  const newSupplier: Supplier = {
    id: `sup-${Date.now()}`,
    supplierName: supplierName.trim(),
    contactPerson: contactPerson.trim(),
    phone: phone.trim(),
    email: email.trim(),
    address: (address || '').trim(),
    licenseNumber: (licenseNumber || `LIC-${Date.now().toString().slice(-4)}`).trim(),
    createdAt: now,
    updatedAt: now,
  };

  db.suppliers.push(newSupplier);

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'SUPPLIER_CREATED',
    entity: 'Supplier',
    entityId: newSupplier.id,
    oldValue: null,
    newValue: `Registered supplier: ${newSupplier.supplierName}`,
    createdAt: now,
  });

  saveDatabase();
  res.status(201).json(newSupplier);
});

// PUT /api/suppliers/:id
router.put('/:id', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const index = db.suppliers.findIndex((s) => s.id === req.params.id);

  if (index === -1) {
    res.status(404).json({ error: 'Supplier not found.' });
    return;
  }

  const existing = db.suppliers[index];
  const { supplierName, contactPerson, phone, email, address, licenseNumber } = req.body;

  const now = new Date().toISOString();
  const updated: Supplier = {
    ...existing,
    supplierName: supplierName !== undefined ? supplierName.trim() : existing.supplierName,
    contactPerson: contactPerson !== undefined ? contactPerson.trim() : existing.contactPerson,
    phone: phone !== undefined ? phone.trim() : existing.phone,
    email: email !== undefined ? email.trim() : existing.email,
    address: address !== undefined ? address.trim() : existing.address,
    licenseNumber: licenseNumber !== undefined ? licenseNumber.trim() : existing.licenseNumber,
    updatedAt: now,
  };

  db.suppliers[index] = updated;

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'SUPPLIER_UPDATED',
    entity: 'Supplier',
    entityId: updated.id,
    oldValue: existing.supplierName,
    newValue: updated.supplierName,
    createdAt: now,
  });

  saveDatabase();
  res.json(updated);
});

// DELETE /api/suppliers/:id (Admin only)
router.delete('/:id', requireAuth, requireAdmin, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const supplier = db.suppliers.find((s) => s.id === req.params.id);

  if (!supplier) {
    res.status(404).json({ error: 'Supplier not found.' });
    return;
  }

  const linkedBatches = db.batches.filter((b) => b.supplierId === supplier.id);
  if (linkedBatches.length > 0) {
    res.status(400).json({
      error: `Cannot delete supplier: ${linkedBatches.length} batch(es) are linked to this supplier.`,
    });
    return;
  }

  db.suppliers = db.suppliers.filter((s) => s.id !== req.params.id);

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'SUPPLIER_DELETED',
    entity: 'Supplier',
    entityId: supplier.id,
    oldValue: supplier.supplierName,
    newValue: null,
    createdAt: new Date().toISOString(),
  });

  saveDatabase();
  res.json({ message: 'Supplier successfully removed.' });
});

export default router;
