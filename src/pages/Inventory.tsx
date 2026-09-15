import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { MedicineBatch, Medicine, Supplier } from '../types';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import {
  Layers,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  ArrowUpFromLine,
  ArrowDownToLine,
  X,
  Building,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface InventoryProps {
  onNavigate: (tab: string, batchId?: string) => void;
}

export const Inventory: React.FC<InventoryProps> = ({ onNavigate }) => {
  const { showToast } = useNotifications();
  const { isAdmin } = useAuth();

  const [batches, setBatches] = useState<MedicineBatch[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [search, setSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('all'); // all, expired, critical, expiring, lowstock, available
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Reference data for modals
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentBatch, setCurrentBatch] = useState<MedicineBatch | null>(null);

  // Add / Edit form
  const [formData, setFormData] = useState({
    medicineId: '',
    batchNumber: '',
    manufacturingDate: '',
    expiryDate: '',
    purchasePrice: 0,
    sellingPrice: 0,
    quantity: 50,
    supplierId: '',
    storageLocation: 'Shelf A-1',
  });

  const fetchBatches = async () => {
    setIsLoading(true);
    try {
      let expiryWindow: string | undefined;
      let status: string | undefined;

      if (activeTab === 'expired') {
        expiryWindow = 'expired';
      } else if (activeTab === 'critical') {
        expiryWindow = 'critical'; // <= 7 days
      } else if (activeTab === 'expiring') {
        expiryWindow = 'warning'; // <= 90 days
      } else if (activeTab === 'lowstock') {
        status = 'LOW_STOCK';
      } else if (activeTab === 'available') {
        status = 'AVAILABLE';
      }

      const res = await api.getBatches({
        search: search.trim() || undefined,
        status,
        expiryWindow,
        limit: 100,
      });

      setBatches(res.data);
      setTotalCount(res.pagination.total);
    } catch (err: any) {
      showToast(err.message || 'Failed to load batch inventory.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadReferences = async () => {
    try {
      const [medRes, supRes] = await Promise.all([
        api.getMedicines({ limit: 200 }),
        api.getSuppliers(),
      ]);
      setMedicines(medRes.data);
      setSuppliers(supRes);
      if (medRes.data.length > 0) {
        setFormData((prev) => ({ ...prev, medicineId: medRes.data[0].id }));
      }
      if (supRes.length > 0) {
        setFormData((prev) => ({ ...prev, supplierId: supRes[0].id }));
      }
    } catch (err) {
      console.warn('Failed to load references for batch forms', err);
    }
  };

  useEffect(() => {
    loadReferences();
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchBatches, 200);
    return () => clearTimeout(timer);
  }, [search, activeTab]);

  const handleOpenAdd = () => {
    const today = new Date().toISOString().split('T')[0];
    const defaultExp = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    setFormData({
      medicineId: medicines.length > 0 ? medicines[0].id : '',
      batchNumber: `B-${Math.floor(100000 + Math.random() * 900000)}`,
      manufacturingDate: today,
      expiryDate: defaultExp,
      purchasePrice: 12.5,
      sellingPrice: 18.0,
      quantity: 100,
      supplierId: suppliers.length > 0 ? suppliers[0].id : '',
      storageLocation: 'Shelf A-1 (Main Inventory)',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (batch: MedicineBatch) => {
    setCurrentBatch(batch);
    setFormData({
      medicineId: batch.medicineId,
      batchNumber: batch.batchNumber,
      manufacturingDate: batch.manufacturingDate || '',
      expiryDate: batch.expiryDate,
      purchasePrice: batch.purchasePrice,
      sellingPrice: batch.sellingPrice,
      quantity: batch.quantity,
      supplierId: batch.supplierId,
      storageLocation: batch.storageLocation || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.medicineId || !formData.batchNumber || !formData.expiryDate || !formData.supplierId) {
      showToast('Medicine, batch number, expiry date, and supplier are required.', 'warning');
      return;
    }

    if (new Date(formData.expiryDate) <= new Date(formData.manufacturingDate)) {
      showToast('Expiry date must be after manufacturing date.', 'warning');
      return;
    }

    try {
      await api.createBatch(formData);
      showToast(`Batch #${formData.batchNumber} created successfully.`, 'success');
      setIsAddModalOpen(false);
      fetchBatches();
    } catch (err: any) {
      showToast(err.message || 'Failed to create batch.', 'error');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBatch) return;

    try {
      await api.updateBatch(currentBatch.id, formData);
      showToast(`Batch #${formData.batchNumber} updated.`, 'success');
      setIsEditModalOpen(false);
      fetchBatches();
    } catch (err: any) {
      showToast(err.message || 'Failed to update batch.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!currentBatch) return;
    try {
      await api.deleteBatch(currentBatch.id);
      showToast(`Batch #${currentBatch.batchNumber} deleted.`, 'info');
      setIsDeleteModalOpen(false);
      fetchBatches();
    } catch (err: any) {
      showToast(err.message || 'Cannot delete batch.', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Batch-Level Inventory &amp; Expiry Control
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Real-time batch lifecycle management, FEFO ranking, and shelf-life countdown.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-add-batch"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Batch
          </button>
        </div>
      </div>

      {/* Filter Tabs and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Filter Tabs */}
          <div className="flex items-center flex-wrap gap-1.5 w-full md:w-auto">
            {[
              { id: 'all', label: 'All Batches' },
              { id: 'critical', label: 'Critical (≤ 7d)' },
              { id: 'expiring', label: 'Expiring Soon (≤ 90d)' },
              { id: 'expired', label: 'Expired' },
              { id: 'lowstock', label: 'Low Stock' },
              { id: 'available', label: 'Adequate Stock' },
            ].map((tab) => (
              <button
                key={tab.id}
                id={`tab-filter-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="input-search-batches"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search batch #, medicine, shelf..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Medicine &amp; Batch No.</th>
                <th className="px-4 py-3">Storage Shelf</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3">Expiry Date</th>
                <th className="px-4 py-3">Days Remaining</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    Loading inventory batches...
                  </td>
                </tr>
              ) : batches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-500">
                    No batches found matching the selected filters.
                  </td>
                </tr>
              ) : (
                batches.map((batch) => {
                  const days = batch.daysRemaining ?? 0;
                  const isExpired = days < 0;

                  return (
                    <tr
                      key={batch.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isExpired ? 'bg-red-50/30' : days <= 7 ? 'bg-orange-50/30' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{batch.medicineName}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="font-mono text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/60">
                            #{batch.batchNumber}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Mfg: {batch.manufacturingDate}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {batch.storageLocation || 'General Rack'}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-slate-900 text-sm">{batch.quantity}</span>
                        <div className="text-[10px] text-slate-400">
                          Cost: ${batch.purchasePrice} | Sell: ${batch.sellingPrice}
                        </div>
                      </td>

                      <td className="px-4 py-3 font-medium text-slate-800">
                        {batch.expiryDate}
                      </td>

                      <td className="px-4 py-3">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                            <AlertOctagon className="w-3 h-3" /> Expired ({Math.abs(days)}d ago)
                          </span>
                        ) : days <= 7 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700 border border-orange-200 animate-pulse">
                            <ShieldAlert className="w-3 h-3" /> {days} days left (Critical)
                          </span>
                        ) : days <= 30 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3" /> {days} days left
                          </span>
                        ) : days <= 90 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100 text-yellow-800">
                            <Clock className="w-3 h-3" /> {days} days left
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> {days} days left
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            batch.status === 'EXPIRED'
                              ? 'bg-red-100 text-red-700'
                              : batch.status === 'EXPIRING_SOON'
                              ? 'bg-amber-100 text-amber-700'
                              : batch.status === 'LOW_STOCK'
                              ? 'bg-orange-100 text-orange-700'
                              : batch.status === 'OUT_OF_STOCK'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {batch.status.replace(/_/g, ' ')}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-600 truncate max-w-36">
                        {batch.supplierName || 'Primary Distributor'}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          {!isExpired && batch.quantity > 0 && (
                            <button
                              id={`btn-dispense-batch-${batch.id}`}
                              onClick={() => onNavigate('stock-out')}
                              title="Dispense from this batch"
                              className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <ArrowUpFromLine className="w-4 h-4" />
                            </button>
                          )}
                          {isExpired && (
                            <button
                              id={`btn-dispose-batch-${batch.id}`}
                              onClick={() => onNavigate('expired')}
                              title="Dispose Expired Batch"
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <AlertOctagon className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            id={`btn-edit-batch-${batch.id}`}
                            onClick={() => handleOpenEdit(batch)}
                            title="Edit Batch"
                            className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button
                              id={`btn-delete-batch-${batch.id}`}
                              onClick={() => {
                                setCurrentBatch(batch);
                                setIsDeleteModalOpen(true);
                              }}
                              title="Delete Batch"
                              className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Total Batches Tracked: {totalCount}</span>
          <span>FEFO Engine sorts by earliest expiration date first</span>
        </div>
      </div>

      {/* Add Batch Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-slate-900">Add New Inventory Batch</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Medicine *</label>
                <select
                  id="select-add-batch-med"
                  required
                  value={formData.medicineId}
                  onChange={(e) => setFormData({ ...formData, medicineId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.medicineName} ({m.dosageForm}, {m.strength})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batch Number *</label>
                  <input
                    id="input-add-batch-num"
                    type="text"
                    required
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Quantity *</label>
                  <input
                    id="input-add-batch-qty"
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Manufacturing Date</label>
                  <input
                    id="input-add-batch-mfg"
                    type="date"
                    value={formData.manufacturingDate}
                    onChange={(e) => setFormData({ ...formData, manufacturingDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiry Date *</label>
                  <input
                    id="input-add-batch-exp"
                    type="date"
                    required
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Price ($) *</label>
                  <input
                    id="input-add-batch-pprice"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Selling Price ($) *</label>
                  <input
                    id="input-add-batch-sprice"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supplier *</label>
                  <select
                    id="select-add-batch-sup"
                    required
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.supplierName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Storage Location *</label>
                  <input
                    id="input-add-batch-loc"
                    type="text"
                    required
                    value={formData.storageLocation}
                    onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                    placeholder="e.g., Shelf B-2, Cold Chain Refrigerator 2"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  id="btn-add-batch-submit"
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Create Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Batch Modal */}
      {isEditModalOpen && currentBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-slate-900">Edit Batch Details</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batch Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Manufacturing Date</label>
                  <input
                    type="date"
                    value={formData.manufacturingDate}
                    onChange={(e) => setFormData({ ...formData, manufacturingDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Selling Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Storage Location</label>
                <input
                  type="text"
                  value={formData.storageLocation}
                  onChange={(e) => setFormData({ ...formData, storageLocation: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Update Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && currentBatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-2 bg-red-100 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Delete Batch #{currentBatch.batchNumber}?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete this batch ({currentBatch.quantity} units)?
              This action will be logged in the audit trail.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-batch"
                onClick={handleDelete}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Delete Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
