import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Medicine, MedicineBatch } from '../types';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import {
  Plus,
  Search,
  Pill,
  Filter,
  Edit2,
  Trash2,
  Eye,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Sparkles,
  ArrowDownToLine,
  ArrowUpFromLine,
  X,
} from 'lucide-react';

interface MedicinesProps {
  onNavigate: (tab: string) => void;
}

const CATEGORIES = [
  'All Categories',
  'Antibiotics',
  'Analgesics',
  'Cardiovascular',
  'Antidiabetic',
  'Respiratory',
  'Gastrointestinal',
  'Dermatology',
  'Antihistamine',
  'Vitamins & Supplements',
];

const DOSAGE_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Injection',
  'Ointment',
  'Suspension',
  'Inhaler',
  'Drops',
];

export const Medicines: React.FC<MedicinesProps> = ({ onNavigate }) => {
  const { showToast } = useNotifications();
  const { isAdmin } = useAuth();

  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>('All');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Selected medicine for edit/view/delete
  const [currentMed, setCurrentMed] = useState<Medicine | null>(null);
  const [viewBatches, setViewBatches] = useState<MedicineBatch[]>([]);
  const [fefoRecommendation, setFefoRecommendation] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    medicineName: '',
    genericName: '',
    brandName: '',
    category: 'Antibiotics',
    dosageForm: 'Tablet',
    strength: '',
    manufacturer: '',
    minimumStockLevel: 20,
    description: '',
  });

  const fetchMedicines = async () => {
    setIsLoading(true);
    try {
      const res = await api.getMedicines({
        search: search.trim() || undefined,
        category: selectedCategory !== 'All Categories' ? selectedCategory : undefined,
        manufacturer: selectedManufacturer !== 'All' ? selectedManufacturer : undefined,
      });
      setMedicines(res.data);
      setTotalCount(res.pagination.total);
      setCategories(res.meta.categories);
      setManufacturers(res.meta.manufacturers);
    } catch (err: any) {
      showToast(err.message || 'Failed to load medicines.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchMedicines();
    }, 250);
    return () => clearTimeout(delayDebounce);
  }, [search, selectedCategory, selectedManufacturer]);

  const handleOpenAdd = () => {
    setFormData({
      medicineName: '',
      genericName: '',
      brandName: '',
      category: 'Antibiotics',
      dosageForm: 'Tablet',
      strength: '',
      manufacturer: '',
      minimumStockLevel: 20,
      description: '',
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (med: Medicine) => {
    setCurrentMed(med);
    setFormData({
      medicineName: med.medicineName,
      genericName: med.genericName,
      brandName: med.brandName || '',
      category: med.category,
      dosageForm: med.dosageForm,
      strength: med.strength,
      manufacturer: med.manufacturer,
      minimumStockLevel: med.minimumStockLevel,
      description: med.description || '',
    });
    setIsEditModalOpen(true);
  };

  const handleOpenView = async (med: Medicine) => {
    setCurrentMed(med);
    setIsViewModalOpen(true);
    try {
      const res = await api.getMedicine(med.id);
      setViewBatches(res.batches);
      setFefoRecommendation(res.fefoRecommendation);
    } catch (err: any) {
      showToast(err.message || 'Could not fetch medicine details', 'error');
    }
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.medicineName || !formData.genericName || !formData.strength || !formData.manufacturer) {
      showToast('Please fill out all mandatory fields.', 'warning');
      return;
    }

    try {
      await api.createMedicine(formData);
      showToast(`Medicine "${formData.medicineName}" added successfully.`, 'success');
      setIsAddModalOpen(false);
      fetchMedicines();
    } catch (err: any) {
      showToast(err.message || 'Failed to add medicine.', 'error');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMed) return;

    try {
      await api.updateMedicine(currentMed.id, formData);
      showToast(`Medicine "${formData.medicineName}" updated successfully.`, 'success');
      setIsEditModalOpen(false);
      fetchMedicines();
    } catch (err: any) {
      showToast(err.message || 'Failed to update medicine.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!currentMed) return;
    try {
      await api.deleteMedicine(currentMed.id);
      showToast(`Medicine "${currentMed.medicineName}" deleted.`, 'info');
      setIsDeleteModalOpen(false);
      fetchMedicines();
    } catch (err: any) {
      showToast(err.message || 'Cannot delete medicine.', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Medicine Catalog &amp; Formulary
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Manage pharmaceutical master data, therapeutic classifications, and threshold levels.
          </p>
        </div>

        <button
          id="btn-add-medicine"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add New Medicine
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            id="input-search-medicines"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by brand, generic name..."
            className="w-full pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Category:</span>
          </div>
          <select
            id="select-category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {manufacturers.length > 0 && (
            <select
              id="select-mfg-filter"
              value={selectedManufacturer}
              onChange={(e) => setSelectedManufacturer(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="All">All Manufacturers</option>
              {manufacturers.map((mfg) => (
                <option key={mfg} value={mfg}>
                  {mfg}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Medicines Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Medicine &amp; Generic</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Dosage / Strength</th>
                <th className="px-4 py-3">Manufacturer</th>
                <th className="px-4 py-3 text-right">Available Stock</th>
                <th className="px-4 py-3 text-center">Batch Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    Loading medicine inventory...
                  </td>
                </tr>
              ) : medicines.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No medicines match the search criteria.
                  </td>
                </tr>
              ) : (
                medicines.map((med) => {
                  const stock = med.totalStock || 0;
                  const isOut = stock === 0;
                  const isLow = stock > 0 && stock <= med.minimumStockLevel;

                  return (
                    <tr key={med.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{med.medicineName}</div>
                        <div className="text-[11px] text-slate-500">{med.genericName}</div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                          {med.category}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {med.dosageForm} • {med.strength}
                      </td>

                      <td className="px-4 py-3 text-slate-600 truncate max-w-36">
                        {med.manufacturer}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="font-bold text-slate-900">{stock.toLocaleString()} units</div>
                        <div className="text-[10px] text-slate-400">Min: {med.minimumStockLevel}</div>
                      </td>

                      <td className="px-4 py-3 text-center">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                            <XCircle className="w-3 h-3" /> Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3 h-3" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Available
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            id={`btn-view-med-${med.id}`}
                            onClick={() => handleOpenView(med)}
                            title="View Batches & FEFO Recommendation"
                            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-edit-med-${med.id}`}
                            onClick={() => handleOpenEdit(med)}
                            title="Edit Medicine"
                            className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button
                              id={`btn-delete-med-${med.id}`}
                              onClick={() => {
                                setCurrentMed(med);
                                setIsDeleteModalOpen(true);
                              }}
                              title="Delete Medicine"
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
          <span>Total Medicines: {totalCount}</span>
          <span>Showing all active catalog records</span>
        </div>
      </div>

      {/* View Details Drawer / Modal */}
      {isViewModalOpen && currentMed && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  {currentMed.category}
                </span>
                <h2 className="text-xl font-bold text-slate-900">{currentMed.medicineName}</h2>
                <p className="text-xs text-slate-500">
                  Generic: {currentMed.genericName} • Dosage: {currentMed.dosageForm} ({currentMed.strength})
                </p>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* FEFO Recommendation Box */}
            {fefoRecommendation ? (
              <div className="mb-5 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  First-Expiry-First-Out (FEFO) Recommended Batch
                </div>
                <p className="text-sm font-bold text-slate-900">
                  Dispense Batch #{fefoRecommendation.batchNumber}
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Expires on <span className="font-semibold">{fefoRecommendation.expiryDate}</span> (
                  {fefoRecommendation.daysRemaining} days remaining). Available units:{' '}
                  <span className="font-bold">{fefoRecommendation.quantity}</span>. Shelf:{' '}
                  {fefoRecommendation.location}.
                </p>
              </div>
            ) : (
              <div className="mb-5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
                No active non-expired batches currently in stock for dispensing.
              </div>
            )}

            {/* Batch List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-500" />
                Active Batches for this SKU ({viewBatches.length})
              </h3>

              {viewBatches.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No batches created for this medicine yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {viewBatches.map((b) => (
                    <div key={b.id} className="p-3 bg-white flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-800">Batch #{b.batchNumber}</div>
                        <div className="text-[11px] text-slate-500">
                          Location: {b.storageLocation} • Cost: ${b.purchasePrice} / Sell: ${b.sellingPrice}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">{b.quantity} units</div>
                        <div className="text-[11px]">
                          Exp: {b.expiryDate} (
                          <span
                            className={
                              (b.daysRemaining || 0) < 0
                                ? 'text-red-600 font-bold'
                                : (b.daysRemaining || 0) <= 90
                                ? 'text-amber-600 font-semibold'
                                : 'text-emerald-600'
                            }
                          >
                            {(b.daysRemaining || 0) < 0
                              ? 'Expired'
                              : `${b.daysRemaining}d remaining`}
                          </span>
                          )
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  onNavigate('stock-in');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
                Receive Stock
              </button>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  onNavigate('stock-out');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowUpFromLine className="w-4 h-4" />
                Dispense (FEFO)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Medicine Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-slate-900">Add New Medicine to Catalog</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Medicine Name *</label>
                  <input
                    id="input-add-med-name"
                    type="text"
                    required
                    value={formData.medicineName}
                    onChange={(e) => setFormData({ ...formData, medicineName: e.target.value })}
                    placeholder="e.g., Amoxicillin 500mg"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Generic Name *</label>
                  <input
                    id="input-add-generic-name"
                    type="text"
                    required
                    value={formData.genericName}
                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    placeholder="e.g., Amoxicillin Trihydrate"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    id="input-add-category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    {CATEGORIES.filter((c) => c !== 'All Categories').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dosage Form *</label>
                  <select
                    id="input-add-form"
                    value={formData.dosageForm}
                    onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    {DOSAGE_FORMS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Strength *</label>
                  <input
                    id="input-add-strength"
                    type="text"
                    required
                    value={formData.strength}
                    onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    placeholder="e.g., 500mg, 10ml, 5mg/ml"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Stock Threshold *</label>
                  <input
                    id="input-add-minstock"
                    type="number"
                    min="1"
                    required
                    value={formData.minimumStockLevel}
                    onChange={(e) => setFormData({ ...formData, minimumStockLevel: parseInt(e.target.value) || 10 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Manufacturer *</label>
                <input
                  id="input-add-mfg"
                  type="text"
                  required
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="e.g., Pfizer Inc., Novartis, GlaxoSmithKline"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Clinical Description / Notes</label>
                <textarea
                  id="input-add-desc"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Storage requirements, therapeutic indications..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
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
                  id="btn-add-med-submit"
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Save Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Medicine Modal */}
      {isEditModalOpen && currentMed && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-slate-900">Edit Medicine</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Medicine Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.medicineName}
                    onChange={(e) => setFormData({ ...formData, medicineName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Generic Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.genericName}
                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    {CATEGORIES.filter((c) => c !== 'All Categories').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dosage Form *</label>
                  <select
                    value={formData.dosageForm}
                    onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                  >
                    {DOSAGE_FORMS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Strength *</label>
                  <input
                    type="text"
                    required
                    value={formData.strength}
                    onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Stock Threshold *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.minimumStockLevel}
                    onChange={(e) => setFormData({ ...formData, minimumStockLevel: parseInt(e.target.value) || 10 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Manufacturer *</label>
                <input
                  type="text"
                  required
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
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
                  Update Medicine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && currentMed && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-2 bg-red-100 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Delete Medicine?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove <span className="font-bold text-slate-900">{currentMed.medicineName}</span>?
              Deletion is only allowed if there are no historical or active batches linked.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-med"
                onClick={handleDelete}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Delete Medicine
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
