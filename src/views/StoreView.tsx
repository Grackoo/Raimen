import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingBag, Search, Filter, Loader2, ChevronRight, Menu, Bookmark, X, Receipt, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  price: number;
  image: string;
  stock: number;
}

interface LayawayLookupItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
}

interface LayawayLookupData {
  id: string;
  code: string;
  customer_name: string;
  customer_phone?: string;
  total: number;
  paid_amount: number;
  remaining_amount: number;
  expiration_date: string;
  created_at: string;
  status: string;
  items: LayawayLookupItem[];
}

export function StoreView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Apartado lookup state
  const [showLookupModal, setShowLookupModal] = useState(false);
  const [searchCode, setSearchCode] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [consultedLayaway, setConsultedLayaway] = useState<LayawayLookupData | null>(null);

  const lookupLayaway = async (codeToSearch: string) => {
    if (!codeToSearch.trim()) return;
    setLookingUp(true);
    setLookupError(null);
    setShowLookupModal(true);
    try {
      const { data, error } = await supabase
        .from('layaways')
        .select('*')
        .ilike('code', codeToSearch.trim())
        .single();

      if (error || !data) {
        setLookupError('No se encontró ningún apartado con ese código. Verifica el folio proporcionado.');
        setConsultedLayaway(null);
        return;
      }

      // Fetch items
      const { data: items } = await supabase
        .from('layaway_items')
        .select('*')
        .eq('layaway_id', data.id);

      const itemsWithNames: LayawayLookupItem[] = await Promise.all((items || []).map(async (it: any) => {
        if (it.product_id) {
          const { data: prod } = await supabase.from('products').select('name').eq('id', it.product_id).single();
          return {
            id: it.id,
            product_name: prod?.name || 'Producto',
            quantity: it.quantity,
            price: Number(it.price)
          };
        }
        return {
          id: it.id,
          product_name: 'Producto',
          quantity: it.quantity,
          price: Number(it.price)
        };
      }));

      setConsultedLayaway({
        id: data.id,
        code: data.code,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        total: Number(data.total),
        paid_amount: Number(data.paid_amount),
        remaining_amount: Number(data.remaining_amount),
        expiration_date: data.expiration_date,
        created_at: data.created_at,
        status: data.status,
        items: itemsWithNames
      });
    } catch (err) {
      console.error('Error looking up layaway:', err);
      setLookupError('Error al consultar el apartado. Intenta nuevamente.');
    } finally {
      setLookingUp(false);
    }
  };

  useEffect(() => {
    // Check if URL has code parameter in search or hash
    const searchParams = new URLSearchParams(window.location.search);
    const hashSplit = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
    const hashParams = new URLSearchParams(hashSplit);
    const codeParam = searchParams.get('codigo') || hashParams.get('codigo') || searchParams.get('code') || hashParams.get('code');
    if (codeParam) {
      setSearchCode(codeParam);
      lookupLayaway(codeParam);
    }
  }, []);

  useEffect(() => {
    async function fetchStoreData() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('active', true)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const productsData = data || [];
        setProducts(productsData);
        
        // Extract unique categories
        const cats = new Set(productsData.map(p => p.category).filter(Boolean));
        setCategories(['Todos', ...Array.from(cats)]);
      } catch (err) {
        console.error('Error fetching store products:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStoreData();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background font-sans text-on-surface flex flex-col">
      {/* Navbar */}
      <nav className="bg-surface/80 backdrop-blur-xl border-b border-outline-variant sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <img 
                src="/logo.png" 
                alt="RAIMEN Logo" 
                className="w-10 h-10 object-contain rounded-xl shadow-md bg-white p-1 border border-outline-variant"
              />
              <span className="text-title-lg font-bold tracking-tight">Raimen Store</span>
            </div>
            
            <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar artículos..." 
                className="w-full bg-surface-container-low border border-outline-variant rounded-full h-10 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all text-body-sm"
              />
            </div>
            
            <div className="flex items-center gap-2.5 sm:gap-3">
              <button 
                onClick={() => {
                  setLookupError(null);
                  setShowLookupModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-all border border-primary/20"
                title="Consultar Apartado por Código"
              >
                <Bookmark size={15} />
                <span className="hidden sm:inline">Consultar Apartado</span>
                <span className="sm:hidden">Apartado</span>
              </button>

              <button className="relative p-2 text-on-surface hover:bg-surface-variant rounded-full transition-colors">
                <ShoppingBag size={22} />
                <span className="absolute top-1 right-1 w-4 h-4 bg-error text-on-error rounded-full text-[10px] flex items-center justify-center font-bold">0</span>
              </button>
              <button className="md:hidden p-2 text-on-surface hover:bg-surface-variant rounded-full transition-colors">
                <Menu size={22} />
              </button>
            </div>
          </div>
          
          {/* Mobile search */}
          <div className="md:hidden py-3">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={18} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar artículos..." 
                className="w-full bg-surface-container-low border border-outline-variant rounded-full h-10 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary transition-all text-body-sm"
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-primary-container text-on-primary-container relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20 relative z-10">
          <h1 className="text-display-md md:text-display-lg font-bold max-w-2xl leading-tight">
            Descubre nuestra nueva colección de temporada
          </h1>
          <p className="text-body-lg mt-4 max-w-xl opacity-90">
            Explora las mejores pijamas, impermeables, botas para lluvia y más, todo en un solo lugar y al mejor precio.
          </p>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row gap-8">
        
        {/* Categories Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="sticky top-24 bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 shadow-sm">
            <h3 className="text-title-md font-bold mb-4 flex items-center gap-2">
              <Filter size={18} /> Categorías
            </h3>
            <div className="flex flex-col gap-1">
              {categories.map((cat) => (
                <button 
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
                    selectedCategory === cat 
                      ? 'bg-primary text-on-primary font-medium shadow-md' 
                      : 'text-on-surface hover:bg-surface-variant'
                  }`}
                >
                  <span className="text-body-sm truncate">{cat}</span>
                  {selectedCategory === cat && <ChevronRight size={16} />}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1 min-h-[400px]">
          {loading ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant">
              <Loader2 className="animate-spin mb-2" size={32} />
              <p>Cargando catálogo...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant bg-surface-container-lowest border border-outline-variant border-dashed rounded-2xl p-12">
              <ShoppingBag size={48} className="opacity-20 mb-4" />
              <h3 className="text-title-lg font-bold mb-1">No se encontraron productos</h3>
              <p className="text-body-md text-center">Intenta buscar con otros términos o selecciona otra categoría.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {filteredProducts.map(p => (
                <div key={p.id} className="group bg-surface-container-lowest rounded-2xl overflow-hidden border border-outline-variant hover:border-primary/50 hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer">
                  <div className="aspect-[4/5] bg-surface-variant relative overflow-hidden flex items-center justify-center">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <ShoppingBag size={40} className="text-outline" />
                    )}
                    {p.stock <= 0 && (
                      <div className="absolute top-2 left-2 bg-error text-on-error px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                        Agotado
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <p className="text-label-caps text-on-surface-variant mb-1 line-clamp-1">{p.category}</p>
                    <h3 className="text-title-md font-bold text-on-surface line-clamp-2 leading-tight mb-2">{p.name}</h3>
                    <div className="mt-auto flex items-center justify-between">
                      <span className="text-title-lg font-bold text-primary">${p.price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <footer className="bg-surface-container-low border-t border-outline-variant py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="RAIMEN" className="w-8 h-8 object-contain rounded-lg bg-white p-0.5 border border-outline-variant" />
            <span className="font-bold text-body-md text-on-surface">RAIMEN STORE</span>
          </div>
          <div className="text-center sm:text-right text-body-sm text-on-surface-variant">
            &copy; {new Date().getFullYear()} Raimen Store. Todos los derechos reservados.
          </div>
        </div>
      </footer>

      {/* Modal Consulta de Apartado */}
      {showLookupModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-primary text-on-primary flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Bookmark size={20} />
                <span className="font-bold text-title-md">Consulta tu Apartado</span>
              </div>
              <button 
                onClick={() => setShowLookupModal(false)}
                className="hover:bg-primary-fixed hover:text-on-primary-fixed rounded-full p-1 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="text-center">
                <img src="/logo.png" alt="RAIMEN" className="w-16 h-16 object-contain mx-auto mb-2 drop-shadow-sm" />
                <p className="text-body-sm text-on-surface-variant">
                  Ingresa tu código o folio de apartado para consultar tus abonos, saldo pendiente y fecha límite.
                </p>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  lookupLayaway(searchCode);
                }} 
                className="flex gap-2"
              >
                <input 
                  type="text" 
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  placeholder="Ej: AP-7842"
                  className="flex-1 uppercase bg-surface-container-low border border-outline-variant rounded-xl px-4 py-2.5 text-body-md font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-on-surface"
                />
                <button 
                  type="submit" 
                  disabled={lookingUp || !searchCode.trim()}
                  className="px-4 py-2.5 bg-primary text-on-primary rounded-xl font-bold text-body-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {lookingUp ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                  <span>Buscar</span>
                </button>
              </form>

              {lookupError && (
                <div className="p-3 bg-error-container text-on-error-container rounded-xl text-body-sm flex items-start gap-2 border border-error/20">
                  <AlertTriangle size={18} className="shrink-0 text-error mt-0.5" />
                  <span>{lookupError}</span>
                </div>
              )}

              {consultedLayaway && (
                <div className="bg-white text-black p-4 rounded-xl border border-gray-300 font-mono text-xs shadow-sm space-y-3">
                  <div className="text-center pb-3 border-b border-black/20 flex flex-col items-center">
                    <img src="/logo.png" alt="RAIMEN" className="w-14 h-14 object-contain mx-auto mb-1" />
                    <h3 className="font-bold text-base">RAIMEN STORE</h3>
                    <p className="font-bold text-xs text-gray-700">--- NOTA DE APARTADO ---</p>
                    <p className="font-bold text-sm text-primary mt-1">Folio: {consultedLayaway.code}</p>
                    <p className="text-[11px] text-gray-600">Fecha: {new Date(consultedLayaway.created_at).toLocaleString('es-MX')}</p>
                    <p className="text-[11px] font-bold text-red-600">Fecha Límite: {new Date(consultedLayaway.expiration_date).toLocaleDateString('es-MX')}</p>
                  </div>

                  <div className="text-xs pb-2 border-b border-black/20">
                    <p><span className="font-bold">Cliente:</span> {consultedLayaway.customer_name}</p>
                    {consultedLayaway.customer_phone && <p><span className="font-bold">Teléfono:</span> {consultedLayaway.customer_phone}</p>}
                  </div>

                  <div className="border-b border-black/20 pb-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-black/20 text-left">
                          <th className="pb-1">Cant</th>
                          <th className="pb-1">Producto</th>
                          <th className="text-right pb-1">Importe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consultedLayaway.items.map((it) => (
                          <tr key={it.id}>
                            <td className="py-1 align-top">{it.quantity}</td>
                            <td className="py-1 align-top">{it.product_name}</td>
                            <td className="py-1 text-right align-top">${(it.price * it.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-1 text-xs pb-3 border-b border-black/20">
                    <div className="flex justify-between font-bold text-sm">
                      <span>TOTAL DE LA COMPRA:</span>
                      <span>${consultedLayaway.total.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>MONTO A CUENTA (ABONADO):</span>
                      <span>${consultedLayaway.paid_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-extrabold text-base text-primary pt-1 border-t border-dashed border-black/30">
                      <span>RESTA PENDIENTE:</span>
                      <span>${consultedLayaway.remaining_amount.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className={`p-2.5 rounded-lg text-center font-bold text-xs flex items-center justify-center gap-1.5 ${
                    consultedLayaway.status === 'completed' || consultedLayaway.remaining_amount <= 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-900'
                  }`}>
                    {consultedLayaway.status === 'completed' || consultedLayaway.remaining_amount <= 0 ? (
                      <>
                        <CheckCircle2 size={16} /> ¡Apartado Liquidado!
                      </>
                    ) : (
                      <>
                        <Clock size={16} /> Apartado Activo (Pendiente de Liquidar)
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-surface-container-low border-t border-outline-variant flex justify-end">
              <button 
                onClick={() => setShowLookupModal(false)}
                className="px-4 py-2 bg-surface-container hover:bg-surface-variant rounded-xl text-body-sm font-semibold text-on-surface transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
