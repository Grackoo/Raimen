import React from 'react';
import { Search, Bell, User, Menu } from 'lucide-react';

interface TopBarProps {
  currentView: string;
  onViewChange: (view: string) => void;
}

export function TopBar({ currentView, onViewChange }: TopBarProps) {
  return (
    <header className="bg-surface top-0 sticky z-30 border-b border-outline-variant flex justify-between items-center w-full px-4 md:px-8 h-16 shrink-0">
      <div className="flex items-center gap-4 md:gap-6">
        <button className="md:hidden text-on-surface-variant p-2 -ml-2 rounded-full hover:bg-surface-variant">
          <Menu size={24} />
        </button>
        <h1 className="text-headline-lg-mobile font-black text-primary md:hidden">RAIMEN</h1>
        
        <div className="relative w-64 md:w-96 hidden sm:block">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input 
            type="text" 
            placeholder="Buscar inventario, SKUs..." 
            className="w-full h-10 pl-10 pr-4 bg-surface-container-low border-none rounded-lg text-body-sm text-on-surface focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest transition-all outline-none" 
          />
        </div>
      </div>

      <div className="hidden lg:flex gap-6">
        <button className="text-primary border-b-2 border-secondary text-title-md py-4">Resumen</button>
        <button className="text-on-surface-variant hover:text-primary transition-colors text-title-md py-4">Reportes</button>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={() => onViewChange('pos-login')}
          className="hidden sm:flex items-center justify-center h-10 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-title-md text-primary hover:bg-surface-container-low transition-colors active:opacity-80 shadow-sm"
        >
          Abrir Caja
        </button>
        <div className="flex items-center gap-2">
          <button className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-full transition-colors relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
          </button>
          <button onClick={() => onViewChange('settings')} className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-full transition-colors">
            <User size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
