import React, { useState } from 'react';
import { Plus, QrCode, DollarSign, Receipt, ShoppingBag, TrendingUp, TrendingDown, Box, Info, ShoppingCart, X, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function DashboardView() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [adding, setAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: '',
    stock: ''
  });

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const { error } = await supabase.from('products').insert([
        { 
          name: formData.name, 
          sku: formData.sku, 
          price: parseFloat(formData.price), 
          stock: parseInt(formData.stock), 
          active: true 
        }
      ]);
      if (error) throw error;
      alert('Producto agregado con éxito');
      setShowAddModal(false);
      setFormData({ name: '', sku: '', price: '', stock: '' });
    } catch (err) {
      console.error(err);
      alert('Error agregando el producto');
    } finally {
      setAdding(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background relative">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-headline-lg text-on-surface">Panel de Control</h2>
            <p className="text-body-sm text-on-surface-variant mt-1">Métricas de rendimiento en tiempo real</p>
          </div>
          <div className="hidden sm:flex gap-2">
            <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-surface-container-lowest border border-outline-variant text-on-surface rounded-lg text-title-md flex items-center gap-2 hover:bg-surface-variant transition-colors shadow-sm">
              <Plus size={18} /> Agregar Producto
            </button>
            <button onClick={() => alert('Próximamente: Impresión masiva de QRs')} className="px-4 py-2 bg-surface-container-lowest border border-outline-variant text-on-surface rounded-lg text-title-md flex items-center gap-2 hover:bg-surface-variant transition-colors shadow-sm">
              <QrCode size={18} /> Imprimir QR
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <p className="text-label-caps text-on-surface-variant">Ventas Totales</p>
              <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center">
                <DollarSign size={18} className="text-on-secondary-container" />
              </div>
            </div>
            <div>
              <h3 className="text-display-lg text-on-surface mb-1">$124,500</h3>
              <div className="flex items-center gap-1 text-secondary">
                <TrendingUp size={16} />
                <span className="text-body-sm font-medium">+12% vs mes anterior</span>
              </div>
            </div>
          </div>
          
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <p className="text-label-caps text-on-surface-variant">Pedidos (Local)</p>
              <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center">
                <Receipt size={18} className="text-on-secondary-container" />
              </div>
            </div>
            <div>
              <h3 className="text-display-lg text-on-surface mb-1">1,450</h3>
              <div className="flex items-center gap-1 text-secondary">
                <TrendingUp size={16} />
                <span className="text-body-sm font-medium">+5% vs mes anterior</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <p className="text-label-caps text-on-surface-variant">Ventas Web/ML</p>
              <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center">
                <ShoppingBag size={18} className="text-on-surface" />
              </div>
            </div>
            <div>
              <h3 className="text-display-lg text-on-surface mb-1">450</h3>
              <div className="flex items-center gap-1 text-error">
                <TrendingDown size={16} />
                <span className="text-body-sm font-medium">-2% vs mes anterior</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <p className="text-label-caps text-on-surface-variant">Stock Activo</p>
              <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center">
                <Box size={18} className="text-on-surface" />
              </div>
            </div>
            <div>
              <h3 className="text-display-lg text-on-surface mb-1 text-data-mono font-bold">3,200</h3>
              <div className="flex items-center gap-1 text-on-surface-variant">
                <Info size={16} />
                <span className="text-body-sm">Unidades en total</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts & Recent Tickets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-title-md text-on-surface">Comparativa Semanal de Ventas</h3>
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span className="text-label-caps text-on-surface-variant">Local</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-outline"></div>
                  <span className="text-label-caps text-on-surface-variant">Mercado Libre / Web</span>
                </div>
              </div>
            </div>
            {/* Chart Placeholder */}
            <div className="w-full h-64 bg-surface-container-low rounded-lg border border-outline-variant flex items-end p-4 gap-2 relative">
              {[ { l: '40%', m: '20%' }, { l: '60%', m: '30%' }, { l: '50%', m: '40%' }, { l: '80%', m: '50%' }, { l: '70%', m: '60%' } ].map((bar, i) => (
                <div key={i} className="flex-1 flex gap-1 items-end h-full">
                  <div className="w-1/2 bg-primary rounded-t-sm transition-all hover:opacity-80" style={{ height: bar.l }}></div>
                  <div className="w-1/2 bg-outline rounded-t-sm transition-all hover:opacity-80" style={{ height: bar.m }}></div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-title-md text-on-surface">Ventas Recientes</h3>
              <button className="text-label-caps text-primary hover:underline">Ver Todo</button>
            </div>
            <div className="flex-1 flex flex-col">
              {[
                { id: '#TK-8492', time: 'Hace 2 min', amount: '$124.50', icon: Receipt },
                { id: '#TK-8491', time: 'Hace 15 min', amount: '$45.00', icon: Receipt },
                { id: '#ML-1024', time: 'Hace 1 hora', amount: '$210.00', icon: ShoppingCart },
                { id: '#TK-8490', time: 'Hace 2 horas', amount: '$12.99', icon: Receipt },
                { id: '#TK-8489', time: 'Hace 3 horas', amount: '$89.50', icon: Receipt },
              ].map((ticket, i) => {
                const Icon = ticket.icon;
                return (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-surface-variant last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface">
                        <Icon size={20} />
                      </div>
                      <div>
                        <p className="text-data-mono text-on-surface">{ticket.id}</p>
                        <p className="text-body-sm text-on-surface-variant">{ticket.time}</p>
                      </div>
                    </div>
                    <span className="text-data-mono font-bold">{ticket.amount}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-outline-variant bg-surface-container-low">
              <h3 className="text-title-md text-on-surface font-bold">Agregar Producto Nuevo</h3>
              <button onClick={() => setShowAddModal(false)} className="text-on-surface-variant hover:bg-surface-variant p-1 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddProduct} className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-label-caps text-on-surface-variant mb-1 block">Nombre</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} type="text" className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm focus:ring-2 focus:ring-primary outline-none" placeholder="Ej. Zapatos Casuales" />
              </div>
              <div>
                <label className="text-label-caps text-on-surface-variant mb-1 block">SKU</label>
                <input required value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} type="text" className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm focus:ring-2 focus:ring-primary outline-none text-data-mono uppercase" placeholder="ZAP-CAS-001" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-1 block">Precio ($)</label>
                  <input required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} type="number" step="0.01" min="0" className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm focus:ring-2 focus:ring-primary outline-none text-data-mono" placeholder="0.00" />
                </div>
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-1 block">Stock Inicial</label>
                  <input required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} type="number" min="0" className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm focus:ring-2 focus:ring-primary outline-none text-data-mono" placeholder="0" />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-outline-variant">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-on-surface-variant font-bold hover:bg-surface-variant rounded-lg transition-colors">Cancelar</button>
                <button type="submit" disabled={adding} className="px-4 py-2 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50">
                  {adding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
