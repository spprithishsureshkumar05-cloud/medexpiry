import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useNotifications } from '../context/NotificationContext';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  AlertTriangle,
  Package,
  Truck,
  ArrowRightLeft,
  DollarSign,
  Filter,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export const Reports: React.FC = () => {
  const { showToast } = useNotifications();

  const [activeTab, setActiveTab] = useState<'expiry' | 'stock' | 'suppliers' | 'movement'>('expiry');
  const [isLoading, setIsLoading] = useState(true);

  // Data states
  const [expiryData, setExpiryData] = useState<any>(null);
  const [stockData, setStockData] = useState<any>(null);
  const [supplierData, setSupplierData] = useState<any>(null);
  const [movementData, setMovementData] = useState<any>(null);

  // Filter
  const [expiryDaysFilter, setExpiryDaysFilter] = useState<number | undefined>(undefined);

  const fetchCurrentReport = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'expiry') {
        const res = await api.getExpiryReport(expiryDaysFilter);
        setExpiryData(res);
      } else if (activeTab === 'stock') {
        const res = await api.getStockReport();
        setStockData(res);
      } else if (activeTab === 'suppliers') {
        const res = await api.getSuppliersReport();
        setSupplierData(res);
      } else if (activeTab === 'movement') {
        const res = await api.getStockMovementReport();
        setMovementData(res);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load report data.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentReport();
  }, [activeTab, expiryDaysFilter]);

  const handleDownloadCSV = () => {
    const token = localStorage.getItem('medexpiry_token');
    const url = `/api/reports/export-csv?type=${activeTab}`;
    // Fetch with auth header and trigger browser download
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to download CSV');
        return res.blob();
      })
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `medexpiry-${activeTab}-report-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
        showToast(`Downloaded ${activeTab} report as CSV.`, 'success');
      })
      .catch((err) => {
        showToast(err.message, 'error');
      });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 print:p-0">
      {/* Top Banner (Hidden when printing) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Pharmacy Analytics &amp; Compliance Reports
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Generate verifiable regulatory audit reports, batch timelines, stock valuations, and CSV exports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-print-report"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>

          <button
            id="btn-export-csv"
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Report Type Tabs */}
      <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs flex items-center flex-wrap gap-1.5 print:hidden">
        {[
          { id: 'expiry', label: 'Medicine Expiry Report', icon: AlertTriangle },
          { id: 'stock', label: 'Stock Valuation & Inventory', icon: Package },
          { id: 'suppliers', label: 'Supplier Performance', icon: Truck },
          { id: 'movement', label: 'Stock Movement Ledger', icon: ArrowRightLeft },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-report-${tab.id}`}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 1. EXPIRY REPORT TAB */}
      {activeTab === 'expiry' && (
        <div className="space-y-4">
          {expiryData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 print:grid-cols-5">
              <div className="bg-white p-3.5 rounded-xl border border-red-200 bg-red-50/20">
                <p className="text-[11px] font-bold text-red-700 uppercase">Expired Batches</p>
                <p className="text-xl font-black text-red-900 mt-0.5">{expiryData.summary.expiredCount}</p>
                <p className="text-[10px] text-red-600">Action: Bio-waste disposal</p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-orange-200 bg-orange-50/20">
                <p className="text-[11px] font-bold text-orange-700 uppercase">Critical (≤ 7 Days)</p>
                <p className="text-xl font-black text-orange-900 mt-0.5">{expiryData.summary.within7DaysCount}</p>
                <p className="text-[10px] text-orange-600">Immediate dispense</p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-amber-200 bg-amber-50/20">
                <p className="text-[11px] font-bold text-amber-700 uppercase">Within 30 Days</p>
                <p className="text-xl font-black text-amber-900 mt-0.5">{expiryData.summary.within30DaysCount}</p>
                <p className="text-[10px] text-amber-600">FEFO priority</p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-yellow-200 bg-yellow-50/20">
                <p className="text-[11px] font-bold text-yellow-700 uppercase">Within 90 Days</p>
                <p className="text-xl font-black text-yellow-900 mt-0.5">{expiryData.summary.within90DaysCount}</p>
                <p className="text-[10px] text-yellow-600">Under surveillance</p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 bg-slate-900 text-white col-span-2 sm:col-span-1">
                <p className="text-[11px] font-bold text-emerald-400 uppercase">Expired Cost Loss</p>
                <p className="text-xl font-black text-white mt-0.5">
                  ${expiryData.summary.estimatedLossFromExpired.toFixed(2)}
                </p>
                <p className="text-[10px] text-slate-400">Total acquisition cost</p>
              </div>
            </div>
          )}

          {/* Filter options */}
          <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 text-xs print:hidden">
            <span className="font-semibold text-slate-600">Time Horizon Filter:</span>
            {[
              { label: 'All Batches', val: undefined },
              { label: 'Expired Only', val: -1 },
              { label: 'Within 7 Days', val: 7 },
              { label: 'Within 30 Days', val: 30 },
              { label: 'Within 60 Days', val: 60 },
              { label: 'Within 90 Days', val: 90 },
            ].map((f) => (
              <button
                key={f.label}
                onClick={() => setExpiryDaysFilter(f.val)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  expiryDaysFilter === f.val
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Expiry Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5">Medicine Name</th>
                  <th className="px-4 py-2.5">Batch #</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5 text-right">Units</th>
                  <th className="px-4 py-2.5">Expiry Date</th>
                  <th className="px-4 py-2.5">Days Left</th>
                  <th className="px-4 py-2.5">Shelf Location</th>
                  <th className="px-4 py-2.5">Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      Generating expiry audit report...
                    </td>
                  </tr>
                ) : !expiryData?.batches || expiryData.batches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      No batches found matching filter.
                    </td>
                  </tr>
                ) : (
                  expiryData.batches.map((b: any) => (
                    <tr
                      key={b.id}
                      className={
                        b.daysRemaining < 0
                          ? 'bg-red-50/40 text-red-900'
                          : b.daysRemaining <= 7
                          ? 'bg-orange-50/40 text-orange-900'
                          : 'hover:bg-slate-50/60'
                      }
                    >
                      <td className="px-4 py-2.5 font-bold">{b.medicineName}</td>
                      <td className="px-4 py-2.5 font-mono text-emerald-700">#{b.batchNumber}</td>
                      <td className="px-4 py-2.5">{b.category}</td>
                      <td className="px-4 py-2.5 text-right font-bold">{b.quantity}</td>
                      <td className="px-4 py-2.5 font-medium">{b.expiryDate}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`font-bold ${
                            b.daysRemaining < 0
                              ? 'text-red-700'
                              : b.daysRemaining <= 7
                              ? 'text-orange-700'
                              : b.daysRemaining <= 90
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }`}
                        >
                          {b.daysRemaining < 0
                            ? `${Math.abs(b.daysRemaining)}d Expired`
                            : `${b.daysRemaining} days`}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">{b.storageLocation}</td>
                      <td className="px-4 py-2.5 truncate max-w-36">{b.supplierName}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. STOCK REPORT TAB */}
      {activeTab === 'stock' && (
        <div className="space-y-4">
          {stockData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total SKU Count</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{stockData.summary.totalMedicines}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Physical Units</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{stockData.summary.totalUnits.toLocaleString()}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Inventory Valuation</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">${stockData.summary.totalValuation.toLocaleString()}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Low / Out of Stock</p>
                <p className="text-2xl font-black text-orange-600 mt-1">
                  {stockData.summary.lowStockCount} low • {stockData.summary.outOfStockCount} out
                </p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5">Medicine Name</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Dosage / Strength</th>
                  <th className="px-4 py-2.5 text-right">Current Stock</th>
                  <th className="px-4 py-2.5 text-right">Min Level</th>
                  <th className="px-4 py-2.5 text-right">Inventory Valuation</th>
                  <th className="px-4 py-2.5 text-right">Retail Potential</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      Loading inventory valuation...
                    </td>
                  </tr>
                ) : (
                  stockData?.medicines?.map((m: any) => (
                    <tr key={m.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 font-bold text-slate-900">{m.medicineName}</td>
                      <td className="px-4 py-2.5 text-slate-600">{m.category}</td>
                      <td className="px-4 py-2.5 text-slate-600">{m.dosageForm} • {m.strength}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-900">{m.currentQuantity}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{m.minimumStockLevel}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">${m.inventoryCost.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-700">${m.retailValue.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.isOutOfStock
                              ? 'bg-slate-100 text-slate-700'
                              : m.isLowStock
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {m.isOutOfStock ? 'OUT OF STOCK' : m.isLowStock ? 'LOW STOCK' : 'ADEQUATE'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. SUPPLIER REPORT TAB */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5">Supplier Name</th>
                <th className="px-4 py-2.5">Contact Person</th>
                <th className="px-4 py-2.5">License #</th>
                <th className="px-4 py-2.5 text-right">Total Batches</th>
                <th className="px-4 py-2.5 text-right">Medicines Supplied</th>
                <th className="px-4 py-2.5 text-right">Active Batches</th>
                <th className="px-4 py-2.5 text-right">Expired Batches</th>
                <th className="px-4 py-2.5 text-right">Total Supplied Valuation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    Loading supplier analytics...
                  </td>
                </tr>
              ) : (
                supplierData?.suppliers?.map((s: any) => (
                  <tr key={s.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 font-bold text-slate-900">{s.supplierName}</td>
                    <td className="px-4 py-2.5 text-slate-600">{s.contactPerson}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-500">{s.licenseNumber}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">{s.totalBatches}</td>
                    <td className="px-4 py-2.5 text-right">{s.totalMedicinesSupplied} SKUs</td>
                    <td className="px-4 py-2.5 text-right text-emerald-700 font-semibold">{s.activeBatches}</td>
                    <td className="px-4 py-2.5 text-right text-red-600 font-semibold">{s.expiredBatches}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900">${s.totalValuation.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. STOCK MOVEMENT TAB */}
      {activeTab === 'movement' && (
        <div className="space-y-4">
          {movementData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Transactions Logged</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{movementData.summary.totalTransactions}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Total Units Received</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">+{movementData.summary.totalStockInUnits}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">Total Units Dispensed</p>
                <p className="text-2xl font-black text-indigo-700 mt-1">-{movementData.summary.totalStockOutUnits}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <p className="text-xs font-bold uppercase tracking-wider text-red-600">Units Disposed</p>
                <p className="text-2xl font-black text-red-700 mt-1">-{movementData.summary.totalDisposedUnits}</p>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-2.5">Date &amp; Time</th>
                  <th className="px-4 py-2.5">Type</th>
                  <th className="px-4 py-2.5">Medicine</th>
                  <th className="px-4 py-2.5">Batch #</th>
                  <th className="px-4 py-2.5 text-right">Quantity</th>
                  <th className="px-4 py-2.5 text-right">Balance</th>
                  <th className="px-4 py-2.5">Performed By</th>
                  <th className="px-4 py-2.5">Reason / Protocol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      Loading stock ledger...
                    </td>
                  </tr>
                ) : (
                  movementData?.transactions?.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 text-slate-500">
                        {new Date(t.createdAt).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.transactionType === 'STOCK_IN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.transactionType === 'STOCK_OUT'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {t.transactionType}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-bold text-slate-900">{t.medicineName}</td>
                      <td className="px-4 py-2.5 font-mono text-slate-700">#{t.batchNumber}</td>
                      <td
                        className={`px-4 py-2.5 text-right font-bold ${
                          t.transactionType === 'STOCK_IN' ? 'text-emerald-600' : 'text-slate-800'
                        }`}
                      >
                        {t.transactionType === 'STOCK_IN' ? `+${t.quantity}` : `-${t.quantity}`}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{t.newQuantity} units</td>
                      <td className="px-4 py-2.5 text-slate-600">{t.performedByName}</td>
                      <td className="px-4 py-2.5 text-slate-500 truncate max-w-44">{t.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
