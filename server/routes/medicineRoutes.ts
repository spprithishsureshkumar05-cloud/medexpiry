import { Router, Response } from 'express';
import { loadDatabase, saveDatabase, Medicine, calculateDaysRemaining } from '../dataStore.ts';
import { requireAuth, AuthRequest, requireAdmin } from '../middleware/auth.ts';

const router = Router();

// GET /api/medicines
router.get('/', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const search = ((req.query.search as string) || '').toLowerCase().trim();
  const category = (req.query.category as string) || '';
  const manufacturer = (req.query.manufacturer as string) || '';
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;

  let filtered = db.medicines.filter((m) => {
    if (category && m.category !== category) return false;
    if (manufacturer && m.manufacturer !== manufacturer) return false;
    if (search) {
      const matchName = m.medicineName.toLowerCase().includes(search);
      const matchGeneric = m.genericName.toLowerCase().includes(search);
      const matchBrand = m.brandName.toLowerCase().includes(search);
      const matchManuf = m.manufacturer.toLowerCase().includes(search);
      return matchName || matchGeneric || matchBrand || matchManuf;
    }
    return true;
  });

  // Attach aggregate batch & stock metrics for each medicine
  const enriched = filtered.map((med) => {
    const medBatches = db.batches.filter((b) => b.medicineId === med.id);
    const totalStock = medBatches.reduce((sum, b) => sum + b.quantity, 0);
    const expiredBatches = medBatches.filter((b) => calculateDaysRemaining(b.expiryDate) < 0);
    const expiringSoonBatches = medBatches.filter((b) => {
      const days = calculateDaysRemaining(b.expiryDate);
      return days >= 0 && days <= db.settings.warningPeriodDays;
    });

    // Find earliest expiry active batch (FEFO)
    const activeBatches = medBatches
      .filter((b) => b.quantity > 0 && calculateDaysRemaining(b.expiryDate) >= 0)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    const fefoBatch = activeBatches.length > 0 ? activeBatches[0] : null;

    return {
      ...med,
      totalStock,
      batchCount: medBatches.length,
      expiredCount: expiredBatches.length,
      expiringSoonCount: expiringSoonBatches.length,
      isLowStock: totalStock <= med.minimumStockLevel && totalStock > 0,
      isOutOfStock: totalStock === 0,
      fefoRecommendedBatch: fefoBatch
        ? {
            id: fefoBatch.id,
            batchNumber: fefoBatch.batchNumber,
            expiryDate: fefoBatch.expiryDate,
            quantity: fefoBatch.quantity,
          }
        : null,
    };
  });

  const total = enriched.length;
  const startIndex = (page - 1) * limit;
  const paginated = enriched.slice(startIndex, startIndex + limit);

  // Extract unique categories & manufacturers for filter dropdowns
  const categories = Array.from(new Set(db.medicines.map((m) => m.category))).sort();
  const manufacturers = Array.from(new Set(db.medicines.map((m) => m.manufacturer))).sort();

  res.json({
    data: paginated,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
    meta: {
      categories,
      manufacturers,
    },
  });
});

// GET /api/medicines/:id
router.get('/:id', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const medicine = db.medicines.find((m) => m.id === req.params.id);

  if (!medicine) {
    res.status(404).json({ error: 'Medicine not found.' });
    return;
  }

  const supplierMap = new Map(db.suppliers.map((s) => [s.id, s.supplierName]));

  const batches = db.batches
    .filter((b) => b.medicineId === medicine.id)
    .map((b) => {
      const days = calculateDaysRemaining(b.expiryDate);
      return {
        ...b,
        daysRemaining: days,
        isExpired: days < 0,
        supplierName: supplierMap.get(b.supplierId) || 'Unknown Supplier',
      };
    })
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

  // FEFO candidate
  const fefoBatch = batches.find((b) => !b.isExpired && b.quantity > 0);

  const totalStock = batches.reduce((sum, b) => sum + b.quantity, 0);

  res.json({
    medicine: {
      ...medicine,
      totalStock,
      isLowStock: totalStock <= medicine.minimumStockLevel && totalStock > 0,
      isOutOfStock: totalStock === 0,
    },
    batches,
    fefoRecommendation: fefoBatch
      ? {
          batchId: fefoBatch.id,
          batchNumber: fefoBatch.batchNumber,
          expiryDate: fefoBatch.expiryDate,
          daysRemaining: fefoBatch.daysRemaining,
          quantity: fefoBatch.quantity,
          location: fefoBatch.storageLocation,
        }
      : null,
  });
});

