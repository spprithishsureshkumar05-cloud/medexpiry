import { Router, Response } from 'express';
import { loadDatabase, calculateDaysRemaining } from '../dataStore.ts';
import { requireAuth, AuthRequest } from '../middleware/auth.ts';

const router = Router();

// GET /api/reports/expiry
router.get('/expiry', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const medMap = new Map(db.medicines.map((m) => [m.id, m]));
  const supMap = new Map(db.suppliers.map((s) => [s.id, s.supplierName]));

  const daysFilter = req.query.days ? parseInt(req.query.days as string) : null;

  const batches = db.batches.map((b) => {
    const med = medMap.get(b.medicineId);
    const days = calculateDaysRemaining(b.expiryDate);
    return {
      id: b.id,
      batchNumber: b.batchNumber,
      medicineName: med?.medicineName || 'Unknown',
      category: med?.category || 'General',
      quantity: b.quantity,
      manufacturingDate: b.manufacturingDate,
      expiryDate: b.expiryDate,
      daysRemaining: days,
      status: b.status,
      purchasePrice: b.purchasePrice,
      sellingPrice: b.sellingPrice,
      supplierName: supMap.get(b.supplierId) || 'Unknown',
      storageLocation: b.storageLocation,
    };
  });

  const expired = batches.filter((b) => b.daysRemaining < 0);
  const within7Days = batches.filter((b) => b.daysRemaining >= 0 && b.daysRemaining <= 7);
  const within30Days = batches.filter((b) => b.daysRemaining >= 0 && b.daysRemaining <= 30);
  const within60Days = batches.filter((b) => b.daysRemaining >= 0 && b.daysRemaining <= 60);
  const within90Days = batches.filter((b) => b.daysRemaining >= 0 && b.daysRemaining <= 90);

  let resultBatches = batches;
  if (daysFilter !== null) {
    if (daysFilter < 0) {
      resultBatches = expired;
    } else {
      resultBatches = batches.filter((b) => b.daysRemaining >= 0 && b.daysRemaining <= daysFilter);
    }
  }

  res.json({
    summary: {
      totalBatches: batches.length,
      expiredCount: expired.length,
      within7DaysCount: within7Days.length,
      within30DaysCount: within30Days.length,
      within60DaysCount: within60Days.length,
      within90DaysCount: within90Days.length,
      estimatedLossFromExpired: expired.reduce((s, b) => s + b.quantity * b.purchasePrice, 0),
    },
    batches: resultBatches.sort((a, b) => a.daysRemaining - b.daysRemaining),
  });
});

// GET /api/reports/stock
router.get('/stock', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const medMap = new Map(db.medicines.map((m) => [m.id, m]));

  const stockList = db.medicines.map((med) => {
    const batches = db.batches.filter((b) => b.medicineId === med.id);
    const totalQty = batches.reduce((sum, b) => sum + b.quantity, 0);
    const inventoryCost = batches.reduce((sum, b) => sum + b.quantity * b.purchasePrice, 0);
    const retailValue = batches.reduce((sum, b) => sum + b.quantity * b.sellingPrice, 0);

    return {
      id: med.id,
      medicineName: med.medicineName,
      genericName: med.genericName,
      category: med.category,
      dosageForm: med.dosageForm,
      strength: med.strength,
      manufacturer: med.manufacturer,
      minimumStockLevel: med.minimumStockLevel,
      currentQuantity: totalQty,
      batchCount: batches.length,
      inventoryCost: Math.round(inventoryCost * 100) / 100,
      retailValue: Math.round(retailValue * 100) / 100,
      isLowStock: totalQty <= med.minimumStockLevel && totalQty > 0,
      isOutOfStock: totalQty === 0,
    };
  });

  const totalUnits = stockList.reduce((s, m) => s + m.currentQuantity, 0);
  const totalValuation = stockList.reduce((s, m) => s + m.inventoryCost, 0);
  const lowStockCount = stockList.filter((m) => m.isLowStock).length;
  const outOfStockCount = stockList.filter((m) => m.isOutOfStock).length;

  res.json({
    summary: {
      totalMedicines: stockList.length,
      totalUnits,
      totalValuation: Math.round(totalValuation * 100) / 100,
      lowStockCount,
      outOfStockCount,
    },
    medicines: stockList,
  });
});

