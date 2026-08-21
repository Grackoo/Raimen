import React, { useState, useEffect } from 'react';
import { Scan, Search, User, MoreVertical, Minus, Plus, Banknote, CreditCard, Landmark, Receipt, ShoppingBag, Loader2, Trash2, X, Calendar, Monitor, Tag, Percent } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Scanner } from '@yudiel/react-qr-scanner';
import { AdminOverrideModal } from '../components/AdminOverrideModal';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  image: string;
  stock: number;
  category: string;
}

interface Customer {
  id: string;
  name: string;
  rfc?: string;
  email?: string;
  phone?: string;
}

interface CartItem extends Product {
  qty: number;
}

export function POSView() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [searchSku, setSearchSku] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [processingSale, setProcessingSale] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [customDate, setCustomDate] = useState('');

  const [manualDiscountEnabled, setManualDiscountEnabled] = useState(false);
  const [manualDiscountType, setManualDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [manualDiscountValue, setManualDiscountValue] = useState<number>(10);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [showMobileCartModal, setShowMobileCartModal] = useState(false);

  const [adminAction, setAdminAction] = useState<{action: string, payload?: any} | null>(null);

  const [requiresOpening, setRequiresOpening] = useState(false);
  const [initialAmount, setInitialAmount] = useState('');
  const [openingRegister, setOpeningRegister] = useState(false);

  const [todaySalesTotal, setTodaySalesTotal] = useState(0);
  const [todaySalesCount, setTodaySalesCount] = useState(0);

  const sessionUser = JSON.parse(localStorage.getItem('raimen_pos_user') || '{}');

  const fetchTodaySales = async () => {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      let query = supabase
        .from('sales')
        .select('total')
        .gte('created_at', startOfDay.toISOString());

      if (sessionUser.branch_id) {
        query = query.eq('branch_id', sessionUser.branch_id);
      }

      const { data } = await query;
      if (data) {
        const sum = data.reduce((acc, s) => acc + (Number(s.total) || 0), 0);
        setTodaySalesTotal(sum);
        setTodaySalesCount(data.length);
      }
    } catch (err) {
      console.error('Error fetching today sales:', err);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const [prodRes, custRes, activeRegRes] = await Promise.all([
          supabase.from('products').select('*').eq('active', true).order('name'),
          supabase.from('customers').select('id, name, rfc, email, phone').order('name'),
          sessionUser.branch_id ? supabase.from('cash_registers').select('id').eq('branch_id', sessionUser.branch_id).eq('status', 'open').maybeSingle() : Promise.resolve({ data: null, error: null })
        ]);
        
        if (prodRes.error) throw prodRes.error;
        if (custRes.error) throw custRes.error;
        
        setProducts(prodRes.data || []);
        setCustomers(custRes.data || []);

        if (sessionUser.branch_id && !activeRegRes.data) {
          setRequiresOpening(true);
        }
        
        // Auto select Publico en general
        const publico = custRes.data?.find(c => c.name.toLowerCase().includes('público en general'));
        if (publico) setSelectedCustomerId(publico.id);
        else if (custRes.data && custRes.data.length > 0) setSelectedCustomerId(custRes.data[0].id);

      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    fetchTodaySales();

    const channel = supabase
      .channel('realtime_sales_pos')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales' }, () => {
        fetchTodaySales();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category || 'General')))];
  
  const filteredProducts = products.filter(p => {
    const matchCat = activeCategory === 'Todos' || p.category === activeCategory;
    const matchSearch = !searchSku || p.sku.toLowerCase().includes(searchSku.toLowerCase()) || p.name.toLowerCase().includes(searchSku.toLowerCase()) || p.price.toString().includes(searchSku.toLowerCase());
    return matchCat && matchSearch;
  });

  const updateQty = (id: string, delta: number) => {
    setCart(cart.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    const existing = cart.find(c => c.id === product.id);
    if (existing) {
      updateQty(product.id, 1);
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const requestRemoveFromCart = (id: string) => {
    executeRemoveFromCart(id);
  };

  const executeRemoveFromCart = (id: string) => {
    setCart(cart.filter(c => c.id !== id));
    setAdminAction(null);
  };

  const handleOpenRegister = async () => {
    if (!initialAmount || isNaN(parseFloat(initialAmount))) return;
    setOpeningRegister(true);
    try {
      const payload = {
        branch_id: sessionUser.branch_id,
        user_id: sessionUser.id,
        opening_amount: parseFloat(initialAmount),
        status: 'open'
      };
      
      const { error } = await supabase.from('cash_registers').insert([payload]);
      if (error) throw error;
      setRequiresOpening(false);
    } catch (err) {
      console.error('Error al abrir la caja:', err);
      alert('Hubo un error al intentar abrir la caja.');
    } finally {
      setOpeningRegister(false);
    }
  };

  const handleScan = (detectedCodes: any[]) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const sku = detectedCodes[0].rawValue;
      const product = products.find(p => p.sku === sku);
      if (product) {
        addToCart(product);
      }
    }
  };

  const sumProducts = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  const totalItems = cart.reduce((acc, item) => acc + item.qty, 0);
  
  // Auto discount: 3+ items and sum > 350 -> 5%
  const autoDiscountEligible = totalItems >= 3 && sumProducts > 350;
  const autoDiscountAmount = autoDiscountEligible ? sumProducts * 0.05 : 0;

  // Manual discount calculation
  let manualDiscountAmount = 0;
  if (manualDiscountEnabled) {
    if (manualDiscountType === 'percent') {
      manualDiscountAmount = sumProducts * (manualDiscountValue / 100);
    } else {
      manualDiscountAmount = Math.min(sumProducts, manualDiscountValue);
    }
  }

  const hasDiscount = manualDiscountEnabled ? manualDiscountAmount > 0 : autoDiscountEligible;
  const discountAmount = manualDiscountEnabled ? manualDiscountAmount : autoDiscountAmount;
  const discountLabel = manualDiscountEnabled 
    ? (manualDiscountType === 'percent' ? `Descuento Cliente (${manualDiscountValue}%)` : `Descuento Cliente ($${manualDiscountValue.toFixed(2)})`)
    : `Descuento (5%)`;

  const total = Math.max(0, sumProducts - discountAmount);
  const subtotal = total / 1.16;
  const taxes = total - subtotal;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setProcessingSale(true);
    
    try {
      // 1. Create Sale
      const salePayload: any = {
        total: total,
        payment_method: paymentMethod,
        cashier_id: sessionUser.id,
        branch_id: sessionUser.branch_id,
        customer_id: selectedCustomerId || null
      };

      if (customDate) {
        salePayload.created_at = new Date(customDate).toISOString();
      }

      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert(salePayload)
        .select()
        .single();
        
      if (saleError) throw saleError;
      
      // 2. Insert Sale Items
      const saleItems = cart.map(item => ({
        sale_id: saleData.id,
        product_id: item.id,
        quantity: item.qty,
        price_at_time: item.price
      }));
      
      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);
        
      if (itemsError) throw itemsError;
      
      // Prepare ticket data
      setCompletedSale({
        id: saleData.id,
        items: [...cart],
        sumProducts: sumProducts,
        discountAmount: discountAmount,
        hasDiscount: hasDiscount,
        discountLabel: discountLabel,
        isManualDiscount: manualDiscountEnabled,
        total: total,
        subtotal: subtotal,
        taxes: taxes,
        payment_method: paymentMethod,
        date: new Date().toLocaleString('es-MX'),
        customer: customers.find(c => c.id === selectedCustomerId)
      });

      setCart([]);
      setManualDiscountEnabled(false);
      setTodaySalesTotal(prev => prev + total);
      setTodaySalesCount(prev => prev + 1);
      
    } catch (err) {
      console.error('Error procesando venta:', err);
      alert('Error al procesar la venta');
    } finally {
      setProcessingSale(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col lg:flex-row lg:h-full overflow-y-auto lg:overflow-hidden bg-surface-container-low p-4 lg:p-6 pb-36 lg:pb-6 gap-6">
      
      {/* Left panel & Grid */}
      <div className="flex flex-col xl:flex-row gap-6 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
        
        {/* Scanner Panel & Today Sales Card */}
        <section className="w-full xl:w-1/3 flex flex-col gap-4 flex-shrink-0">
          {/* Card de Ventas del Día */}
          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-outline-variant flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center font-bold text-primary">
                <Receipt size={20} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase text-on-surface-variant tracking-wider">Ventas del Día en Caja</p>
                <p className="text-title-lg font-extrabold text-primary text-data-mono">${todaySalesTotal.toFixed(2)}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-secondary-container text-on-secondary-container border border-outline-variant">
                {todaySalesCount} {todaySalesCount === 1 ? 'venta' : 'ventas'}
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-4 shadow-sm border border-outline-variant flex-1 flex flex-col min-h-[300px]">
            <h2 className="text-title-md text-primary mb-4 flex items-center gap-2">
              <Scan size={24} />
              Escanear Producto
            </h2>
            <div className="flex-1 relative bg-surface-dim rounded-lg overflow-hidden border-2 border-dashed border-outline flex items-center justify-center min-h-[200px]">
              <Scanner 
                onScan={handleScan}
                allowMultiple={true}
                scanDelay={2000}
                styles={{ container: { width: '100%', height: '100%', position: 'absolute', inset: 0 } }}
              />
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-secondary-fixed shadow-[0_0_8px_rgba(111,251,190,0.8)] animate-pulse z-10 pointer-events-none"></div>
            </div>
            <div className="mt-4 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input 
                type="text" 
                value={searchSku}
                onChange={(e) => setSearchSku(e.target.value)}
                placeholder="Buscar por SKU, Nombre o Precio..." 
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary outline-none" 
              />
            </div>
          </div>
        </section>

        {/* Product Grid */}
        <section className="w-full xl:w-2/3 flex flex-col lg:h-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-title-md text-primary">Más Vendidos</h2>
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
              {categories.map(cat => (
                <button 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-label-caps whitespace-nowrap transition-colors border ${activeCategory === cat ? 'bg-primary text-on-primary border-primary' : 'bg-surface text-on-surface-variant border-outline-variant hover:bg-surface-container-high'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 pb-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 content-start">
            {loading ? (
              <div className="col-span-full flex justify-center items-center h-32 text-on-surface-variant">
                <Loader2 className="animate-spin mr-2" size={24} /> Cargando productos...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full flex justify-center items-center h-32 text-on-surface-variant">
                No hay productos en esta categoría o búsqueda.
              </div>
            ) : filteredProducts.map((p, i) => (
              <div key={p.id} onClick={() => addToCart(p)} className={`bg-white/70 backdrop-blur-md rounded-xl p-3 flex flex-col cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all border border-white/50 ${p.stock <= 0 ? 'opacity-60' : ''}`}>
                <div className="aspect-square bg-surface-variant rounded-lg mb-3 overflow-hidden relative flex items-center justify-center">
                  {p.stock <= 0 && <span className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center text-label-caps text-primary font-bold">SIN STOCK</span>}
                  {p.image ? (
                    <img src={p.image} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" alt={p.name} />
                  ) : (
                    <ShoppingBag size={36} className="text-primary opacity-50" />
                  )}
                  {p.stock > 0 && p.price && (
                     <div className="absolute top-2 right-2 bg-surface/90 rounded-full px-2 py-0.5 text-label-caps text-[10px] text-primary shadow-sm">${p.price}</div>
                  )}
                </div>
                <h3 className="text-body-sm font-semibold text-on-surface truncate">{p.name}</h3>
                <p className="text-label-caps text-on-surface-variant mt-1 text-[10px]">SKU: {p.sku}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Right Sidebar: Cart */}
      <section className="w-full lg:w-96 bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant flex flex-col lg:h-full min-h-[500px] flex-shrink-0 z-10">
        <div className="p-4 border-b border-outline-variant flex flex-col gap-3 bg-surface/50 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold">
                <User size={20} />
              </div>
              <div className="w-full">
                <select 
                  value={selectedCustomerId} 
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-transparent text-label-caps text-on-surface-variant font-bold outline-none cursor-pointer"
                >
                  <option value="">Seleccionar Cliente...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <button className="w-8 h-8 rounded-full hover:bg-surface-variant flex items-center justify-center text-on-surface-variant transition-colors shrink-0">
              <MoreVertical size={20} />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold shrink-0">
              <Calendar size={18} />
            </div>
            <div className="w-full flex flex-col">
              <label className="text-[10px] text-on-surface-variant font-semibold">Fecha (opcional)</label>
              <input
                type="datetime-local"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="w-full bg-transparent text-body-sm text-on-surface-variant font-medium outline-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {cart.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2 border-b border-outline-variant border-dashed last:border-0">
              <div className="w-12 h-12 bg-surface-variant rounded-md overflow-hidden flex-shrink-0">
                <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-body-sm font-semibold text-on-surface truncate">{item.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-data-mono text-on-surface-variant">${item.price.toFixed(2)}</span>
                  <span className="text-outline-variant text-[10px]">x{item.qty}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-data-mono font-bold text-primary">${(item.price * item.qty).toFixed(2)}</span>
                  <button onClick={() => requestRemoveFromCart(item.id)} className="text-error hover:bg-error-container p-1 rounded-md transition-colors"><Trash2 size={16} /></button>
                </div>
                <div className="flex items-center bg-surface-container rounded-full overflow-hidden border border-outline-variant">
                  <button onClick={() => updateQty(item.id, -1)} className="w-6 h-6 flex items-center justify-center hover:bg-surface-variant text-on-surface"><Minus size={14} /></button>
                  <span className="w-6 text-center text-body-sm text-[12px]">{item.qty}</span>
                  <button onClick={() => updateQty(item.id, 1)} className="w-6 h-6 flex items-center justify-center hover:bg-surface-variant text-on-surface"><Plus size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-surface rounded-b-xl border-t border-outline-variant">
          {/* Botón de Descuento */}
          <div className="mb-3">
            <button
              onClick={() => setShowDiscountModal(true)}
              className={`w-full py-2 px-3 rounded-lg border transition-all flex items-center justify-between text-body-sm font-semibold ${
                manualDiscountEnabled
                  ? 'bg-primary-fixed border-primary text-primary'
                  : hasDiscount
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-surface-container-high border-outline-variant hover:bg-surface-variant text-on-surface-variant'
              }`}
            >
              <div className="flex items-center gap-2">
                <Tag size={18} className={hasDiscount ? "text-primary" : "text-on-surface-variant"} />
                <span>
                  {manualDiscountEnabled
                    ? `Descuento Personalizado (${manualDiscountType === 'percent' ? `${manualDiscountValue}%` : `$${manualDiscountValue}`})`
                    : hasDiscount
                      ? 'Descuento Automático (5%)'
                      : 'Aplicar Descuento a Cliente'}
                </span>
              </div>
              <span className="text-xs bg-surface px-2 py-0.5 rounded border border-outline-variant font-bold">
                {hasDiscount ? 'Modificar' : '+ Descuento'}
              </span>
            </button>
          </div>

          <div className="flex flex-col gap-2 mb-4">
            {hasDiscount && (
              <div className="bg-primary/10 text-primary p-2 rounded-md text-center text-sm font-bold mb-2 animate-pulse border border-primary/20">
                ¡{manualDiscountEnabled ? 'Descuento Especial Aplicado' : 'El cliente obtuvo un descuento del 5%'}!
              </div>
            )}
            <div className="flex justify-between text-body-sm text-on-surface-variant">
              <span>Suma de productos</span>
              <span className="text-data-mono">${sumProducts.toFixed(2)}</span>
            </div>
            {hasDiscount && (
               <div className="flex justify-between text-body-sm text-primary font-bold">
                 <span>{discountLabel}</span>
                 <span className="text-data-mono">-${discountAmount.toFixed(2)}</span>
               </div>
            )}
            <div className="flex justify-between text-body-sm text-on-surface-variant">
              <span>Subtotal (sin IVA)</span>
              <span className="text-data-mono">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-body-sm text-on-surface-variant">
              <span>Impuestos (IVA 16%)</span>
              <span className="text-data-mono">${taxes.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-title-md mt-2 pt-2 border-t border-outline-variant">
              <span>Total</span>
              <span className="text-data-mono font-bold text-primary">${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <button onClick={() => setPaymentMethod('Efectivo')} className={`flex flex-col items-center justify-center py-3 rounded-lg border transition-all h-16 ${paymentMethod === 'Efectivo' ? 'border-primary bg-primary-fixed text-primary ring-2 ring-primary ring-opacity-20' : 'border-outline-variant bg-surface-container-lowest hover:bg-primary-fixed hover:border-primary hover:text-primary text-on-surface-variant'}`}>
              <Banknote size={20} className="mb-1" />
              <span className="text-label-caps text-[10px]">Efectivo</span>
            </button>
            <button onClick={() => setPaymentMethod('Tarjeta')} className={`flex flex-col items-center justify-center py-3 rounded-lg border transition-all h-16 ${paymentMethod === 'Tarjeta' ? 'border-primary bg-primary-fixed text-primary ring-2 ring-primary ring-opacity-20' : 'border-outline-variant bg-surface-container-lowest hover:bg-primary-fixed hover:border-primary hover:text-primary text-on-surface-variant'}`}>
              <CreditCard size={20} className="mb-1" />
              <span className="text-label-caps text-[10px]">Tarjeta</span>
            </button>
            <button onClick={() => setPaymentMethod('Transfer')} className={`flex flex-col items-center justify-center py-3 rounded-lg border transition-all h-16 ${paymentMethod === 'Transfer' ? 'border-primary bg-primary-fixed text-primary ring-2 ring-primary ring-opacity-20' : 'border-outline-variant bg-surface-container-lowest hover:bg-primary-fixed hover:border-primary hover:text-primary text-on-surface-variant'}`}>
              <Landmark size={20} className="mb-1" />
              <span className="text-label-caps text-[10px]">Transferencia</span>
            </button>
          </div>

          <button disabled={processingSale || cart.length === 0} onClick={handleCheckout} className="w-full bg-secondary text-on-secondary hover:bg-on-secondary-fixed-variant transition-colors rounded-xl py-4 text-title-md flex items-center justify-center gap-2 shadow-lg h-14 disabled:opacity-50 disabled:cursor-not-allowed">
            {processingSale ? <Loader2 className="animate-spin" size={20} /> : <Receipt size={20} />}
            {processingSale ? 'Procesando...' : 'Cobrar e Imprimir'}
          </button>
        </div>
      </section>

      {/* Ticket Modal */}
      {completedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-primary text-on-primary flex justify-between items-center shrink-0">
              <h3 className="font-bold flex items-center gap-2"><Receipt size={20}/> Ticket de Venta</h3>
              <button onClick={() => setCompletedSale(null)} className="hover:bg-primary-fixed hover:text-on-primary-fixed rounded-full p-1"><X size={20}/></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 font-mono text-sm bg-white text-black" id="printable-ticket">
              <div className="text-center mb-4 pb-4 border-b border-black/20">
                <h2 className="text-xl font-bold">RAIMEN STORE</h2>
                <p>Sucursal Principal</p>
                <p>Fecha: {completedSale.date}</p>
                <p>Ticket: {completedSale.id.substring(0,8).toUpperCase()}</p>
              </div>
              <div className="mb-4 pb-4 border-b border-black/20">
                <p><span className="font-bold">Cliente:</span> {completedSale.customer?.name || 'Público en General'}</p>
                {completedSale.customer?.rfc && completedSale.customer.rfc !== 'XAXX010101000' && (
                  <p>RFC: {completedSale.customer.rfc}</p>
                )}
                {completedSale.customer?.email && (
                  <p>Email: {completedSale.customer.email}</p>
                )}
                {completedSale.customer?.phone && (
                  <p>Tel: {completedSale.customer.phone}</p>
                )}
              </div>
              
              {completedSale.hasDiscount && (
                <div className="text-center mb-4 py-2 border-y-2 border-dashed border-black">
                  <p className="font-bold text-lg">🎉 ¡Descuento Aplicado! 🎉</p>
                  <p className="text-sm font-bold mt-1">{completedSale.discountLabel || 'Obtuviste un 5% de descuento'}</p>
                </div>
              )}

              <div className="border-t border-b border-black/20 py-2 mb-4">
                <table className="w-full">
                  <thead>
                    <tr className="text-left"><th className="pb-2">Cant</th><th className="pb-2">Descripción</th><th className="text-right pb-2">Importe</th></tr>
                  </thead>
                  <tbody>
                    {completedSale.items.map((item: any) => (
                      <tr key={item.id}>
                        <td className="align-top py-1 pr-2">{item.qty}</td>
                        <td className="align-top py-1">{item.name}</td>
                        <td className="align-top text-right py-1">${(item.price * item.qty).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {completedSale.hasDiscount && (
                <div className="flex justify-between text-sm mt-2">
                  <span>Subtotal:</span>
                  <span>${completedSale.sumProducts.toFixed(2)}</span>
                </div>
              )}
              {completedSale.hasDiscount && (
                <div className="flex justify-between text-sm">
                  <span>{completedSale.discountLabel || 'Descuento (5%)'}:</span>
                  <span>-${completedSale.discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-black/20"><span>TOTAL:</span><span>${completedSale.total.toFixed(2)}</span></div>
              <div className="text-center mt-6 text-xs text-black/60">
                <p>PAGO EN: {completedSale.payment_method.toUpperCase()}</p>
                <p className="mt-2">¡Gracias por su compra!</p>
              </div>
            </div>
            <div className="p-4 bg-surface-container-low border-t border-outline-variant flex flex-col gap-3 shrink-0">
              <div className="flex gap-3">
                <button onClick={() => setCompletedSale(null)} className="flex-1 py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-variant transition-colors font-medium">Nueva Venta</button>
                <button onClick={() => {
                  const printContent = document.getElementById('printable-ticket');
                  const win = window.open('', '', 'width=300,height=600');
                  if(win && printContent) {
                    win.document.write('<html><head><title>Imprimir Ticket</title><style>body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; } table { width: 100%; border-collapse: collapse; } th { text-align: left; border-bottom: 1px dashed #000; } td { padding-top: 4px; } .text-right { text-align: right; } .text-center { text-align: center; } .font-bold { font-weight: bold; } .text-xl { font-size: 16px; } .text-lg { font-size: 14px; } .border-t { border-top: 1px dashed #000; } .border-b { border-bottom: 1px dashed #000; } .border-y-2 { border-top: 2px dashed #000; border-bottom: 2px dashed #000; } .dashed { border-style: dashed; } .my-4 { margin: 10px 0; } .py-2 { padding: 5px 0; } .mt-1 { margin-top: 4px; } .mt-2 { margin-top: 8px; }</style></head><body>');
                    win.document.write(printContent.innerHTML);
                    win.document.write('</body></html>');
                    win.document.close();
                    win.focus();
                    setTimeout(() => { win.print(); win.close(); }, 250);
                  }
                }} className="flex-1 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors font-medium flex justify-center items-center gap-2">
                  <Receipt size={18} /> Imprimir (Web)
                </button>
              </div>
              <button onClick={() => {
                let text = "RAIMEN STORE\n";
                text += "Sucursal Principal\n";
                text += `Fecha: ${completedSale.date}\n`;
                text += `Ticket: ${completedSale.id.substring(0,8).toUpperCase()}\n`;
                text += "--------------------------------\n";
                text += `Cliente: ${completedSale.customer?.name || 'Publico en General'}\n`;
                text += "--------------------------------\n";
                
                if (completedSale.hasDiscount) {
                  text += "*** ¡Descuento Aplicado! ***\n";
                  text += `${completedSale.discountLabel || 'Obtuviste un 5% de descuento'}\n`;
                  text += "--------------------------------\n";
                }
                
                completedSale.items.forEach((item: any) => {
                  text += `${item.qty}x ${item.name}\n$${(item.price * item.qty).toFixed(2)}\n`;
                });
                text += "--------------------------------\n";
                
                if (completedSale.hasDiscount) {
                  text += `Subtotal: $${completedSale.sumProducts.toFixed(2)}\n`;
                  text += `${completedSale.discountLabel || 'Descuento (5%)'}: -$${completedSale.discountAmount.toFixed(2)}\n`;
                }

                text += `TOTAL: $${completedSale.total.toFixed(2)}\n`;
                text += "--------------------------------\n";
                text += `PAGO EN: ${completedSale.payment_method.toUpperCase()}\n`;
                text += "Gracias por su compra!\n\n\n";

                const encoded = encodeURI(text);
                window.location.href = `intent:${encoded}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
              }} className="w-full py-2 rounded-lg bg-secondary text-on-secondary hover:bg-on-secondary-fixed-variant transition-colors font-medium flex justify-center items-center gap-2">
                <Receipt size={18} /> Imprimir Bluetooth (Móvil)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Descuento Personalizado */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-md p-6 shadow-xl border border-outline-variant">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-title-md font-bold text-primary flex items-center gap-2">
                <Tag size={20} /> Opciones de Descuento
              </h3>
              <button onClick={() => setShowDiscountModal(false)} className="text-on-surface-variant hover:bg-surface-variant p-1 rounded-full">
                <X size={20} />
              </button>
            </div>

            <p className="text-body-sm text-on-surface-variant mb-4">
              Puedes elegir entre la regla de descuento automático (5% al llevar 3+ productos y mayor a $350) o establecer un descuento personalizado para este cliente.
            </p>

            {/* Selector de modo */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              <button
                onClick={() => setManualDiscountEnabled(false)}
                className={`py-3 px-2 rounded-lg border text-sm font-medium transition-all ${
                  !manualDiscountEnabled
                    ? 'border-primary bg-primary-fixed text-primary font-bold shadow-sm'
                    : 'border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-variant'
                }`}
              >
                Automático (5%)
              </button>
              <button
                onClick={() => setManualDiscountEnabled(true)}
                className={`py-3 px-2 rounded-lg border text-sm font-medium transition-all ${
                  manualDiscountEnabled
                    ? 'border-primary bg-primary-fixed text-primary font-bold shadow-sm'
                    : 'border-outline-variant bg-surface text-on-surface-variant hover:bg-surface-variant'
                }`}
              >
                Cliente Conocido / Manual
              </button>
            </div>

            {manualDiscountEnabled && (
              <div className="flex flex-col gap-4 mb-6 bg-surface-container-high p-4 rounded-xl border border-outline-variant">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-on-surface-variant uppercase">Tipo de Descuento</label>
                  <div className="flex bg-surface rounded-lg p-1 border border-outline-variant">
                    <button
                      onClick={() => setManualDiscountType('percent')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                        manualDiscountType === 'percent' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
                      }`}
                    >
                      Porcentaje (%)
                    </button>
                    <button
                      onClick={() => setManualDiscountType('fixed')}
                      className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${
                        manualDiscountType === 'fixed' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
                      }`}
                    >
                      Monto Fijo ($)
                    </button>
                  </div>
                </div>

                {manualDiscountType === 'percent' ? (
                  <div>
                    <label className="text-xs text-on-surface-variant mb-2 block font-medium">Accesos Rápidos (%)</label>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {[5, 10, 15, 20, 25, 30, 40, 50].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => setManualDiscountValue(pct)}
                          className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                            manualDiscountValue === pct
                              ? 'bg-primary text-on-primary border-primary'
                              : 'bg-surface border-outline-variant text-on-surface hover:bg-surface-variant'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                    <label className="text-xs text-on-surface-variant mb-1 block font-medium">Porcentaje Personalizado</label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={manualDiscountValue}
                        onChange={(e) => setManualDiscountValue(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                        className="w-full bg-surface border border-outline-variant rounded-lg h-10 pl-3 pr-8 text-on-surface font-bold text-data-mono outline-none focus:border-primary"
                      />
                      <span className="absolute right-3 font-bold text-on-surface-variant">%</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs text-on-surface-variant mb-1 block font-medium">Monto a Descontar ($)</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 font-bold text-on-surface-variant">$</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={manualDiscountValue}
                        onChange={(e) => setManualDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full bg-surface border border-outline-variant rounded-lg h-10 pl-8 pr-3 text-on-surface font-bold text-data-mono outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                )}

                <div className="bg-primary/10 border border-primary/20 rounded-lg p-2 text-center text-xs text-primary font-bold">
                  Descuento estimado: -${(manualDiscountType === 'percent' ? sumProducts * (manualDiscountValue / 100) : Math.min(sumProducts, manualDiscountValue)).toFixed(2)}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setManualDiscountEnabled(false);
                  setShowDiscountModal(false);
                }}
                className="flex-1 py-3 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-variant text-sm font-medium"
              >
                Restablecer (Auto)
              </button>
              <button
                onClick={() => setShowDiscountModal(false)}
                className="flex-1 py-3 rounded-lg bg-primary text-on-primary hover:bg-primary/90 text-sm font-medium shadow"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {adminAction && (
        <AdminOverrideModal 
          actionName={adminAction.action}
          onCancel={() => setAdminAction(null)}
          onSuccess={() => {
            if (adminAction.action === 'eliminar un producto del carrito') {
              executeRemoveFromCart(adminAction.payload);
            }
          }}
        />
      )}

      {requiresOpening && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-2xl w-full max-w-md p-6 shadow-xl border border-outline-variant">
            <h2 className="text-headline-lg-mobile text-on-surface mb-2">Apertura de Caja</h2>
            <p className="text-body-md text-on-surface-variant mb-6">Debes ingresar el monto inicial de la caja para comenzar a registrar ventas en este turno.</p>
            
            <div className="flex flex-col gap-2 mb-6">
              <label className="text-label-caps text-on-surface-variant">Monto Inicial (Efectivo)</label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-data-mono text-on-surface-variant">$</span>
                <input 
                  type="number" 
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(e.target.value)}
                  step="0.01"
                  placeholder="0.00"
                  className="w-full bg-surface border border-outline-variant rounded-lg h-14 pl-10 pr-4 text-on-surface focus:ring-primary focus:border-primary text-data-mono text-xl outline-none"
                />
              </div>
            </div>

            <button
              disabled={openingRegister || !initialAmount || isNaN(parseFloat(initialAmount))}
              onClick={handleOpenRegister}
              className="w-full bg-primary text-on-primary h-12 rounded-lg text-title-md flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
            >
              {openingRegister ? <Loader2 className="animate-spin" /> : <Monitor size={20} />}
              Abrir Caja
            </button>
          </div>
        </div>
      )}
      {/* Floating Mobile Cart Bar */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-40 bg-surface-container-lowest border-t-2 border-primary shadow-[0_-6px_20px_rgba(0,0,0,0.2)] p-3 px-4 flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => setShowMobileCartModal(true)}>
            <div className="relative bg-primary text-on-primary p-2.5 rounded-full shadow shrink-0">
              <ShoppingBag size={20} />
              <span className="absolute -top-1 -right-1 bg-secondary text-on-secondary text-[11px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border-2 border-surface">
                {totalItems}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Ticket ({totalItems} {totalItems === 1 ? 'ítem' : 'ítems'})</p>
              <p className="text-title-md font-extrabold text-primary text-data-mono">${total.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowMobileCartModal(true)}
              className="px-3 py-2.5 bg-surface-variant text-on-surface hover:bg-surface-container-highest font-bold rounded-lg text-xs transition-colors"
            >
              Ver Ticket
            </button>
            <button
              disabled={processingSale}
              onClick={() => setShowMobileCartModal(true)}
              className="px-4 py-2.5 bg-secondary text-on-secondary hover:bg-on-secondary-fixed-variant font-bold rounded-lg text-xs transition-colors shadow flex items-center gap-1.5"
            >
              {processingSale ? <Loader2 className="animate-spin" size={16} /> : <Receipt size={16} />}
              Cobrar (${total.toFixed(2)})
            </button>
          </div>
        </div>
      )}

      {/* Mobile Cart Drawer / Modal */}
      {showMobileCartModal && (
        <div className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex flex-col justify-end p-0">
          <div className="bg-surface-container-lowest w-full rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border-t border-outline-variant animate-in slide-in-from-bottom duration-300">
            <div className="p-4 bg-primary text-on-primary flex justify-between items-center shrink-0">
              <h3 className="font-bold text-title-md flex items-center gap-2">
                <ShoppingBag size={20} /> Resumen de Venta ({totalItems} {totalItems === 1 ? 'producto' : 'productos'})
              </h3>
              <button 
                onClick={() => setShowMobileCartModal(false)}
                className="hover:bg-primary-fixed hover:text-on-primary-fixed rounded-full p-1 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 border-b border-outline-variant bg-surface/50 flex flex-col gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary font-bold shrink-0">
                  <User size={18} />
                </div>
                <div className="w-full">
                  <select 
                    value={selectedCustomerId} 
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full bg-transparent text-label-caps text-on-surface-variant font-bold outline-none cursor-pointer"
                  >
                    <option value="">Seleccionar Cliente...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Cart items scrollable area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-[150px]">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2 border-b border-outline-variant border-dashed last:border-0">
                  <div className="w-12 h-12 bg-surface-variant rounded-md overflow-hidden flex-shrink-0">
                    <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-body-sm font-semibold text-on-surface truncate">{item.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-data-mono text-on-surface-variant">${item.price.toFixed(2)}</span>
                      <span className="text-outline-variant text-[10px]">x{item.qty}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-data-mono font-bold text-primary">${(item.price * item.qty).toFixed(2)}</span>
                      <button onClick={() => requestRemoveFromCart(item.id)} className="text-error hover:bg-error-container p-1 rounded-md transition-colors"><Trash2 size={16} /></button>
                    </div>
                    <div className="flex items-center bg-surface-container rounded-full overflow-hidden border border-outline-variant">
                      <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 flex items-center justify-center hover:bg-surface-variant text-on-surface"><Minus size={14} /></button>
                      <span className="w-7 text-center text-body-sm font-bold text-[12px]">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 flex items-center justify-center hover:bg-surface-variant text-on-surface"><Plus size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals and Checkout */}
            <div className="p-4 bg-surface border-t border-outline-variant shrink-0">
              <div className="mb-3">
                <button
                  onClick={() => setShowDiscountModal(true)}
                  className={`w-full py-2 px-3 rounded-lg border transition-all flex items-center justify-between text-xs font-semibold ${
                    manualDiscountEnabled
                      ? 'bg-primary-fixed border-primary text-primary'
                      : hasDiscount
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'bg-surface-container-high border-outline-variant hover:bg-surface-variant text-on-surface-variant'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Tag size={16} className={hasDiscount ? "text-primary" : "text-on-surface-variant"} />
                    <span>
                      {manualDiscountEnabled
                        ? `Descuento Personalizado (${manualDiscountType === 'percent' ? `${manualDiscountValue}%` : `$${manualDiscountValue}`})`
                        : hasDiscount
                          ? 'Descuento Automático (5%)'
                          : 'Aplicar Descuento'}
                    </span>
                  </div>
                  <span className="text-[10px] bg-surface px-2 py-0.5 rounded border border-outline-variant font-bold">
                    {hasDiscount ? 'Modificar' : '+ Descuento'}
                  </span>
                </button>
              </div>

              <div className="flex flex-col gap-1 mb-3">
                <div className="flex justify-between text-xs text-on-surface-variant">
                  <span>Suma de productos</span>
                  <span className="text-data-mono">${sumProducts.toFixed(2)}</span>
                </div>
                {hasDiscount && (
                   <div className="flex justify-between text-xs text-primary font-bold">
                     <span>{discountLabel}</span>
                     <span className="text-data-mono">-${discountAmount.toFixed(2)}</span>
                   </div>
                )}
                <div className="flex justify-between text-title-md mt-1 pt-1 border-t border-outline-variant font-bold">
                  <span>Total</span>
                  <span className="text-data-mono text-primary">${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                <button onClick={() => setPaymentMethod('Efectivo')} className={`flex flex-col items-center justify-center py-2 rounded-lg border transition-all h-14 ${paymentMethod === 'Efectivo' ? 'border-primary bg-primary-fixed text-primary ring-2 ring-primary ring-opacity-20' : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant'}`}>
                  <Banknote size={18} className="mb-0.5" />
                  <span className="text-label-caps text-[9px]">Efectivo</span>
                </button>
                <button onClick={() => setPaymentMethod('Tarjeta')} className={`flex flex-col items-center justify-center py-2 rounded-lg border transition-all h-14 ${paymentMethod === 'Tarjeta' ? 'border-primary bg-primary-fixed text-primary ring-2 ring-primary ring-opacity-20' : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant'}`}>
                  <CreditCard size={18} className="mb-0.5" />
                  <span className="text-label-caps text-[9px]">Tarjeta</span>
                </button>
                <button onClick={() => setPaymentMethod('Transfer')} className={`flex flex-col items-center justify-center py-2 rounded-lg border transition-all h-14 ${paymentMethod === 'Transfer' ? 'border-primary bg-primary-fixed text-primary ring-2 ring-primary ring-opacity-20' : 'border-outline-variant bg-surface-container-lowest text-on-surface-variant'}`}>
                  <Landmark size={18} className="mb-0.5" />
                  <span className="text-label-caps text-[9px]">Transferencia</span>
                </button>
              </div>

              <button 
                disabled={processingSale || cart.length === 0} 
                onClick={async () => {
                  await handleCheckout();
                  setShowMobileCartModal(false);
                }} 
                className="w-full bg-secondary text-on-secondary hover:bg-on-secondary-fixed-variant transition-colors rounded-xl py-3 text-title-md flex items-center justify-center gap-2 shadow-lg h-12 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
              >
                {processingSale ? <Loader2 className="animate-spin" size={18} /> : <Receipt size={18} />}
                {processingSale ? 'Procesando...' : `Cobrar ($${total.toFixed(2)})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
