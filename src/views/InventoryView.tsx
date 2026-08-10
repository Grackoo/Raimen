import React, { useState, useEffect } from 'react';
import { Download, Plus, ChevronDown, Filter, AlertTriangle, Edit2, Trash2, Printer, QrCode } from 'lucide-react';
import { supabase } from '../lib/supabase';
import QRCode from 'react-qr-code';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ProductModal } from '../components/ProductModal';

interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  stock: number;
  cost: number;
  price: number;
  ml_price: number;
  active: boolean;
  warning: boolean;
  image: string;
}

export function InventoryView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProducts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (selectedBranch !== 'all') {
        query = query.eq('branch_id', selectedBranch);
      }
      
      const [productsRes, branchesRes] = await Promise.all([
        query,
        supabase.from('branches').select('id, name')
      ]);
      
      if (productsRes.error) throw productsRes.error;
      setProducts(productsRes.data || []);
      
      if (branchesRes.data) {
        setBranches(branchesRes.data);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedBranch]);

  const handleDeleteProduct = async (product: Product) => {
    if (confirm(`¿Estás seguro de que deseas eliminar "${product.name}"?\nEl producto pasará a estar inactivo para no afectar el historial de ventas.`)) {
      try {
        const { error } = await supabase.from('products').update({ active: false }).eq('id', product.id);
        if (error) throw error;
        alert('Producto desactivado con éxito.');
        fetchProducts();
      } catch (err) {
        console.error(err);
        alert('Error al desactivar el producto.');
      }
    }
  };

  const exportToCSV = () => {
    if (products.length === 0) return;
    const headers = ['ID', 'Producto', 'SKU', 'Categoría', 'Stock', 'Costo', 'Precio', 'Precio ML', 'Activo'];
    const rows = filteredProducts.map(p => [
      p.id,
      `"${p.name}"`,
      p.sku,
      `"${p.category}"`,
      p.stock,
      p.cost,
      p.price,
      p.ml_price,
      p.active ? 'Si' : 'No'
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventario.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = async () => {
    if (!selectedProduct) return;
    const element = document.getElementById('qr-preview-container');
    if (!element) return;
    
    const win = window.open('', '', 'width=400,height=400');
    if (!win) {
      alert('Por favor habilite las ventanas emergentes de su navegador para imprimir la etiqueta.');
      return;
    }
    win.document.write('<html><head><title>Generando...</title></head><body>Cargando etiqueta...</body></html>');
    
    try {
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      
      win.document.open();
      win.document.write(`<html><head><title>Imprimir Etiqueta</title><style>
        @page { size: 30mm 30mm; margin: 0; }
        body { margin: 0; width: 30mm; height: 30mm; display: flex; justify-content: center; align-items: center; background-color: white; }
        img { width: 100%; height: 100%; object-fit: contain; }
      </style></head><body><img src="${imgData}" /></body></html>`);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); win.close(); }, 250);
    } catch (err) {
      console.error('Error al imprimir etiqueta:', err);
      win.close();
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedProduct) return;
    const element = document.getElementById('qr-preview-container');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [30, 30] // 30x30 mm
      });
      pdf.addImage(imgData, 'JPEG', 0, 0, 30, 30);
      pdf.save(`etiqueta-${selectedProduct.sku}.pdf`);
    } catch (err) {
      console.error('Error generando PDF:', err);
      alert('Error generando el PDF');
    }
  };

  const categories = Array.from(new Set(products.map(p => p.category || 'General')));

  const filteredProducts = products.filter(p => {
    const matchCat = categoryFilter === 'all' || p.category === categoryFilter;
    const matchSearch = !searchQuery || p.sku.toLowerCase().includes(searchQuery.toLowerCase()) || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    let matchStock = true;
    if (stockFilter === 'low') matchStock = p.stock > 0 && p.stock < 10;
    if (stockFilter === 'out') matchStock = p.stock <= 0;
    if (stockFilter === 'in') matchStock = p.stock >= 10;
    
    return matchCat && matchSearch && matchStock;
  });

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 bg-background flex flex-col gap-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-display-lg font-bold text-on-surface tracking-tight">Gestión de Inventario</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Administra existencias, precios y genera etiquetas QR.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button onClick={exportToCSV} className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-4 bg-surface-container-lowest border border-outline-variant rounded-lg text-title-md text-primary hover:bg-surface-container-low transition-colors shadow-sm">
            <Download size={20} /> Exportar CSV
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 h-10 px-4 bg-primary text-on-primary rounded-lg text-title-md hover:opacity-90 transition-opacity shadow-sm">
            <Plus size={20} /> Agregar Producto
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-2 flex flex-wrap gap-2 items-center shadow-sm">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg border border-transparent cursor-pointer transition-colors">
          <span className="text-label-caps text-on-surface-variant">SUCURSAL:</span>
          <select 
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="bg-transparent text-body-sm font-semibold text-on-surface outline-none cursor-pointer"
          >
            <option value="all">Todas</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg border border-transparent cursor-pointer transition-colors">
          <span className="text-label-caps text-on-surface-variant">CATEGORÍA:</span>
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-transparent text-body-sm font-semibold text-on-surface outline-none cursor-pointer"
          >
            <option value="all">Todas</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg border border-transparent cursor-pointer transition-colors">
          <span className="text-label-caps text-on-surface-variant">STOCK:</span>
          <select 
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="bg-transparent text-body-sm font-semibold text-on-surface outline-none cursor-pointer"
          >
            <option value="all">Todos</option>
            <option value="in">En Stock (&gt;=10)</option>
            <option value="low">Bajo (&lt;10)</option>
            <option value="out">Agotado (0)</option>
          </select>
        </div>
        <div className="flex-1"></div>
        <div className="relative w-full sm:w-64 mt-2 sm:mt-0">
          <Filter size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filtrar por SKU o Nombre..." 
            className="w-full h-9 pl-9 pr-3 bg-surface border border-outline-variant rounded-lg text-body-sm text-on-surface focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none"
          />
        </div>
      </div>

      {/* Main Layout Grid */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center min-h-[500px]">
          <div className="text-title-md text-on-surface-variant animate-pulse">Cargando inventario...</div>
        </div>
      ) : (
      <div className="flex-1 flex flex-col xl:flex-row gap-6">
        
        {/* Table */}
        <div className="flex-1 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col min-h-[400px] xl:min-h-0">
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
              <thead className="bg-surface-container-low sticky top-0 z-10 border-b border-outline-variant">
                <tr>
                  <th className="p-4 w-12 text-center">
                    <input type="checkbox" className="rounded border-outline-variant text-primary focus:ring-primary" />
                  </th>
                  <th className="p-4 text-label-caps text-on-surface-variant tracking-wider">Producto</th>
                  <th className="p-4 text-label-caps text-on-surface-variant tracking-wider">SKU</th>
                  <th className="p-4 text-label-caps text-on-surface-variant tracking-wider text-right">Stock</th>
                  <th className="p-4 text-label-caps text-on-surface-variant tracking-wider text-right">Costo</th>
                  <th className="p-4 text-label-caps text-on-surface-variant tracking-wider text-right">Precio (Local)</th>
                  <th className="p-4 text-label-caps text-on-surface-variant tracking-wider text-right">Precio ML</th>
                  <th className="p-4 text-label-caps text-on-surface-variant tracking-wider text-center">Activo</th>
                  <th className="p-4 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {filteredProducts.map((p, i) => (
                  <tr key={i} onClick={() => setSelectedProduct(p)} className={`hover:bg-surface-container-low transition-colors cursor-pointer group ${selectedProduct?.id === p.id ? 'bg-primary-fixed/20' : ''}`}>
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedProduct?.id === p.id} onChange={() => setSelectedProduct(p)} className="rounded border-outline-variant text-primary focus:ring-primary" />
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
                    <td className="p-4 text-right text-data-mono text-on-surface-variant">${p.cost || 0}</td>
                    <td className="p-4 text-right text-data-mono text-on-surface">${p.price}</td>
                    <td className="p-4 text-right text-data-mono text-on-surface-variant">${p.ml_price}</td>
                    <td className="p-4 text-center">
                      <div className={`inline-flex items-center w-8 h-4 rounded-full transition-colors ${p.active ? 'bg-secondary-fixed' : 'bg-surface-variant'}`}>
                        <span className={`w-3 h-3 rounded-full shadow-sm transition-transform ${p.active ? 'bg-secondary translate-x-[18px]' : 'bg-outline translate-x-[2px]'}`}></span>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setProductToEdit(p); setShowAddModal(true); }}
                          className="text-on-surface-variant hover:text-primary transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDeleteProduct(p); }}
                          className="text-on-surface-variant hover:text-error transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-surface-container-lowest border-t border-outline-variant p-3 flex justify-between items-center">
            <span className="text-body-sm text-on-surface-variant">Mostrando {filteredProducts.length} productos</span>
          </div>
        </div>

      {/* QR Preview Sidebar */}
        <div className="w-full xl:w-80 shrink-0 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
            <h3 className="text-title-md text-on-surface">Vista Previa de Etiqueta</h3>
            <span className="text-label-caps text-on-surface-variant bg-surface-variant px-2 py-1 rounded">3x3 cm</span>
          </div>
          <div className="p-6 flex-1 flex flex-col items-center justify-center bg-surface relative">
            <div id="qr-preview-container" className="w-48 h-48 shadow-md p-3 flex flex-col items-center justify-between" style={{ backgroundColor: '#ffffff', borderColor: '#76777d', borderWidth: '1px', borderStyle: 'solid' }}>
              <div className="text-center w-full" style={{ padding: '2px 0' }}>
                <h4 className="text-title-md font-bold tracking-tighter leading-none mb-1" style={{ color: '#000000' }}>RAIMEN</h4>
                <div className="w-full h-px mb-1" style={{ backgroundColor: '#000000', opacity: 0.2 }}></div>
                <div style={{ width: '100%', overflow: 'hidden' }}>
                  <p style={{ color: '#000000', fontSize: '10px', lineHeight: '14px', whiteSpace: 'nowrap', padding: '1px 0' }}>
                    {selectedProduct ? selectedProduct.name : 'Selecciona un producto'}
                  </p>
                  <p style={{ color: 'rgba(0, 0, 0, 0.6)', fontSize: '9px', fontFamily: 'monospace', lineHeight: '12px', whiteSpace: 'nowrap', padding: '1px 0' }}>
                    {selectedProduct ? selectedProduct.sku : '---'}
                  </p>
                </div>
              </div>
              <div className="w-20 h-20 p-1" style={{ backgroundColor: '#ffffff' }}>
                {selectedProduct ? (
                  <QRCode value={selectedProduct.sku} size={80} style={{ height: "auto", maxWidth: "100%", width: "100%" }} viewBox={`0 0 80 80`} />
                ) : (
                  <QrCode className="w-full h-full" style={{ color: 'rgba(0, 0, 0, 0.2)' }} />
                )}
              </div>
              <div className="text-data-mono text-title-md font-bold leading-none mt-1" style={{ color: '#000000' }}>
                ${selectedProduct ? selectedProduct.price : '0.00'}
              </div>
            </div>
            <p className="text-body-sm text-on-surface-variant text-center mt-6">
              Vista previa para {selectedProduct ? '1 producto seleccionado' : 'ningún producto seleccionado'}.
            </p>
          </div>
          <div className="p-4 border-t border-outline-variant bg-surface-container-lowest flex flex-col gap-3">
            <button onClick={handlePrint} disabled={!selectedProduct} className="w-full bg-primary text-on-primary h-12 rounded-lg text-title-md flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50">
              <Printer size={20} />
              Imprimir Etiqueta
            </button>
            <button onClick={handleDownloadPDF} disabled={!selectedProduct} className="w-full bg-surface-container-lowest border border-outline-variant text-primary h-12 rounded-lg text-title-md flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors disabled:opacity-50">
              <Download size={20} />
              Descargar PDF
            </button>
          </div>
        </div>
      </div>
      )}

      {showAddModal && (
        <ProductModal 
          productToEdit={productToEdit}
          onClose={() => {
            setShowAddModal(false);
            setProductToEdit(null);
          }} 
          onSuccess={() => fetchProducts()} 
        />
      )}
    </main>
  );
}
