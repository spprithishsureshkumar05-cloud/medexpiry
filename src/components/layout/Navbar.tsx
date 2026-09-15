import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import {
  Bell,
  CheckCheck,
  RotateCw,
  LogOut,
  ShieldCheck,
  UserCheck,
  Menu,
  X,
  AlertTriangle,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  onNavigate?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, onNavigate }) => {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead, runManualEvaluation, isLoading } =
    useNotifications();
  const [showNotifs, setShowNotifs] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close notifications dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAuditClick = async () => {
    setIsAuditing(true);
    try {
      await runManualEvaluation();
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 md:px-6 bg-white border-b border-slate-200/80 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          id="btn-sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-slate-800 font-semibold text-base tracking-tight">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold text-sm shadow-xs">
            Rx
          </span>
          <div>
            <span className="text-slate-900 font-bold">MedExpiry</span>
            <span className="text-xs text-slate-600 ml-1.5 font-normal">Pharmacy Inventory Engine</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Run Expiry Evaluation Button */}
        <button
          id="btn-run-audit"
          onClick={handleAuditClick}
          disabled={isAuditing || isLoading}
          title="Run automated FEFO & expiry date recalculation scan"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline">Run Expiry Audit</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            id="btn-notifications-bell"
            onClick={() => setShowNotifs(!showNotifs)}
            aria-label="View notifications"
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-800 text-sm">Notifications &amp; Alerts</span>
                  {unreadCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    id="btn-mark-all-read"
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-xs text-slate-600 hover:text-emerald-700 font-medium cursor-pointer"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-600 text-sm">
                    <Sparkles className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    All active batches are currently monitored. No alerts!
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        if (!notif.isRead) markAsRead(notif.id);
                        if (onNavigate && (notif.type === 'EXPIRED_ALERT' || notif.type === 'EXPIRY_ALERT')) {
                          onNavigate('expired');
                          setShowNotifs(false);
                        }
                      }}
                      className={`p-3.5 text-left transition-colors cursor-pointer ${
                        notif.isRead ? 'bg-white opacity-80 hover:bg-slate-50' : 'bg-emerald-50/40 hover:bg-emerald-50/70'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-0.5 shrink-0">
                          {notif.type === 'EXPIRED_ALERT' ? (
                            <AlertCircle className="w-4 h-4 text-red-600" />
                          ) : notif.type === 'EXPIRY_ALERT' ? (
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Clock className="w-4 h-4 text-cyan-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">{notif.title}</p>
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>
                          <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-600">
                            <span>{new Date(notif.createdAt).toLocaleDateString()}</span>
                            {!notif.isRead && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                  <button
                    onClick={() => {
                      if (onNavigate) onNavigate('inventory');
                      setShowNotifs(false);
                    }}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-medium"
                  >
                    View Batch Inventory →
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Info & Role Badge */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="hidden sm:block text-right leading-tight">
              <p className="text-xs font-semibold text-slate-900 truncate max-w-32">{user.name}</p>
              <div className="flex items-center justify-end gap-1 mt-0.5">
                {user.role === 'ADMIN' ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <UserCheck className="w-2.5 h-2.5" />
                    Staff
                  </span>
                )}
              </div>
            </div>

            <button
              id="btn-logout"
              onClick={logout}
              title="Sign Out"
              className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
