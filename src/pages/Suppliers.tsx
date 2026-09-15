import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Supplier, MedicineBatch } from '../types';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import {
  Truck,
  Plus,
  Search,
  Building,
  Phone,
  Mail,
  MapPin,
  FileCheck,
  Edit2,
  Trash2,
  Eye,
  Layers,
  DollarSign,
  AlertTriangle,
  X,
  Sparkles,
} from 'lucide-react';

export const Suppliers: React.FC = () => {
  const { showToast } = useNotifications();
  const { isAdmin } = useAuth();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierBatches, setSupplierBatches] = useState<MedicineBatch[]>([]);

  // Form
  const [formData, setFormData] = useState({
    supplierName: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    licenseNumber: '',
  });

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSuppliers(search.trim() || undefined);
      setSuppliers(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load suppliers.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchSuppliers, 200);
    return () => clearTimeout(timer);
  }, [search]);

  const handleOpenAdd = () => {
    setFormData({
      supplierName: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      licenseNumber: `LIC-MED-${Math.floor(1000 + Math.random() * 9000)}`,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (sup: Supplier) => {
    setSelectedSupplier(sup);
    setFormData({
      supplierName: sup.supplierName,
      contactPerson: sup.contactPerson,
      phone: sup.phone,
      email: sup.email,
      address: sup.address || '',
      licenseNumber: sup.licenseNumber || '',
    });
    setIsEditModalOpen(true);
  };

  const handleOpenView = async (sup: Supplier) => {
    setSelectedSupplier(sup);
    setIsViewModalOpen(true);
    try {
      const res = await api.getSupplier(sup.id);
      setSupplierBatches(res.batches);
    } catch (err: any) {
      showToast(err.message || 'Could not load supplier batches.', 'error');
    }
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplierName || !formData.contactPerson || !formData.phone || !formData.email) {
      showToast('Supplier name, contact person, phone, and email are required.', 'warning');
      return;
    }

    try {
      await api.createSupplier(formData);
      showToast(`Supplier "${formData.supplierName}" registered.`, 'success');
      setIsAddModalOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      showToast(err.message || 'Failed to create supplier.', 'error');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;

    try {
      await api.updateSupplier(selectedSupplier.id, formData);
      showToast(`Supplier "${formData.supplierName}" updated.`, 'success');
      setIsEditModalOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      showToast(err.message || 'Failed to update supplier.', 'error');
    }
  };

  const handleDelete = async () => {
    if (!selectedSupplier) return;
    try {
      await api.deleteSupplier(selectedSupplier.id);
      showToast(`Supplier removed.`, 'info');
      setIsDeleteModalOpen(false);
      fetchSuppliers();
    } catch (err: any) {
      showToast(err.message || 'Cannot delete supplier with linked batches.', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Pharmaceutical Suppliers Directory
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Manage distributor vendor profiles, licenses, delivery volume, and supply chain accountability.
          </p>
        </div>

        <button
          id="btn-add-supplier"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Supplier
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="input-search-suppliers"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplier, contact, license..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <span className="text-xs text-slate-500 hidden sm:inline">
          {suppliers.length} Registered Suppliers
        </span>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-slate-400 text-xs">
            Loading supplier profiles...
          </div>
        ) : suppliers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 text-xs">
            No suppliers found.
          </div>
        ) : (
          suppliers.map((sup) => (
            <div
              key={sup.id}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{sup.supplierName}</h3>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                      <FileCheck className="w-3 h-3 text-emerald-600" />
                      <span>Lic: {sup.licenseNumber}</span>
                    </div>
                  </div>

                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
                    <Truck className="w-4 h-4" />
                  </div>
                </div>

                {/* Contact details */}
                <div className="space-y-1.5 text-xs text-slate-600 border-t border-slate-100 pt-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Contact:</span>
                    <strong className="text-slate-800">{sup.contactPerson}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{sup.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                    <span className="truncate">{sup.email}</span>
                  </div>
                  {sup.address && (
                    <div className="flex items-center gap-2 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate text-[11px] text-slate-500">{sup.address}</span>
                    </div>
                  )}
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50 rounded-xl text-center text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{sup.totalBatches || 0}</div>
                    <div className="text-[10px] text-slate-400">Batches</div>
                  </div>
                  <div>
                    <div className="font-bold text-emerald-600">{sup.activeBatchesCount || 0}</div>
                    <div className="text-[10px] text-slate-400">Active</div>
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">
                      ${Math.round(sup.totalInventoryValue || 0).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-400">Supply Val.</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  id={`btn-view-sup-${sup.id}`}
                  onClick={() => handleOpenView(sup)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Batches
                </button>

                <div className="flex items-center gap-1">
                  <button
                    id={`btn-edit-sup-${sup.id}`}
                    onClick={() => handleOpenEdit(sup)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {isAdmin && (
                    <button
                      id={`btn-delete-sup-${sup.id}`}
                      onClick={() => {
                        setSelectedSupplier(sup);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Supplier Profile & Batches Drawer / Modal */}
      {isViewModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  Supplier Profile
                </span>
                <h2 className="text-xl font-bold text-slate-900">{selectedSupplier.supplierName}</h2>
                <p className="text-xs text-slate-500">
                  Contact: {selectedSupplier.contactPerson} • Phone: {selectedSupplier.phone} • Email: {selectedSupplier.email}
                </p>
              </div>
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-500" />
                Batches Procured from this Supplier ({supplierBatches.length})
              </h3>

              {supplierBatches.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No batches linked to this supplier yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {supplierBatches.map((b: any) => (
                    <div key={b.id} className="p-3 bg-white flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">
                          {b.medicineName} — <span className="font-mono text-emerald-700">#{b.batchNumber}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Qty: {b.quantity} • Cost: ${b.purchasePrice} • Shelf: {b.storageLocation}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-semibold">Exp: {b.expiryDate}</div>
                        <div
                          className={`text-[11px] font-bold ${
                            b.isExpired ? 'text-red-600' : (b.daysRemaining || 0) <= 90 ? 'text-amber-600' : 'text-emerald-600'
                          }`}
                        >
                          {b.isExpired ? 'Expired' : `${b.daysRemaining} days left`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-right">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-slate-900">Register New Pharmaceutical Supplier</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Supplier Name *</label>
                <input
                  id="input-add-sup-name"
                  type="text"
                  required
                  value={formData.supplierName}
                  onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                  placeholder="e.g., McKesson Pharmaceuticals"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Person *</label>
                  <input
                    id="input-add-sup-person"
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    placeholder="e.g., Jennifer Adams"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    id="input-add-sup-phone"
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 (555) 019-2834"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    id="input-add-sup-email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="orders@supplier.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Drug Wholesale License No.</label>
                  <input
                    id="input-add-sup-license"
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Warehouse / Head Office Address</label>
                <input
                  id="input-add-sup-address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="City, State, Country"
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
                  id="btn-add-sup-submit"
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Register Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {isEditModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-slate-900">Edit Supplier Profile</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={formData.supplierName}
                  onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Contact Person *</label>
                  <input
                    type="text"
                    required
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Drug Wholesale License No.</label>
                  <input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Warehouse Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                  Update Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedSupplier && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-2 bg-red-100 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Delete Supplier?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-slate-900">{selectedSupplier.supplierName}</span>?
              Deletion is only allowed if no batches are currently linked to this supplier.
            </p>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-delete-sup"
                onClick={handleDelete}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg"
              >
                Delete Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
