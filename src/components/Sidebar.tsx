import React from 'react';
import { LayoutDashboard, Package, RefreshCw, Monitor, Settings, HelpCircle, LogOut, Plus } from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Panel de Control', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventario', icon: Package },
    { id: 'orders', label: 'Historial de Ventas', icon: RefreshCw },
    { id: 'pos', label: 'Ventas (Caja)', icon: Monitor },
    { id: 'settings', label: 'Configuración', icon: Settings },
  ];

  return (
    <aside className="bg-surface-container-lowest h-screen w-60 fixed left-0 top-0 hidden md:flex flex-col border-r border-outline-variant shadow-sm z-40">
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-body-sm w-full text-left transition-all duration-200 ease-in-out group ${
                  isActive
                    ? 'text-primary font-bold border-r-4 border-secondary bg-surface-container-high'
                    : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
                }`}
              >
                <Icon size={20} className={!isActive ? 'group-hover:scale-110 transition-transform' : ''} />
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
