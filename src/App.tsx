import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ToastContainer } from './components/ui/ToastContainer';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';

// Pages
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Medicines } from './pages/Medicines';
import { Inventory } from './pages/Inventory';
import { StockIn } from './pages/StockIn';
import { StockOut } from './pages/StockOut';
import { ExpiredMedicines } from './pages/ExpiredMedicines';
import { Suppliers } from './pages/Suppliers';
import { Reports } from './pages/Reports';
import { AuditLogs } from './pages/AuditLogs';
import { Settings } from './pages/Settings';
import { Docs } from './pages/Docs';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            Initializing MedExpiry Engine...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderActivePage = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'medicines':
        return <Medicines onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'inventory':
        return <Inventory onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'stock-in':
        return <StockIn onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'stock-out':
        return <StockOut onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'expired':
        return <ExpiredMedicines />;
      case 'suppliers':
        return <Suppliers />;
      case 'reports':
        return <Reports />;
      case 'audit':
        return <AuditLogs />;
      case 'settings':
        return <Settings />;
      case 'docs':
        return <Docs />;
      default:
        return <Dashboard onNavigate={(tab) => setCurrentTab(tab)} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex">
      {/* Navigation Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
          onNavigate={(tab) => setCurrentTab(tab)}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
        <ToastContainer />
      </NotificationProvider>
    </AuthProvider>
  );
}
