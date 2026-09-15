import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { SystemSettings, User as UserType } from '../types';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import {
  Sliders,
  Users,
  Shield,
  Save,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  BellRing,
  Sparkles,
  CheckCircle2,
  X,
  AlertTriangle,
  Mail,
  Lock,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { showToast, runManualEvaluation } = useNotifications();
  const { user: currentUser, isAdmin } = useAuth();

  const [settings, setSettings] = useState<SystemSettings>({
    warningPeriodDays: 90,
    criticalPeriodDays: 7,
    mediumPeriodDays: 30,
    autoRunJobHours: 4,
    pharmacyName: 'MedExpiry Central Pharmacy',
    pharmacyAddress: '100 Medical Center Drive, Suite 400',
    licenseNo: 'PH-REG-98241',
    expiryAlertDays: [90, 60, 30, 7],
    defaultLowStockThreshold: 20,
    enableEmailAlerts: false,
    fefoStrictEnforce: true,
    evaluationFrequencyHours: 4,
  });

  const [usersList, setUsersList] = useState<UserType[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'thresholds' | 'users'>('thresholds');
  const [isSaving, setIsSaving] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // User modal
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userFormData, setUserFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STAFF' as 'ADMIN' | 'STAFF',
  });

  const loadSettingsAndUsers = async () => {
    try {
      const sRes = await api.getSettings();
      setSettings(sRes.settings);
      if (isAdmin) {
        const uRes = await api.getUsers();
        setUsersList(uRes.users);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load configuration.', 'error');
    }
  };

  useEffect(() => {
    loadSettingsAndUsers();
  }, [isAdmin]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updatedRes = await api.updateSettings(settings);
      setSettings(updatedRes.settings);
      showToast('System configuration saved successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update settings.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualEvaluation = async () => {
    setIsEvaluating(true);
    try {
      await runManualEvaluation();
    } catch (err: any) {
      showToast(err.message || 'Manual evaluation failed.', 'error');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormData.name || !userFormData.email || !userFormData.password) {
      showToast('Name, email, and initial password are required.', 'warning');
      return;
    }

    try {
      await api.createUser(userFormData);
      showToast(`User account for ${userFormData.name} created.`, 'success');
      setIsUserModalOpen(false);
      setUserFormData({ name: '', email: '', password: '', role: 'STAFF' });
      const uRes = await api.getUsers();
      setUsersList(uRes.users);
    } catch (err: any) {
      showToast(err.message || 'Could not create user.', 'error');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (userId === currentUser?.id) {
      showToast('You cannot delete your own active administrator account.', 'error');
      return;
    }

    try {
      await api.deleteUser(userId);
      showToast('User account deleted.', 'info');
      const uRes = await api.getUsers();
      setUsersList(uRes.users);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete user.', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
            System Settings &amp; Configuration
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Configure expiry thresholds, FEFO dispatch rules, staff roles, and background evaluation engines.
          </p>
        </div>

        <button
          id="btn-trigger-eval"
          onClick={handleManualEvaluation}
          disabled={isEvaluating}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
          {isEvaluating ? 'Evaluating Inventory...' : 'Run Stock & Expiry Check Now'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveSubTab('thresholds')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeSubTab === 'thresholds'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          Alert Thresholds &amp; FEFO Rules
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveSubTab('users')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeSubTab === 'users'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            User &amp; Pharmacist Accounts ({usersList.length})
          </button>
        )}
      </div>

      {/* 1. THRESHOLDS & ENGINE SETTINGS */}
      {activeSubTab === 'thresholds' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Expiry Notification Windows (Days Before Expiry)
                </h3>
                <p className="text-slate-500 mb-3">
                  Batches with remaining days less than or equal to these numbers generate priority alerts.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[0, 1, 2, 3].map((index) => (
                    <div key={index}>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Tier {index + 1} Threshold (Days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={settings.expiryAlertDays[index] || 30}
                        onChange={(e) => {
                          const newDays = [...settings.expiryAlertDays];
                          newDays[index] = parseInt(e.target.value) || 1;
                          setSettings({ ...settings, expiryAlertDays: newDays });
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Default Low-Stock Threshold
                </h3>
                <p className="text-slate-500 mb-2">
                  Medicines with remaining total physical inventory below this default level trigger replenishment warnings.
                </p>
                <div className="max-w-xs">
                  <input
                    type="number"
                    min="1"
                    value={settings.defaultLowStockThreshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        defaultLowStockThreshold: parseInt(e.target.value) || 10,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  Clinical Dispensing &amp; FEFO Rules
                </h3>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.fefoStrictEnforce}
                    onChange={(e) => setSettings({ ...settings, fefoStrictEnforce: e.target.checked })}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500 rounded"
                  />
                  <div>
                    <span className="font-bold text-slate-900">
                      Enforce First-Expiry-First-Out (FEFO) Protocol
                    </span>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Automatically picks the batch with earliest expiry date and requires staff acknowledgement to bypass.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableEmailAlerts}
                    onChange={(e) => setSettings({ ...settings, enableEmailAlerts: e.target.checked })}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500 rounded"
                  />
                  <div>
                    <span className="font-bold text-slate-900">
                      Enable Critical Alert Notifications
                    </span>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Broadcasts instant high-priority alerts to logged-in pharmacists when batches reach ≤ 7 days to expiry.
                    </p>
                  </div>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <label className="block font-semibold text-slate-700 mb-1">
                  Automated Background Check Frequency (Hours)
                </label>
                <select
                  value={settings.evaluationFrequencyHours}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      evaluationFrequencyHours: parseInt(e.target.value) || 4,
                    })
                  }
                  className="w-48 px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value={1}>Every 1 hour</option>
                  <option value={2}>Every 2 hours</option>
                  <option value={4}>Every 4 hours (Default)</option>
                  <option value={12}>Every 12 hours</option>
                  <option value={24}>Every 24 hours</option>
                </select>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  id="btn-save-settings"
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-md border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-emerald-400 font-bold mb-2">
                <Shield className="w-4 h-4" />
                Compliance Safeguards
              </div>
              <p className="text-slate-300 leading-relaxed">
                The MedExpiry background daemon executes continuously on the server, guaranteeing that no expired medicine batch escapes audit detection or accidental clinical dispensing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. USER MANAGEMENT */}
      {activeSubTab === 'users' && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Authorized Personnel Accounts</h2>
              <p className="text-xs text-slate-500">Manage pharmacists, supervisors, and administrative access.</p>
            </div>

            <button
              id="btn-add-user"
              onClick={() => setIsUserModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add User Account
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">User Name</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">System Role</th>
                  <th className="px-4 py-3">Created Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{u.name}</div>
                      {u.id === currentUser?.id && (
                        <span className="text-[10px] text-emerald-600 font-semibold">(Current Active Session)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.id !== currentUser?.id && (
                        <button
                          id={`btn-delete-user-${u.id}`}
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h2 className="text-base font-bold text-slate-900">Add Pharmacy Staff Account</h2>
              <button onClick={() => setIsUserModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={userFormData.name}
                  onChange={(e) => setUserFormData({ ...userFormData, name: e.target.value })}
                  placeholder="e.g. Dr. Robert Vance"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  placeholder="pharmacist@hospital.org"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Access Role *</label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="STAFF">STAFF (Dispensing, Stock In, Inventory)</option>
                  <option value="ADMIN">ADMIN (Full Access, User Mgmt, Settings, Audit)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
