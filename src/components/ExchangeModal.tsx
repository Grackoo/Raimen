import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, Search, Plus, Minus, RefreshCw, Loader2, ArrowRight } from 'lucide-react';

interface ExchangeModalProps {
  originalSale: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExchangeModal({ originalSale, onClose, onSuccess }: ExchangeModalProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for returns
  const [returns, setReturns] = useState<any[]>(
    originalSale.items.map((item: any) => ({ ...item, returnQty: 0 }))
  );
  
  // State for new items
  const [newItems, setNewItems] = useState<any[]>([]);

  useEffect(() => {
    async function fetchProducts() {
      const { data } = await supabase.from('products').select('*').eq('active', true);
      if (data) setProducts(data);
    }
    fetchProducts();
  }, []);

  const handleReturnQtyChange = (id: string, delta: number) => {
    setReturns(returns.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, Math.min(item.qty, item.returnQty + delta));
        return { ...item, returnQty: newQty };
      }
      return item;
    }));
  };

  const addNewItem = (product: any) => {
    const existing = newItems.find(item => item.id === product.id);
    if (existing) {
      setNewItems(newItems.map(item => 
        item.id === product.id ? { ...item, qty: item.qty + 1 } : item
      ));
    } else {
      setNewItems([...newItems, { ...product, qty: 1 }]);
    }
  };

  const updateNewItemQty = (id: string, delta: number) => {
    setNewItems(newItems.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + delta);
        return { ...item, qty: newQty };
      }
      return item;
    }).filter(item => item.qty > 0));
  };

  const totalReturnValue = returns.reduce((acc, item) => acc + (item.price * item.returnQty), 0);
  const totalNewValue = newItems.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const netDifference = totalNewValue - totalReturnValue;

  const handleProcessExchange = async () => {
    if (totalReturnValue === 0 && newItems.length === 0) return;
    
    setLoading(true);
    try {
      // Create new sale
      let saleData;
      const { data, error: saleError } = await supabase
        .from('sales')
        .insert([{
          total: netDifference,
          payment_method: 'Efectivo', // Or could ask for it
          branch_id: 'default-branch',
          user_id: 'default-user',
          type: 'exchange',
          reference_id: originalSale.id
        }])
        .select()
        .single();

      if (saleError) {
        console.warn('Fallback to normal sale, DB might not be updated', saleError);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('sales')
          .insert([{
            total: netDifference,
            payment_method: 'Efectivo',
            branch_id: 'default-branch',
            user_id: 'default-user'
          }])
          .select()
          .single();
          
        if (fallbackError) throw fallbackError;
        saleData = fallbackData;
      } else {
        saleData = data;
      }

      // Prepare items for sale_items
      const itemsToInsert: any[] = [];
      
      // Negative qty for returns
      returns.forEach(item => {
        if (item.returnQty > 0) {
          itemsToInsert.push({
            sale_id: saleData!.id,
            product_id: item.product_id, // we mapped product_id earlier but in originalSale.items we only had id which was sale_item.id!
            // Wait, we need to ensure originalSale.items contains the actual product_id! We will update OrdersView to include product_id.
            quantity: -item.returnQty,
            price_at_time: item.price
          });
        }
      });
      
      // Positive qty for new items
      newItems.forEach(item => {
        itemsToInsert.push({
          sale_id: saleData!.id,
          product_id: item.id, // For newItems, product object is fetched directly, so id is product_id
          quantity: item.qty,
          price_at_time: item.price
        });
      });

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(itemsToInsert);
        
      if (itemsError) throw itemsError;

      alert('Cambio procesado con éxito');
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Error procesando el cambio.');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.includes(searchTerm));

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest w-full max-w-4xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-4 bg-primary text-on-primary flex justify-between items-center shrink-0">
          <h3 className="font-bold flex items-center gap-2"><RefreshCw size={20}/> Procesar Cambio / Devolución</h3>
          <button onClick={onClose} className="hover:bg-primary-fixed hover:text-on-primary-fixed rounded-full p-1"><X size={20}/></button>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Original Sale */}
          <div className="w-1/2 flex flex-col border-r border-outline-variant bg-surface-container-low">
            <div className="p-4 border-b border-outline-variant shrink-0 bg-surface-container">
              <h4 className="font-bold text-on-surface">Ticket Original: {originalSale.id.substring(0,8)}</h4>
              <p className="text-sm text-on-surface-variant">Selecciona los productos a devolver</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {returns.map(item => (
                <div key={item.id} className="bg-surface-container-lowest p-3 rounded-lg border border-outline-variant flex justify-between items-center">
                  <div>
                    <p className="font-bold text-on-surface text-sm">{item.name}</p>
                    <p className="text-xs text-on-surface-variant">Comprados: {item.qty} | Precio: ${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-data-mono font-bold text-error">-${(item.price * item.returnQty).toFixed(2)}</span>
                    <div className="flex items-center bg-surface-variant rounded-full overflow-hidden">
                      <button onClick={() => handleReturnQtyChange(item.id, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-surface-container-highest text-on-surface"><Minus size={14} /></button>
                      <span className="w-8 text-center text-body-sm font-bold flex items-center justify-center">{item.returnQty}</span>
                      <button onClick={() => handleReturnQtyChange(item.id, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-surface-container-highest text-on-surface"><Plus size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-outline-variant bg-surface-container-lowest flex justify-between items-center shrink-0">
              <span className="font-bold text-on-surface">Total a Devolver:</span>
              <span className="font-bold text-error text-title-md">-${totalReturnValue.toFixed(2)}</span>
            </div>
          </div>

          {/* Right: New Items */}
          <div className="w-1/2 flex flex-col bg-surface-container-lowest">
            <div className="p-4 border-b border-outline-variant shrink-0 bg-surface-container">
              <h4 className="font-bold text-on-surface mb-2">Nuevos Productos</h4>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar producto a llevar..."
                  className="w-full pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-lg text-sm outline-none focus:border-primary text-black"
                />
              </div>
            </div>
            
            {/* Search Results */}
            {searchTerm && (
              <div className="max-h-40 overflow-y-auto border-b border-outline-variant p-2 bg-surface-container">
                {filteredProducts.slice(0, 5).map(p => (
                  <div key={p.id} onClick={() => { addNewItem(p); setSearchTerm(''); }} className="p-2 hover:bg-surface-variant rounded cursor-pointer flex justify-between items-center text-sm text-black">
                    <span>{p.name}</span>
                    <span className="font-bold text-primary">${p.price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* New Cart */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {newItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-on-surface-variant opacity-50">
                  <Search size={48} className="mb-4" />
                  <p>Busca y añade los productos que</p>
                  <p>el cliente se llevará a cambio</p>
                </div>
              ) : newItems.map(item => (
                <div key={item.id} className="bg-surface-container-low p-3 rounded-lg border border-outline-variant flex justify-between items-center">
                  <div>
                    <p className="font-bold text-on-surface text-sm">{item.name}</p>
                    <p className="text-xs text-on-surface-variant">Precio: ${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-data-mono font-bold text-primary">${(item.price * item.qty).toFixed(2)}</span>
                    <div className="flex items-center bg-surface-variant rounded-full overflow-hidden">
                      <button onClick={() => updateNewItemQty(item.id, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-surface-container-highest text-on-surface"><Minus size={14} /></button>
                      <span className="w-8 text-center text-body-sm font-bold flex items-center justify-center">{item.qty}</span>
                      <button onClick={() => updateNewItemQty(item.id, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-surface-container-highest text-on-surface"><Plus size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-outline-variant bg-surface-container-lowest flex justify-between items-center shrink-0">
              <span className="font-bold text-on-surface">Total Nuevo:</span>
              <span className="font-bold text-primary text-title-md">${totalNewValue.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {/* Footer: Summary and Action */}
        <div className="p-4 bg-surface-container border-t border-outline-variant flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">A favor</span>
              <span className="text-error font-mono text-lg">-${totalReturnValue.toFixed(2)}</span>
            </div>
            <ArrowRight className="text-on-surface-variant" />
            <div className="flex flex-col">
              <span className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">Cargo nuevo</span>
              <span className="text-primary font-mono text-lg">${totalNewValue.toFixed(2)}</span>
            </div>
            <ArrowRight className="text-on-surface-variant" />
            <div className="flex flex-col">
              <span className="text-xs text-on-surface-variant uppercase font-bold tracking-wider">Diferencia Neta</span>
              <span className={`font-mono text-xl font-bold ${netDifference > 0 ? 'text-primary' : netDifference < 0 ? 'text-error' : 'text-on-surface'}`}>
                {netDifference > 0 ? '+' : ''}${netDifference.toFixed(2)}
              </span>
            </div>
          </div>
          
          <button 
            disabled={loading || (totalReturnValue === 0 && newItems.length === 0)}
            onClick={handleProcessExchange}
            className="bg-primary text-on-primary px-8 py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
            {loading ? 'Procesando...' : netDifference > 0 ? 'Cobrar Diferencia' : netDifference < 0 ? 'Devolver Diferencia' : 'Confirmar Cambio'}
          </button>
        </div>
      </div>
    </div>
  );
}
