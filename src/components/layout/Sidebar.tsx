import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  LayoutDashboard,
  Pill,
  Layers,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertOctagon,
  Truck,
  FileSpreadsheet,
  History,
  Settings,
  BookOpen,
  X,
  HeartHandshake,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, isOpen, onClose }) => {
  const { isAdmin, user } = useAuth();
  const { notifications } = useNotifications();

  const expiredCount = notifications.filter((n) => n.type === 'EXPIRED_ALERT').length;

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'medicines', label: 'Medicine Catalog', icon: Pill },
    { id: 'inventory', label: 'Batch Inventory', icon: Layers },
    { id: 'stock-in', label: 'Stock In (Receive)', icon: ArrowDownToLine },
    { id: 'stock-out', label: 'Stock Out (FEFO)', icon: ArrowUpFromLine },
    {
      id: 'expired',
      label: 'Expired Stock',
      icon: AlertOctagon,
      badge: expiredCount > 0 ? expiredCount : null,
      badgeColor: 'bg-red-500 text-white',
    },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'reports', label: 'Reports & Export', icon: FileSpreadsheet },
  ];

  const adminItems = [
    { id: 'audit', label: 'Audit Trail', icon: History },
    { id: 'settings', label: 'Settings & Users', icon: Settings },
  ];

  const infoItems = [
    { id: 'docs', label: 'Project Docs & Manual', icon: BookOpen },
  ];

  const handleItemClick = (id: string) => {
    onSelectTab(id);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500 text-white font-black text-base shadow-sm">
              Rx
            </div>
            <div>
              <div className="font-bold text-white text-sm tracking-tight flex items-center gap-1.5">
                MedExpiry
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                  v2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Inventory &amp; Expiry Engine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation sidebar"
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Operations
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {isAdmin && (
            <div>
              <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Administration
              </p>
              <nav className="space-y-1">
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`nav-${item.id}`}
                      onClick={() => handleItemClick(item.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          )}

          <div>
            <p className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Documentation
            </p>
            <nav className="space-y-1">
              {infoItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`nav-${item.id}`}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Safety Disclaimer footer as required by Section 48 */}
        <div className="p-3 mx-3 mb-3 bg-slate-800/80 border border-slate-700/60 rounded-xl text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200 mb-1">
            <HeartHandshake className="w-3.5 h-3.5 text-emerald-400" />
            Medical Safety Notice
          </div>
          <p className="leading-snug text-slate-400 text-[10px]">
            Inventory &amp; expiry tracking system only. Not for diagnostic or prescribing decisions.
          </p>
        </div>
      </aside>
    </>
  );
};
