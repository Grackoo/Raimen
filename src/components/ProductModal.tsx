import React, { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProductModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function ProductModal({ onClose, onSuccess }: ProductModalProps) {
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
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error agregando el producto');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-outline-variant bg-surface-container-low">
          <h3 className="text-title-md text-on-surface font-bold">Agregar Producto Nuevo</h3>
          <button onClick={onClose} className="text-on-surface-variant hover:bg-surface-variant p-1 rounded-full transition-colors">
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
            <button type="button" onClick={onClose} className="px-4 py-2 text-on-surface-variant font-bold hover:bg-surface-variant rounded-lg transition-colors">Cancelar</button>
            <button type="submit" disabled={adding} className="px-4 py-2 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50">
              {adding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
