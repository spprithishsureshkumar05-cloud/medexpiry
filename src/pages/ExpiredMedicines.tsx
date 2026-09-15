import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { MedicineBatch } from '../types';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import {
  AlertOctagon,
  Trash2,
  DollarSign,
  ShieldCheck,
  FileCheck,
  CheckCircle2,
  Sparkles,
  Layers,
  X,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

export const ExpiredMedicines: React.FC = () => {
  const { showToast } = useNotifications();
  const { user } = useAuth();

  const [expiredBatches, setExpiredBatches] = useState<MedicineBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisposalModalOpen, setIsDisposalModalOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<MedicineBatch | null>(null);

  // Disposal form
  const [disposalType, setDisposalType] = useState<'EXPIRED' | 'DAMAGED' | 'RECALLED'>('EXPIRED');
  const [reason, setReason] = useState('Standard Pharmaceutical Bio-waste Protocol');
  const [witness, setWitness] = useState('Chief Regulatory Pharmacist');
  const [notes, setNotes] = useState('Certificate #BW-2026-');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchExpiredBatches = async () => {
    setIsLoading(true);
    try {
      const res = await api.getBatches({ expiryWindow: 'expired', limit: 100 });
      setExpiredBatches(res.data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load expired inventory.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiredBatches();
    setNotes(`Biohazard Incineration Certificate #CERT-${Math.floor(10000 + Math.random() * 90000)}`);
  }, []);

  const totalExpiredUnits = expiredBatches.reduce((sum, b) => sum + b.quantity, 0);
  const totalFinancialLoss = expiredBatches.reduce((sum, b) => sum + b.quantity * b.purchasePrice, 0);

  const handleOpenDisposal = (batch: MedicineBatch) => {
    setSelectedBatch(batch);
    setIsDisposalModalOpen(true);
  };

  const handleConfirmDisposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch) return;

    setIsSubmitting(true);
    try {
      const res = await api.disposeBatch({
        medicineBatchId: selectedBatch.id,
        disposalType,
        reason,
        witness,
        notes,
      });

      showToast(res.message, 'success');
      setIsDisposalModalOpen(false);
      fetchExpiredBatches();
    } catch (err: any) {
      showToast(err.message || 'Failed to complete disposal process.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-red-600 font-bold text-xs uppercase tracking-wider mb-1">
            <AlertOctagon className="w-4 h-4" />
            Bio-Waste &amp; Quarantine Protocol
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Expired Medicines Quarantine &amp; Disposal
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Safely segregate, track financial losses, and document certified destruction or manufacturer return.
          </p>
        </div>

        <button
          onClick={fetchExpiredBatches}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh List
        </button>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-red-50/50 border border-red-200 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-red-700">Expired Batches</p>
            <p className="text-2xl font-black text-red-900 mt-0.5">{expiredBatches.length}</p>
            <p className="text-[11px] text-red-700">Awaiting disposal protocol</p>
          </div>
          <div className="p-3 bg-red-100 text-red-700 rounded-xl">
            <AlertOctagon className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-orange-50/50 border border-orange-200 p-4 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-orange-700">Total Expired Units</p>
            <p className="text-2xl font-black text-orange-900 mt-0.5">{totalExpiredUnits.toLocaleString()}</p>
            <p className="text-[11px] text-orange-700">Physical units segregated</p>
          </div>
          <div className="p-3 bg-orange-100 text-orange-700 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900 text-white border border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-md">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Total Financial Loss</p>
            <p className="text-2xl font-black text-white mt-0.5">
              ${totalFinancialLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-400">Based on acquisition cost</p>
          </div>
          <div className="p-3 bg-slate-800 text-emerald-400 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Expired Batches Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-red-50/60 border-b border-red-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-800 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-red-600" />
            Quarantined Pharmaceutical Stock Requiring Disposal
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Medicine &amp; Batch No.</th>
                <th className="px-4 py-3">Quarantine Shelf</th>
                <th className="px-4 py-3 text-right">Expired Units</th>
                <th className="px-4 py-3">Expiry Date</th>
                <th className="px-4 py-3">Elapsed Time</th>
                <th className="px-4 py-3 text-right">Cost Loss</th>
                <th className="px-4 py-3 text-right">Protocol Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    Scanning for expired batches...
                  </td>
                </tr>
              ) : expiredBatches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-emerald-700 bg-emerald-50/20">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                    <span className="font-bold">Zero Expired Stock!</span>
                    <p className="text-xs text-slate-500 mt-1">
                      All inventory batches are strictly within their valid clinical shelf-life.
                    </p>
                  </td>
                </tr>
              ) : (
                expiredBatches.map((batch) => {
                  const days = batch.daysRemaining ?? 0;
                  const loss = batch.quantity * batch.purchasePrice;

                  return (
                    <tr key={batch.id} className="hover:bg-red-50/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{batch.medicineName}</div>
                        <div className="font-mono text-[11px] text-red-600 mt-0.5">#{batch.batchNumber}</div>
                      </td>

                      <td className="px-4 py-3 text-slate-600">
                        {batch.storageLocation || 'Quarantine Room Q-1'}
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {batch.quantity} units
                      </td>

                      <td className="px-4 py-3 font-semibold text-red-700">
                        {batch.expiryDate}
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                          {Math.abs(days)} days expired
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-red-700">
                        ${loss.toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          id={`btn-dispose-${batch.id}`}
                          onClick={() => handleOpenDisposal(batch)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Record Disposal
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disposal Protocol Modal */}
      {isDisposalModalOpen && selectedBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2 text-red-600">
                <AlertOctagon className="w-5 h-5" />
                <h2 className="text-base font-bold text-slate-900">Pharmaceutical Disposal Protocol</h2>
              </div>
              <button onClick={() => setIsDisposalModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-xs text-red-900">
              <p className="font-bold">
                Batch #{selectedBatch.batchNumber} — {selectedBatch.medicineName}
              </p>
              <p className="mt-0.5">
                Quantity to dispose: <strong>{selectedBatch.quantity} units</strong> (Est. Loss: $
                {(selectedBatch.quantity * selectedBatch.purchasePrice).toFixed(2)})
              </p>
            </div>

            <form onSubmit={handleConfirmDisposal} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Disposal Method *</label>
                <select
                  id="select-disposal-type"
                  value={disposalType}
                  onChange={(e) => setDisposalType(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-red-500"
                >
                  <option value="EXPIRED">Bio-Hazard Incineration (Expired Stock)</option>
                  <option value="DAMAGED">Manufacturer Credit Return / RMA</option>
                  <option value="RECALLED">Authorized Regulatory Destruction</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Disposal Witness / Supervisor *</label>
                <input
                  id="input-disposal-witness"
                  type="text"
                  required
                  value={witness}
                  onChange={(e) => setWitness(e.target.value)}
                  placeholder="e.g. Dr. Sarah Jenkins (Head Pharmacist)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason / Regulatory Justification *
                </label>
                <input
                  id="input-disposal-reason"
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Destruction Certificate / Reference No.
                </label>
                <input
                  id="input-disposal-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Certificate #INC-8941"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDisposalModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-disposal-submit"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                >
                  {isSubmitting ? 'Recording Disposal...' : 'Confirm Certified Disposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