// GET /api/reports/suppliers
router.get('/suppliers', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();

  const suppliers = db.suppliers.map((sup) => {
    const batches = db.batches.filter((b) => b.supplierId === sup.id);
    const uniqueMeds = new Set(batches.map((b) => b.medicineId));
    const active = batches.filter((b) => b.quantity > 0 && calculateDaysRemaining(b.expiryDate) >= 0);
    const expired = batches.filter((b) => calculateDaysRemaining(b.expiryDate) < 0);
    const totalValuation = batches.reduce((sum, b) => sum + b.quantity * b.purchasePrice, 0);

    return {
      id: sup.id,
      supplierName: sup.supplierName,
      contactPerson: sup.contactPerson,
      phone: sup.phone,
      email: sup.email,
      licenseNumber: sup.licenseNumber,
      totalBatches: batches.length,
      totalMedicinesSupplied: uniqueMeds.size,
      activeBatches: active.length,
      expiredBatches: expired.length,
      totalValuation: Math.round(totalValuation * 100) / 100,
    };
  });

  res.json({ suppliers });
});

// GET /api/reports/stock-movement
router.get('/stock-movement', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const fromDate = req.query.from ? new Date(req.query.from as string) : null;
  const toDate = req.query.to ? new Date(req.query.to as string) : null;

  let transactions = db.transactions;
  if (fromDate && !isNaN(fromDate.getTime())) {
    transactions = transactions.filter((t) => new Date(t.createdAt) >= fromDate);
  }
  if (toDate && !isNaN(toDate.getTime())) {
    transactions = transactions.filter((t) => new Date(t.createdAt) <= toDate);
  }

  const stockInTotal = transactions
    .filter((t) => t.transactionType === 'STOCK_IN')
    .reduce((s, t) => s + t.quantity, 0);

  const stockOutTotal = transactions
    .filter((t) => t.transactionType === 'STOCK_OUT')
    .reduce((s, t) => s + t.quantity, 0);

  const disposalTotal = transactions
    .filter((t) => ['DAMAGED', 'EXPIRED', 'RECALLED'].includes(t.transactionType))
    .reduce((s, t) => s + t.quantity, 0);

  res.json({
    summary: {
      totalTransactions: transactions.length,
      totalStockInUnits: stockInTotal,
      totalStockOutUnits: stockOutTotal,
      totalDisposedUnits: disposalTotal,
    },
    transactions,
  });
});

// GET /api/reports/export-csv
router.get('/export-csv', requireAuth, (req: AuthRequest, res: Response): void => {
  const db = loadDatabase();
  const type = (req.query.type as string) || 'expiry';

  const medMap = new Map(db.medicines.map((m) => [m.id, m]));
  const supMap = new Map(db.suppliers.map((s) => [s.id, s.supplierName]));

  let csvContent = '';
  let filename = `medexpiry-${type}-${new Date().toISOString().split('T')[0]}.csv`;

  if (type === 'expiry') {
    csvContent = 'Medicine Name,Batch Number,Category,Quantity,Expiry Date,Days Remaining,Status,Storage Location,Supplier\n';
    db.batches.forEach((b) => {
      const med = medMap.get(b.medicineId);
      const days = calculateDaysRemaining(b.expiryDate);
      csvContent += `"${med?.medicineName || ''}","${b.batchNumber}","${med?.category || ''}",${b.quantity},"${b.expiryDate}",${days},"${b.status}","${b.storageLocation}","${supMap.get(b.supplierId) || ''}"\n`;
    });
  } else if (type === 'stock') {
    csvContent = 'Medicine Name,Generic Name,Category,Dosage Form,Strength,Manufacturer,Current Stock,Min Stock,Status,Batches\n';
    db.medicines.forEach((m) => {
      const batches = db.batches.filter((b) => b.medicineId === m.id);
      const total = batches.reduce((s, b) => s + b.quantity, 0);
      const status = total === 0 ? 'OUT_OF_STOCK' : total <= m.minimumStockLevel ? 'LOW_STOCK' : 'ADEQUATE';
      csvContent += `"${m.medicineName}","${m.genericName}","${m.category}","${m.dosageForm}","${m.strength}","${m.manufacturer}",${total},${m.minimumStockLevel},"${status}",${batches.length}\n`;
    });
  } else if (type === 'movement') {
    csvContent = 'Date & Time,Transaction Type,Medicine,Batch Number,Quantity,Previous Qty,New Qty,Reason,Performed By\n';
    db.transactions.forEach((tx) => {
      csvContent += `"${tx.createdAt}","${tx.transactionType}","${tx.medicineName || ''}","${tx.batchNumber || ''}",${tx.quantity},${tx.previousQuantity},${tx.newQuantity},"${tx.reason}","${tx.performedByName || ''}"\n`;
    });
  } else {
    csvContent = 'Supplier Name,Contact Person,Phone,Email,License Number,Total Batches\n';
    db.suppliers.forEach((s) => {
      const bCount = db.batches.filter((b) => b.supplierId === s.id).length;
      csvContent += `"${s.supplierName}","${s.contactPerson}","${s.phone}","${s.email}","${s.licenseNumber}",${bCount}\n`;
    });
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvContent);
});

export default router;
