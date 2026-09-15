import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AuditLog } from '../types';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  Search,
  Filter,
  History,
  FileCode,
  CheckCircle2,
  X,
  User,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const { showToast } = useNotifications();
  const { isAdmin } = useAuth();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');

  // Inspection modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.getAuditLogs({
        action: actionFilter || undefined,
        limit: 100,
      });

      // Filter locally by search term and entity type
      let list = res.data;
      if (entityTypeFilter) {
        list = list.filter((l) => (l.entity || '').toUpperCase() === entityTypeFilter.toUpperCase());
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        list = list.filter(
          (l) =>
            l.userName.toLowerCase().includes(q) ||
            l.action.toLowerCase().includes(q) ||
            (l.entity || '').toLowerCase().includes(q) ||
            (l.newValue || '').toLowerCase().includes(q)
        );
      }

      setLogs(list);
      setTotalCount(res.pagination.total);
    } catch (err: any) {
      showToast(err.message || 'Failed to load audit logs.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(fetchLogs, 200);
    return () => clearTimeout(timer);
  }, [actionFilter, entityTypeFilter, search]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-700 mb-1">
            <ShieldAlert className="w-4 h-4" />
            Immutable Regulatory Audit Trail
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            Security &amp; Operational Audit Log
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Full tamper-evident historical recording of stock adjustments, logins, deletions, and clinical dispensing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200">
            {totalCount} Total Entries Logged
          </span>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            id="input-search-audit"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user, action, details..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            id="select-audit-action"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full md:w-44 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Actions</option>
            <option value="USER_LOGIN">USER_LOGIN</option>
            <option value="BATCH_STOCK_IN">BATCH_STOCK_IN</option>
            <option value="BATCH_STOCK_OUT">BATCH_STOCK_OUT</option>
            <option value="BATCH_DISPOSAL">BATCH_DISPOSAL</option>
            <option value="MEDICINE_CREATED">MEDICINE_CREATED</option>
            <option value="MEDICINE_UPDATED">MEDICINE_UPDATED</option>
            <option value="SETTINGS_UPDATED">SETTINGS_UPDATED</option>
          </select>

          <select
            id="select-audit-entity"
            value={entityTypeFilter}
            onChange={(e) => setEntityTypeFilter(e.target.value)}
            className="w-full md:w-36 px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Entities</option>
            <option value="AUTH">AUTH</option>
            <option value="MEDICINE">MEDICINE</option>
            <option value="BATCH">BATCH</option>
            <option value="STOCK_TRANSACTION">STOCK_TRANSACTION</option>
            <option value="SUPPLIER">SUPPLIER</option>
            <option value="SETTINGS">SETTINGS</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Actor / User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity Type</th>
                <th className="px-4 py-3">Summary Details</th>
                <th className="px-4 py-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    Retrieving tamper-evident audit ledger...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    No audit records matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{log.userName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">IP: {log.ipAddress || 'Internal/Secure'}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.action.includes('DISPOSAL')
                            ? 'bg-red-100 text-red-800'
                            : log.action.includes('STOCK_IN')
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.action.includes('STOCK_OUT')
                            ? 'bg-indigo-100 text-indigo-800'
                            : log.action.includes('LOGIN')
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-slate-100 text-slate-800'
                        }`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-semibold text-slate-600">
                      {log.entity || log.entityType || 'SYSTEM'}
                    </td>

                    <td className="px-4 py-3 text-slate-600 truncate max-w-md">
                      {log.newValue || log.oldValue || log.action}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        id={`btn-inspect-log-${log.id}`}
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                      >
                        View JSON
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail JSON Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2 text-slate-900">
                <FileCode className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm">Audit Record Detail: {selectedLog.action}</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-slate-400">Timestamp:</span>{' '}
                  <span className="font-medium text-slate-800">
                    {new Date(selectedLog.createdAt).toISOString()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Actor:</span>{' '}
                  <span className="font-bold text-slate-900">{selectedLog.userName}</span>
                </div>
                <div>
                  <span className="text-slate-400">Entity:</span>{' '}
                  <span className="font-mono text-slate-800">
                    {selectedLog.entity || selectedLog.entityType} ({selectedLog.entityId || 'N/A'})
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Client IP:</span>{' '}
                  <span className="font-mono text-slate-800">{selectedLog.ipAddress || '127.0.0.1'}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Captured Payload (JSON):
                </label>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl overflow-x-auto text-[11px] font-mono leading-relaxed">
                  {JSON.stringify(
                    {
                      id: selectedLog.id,
                      action: selectedLog.action,
                      entity: selectedLog.entity,
                      entityId: selectedLog.entityId,
                      actor: selectedLog.userName,
                      userId: selectedLog.userId,
                      oldValue: selectedLog.oldValue,
                      newValue: selectedLog.newValue,
                      timestamp: selectedLog.createdAt,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
