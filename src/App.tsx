import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './views/DashboardView';
import { InventoryView } from './views/InventoryView';
import { POSLoginView } from './views/POSLoginView';
import { POSView } from './views/POSView';
import { SettingsView } from './views/SettingsView';
import { OrdersView } from './views/OrdersView';
import { StoreView } from './views/StoreView';
import { ReportsView } from './views/ReportsView';
import { CustomersView } from './views/CustomersView';
import { ExpensesView } from './views/ExpensesView';
import { AccountsPayableView } from './views/AccountsPayableView';
import { CashRegisterView } from './views/CashRegisterView';
import { Scan, ShoppingBag, Menu, Wallet, Lock } from 'lucide-react';

import { DailyCashCutAlertBanner } from './components/DailyCashCutAlertBanner';

export default function App() {
  const sessionUser = JSON.parse(localStorage.getItem('raimen_pos_user') || '{}');
  const [currentView, setCurrentView] = useState(() => {
    if (window.location.hash === '#tienda') return 'store';
    if (!sessionUser || !sessionUser.id) return 'pos-login';
    const role = (sessionUser.role || 'admin').toLowerCase();
    return role === 'cashier' ? 'pos' : 'dashboard';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const userRole = (sessionUser.role || 'admin').toLowerCase();

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#tienda') {
        setCurrentView('store');
      } else if (currentView === 'store') {
        const user = JSON.parse(localStorage.getItem('raimen_pos_user') || '{}');
        const role = (user.role || 'admin').toLowerCase();
        setCurrentView(user.id ? (role === 'cashier' ? 'pos' : 'dashboard') : 'pos-login');
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    // Initial check
    handleHashChange();
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (currentView === 'store') {
    return <StoreView />;
  }

  if (currentView === 'pos-login') {
    return <POSLoginView onLogin={() => setCurrentView('pos')} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background font-sans text-on-surface">
      <Sidebar 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        mobileMenuOpen={isMobileMenuOpen}
        onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
      />
      
      <div className="flex-1 flex flex-col md:ml-60 h-screen overflow-hidden">
        <DailyCashCutAlertBanner onGoToCashRegister={() => setCurrentView('cash_register')} />
        
        {/* Render TopBar for all views when logged in */}
        <TopBar 
          currentView={currentView} 
          onViewChange={setCurrentView} 
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />
        
        {currentView === 'dashboard' && <DashboardView onViewChange={setCurrentView} />}
        {currentView === 'inventory' && <InventoryView />}
        {currentView === 'pos' && <POSView />}
        {currentView === 'settings' && <SettingsView />}
        {currentView === 'orders' && <OrdersView />}
        {currentView === 'reports' && <ReportsView />}
        {currentView === 'customers' && <CustomersView />}
        {currentView === 'expenses' && <ExpensesView />}
        {currentView === 'accounts_payable' && <AccountsPayableView />}
        {currentView === 'cash_register' && <CashRegisterView />}
        
        {/* Mobile bottom nav with direct access to Caja, Gastos, Corte, Ventas & Menú across all views */}
        {currentView !== 'pos-login' && (
          <nav className="md:hidden bg-surface-container-highest docked full-width bottom-0 fixed z-50 rounded-t-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] left-0 w-full flex justify-around items-center px-2 py-2">
            <button 
              onClick={() => setCurrentView('pos')} 
              className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all text-label-caps w-14 ${
                currentView === 'pos' ? 'bg-primary text-on-primary font-bold shadow' : 'bg-secondary-container text-on-secondary-container font-bold'
              }`}
            >
              <Scan className="mb-0.5" size={18} />
              <span className="text-[10px]">Caja</span>
            </button>

            <button 
              onClick={() => setCurrentView('expenses')} 
              className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-colors text-label-caps w-14 ${
                currentView === 'expenses' ? 'text-primary font-bold bg-white/60 shadow-sm' : 'text-on-surface-variant'
              }`}
            >
              <Wallet className="mb-0.5" size={18} />
              <span className="text-[10px]">Gastos</span>
            </button>

            <button 
              onClick={() => setCurrentView('cash_register')} 
              className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-colors text-label-caps w-14 ${
                currentView === 'cash_register' ? 'text-primary font-bold bg-white/60 shadow-sm' : 'text-on-surface-variant'
              }`}
            >
              <Lock className="mb-0.5" size={18} />
              <span className="text-[10px]">Corte</span>
            </button>
            
            <button 
              onClick={() => setCurrentView('orders')} 
              className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-colors text-label-caps w-14 ${
                currentView === 'orders' ? 'text-primary font-bold bg-white/60 shadow-sm' : 'text-on-surface-variant'
              }`}
            >
              <ShoppingBag className="mb-0.5" size={18} />
              <span className="text-[10px]">Ventas</span>
            </button>

            <button 
              onClick={() => setIsMobileMenuOpen(true)} 
              className="flex flex-col items-center justify-center p-1.5 rounded-xl transition-colors text-label-caps w-14 text-on-surface-variant hover:text-primary"
            >
              <Menu className="mb-0.5" size={18} />
              <span className="text-[10px]">Menú</span>
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
