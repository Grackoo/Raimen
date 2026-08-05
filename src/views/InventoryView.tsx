import React, { useState, useEffect } from 'react';
import { Download, Plus, ChevronDown, Filter, AlertTriangle, MoreVertical, Printer, QrCode } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  stock: number;
  price: number;
  ml_price: number;
  active: boolean;
  warning: boolean;
  image: string;
}

export function InventoryView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setProducts(data || []);
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchProducts();
  }, []);

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background flex flex-col gap-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-display-lg font-bold text-on-surface tracking-tight">Inventory Management</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Manage stock, prices, and generate QR labels.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-title-md text-primary hover:bg-surface-container-low transition-colors shadow-sm">
            <Download size={20} /> Export
          </button>
          <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-4 bg-primary text-on-primary rounded-lg text-title-md hover:opacity-90 transition-opacity shadow-sm">
            <Plus size={20} /> Add Product
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-2 flex flex-wrap gap-2 items-center shadow-sm">
        {['CATEGORY: All Apparel', 'SEASON: FW23', 'STOCK: Low Stock (<10)'].map((filter, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg border border-transparent hover:border-outline-variant cursor-pointer transition-colors">
            <span className="text-label-caps text-on-surface-variant">{filter.split(':')[0]}:</span>
            <span className="text-body-sm font-semibold text-on-surface">{filter.split(':')[1].trim()}</span>
            <ChevronDown size={16} className="text-on-surface-variant" />
          </div>
        ))}
        <div className="flex-1"></div>
        <div className="relative w-full sm:w-64 mt-2 sm:mt-0">
          <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input 
            type="text" 
            placeholder="Filter by SKU or Name..." 
            className="w-full h-9 pl-9 pr-3 bg-surface border border-outline-variant rounded-lg text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none"
          />
        </div>
      </div>

      {/* Main Layout Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[500px]">
          <div className="text-title-md text-on-surface-variant animate-pulse">Loading inventory...</div>
        </div>
      ) : (
      <div className="flex flex-col xl:flex-row gap-6 h-full min-h-[500px]">
        
        {/* Table */}
        <div className="flex-1 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
              <thead className="bg-surface-container-low sticky top-0 z-10 border-b border-outline-variant">
                <tr>
                  <th className="p-4 w-12 text-center">
                    <input type="checkbox" className="rounded border-outline-variant text-primary focus:ring-primary" />
                  </th>
                  <th className="p-4 text-label-caps text-on-surface-variant tracking-wider">Product</th>
                  <th className="p-4 text-label-caps text-on-surface-variant tracking-wider">SKU</th>
                  <th className="p-4 text-label-caps text-on-surface-variant tracking-wider text-right">Stock</th>
                  <th className="p-4 text-label-caps text-on-surface-variant tracking-wider text-right">Price (PVP)</th>
                  <th className="p-4 text-label-caps text-on-surface-variant tracking-wider text-right">ML Price</th>
                  <th className="p-4 text-label-caps text-on-surface-variant tracking-wider text-center">ML Sync</th>
                  <th className="p-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {products.map((p, i) => (
                  <tr key={i} className={`hover:bg-surface-container-low transition-colors cursor-pointer group ${i === 0 ? 'bg-primary-fixed/20' : ''}`}>
                    <td className="p-4 text-center">
                      <input type="checkbox" defaultChecked={i === 0} className="rounded border-outline-variant text-primary focus:ring-primary" />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded border border-outline-variant/50 overflow-hidden bg-surface-variant shrink-0">
                          <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
                        </div>
                        <div>
                          <div className="text-title-md text-on-surface">{p.name}</div>
                          <div className="text-body-sm text-on-surface-variant">{p.category}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-data-mono text-on-surface-variant">{p.sku}</td>
                    <td className="p-4 text-right">
                      <span className={`inline-flex items-center gap-1 text-data-mono font-bold ${p.warning ? 'text-error' : 'text-on-surface'}`}>
                        {p.warning && <AlertTriangle size={16} />}
                        {p.stock}
                      </span>
                    </td>
                    <td className="p-4 text-right text-data-mono text-on-surface">${p.price}</td>
                    <td className="p-4 text-right text-data-mono text-on-surface-variant">${p.ml_price}</td>
                    <td className="p-4 text-center">
                      <div className={`inline-flex items-center w-8 h-4 rounded-full transition-colors ${p.active ? 'bg-secondary-fixed' : 'bg-surface-variant'}`}>
                        <span className={`w-3 h-3 rounded-full shadow-sm transition-transform ${p.active ? 'bg-secondary translate-x-[18px]' : 'bg-outline translate-x-[2px]'}`}></span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button className="text-on-surface-variant hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                        <MoreVertical size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-surface-container-lowest border-t border-outline-variant p-3 flex justify-between items-center">
            <span className="text-body-sm text-on-surface-variant">Showing 1 to 3 of 42 entries</span>
          </div>
        </div>
      )}

      {/* QR Preview Sidebar */}
        <div className="w-full xl:w-80 shrink-0 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
            <h3 className="text-title-md text-on-surface">Label Preview</h3>
            <span className="text-label-caps text-on-surface-variant bg-surface-variant px-2 py-1 rounded">3x3 cm</span>
          </div>
          <div className="p-6 flex-1 flex flex-col items-center justify-center bg-surface relative">
            <div className="w-48 h-48 bg-white border border-outline shadow-md p-3 flex flex-col items-center justify-between">
              <div className="text-center w-full">
                <h4 className="text-title-md font-bold text-black tracking-tighter leading-none mb-1">RAIMEN</h4>
                <div className="w-full h-px bg-black opacity-20 mb-1"></div>
                <p className="text-[10px] text-black leading-tight truncate px-2">Alpha Puffer Jacket</p>
                <p className="text-data-mono text-[9px] text-black/60 truncate">JKT-ALP-BLK-M</p>
              </div>
              <div className="w-20 h-20 bg-white p-1">
                <QrCode className="w-full h-full text-black" />
              </div>
              <div className="text-data-mono text-title-md font-bold text-black leading-none mt-1">
                $129.99
              </div>
            </div>
            <p className="text-body-sm text-on-surface-variant text-center mt-6">
              Previewing label for 1 selected product.
            </p>
          </div>
          <div className="p-4 border-t border-outline-variant bg-surface-container-lowest flex flex-col gap-3">
            <button className="w-full bg-primary text-on-primary h-12 rounded-lg text-title-md flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-sm">
              <Printer size={20} />
              Print Label
            </button>
            <button className="w-full bg-surface-container-lowest border border-outline-variant text-primary h-12 rounded-lg text-title-md flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors">
              <Download size={20} />
              Download PDF
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