// POST /api/medicines
router.post('/', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const {
    medicineName,
    genericName,
    brandName,
    category,
    dosageForm,
    strength,
    manufacturer,
    description,
    minimumStockLevel,
  } = req.body;

  if (!medicineName || medicineName.trim().length < 2) {
    res.status(400).json({ error: 'Medicine name is required (minimum 2 characters).' });
    return;
  }
  if (!category || !dosageForm || !manufacturer) {
    res.status(400).json({ error: 'Category, dosage form, and manufacturer are required.' });
    return;
  }

  const minStock = parseInt(minimumStockLevel) >= 0 ? parseInt(minimumStockLevel) : 20;

  const newMed: Medicine = {
    id: `med-${Date.now()}`,
    medicineName: medicineName.trim(),
    genericName: (genericName || '').trim(),
    brandName: (brandName || '').trim(),
    category: category.trim(),
    dosageForm: dosageForm.trim(),
    strength: (strength || '').trim(),
    manufacturer: manufacturer.trim(),
    description: (description || '').trim(),
    minimumStockLevel: minStock,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.medicines.unshift(newMed);

  // Audit Log
  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'MEDICINE_CREATED',
    entity: 'Medicine',
    entityId: newMed.id,
    oldValue: null,
    newValue: `Created medicine: ${newMed.medicineName} (${newMed.strength})`,
    createdAt: new Date().toISOString(),
  });

  saveDatabase();
  res.status(201).json(newMed);
});

// PUT /api/medicines/:id
router.put('/:id', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const index = db.medicines.findIndex((m) => m.id === req.params.id);

  if (index === -1) {
    res.status(404).json({ error: 'Medicine not found.' });
    return;
  }

  const existing = db.medicines[index];
  const {
    medicineName,
    genericName,
    brandName,
    category,
    dosageForm,
    strength,
    manufacturer,
    description,
    minimumStockLevel,
  } = req.body;

  if (!medicineName || medicineName.trim().length < 2) {
    res.status(400).json({ error: 'Medicine name must be at least 2 characters.' });
    return;
  }

  const updated: Medicine = {
    ...existing,
    medicineName: medicineName.trim(),
    genericName: (genericName || existing.genericName).trim(),
    brandName: (brandName || existing.brandName).trim(),
    category: category ? category.trim() : existing.category,
    dosageForm: dosageForm ? dosageForm.trim() : existing.dosageForm,
    strength: strength ? strength.trim() : existing.strength,
    manufacturer: manufacturer ? manufacturer.trim() : existing.manufacturer,
    description: description !== undefined ? description.trim() : existing.description,
    minimumStockLevel:
      parseInt(minimumStockLevel) >= 0 ? parseInt(minimumStockLevel) : existing.minimumStockLevel,
    updatedAt: new Date().toISOString(),
  };

  db.medicines[index] = updated;

  // Audit Log
  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'MEDICINE_UPDATED',
    entity: 'Medicine',
    entityId: updated.id,
    oldValue: existing.medicineName,
    newValue: updated.medicineName,
    createdAt: new Date().toISOString(),
  });

  saveDatabase();
  res.json(updated);
});

// DELETE /api/medicines/:id (Admin only)
router.delete('/:id', requireAuth, requireAdmin, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const med = db.medicines.find((m) => m.id === req.params.id);

  if (!med) {
    res.status(404).json({ error: 'Medicine not found.' });
    return;
  }

  const batches = db.batches.filter((b) => b.medicineId === med.id);
  if (batches.length > 0) {
    res.status(400).json({
      error: `Cannot delete medicine: ${batches.length} batch(es) are associated with this item. Please dispose or reassign them first.`,
    });
    return;
  }

  db.medicines = db.medicines.filter((m) => m.id !== req.params.id);

  db.auditLogs.unshift({
    id: `aud-${Date.now()}`,
    userId: req.user!.id,
    userName: req.user!.name,
    action: 'MEDICINE_DELETED',
    entity: 'Medicine',
    entityId: med.id,
    oldValue: `${med.medicineName} (${med.manufacturer})`,
    newValue: null,
    createdAt: new Date().toISOString(),
  });

  saveDatabase();
  res.json({ message: 'Medicine successfully deleted.' });
});

export default router;
