import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { DashboardSummary, DashboardCharts } from '../types';
import {
  Pill,
  Package,
  AlertTriangle,
  AlertOctagon,
  TrendingDown,
  XCircle,
  DollarSign,
  ArrowDownToLine,
  ArrowUpFromLine,
  Plus,
  RefreshCw,
  Clock,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';

interface DashboardProps {
  onNavigate: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [charts, setCharts] = useState<DashboardCharts | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sumRes, chartRes] = await Promise.all([
        api.getDashboardSummary(),
        api.getDashboardCharts(),
      ]);
      setSummary(sumRes);
      setCharts(chartRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px]">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600">Gathering real-time pharmacy inventory &amp; expiry metrics...</p>
      </div>
    );
  }

  if (error || !summary || !charts) {
    return (
      <div className="p-6">
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error || 'Unable to load dashboard.'}
        </div>
      </div>
    );
  }

  const { cards, urgentAlerts } = summary;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Welcome & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Pharmacy Control Center
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            FEFO-guided batch tracking, automated expiry monitoring, and stock surveillance.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            id="btn-dash-add-med"
            onClick={() => onNavigate('medicines')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Medicine
          </button>

          <button
            id="btn-dash-stock-in"
            onClick={() => onNavigate('stock-in')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
            Stock In
          </button>

          <button
            id="btn-dash-stock-out"
            onClick={() => onNavigate('stock-out')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <ArrowUpFromLine className="w-4 h-4 text-indigo-600" />
            Dispense (FEFO)
          </button>

          {cards.expired > 0 && (
            <button
              id="btn-dash-expired-manage"
              onClick={() => onNavigate('expired')}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer animate-pulse"
            >
              <AlertOctagon className="w-4 h-4 text-red-600" />
              Manage Expired ({cards.expired})
            </button>
          )}
        </div>
      </div>

      {/* Critical Expiry Alert Box (if any critical or expired items exist) */}
      {urgentAlerts.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-300/80 rounded-2xl p-4 md:p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" />
              <h2 className="text-sm md:text-base font-bold text-amber-900">
                Action Required: Urgent Expiry &amp; Stock Watchlist
              </h2>
            </div>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-200/80 text-amber-900 font-semibold">
              {urgentAlerts.length} Batches Flagged
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {urgentAlerts.slice(0, 6).map((alert) => (
              <div
                key={alert.id}
                className="bg-white p-3 rounded-xl border border-amber-200/60 shadow-xs flex items-start justify-between gap-2"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        alert.type === 'EXPIRED'
                          ? 'bg-red-100 text-red-700'
                          : alert.type === 'CRITICAL_EXPIRY'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {alert.type === 'EXPIRED' ? 'Expired' : alert.type === 'CRITICAL_EXPIRY' ? 'Expiring Soon' : 'Low Stock'}
                    </span>
                    <span className="text-xs font-semibold text-slate-800 truncate max-w-32">
                      Batch #{alert.batchNumber}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 mt-1 truncate">{alert.medicineName}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Exp: {alert.expiryDate} (
                    <span className={alert.daysRemaining < 0 ? 'text-red-600 font-semibold' : 'text-amber-600 font-semibold'}>
                      {alert.daysRemaining < 0 ? `${Math.abs(alert.daysRemaining)}d ago` : `${alert.daysRemaining}d left`}
                    </span>
                    ) • Qty: {alert.quantity}
                  </p>
                </div>

                <button
                  onClick={() => alert.type === 'EXPIRED' ? onNavigate('expired') : onNavigate('stock-out')}
                  className="shrink-0 text-xs px-2 py-1 font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                >
                  {alert.type === 'EXPIRED' ? 'Disposal' : 'Dispense'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6 Key KPI Metric Cards (Section 10) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        {/* Total Medicines */}
        <div
          onClick={() => onNavigate('medicines')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Medicines</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 group-hover:scale-105 transition-transform">
              <Pill className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{cards.totalMedicines}</div>
          <p className="text-[11px] text-slate-600 mt-1">Unique active SKUs</p>
        </div>

        {/* Total Stock Units */}
        <div
          onClick={() => onNavigate('inventory')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Stock</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{cards.totalStock.toLocaleString()}</div>
          <p className="text-[11px] text-slate-600 mt-1">Units on shelves</p>
        </div>

        {/* Expiring Soon */}
        <div
          onClick={() => onNavigate('inventory')}
          className="bg-white p-4 rounded-xl border border-amber-200 bg-amber-50/20 shadow-xs hover:border-amber-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Expiring Soon</span>
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-700">{cards.expiringSoon}</div>
          <p className="text-[11px] text-amber-800 mt-1">Within 90 days</p>
        </div>

        {/* Expired */}
        <div
          onClick={() => onNavigate('expired')}
          className="bg-white p-4 rounded-xl border border-red-200 bg-red-50/20 shadow-xs hover:border-red-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-red-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Expired</span>
            <div className="p-1.5 rounded-lg bg-red-100 text-red-700 group-hover:scale-105 transition-transform">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-700">{cards.expired}</div>
          <p className="text-[11px] text-red-800 mt-1">Awaiting quarantine</p>
        </div>

        {/* Low Stock */}
        <div
          onClick={() => onNavigate('inventory')}
          className="bg-white p-4 rounded-xl border border-orange-200 bg-orange-50/20 shadow-xs hover:border-orange-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-orange-600 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Low Stock</span>
            <div className="p-1.5 rounded-lg bg-orange-100 text-orange-700 group-hover:scale-105 transition-transform">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-orange-700">{cards.lowStock}</div>
          <p className="text-[11px] text-orange-800 mt-1">Below minimum level</p>
        </div>

        {/* Out of Stock */}
        <div
          onClick={() => onNavigate('inventory')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Out of Stock</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 group-hover:scale-105 transition-transform">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{cards.outOfStock}</div>
          <p className="text-[11px] text-slate-600 mt-1">Zero balance batches</p>
        </div>
      </div>

      {/* Financial Valuation Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Inventory Valuation (Cost Price)
            </p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">
              ${cards.totalInventoryCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-600">Calculated across active batches</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Estimated Total Retail Value
            </p>
            <p className="text-xl font-bold text-slate-900 mt-0.5">
              ${cards.totalRetailValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[11px] text-slate-600">Expected revenue at market prices</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
            <Sparkles className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts Grid (Section 11) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Expiry Status Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Expiry Status Distribution</h2>
              <p className="text-xs text-slate-500">Real-time breakdown of all monitored batches</p>
            </div>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.expiryStatusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {charts.expiryStatusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number, name: string) => [`${val} Batches`, name]}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Category Stock Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Inventory by Category</h2>
              <p className="text-xs text-slate-500">Physical stock distribution across therapeutic classes</p>
            </div>
            <Pill className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.categoryStock} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="category" angle={-25} textAnchor="end" tick={{ fontSize: 11, fill: '#64748b' }} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: number) => [`${val} Units`, 'Quantity']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="quantity" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Expiry Timeline Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Expiry Horizon Timeline</h2>
              <p className="text-xs text-slate-500">Batches grouped by remaining shelf life windows</p>
            </div>
            <AlertTriangle className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.expiryTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: number) => [`${val} Batches`, 'Count']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {charts.expiryTimeline.map((entry, index) => (
                    <Cell key={`cell-tl-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Monthly Stock Movement */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Stock In vs. Stock Out Trend</h2>
              <p className="text-xs text-slate-500">Historical velocity of incoming and dispensed units</p>
            </div>
            <ArrowDownToLine className="w-4 h-4 text-slate-400" />
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.monthlyMovement} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="stockIn" name="Stock In" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="stockOut" name="Stock Out" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
