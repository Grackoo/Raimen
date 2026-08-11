import React from 'react';
import { LayoutDashboard, Package, RefreshCw, Monitor, Settings, HelpCircle, LogOut, Plus, Users, Wallet, FileText, Lock, LineChart } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const sessionUser = JSON.parse(localStorage.getItem('raimen_pos_user') || '{}');
  const userRole = (sessionUser.role || 'admin').toLowerCase();

  const allNavItems = [
    { id: 'dashboard', label: 'Panel de Control', icon: LayoutDashboard },
    { id: 'pos', label: 'Ventas (Caja)', icon: Monitor },
    { id: 'orders', label: 'Historial de Ventas', icon: RefreshCw },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'customers', label: 'Clientes', icon: Users },
    { id: 'expenses', label: 'Control de Gastos', icon: Wallet },
    { id: 'accounts_payable', label: 'Cuentas por Pagar', icon: FileText },
    { id: 'cash_register', label: 'Corte de Caja', icon: Lock },
    { id: 'reports', label: 'Reportes Financieros', icon: LineChart },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  const navItems = userRole === 'cajero' 
    ? allNavItems.filter(item => ['pos', 'orders', 'inventory', 'customers', 'expenses', 'cash_register'].includes(item.id))
    : allNavItems;

  return (
    <aside className="bg-surface-container-low h-screen w-64 fixed left-0 top-0 hidden md:flex flex-col border-r border-outline-variant/30 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.1)] z-40">
      <div className="flex flex-col h-full py-6 px-4">
        {/* Header */}
        <div className="mb-8 px-2 flex items-center gap-3">
          {currentView === 'pos' ? (
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold">
              <Monitor size={20} />
            </div>
          ) : (
             <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center shrink-0">
               <span className="text-title-md font-bold text-on-primary-container">R</span>
             </div>
          )}
          <div>
            <h1 className="text-headline-lg font-bold text-primary leading-tight tracking-tight text-xl">RAIMEN</h1>
            <p className="text-label-caps text-on-surface-variant">Retail Management</p>
          </div>
        </div>
        
        {/* CTA */}
        <button 
          onClick={() => onViewChange('pos-login')}
          className="w-full bg-primary text-on-primary h-12 rounded-lg text-title-md flex items-center justify-center gap-2 mb-6 hover:opacity-90 transition-opacity"
        >
          <Plus size={20} />
          Nueva Venta
        </button>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-body-sm w-full text-left transition-all duration-300 ease-out group relative ${
                  isActive
                    ? 'text-primary font-bold bg-white shadow-sm ring-1 ring-outline-variant/30'
                    : 'text-on-surface-variant hover:text-primary hover:bg-white/50'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"></div>
                )}
                <Icon size={20} className={!isActive ? 'group-hover:scale-110 transition-transform duration-300' : ''} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="mt-auto flex flex-col gap-2 border-t border-outline-variant pt-4">
          <button className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-all duration-200 ease-in-out text-body-sm group w-full text-left">
            <HelpCircle size={20} className="group-hover:scale-110 transition-transform" />
            Soporte
          </button>
          <button onClick={() => {
            if(window.confirm('¿Seguro que deseas cerrar sesión?')) {
              onViewChange('pos-login');
            }
          }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-error hover:text-error hover:bg-error-container transition-all duration-200 ease-in-out text-body-sm group w-full text-left mt-2">
            <LogOut size={20} className="group-hover:scale-110 transition-transform" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </aside>
  );
}
