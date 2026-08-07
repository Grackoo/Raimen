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
import { Scan, Package, ShoppingBag, User } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const sessionUser = JSON.parse(localStorage.getItem('raimen_pos_user') || '{}');
  const userRole = sessionUser.role || 'admin';

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#tienda') {
        setCurrentView('store');
      } else if (currentView === 'store') {
        setCurrentView('pos-login');
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
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      
      <div className="flex-1 flex flex-col md:ml-60 h-screen overflow-hidden">
        {currentView !== 'pos' && (
          <TopBar currentView={currentView} onViewChange={setCurrentView} />
        )}
        
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
        
        {/* Mobile bottom nav for specific views if needed, though most views manage their own */}
        {currentView !== 'pos-login' && currentView !== 'pos' && (
          <nav className="md:hidden bg-surface-container-highest docked full-width bottom-0 fixed z-50 rounded-t-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] left-0 w-full flex justify-around items-center px-4 py-2">
            <button onClick={() => setCurrentView('pos')} className="flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-full p-2 transition-transform scale-95 active:scale-90 text-label-caps w-16">
              <Scan className="mb-1" size={20} />
              <span className="text-[10px]">Caja</span>
            </button>
            
            {userRole !== 'cajero' && (
              <button onClick={() => setCurrentView('inventory')} className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors text-label-caps w-16 ${currentView === 'inventory' ? 'text-primary' : 'text-on-surface-variant'}`}>
                <Package className="mb-1" size={20} />
                <span className="text-[10px]">Inv</span>
              </button>
            )}
            
            {userRole !== 'cajero' && (
              <button onClick={() => setCurrentView('orders')} className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors text-label-caps w-16 ${currentView === 'orders' ? 'text-primary' : 'text-on-surface-variant'}`}>
                <ShoppingBag className="mb-1" size={20} />
                <span className="text-[10px]">Ventas</span>
              </button>
            )}

            {userRole === 'cajero' && (
              <button onClick={() => setCurrentView('expenses')} className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors text-label-caps w-16 ${currentView === 'expenses' ? 'text-primary' : 'text-on-surface-variant'}`}>
                <ShoppingBag className="mb-1" size={20} />
                <span className="text-[10px]">Gastos</span>
              </button>
            )}
            
            {userRole !== 'cajero' && (
              <button onClick={() => setCurrentView('settings')} className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors text-label-caps w-16 ${currentView === 'settings' ? 'text-primary' : 'text-on-surface-variant'}`}>
                <User className="mb-1" size={20} />
                <span className="text-[10px]">Perfil</span>
              </button>
            )}
          </nav>
        )}
      </div>
    </div>
  );
}
