import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingBag, Search, Filter, Loader2, ChevronRight, Menu } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  price: number;
  image: string;
  stock: number;
}

export function StoreView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState('');

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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-on-primary font-bold shadow-md">
                R
              </div>
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
            
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-on-surface hover:bg-surface-variant rounded-full transition-colors">
                <ShoppingBag size={24} />
                <span className="absolute top-1 right-1 w-4 h-4 bg-error text-on-error rounded-full text-[10px] flex items-center justify-center font-bold">0</span>
              </button>
              <button className="md:hidden p-2 text-on-surface hover:bg-surface-variant rounded-full transition-colors">
                <Menu size={24} />
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-body-sm text-on-surface-variant">
          &copy; {new Date().getFullYear()} Raimen Store. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
