import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Medicine, Supplier, StockTransaction } from '../types';
import { useNotifications } from '../context/NotificationContext';
import {
  ArrowDownToLine,
  CheckCircle2,
  AlertTriangle,
  History,
  Building,
  Package,
  Calendar,
  DollarSign,
  FileText,
  MapPin,
  Sparkles,
} from 'lucide-react';

interface StockInProps {
  onNavigate: (tab: string) => void;
}

export const StockIn: React.FC<StockInProps> = ({ onNavigate }) => {
  const { showToast } = useNotifications();

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<StockTransaction[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [medicineId, setMedicineId] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [quantity, setQuantity] = useState<number>(100);
  const [manufacturingDate, setManufacturingDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState<number>(15.0);
  const [sellingPrice, setSellingPrice] = useState<number>(22.5);
  const [supplierId, setSupplierId] = useState('');
  const [storageLocation, setStorageLocation] = useState('Shelf A-1 (Main Inventory)');
  const [reason, setReason] = useState('Purchase Order Reception #PO-2026-');

  const selectedMed = medicines.find((m) => m.id === medicineId);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [medRes, supRes, txRes] = await Promise.all([
        api.getMedicines({ limit: 200 }),
        api.getSuppliers(),
        api.getTransactions({ type: 'STOCK_IN', limit: 8 }),
      ]);
      setMedicines(medRes.data);
      setSuppliers(supRes);
      setRecentTransactions(txRes.data);

      if (medRes.data.length > 0) {
        setMedicineId(medRes.data[0].id);
      }
      if (supRes.length > 0) {
        setSupplierId(supRes[0].id);
      }

      // Default dates
      const today = new Date().toISOString().split('T')[0];
      const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setManufacturingDate(today);
      setExpiryDate(nextYear);
      setBatchNumber(`B-${Math.floor(100000 + Math.random() * 900000)}`);
      setReason(`Purchase Order Reception #PO-${Math.floor(1000 + Math.random() * 9000)}`);
    } catch (err: any) {
      showToast(err.message || 'Failed to load stock-in references.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicineId || !batchNumber.trim() || !expiryDate || !supplierId || quantity <= 0) {
      showToast('Please verify all required fields with positive quantity.', 'warning');
      return;
    }

    if (manufacturingDate && new Date(expiryDate) <= new Date(manufacturingDate)) {
      showToast('Expiry date must be in the future relative to manufacturing date.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.stockIn({
        medicineId,
        batchNumber: batchNumber.trim(),
        quantity,
        manufacturingDate,
        expiryDate,
        purchasePrice,
        sellingPrice,
        supplierId,
        storageLocation,
        reason,
      });

      showToast(res.message, 'success');

      // Refresh recent transactions
      const txRes = await api.getTransactions({ type: 'STOCK_IN', limit: 8 });
      setRecentTransactions(txRes.data);

      // Generate new batch number for next entry
      setBatchNumber(`B-${Math.floor(100000 + Math.random() * 900000)}`);
      setReason(`Purchase Order Reception #PO-${Math.floor(1000 + Math.random() * 9000)}`);
    } catch (err: any) {
      showToast(err.message || 'Stock In operation failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Inward Stock Reception (Stock In)
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Receive incoming medicine shipments, assign batch numbers, set expiry dates, and update shelves.
          </p>
        </div>

        <button
          onClick={() => onNavigate('inventory')}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
        >
          View Batch Inventory →
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Container */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            {/* Medicine Selection */}
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Target Medicine SKU *
              </label>
              <select
                id="select-stockin-med"
                required
                value={medicineId}
                onChange={(e) => setMedicineId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {medicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.medicineName} — {m.category} ({m.dosageForm} • {m.strength}) | Current Stock: {m.totalStock || 0}
                  </option>
                ))}
              </select>

              {selectedMed && (
                <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-[11px] text-slate-600">
                  <span>Generic: <strong className="text-slate-800">{selectedMed.genericName}</strong></span>
                  <span>Manufacturer: <strong className="text-slate-800">{selectedMed.manufacturer}</strong></span>
                  <span>Min Threshold: <strong className="text-slate-800">{selectedMed.minimumStockLevel} units</strong></span>
                </div>
              )}
            </div>

            {/* Batch & Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Batch / Lot Number *
                </label>
                <input
                  id="input-stockin-batchno"
                  type="text"
                  required
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  placeholder="e.g. B-948210"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Quantity Received (Units) *
                </label>
                <input
                  id="input-stockin-qty"
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Manufacturing Date
                </label>
                <input
                  id="input-stockin-mfg"
                  type="date"
                  value={manufacturingDate}
                  onChange={(e) => setManufacturingDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Expiry Date *
                </label>
                <input
                  id="input-stockin-exp"
                  type="date"
                  required
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-semibold text-emerald-800"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Purchase Price per Unit ($) *
                </label>
                <input
                  id="input-stockin-pprice"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={purchasePrice}
                  onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Selling Price per Unit ($) *
                </label>
                <input
                  id="input-stockin-sprice"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Supplier & Storage */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Pharmaceutical Supplier *
                </label>
                <select
                  id="select-stockin-sup"
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.supplierName} ({s.contactPerson})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Storage Location / Shelf *
                </label>
                <input
                  id="input-stockin-loc"
                  type="text"
                  required
                  value={storageLocation}
                  onChange={(e) => setStorageLocation(e.target.value)}
                  placeholder="e.g. Shelf A-2, Cold Chain Refrigerator 1"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Reception Note */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Reception Reason / PO Reference
              </label>
              <input
                id="input-stockin-reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Inward consignment from distributor PO #9842"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                id="btn-stockin-submit"
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <ArrowDownToLine className="w-4 h-4" />
                {isSubmitting ? 'Recording Inward Batch...' : 'Confirm Stock Reception'}
              </button>
            </div>
          </form>
        </div>

        {/* Live Calculation & Preview Card */}
        <div className="space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">
              <Sparkles className="w-4 h-4" />
              Live Inward Batch Preview
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Medicine:</span>
                <span className="font-semibold text-white truncate max-w-44 text-right">
                  {selectedMed?.medicineName || 'None selected'}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Batch Number:</span>
                <span className="font-mono font-semibold text-emerald-400">{batchNumber || 'Pending'}</span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Receiving Quantity:</span>
                <span className="font-bold text-white">{quantity} units</span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Total Purchase Cost:</span>
                <span className="font-bold text-white">${(quantity * purchasePrice).toFixed(2)}</span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Expiry Date:</span>
                <span className="font-medium text-white">{expiryDate || 'N/A'}</span>
              </div>

              <div className="flex justify-between pt-1">
                <span className="text-slate-400">Shelf Assignment:</span>
                <span className="font-medium text-slate-200">{storageLocation}</span>
              </div>
            </div>
          </div>

          {/* Quick Regulatory Protocol reminder */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 p-4 rounded-2xl text-xs text-emerald-950">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900 mb-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Good Pharmacy Practice Protocol
            </div>
            <p className="text-[11px] text-emerald-800 leading-relaxed">
              Every inward shipment is automatically registered in the system audit log, timestamped, and immediately indexed in the FEFO dispensing engine.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Inward Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Recent Inward Stock Transactions
            </h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5">Date &amp; Time</th>
                <th className="px-4 py-2.5">Medicine</th>
                <th className="px-4 py-2.5">Batch #</th>
                <th className="px-4 py-2.5 text-right">Units Added</th>
                <th className="px-4 py-2.5 text-right">New Balance</th>
                <th className="px-4 py-2.5">Received By</th>
                <th className="px-4 py-2.5">Reference Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-400">
                    No recent inward transactions recorded yet.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 text-slate-500">
                      {new Date(tx.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-slate-900">{tx.medicineName}</td>
                    <td className="px-4 py-2.5 font-mono text-emerald-700">#{tx.batchNumber}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-600">+{tx.quantity}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{tx.newQuantity} units</td>
                    <td className="px-4 py-2.5 text-slate-600">{tx.performedByName || 'Pharmacist'}</td>
                    <td className="px-4 py-2.5 text-slate-500 truncate max-w-44">{tx.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
