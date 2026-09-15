import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Medicine, MedicineBatch, StockTransaction } from '../types';
import { useNotifications } from '../context/NotificationContext';
import {
  ArrowUpFromLine,
  Sparkles,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Lock,
  History,
  Info,
  Calendar,
  Layers,
} from 'lucide-react';

interface StockOutProps {
  onNavigate: (tab: string) => void;
}

export const StockOut: React.FC<StockOutProps> = ({ onNavigate }) => {
  const { showToast } = useNotifications();

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [batches, setBatches] = useState<MedicineBatch[]>([]);
  const [recommendedBatch, setRecommendedBatch] = useState<MedicineBatch | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<StockTransaction[]>([]);

  // Selection state
  const [selectedMedicineId, setSelectedMedicineId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [dispenseQuantity, setDispenseQuantity] = useState<number>(1);
  const [reason, setReason] = useState('Outpatient Prescription Dispense');
  const [allowBypassFEFO, setAllowBypassFEFO] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const selectedMed = medicines.find((m) => m.id === selectedMedicineId);
  const activeBatch = batches.find((b) => b.id === selectedBatchId);

  const loadMedicines = async () => {
    setIsLoading(true);
    try {
      const [medRes, txRes] = await Promise.all([
        api.getMedicines({ limit: 200 }),
        api.getTransactions({ type: 'STOCK_OUT', limit: 8 }),
      ]);
      setMedicines(medRes.data);
      setRecentTransactions(txRes.data);

      if (medRes.data.length > 0) {
        setSelectedMedicineId(medRes.data[0].id);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load medicines.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMedicines();
  }, []);

  // When medicine changes, load candidate batches & FEFO recommendation
  useEffect(() => {
    if (!selectedMedicineId) return;

    const loadBatchesForMed = async () => {
      try {
        const fefoData = await api.getFEFORecommendation(selectedMedicineId);
        setBatches(fefoData.allCandidateBatches);
        setRecommendedBatch(fefoData.recommendedBatch);

        // Auto-select the FEFO recommended batch if available
        if (fefoData.recommendedBatch) {
          setSelectedBatchId(fefoData.recommendedBatch.id);
          setDispenseQuantity(1);
        } else if (fefoData.allCandidateBatches.length > 0) {
          setSelectedBatchId(fefoData.allCandidateBatches[0].id);
        } else {
          setSelectedBatchId('');
        }
      } catch (err) {
        console.warn('Failed to load FEFO recommendation', err);
      }
    };

    loadBatchesForMed();
  }, [selectedMedicineId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId || dispenseQuantity <= 0) {
      showToast('Please select an active batch and enter a valid quantity.', 'warning');
      return;
    }

    if (!activeBatch) return;

    if (dispenseQuantity > activeBatch.quantity) {
      showToast(`Cannot dispense ${dispenseQuantity} units: only ${activeBatch.quantity} units available.`, 'error');
      return;
    }

    if (activeBatch.isExpired || (activeBatch.daysRemaining ?? 0) < 0) {
      showToast('Safety Protocol Error: Expired batches cannot be dispensed for clinical sale.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.stockOut({
        medicineBatchId: selectedBatchId,
        quantity: dispenseQuantity,
        reason,
        allowBypassFEFO,
      });

      showToast(res.message, 'success');

      if (res.fefoAdvisory) {
        showToast(res.fefoAdvisory, 'warning');
      }

      // Reload batches for medicine & recent transactions
      const [fefoData, txRes] = await Promise.all([
        api.getFEFORecommendation(selectedMedicineId),
        api.getTransactions({ type: 'STOCK_OUT', limit: 8 }),
      ]);
      setBatches(fefoData.allCandidateBatches);
      setRecommendedBatch(fefoData.recommendedBatch);
      setRecentTransactions(txRes.data);
      if (fefoData.recommendedBatch) {
        setSelectedBatchId(fefoData.recommendedBatch.id);
      }
      setDispenseQuantity(1);
    } catch (err: any) {
      showToast(err.message || 'Dispensing failed.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSelectedBatchFEFO = recommendedBatch && activeBatch && recommendedBatch.id === activeBatch.id;
  const isSelectedBatchExpired = activeBatch && ((activeBatch.daysRemaining ?? 0) < 0 || activeBatch.isExpired);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Prescription Dispensing (FEFO Stock Out)
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Strict First-Expiry-First-Out enforcement prevents stock wastage and guarantees patient safety.
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
        {/* Dispensing Form */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-5 text-xs">
            {/* Step 1: Select Medicine */}
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                1. Select Medicine *
              </label>
              <select
                id="select-stockout-med"
                required
                value={selectedMedicineId}
                onChange={(e) => setSelectedMedicineId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {medicines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.medicineName} ({m.dosageForm} • {m.strength}) | Total Stock: {m.totalStock || 0}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Automated FEFO Recommendation Banner */}
            {recommendedBatch ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300/80 text-emerald-950">
                <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-emerald-900 mb-1">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  FEFO Priority Recommendation
                </div>
                <div className="text-sm font-bold text-slate-900">
                  Batch #{recommendedBatch.batchNumber} has nearest expiry date
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Expires on <span className="font-semibold text-slate-800">{recommendedBatch.expiryDate}</span> (
                  {recommendedBatch.daysRemaining} days left). Stock balance:{' '}
                  <span className="font-bold text-slate-900">{recommendedBatch.quantity} units</span> on{' '}
                  <span className="font-medium text-slate-800">{recommendedBatch.storageLocation}</span>.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  No Valid Non-Expired Batches Found
                </div>
                There are no active, non-expired batches with available inventory for this medicine.
              </div>
            )}

            {/* Step 3: Select Batch to Dispense */}
            <div>
              <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                2. Select Batch to Dispense From *
              </label>
              {batches.length === 0 ? (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
                  No batches exist for this medicine.
                </div>
              ) : (
                <div className="space-y-2">
                  {batches.map((b) => {
                    const days = b.daysRemaining ?? 0;
                    const isExpired = days < 0;
                    const isSelected = b.id === selectedBatchId;
                    const isFEFORank1 = recommendedBatch?.id === b.id;

                    return (
                      <div
                        key={b.id}
                        onClick={() => {
                          if (!isExpired) setSelectedBatchId(b.id);
                        }}
                        className={`p-3 rounded-xl border transition-all flex items-center justify-between text-xs ${
                          isExpired
                            ? 'bg-red-50/40 border-red-200 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20 cursor-pointer'
                            : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="selectedBatch"
                            disabled={isExpired}
                            checked={isSelected}
                            onChange={() => setSelectedBatchId(b.id)}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 font-mono">#{b.batchNumber}</span>
                              {isFEFORank1 && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <Sparkles className="w-3 h-3" /> FEFO Preferred
                                </span>
                              )}
                              {isExpired && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-700">
                                  <Lock className="w-3 h-3" /> Expired (Dispense Blocked)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Shelf: {b.storageLocation} • Selling Price: ${b.sellingPrice}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-slate-900">{b.quantity} units</div>
                          <div
                            className={`text-[11px] font-semibold ${
                              isExpired
                                ? 'text-red-600'
                                : days <= 7
                                ? 'text-orange-600'
                                : days <= 90
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            Exp: {b.expiryDate} ({isExpired ? 'Expired' : `${days}d left`})
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* FEFO Non-compliance warning if user picked a later batch */}
            {activeBatch && !isSelectedBatchFEFO && !isSelectedBatchExpired && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900">
                <div className="flex items-center gap-1.5 font-bold mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  FEFO Advisory Warning
                </div>
                <p className="leading-relaxed text-amber-800">
                  You have selected Batch <strong>#{activeBatch.batchNumber}</strong> (expires {activeBatch.expiryDate}),
                  but an earlier-expiring batch <strong>#{recommendedBatch?.batchNumber}</strong> (expires {recommendedBatch?.expiryDate})
                  is available. Dispensing this batch out of sequence increases expiry risk.
                </p>
                <label className="flex items-center gap-2 mt-2 font-semibold text-amber-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowBypassFEFO}
                    onChange={(e) => setAllowBypassFEFO(e.target.checked)}
                    className="text-amber-600 focus:ring-amber-500 rounded"
                  />
                  <span>Acknowledge and override FEFO recommendation for this transaction</span>
                </label>
              </div>
            )}

            {/* Step 4: Dispense Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  3. Dispense Quantity (Units) *
                </label>
                <div className="relative">
                  <input
                    id="input-stockout-qty"
                    type="number"
                    min="1"
                    max={activeBatch?.quantity || 1}
                    required
                    disabled={!activeBatch || isSelectedBatchExpired}
                    value={dispenseQuantity}
                    onChange={(e) => setDispenseQuantity(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
                  />
                </div>
                {activeBatch && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Max available in this batch: <strong>{activeBatch.quantity} units</strong>
                  </p>
                )}
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  4. Dispense Reason / Context *
                </label>
                <select
                  id="select-stockout-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Outpatient Prescription Dispense">Outpatient Prescription Dispense</option>
                  <option value="Inpatient Ward Requisition">Inpatient Ward Requisition</option>
                  <option value="Emergency Department Floor Stock">Emergency Department Floor Stock</option>
                  <option value="ICU Critical Requisition">ICU Critical Requisition</option>
                  <option value="Surgery / OT Supply">Surgery / OT Supply</option>
                  <option value="Internal Quality Audit Sample">Internal Quality Audit Sample</option>
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
              <button
                id="btn-confirm-stockout"
                type="submit"
                disabled={isSubmitting || !activeBatch || isSelectedBatchExpired}
                className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <ArrowUpFromLine className="w-4 h-4" />
                {isSubmitting ? 'Recording Outward Transaction...' : 'Dispense Medicine'}
              </button>
            </div>
          </form>
        </div>

        {/* Live Calculation Sidebar */}
        <div className="space-y-4">
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3">
              <Info className="w-4 h-4" />
              Dispense Summary &amp; Bill Preview
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Medicine:</span>
                <span className="font-semibold text-white truncate max-w-44 text-right">
                  {selectedMed?.medicineName || 'None'}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Target Batch:</span>
                <span className="font-mono text-emerald-400">
                  {activeBatch ? `#${activeBatch.batchNumber}` : 'None'}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Unit Selling Price:</span>
                <span className="font-bold text-white">${activeBatch?.sellingPrice || '0.00'}</span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Dispense Count:</span>
                <span className="font-bold text-white">{dispenseQuantity} units</span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Total Bill Value:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  ${((activeBatch?.sellingPrice || 0) * dispenseQuantity).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between pt-1">
                <span className="text-slate-400">Remaining Balance:</span>
                <span className="font-semibold text-white">
                  {activeBatch ? Math.max(0, activeBatch.quantity - dispenseQuantity) : 0} units
                </span>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50/70 border border-indigo-200/80 p-4 rounded-2xl text-xs text-indigo-950">
            <div className="flex items-center gap-1.5 font-bold text-indigo-900 mb-1">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              Audit Traceability
            </div>
            <p className="text-[11px] text-indigo-800 leading-relaxed">
              Every dispensed quantity is permanently tagged with the operator's user account, timestamped, and deducted in real time.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Dispensing Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Recent Dispensed Outward Transactions
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
                <th className="px-4 py-2.5 text-right">Units Dispensed</th>
                <th className="px-4 py-2.5 text-right">Remaining Balance</th>
                <th className="px-4 py-2.5">Dispensed By</th>
                <th className="px-4 py-2.5">Context / Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-slate-400">
                    No recent outward dispensing transactions recorded yet.
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
                    <td className="px-4 py-2.5 font-mono text-indigo-700">#{tx.batchNumber}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-indigo-600">-{tx.quantity}</td>
                    <td className="px-4 py-2.5 text-right text-slate-700">{tx.newQuantity} units</td>
                    <td className="px-4 py-2.5 text-slate-600">{tx.performedByName || 'Staff Pharmacist'}</td>
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
