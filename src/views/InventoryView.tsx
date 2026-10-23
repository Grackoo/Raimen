import React, { useState, useEffect } from 'react';
import { Download, Plus, ChevronDown, Filter, AlertTriangle, Edit2, Trash2, Printer, QrCode, Receipt, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
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

function LabelCard({ product, id }: { product: Product | null; id?: string }) {
  return (
    <div 
      id={id} 
      className="shadow-md flex flex-col items-center justify-between" 
      style={{ 
        width: '260px', 
        minHeight: '280px', 
        backgroundColor: '#ffffff', 
        borderColor: '#76777d', 
        borderWidth: '1px', 
        borderStyle: 'solid',
        padding: '14px 14px 22px 14px',
        boxSizing: 'border-box'
      }}
    >
      <div className="text-center w-full" style={{ padding: '0 2px' }}>
        <h4 className="font-black tracking-wider leading-none mb-1.5" style={{ color: '#000000', fontSize: '15px' }}>
          RAIMEN
        </h4>
        <div className="w-full h-px mb-2" style={{ backgroundColor: '#000000', opacity: 0.25 }}></div>
        <div style={{ width: '100%' }}>
          <p 
            style={{ 
              color: '#000000', 
              fontSize: '13px', 
              fontWeight: 700, 
              lineHeight: '17px', 
              textAlign: 'center',
              wordBreak: 'break-word',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden', 
              margin: 0 
            }}
          >
            {product ? product.name : 'Selecciona un producto'}
          </p>
          <p 
            style={{ 
              color: 'rgba(0, 0, 0, 0.65)', 
              fontSize: '11px', 
              fontFamily: 'monospace', 
              fontWeight: 600,
              lineHeight: '14px', 
              textAlign: 'center', 
              margin: '3px 0 0 0' 
            }}
          >
            {product ? product.sku : '---'}
          </p>
        </div>
      </div>

      <div style={{ width: '88px', height: '88px', padding: '2px', backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '8px 0' }}>
        {product ? (
          <QRCode 
            value={product.sku} 
            size={84} 
            style={{ height: "auto", maxWidth: "100%", width: "100%" }} 
          />
        ) : (
          <QrCode className="w-full h-full" style={{ color: 'rgba(0, 0, 0, 0.2)' }} />
        )}
      </div>

      <div 
        className="font-black leading-none text-center" 
        style={{ 
          color: '#000000', 
          fontSize: '36px', 
          fontWeight: 900, 
          letterSpacing: '-0.03em',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          whiteSpace: 'nowrap',
          marginTop: '6px',
          marginBottom: '2px'
        }}
      >
        ${product ? product.price : '0.00'}
      </div>
    </div>
  );
}

export function InventoryView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);
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
        setSelectedProductIds(prev => prev.filter(id => id !== product.id));
        if (selectedProduct?.id === product.id) setSelectedProduct(null);
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

  const selectedProducts = products.filter(p => selectedProductIds.includes(p.id));
  const productsToPrint = selectedProducts.length > 0 
    ? selectedProducts 
    : (selectedProduct ? [selectedProduct] : []);

  const currentPreviewProduct = selectedProducts.length > 0
    ? (selectedProducts[previewIndex] || selectedProducts[0])
    : selectedProduct;

  useEffect(() => {
    if (previewIndex >= selectedProducts.length && selectedProducts.length > 0) {
      setPreviewIndex(0);
    }
  }, [selectedProducts.length, previewIndex]);

  const toggleSelectProduct = (product: Product) => {
    setSelectedProductIds(prev => {
      const exists = prev.includes(product.id);
      if (exists) {
        return prev.filter(id => id !== product.id);
      } else {
        return [...prev, product.id];
      }
    });
    setSelectedProduct(product);
  };

  const handleRowClick = (product: Product) => {
    setSelectedProduct(product);
    if (!selectedProductIds.includes(product.id)) {
      setSelectedProductIds([product.id]);
      setPreviewIndex(0);
    } else {
      const idx = selectedProducts.findIndex(p => p.id === product.id);
      if (idx !== -1) setPreviewIndex(idx);
    }
  };

  const generateAllLabelCanvases = async (): Promise<HTMLCanvasElement[]> => {
    const canvases: HTMLCanvasElement[] = [];
    for (const p of productsToPrint) {
      const el = document.getElementById(`batch-label-${p.id}`);
      if (el) {
        const canvas = await html2canvas(el, { scale: 3, backgroundColor: '#ffffff' });
        canvases.push(canvas);
      }
    }
    if (canvases.length === 0) {
      const el = document.getElementById('qr-preview-container');
      if (el) {
        const canvas = await html2canvas(el, { scale: 3, backgroundColor: '#ffffff' });
        canvases.push(canvas);
      }
    }
    return canvases;
  };

  const handlePrint = async () => {
    if (productsToPrint.length === 0) return;
    setIsPrinting(true);

    const win = window.open('', '', 'width=450,height=600');
    if (!win) {
      alert('Por favor habilite las ventanas emergentes de su navegador para imprimir las etiquetas.');
      setIsPrinting(false);
      return;
    }
    win.document.write('<html><head><title>Generando...</title></head><body style="font-family:sans-serif;text-align:center;padding:40px 20px;"><h3>Generando etiquetas (80mm)...</h3><p>Por favor espera un momento.</p></body></html>');

    try {
      const canvases = await generateAllLabelCanvases();
      const imagesHtml = canvases.map(c => `
        <div class="label-page">
          <img src="${c.toDataURL('image/png')}" />
        </div>
      `).join('');

      win.document.open();
      win.document.write(`<!DOCTYPE html><html><head><title>Imprimir Etiquetas (${productsToPrint.length})</title><style>
        @page { 
          size: 80mm auto; 
          margin: 0; 
        }
        @media print {
          html, body { 
            margin: 0; 
            padding: 0; 
            width: 80mm; 
            background: #ffffff; 
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .label-page { 
            width: 80mm; 
            margin: 0 auto; 
            padding: 2mm 0 6mm 0; 
            box-sizing: border-box; 
            page-break-after: always; 
            break-after: page; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
          }
          .label-page:last-child { 
            page-break-after: avoid; 
            break-after: avoid; 
          }
          img { 
            width: 100%; 
            max-width: 80mm; 
            height: auto; 
            object-fit: contain; 
            display: block; 
          }
        }
        @media screen {
          body { 
            margin: 0; 
            padding: 20px; 
            background: #e5e7eb; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            gap: 16px; 
            font-family: sans-serif;
          }
          .label-page { 
            width: 80mm; 
            background: #fff; 
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); 
            padding: 2mm 0 6mm 0; 
            box-sizing: border-box; 
          }
          img { width: 100%; height: auto; display: block; }
        }
      </style></head><body>${imagesHtml}</body></html>`);
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); win.close(); }, 350);
    } catch (err) {
      console.error('Error al imprimir etiquetas:', err);
      win.close();
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintRawBT = async () => {
    if (productsToPrint.length === 0) return;
    setIsPrinting(true);

    try {
      const canvases = await generateAllLabelCanvases();
      if (canvases.length === 0) return;

      let finalCanvas: HTMLCanvasElement;

      if (canvases.length === 1) {
        finalCanvas = canvases[0];
      } else {
        const w = canvases[0].width;
        const separatorHeight = 24;
        const totalHeight = canvases.reduce((acc, c) => acc + c.height + separatorHeight, 0);
        
        finalCanvas = document.createElement('canvas');
        finalCanvas.width = w;
        finalCanvas.height = totalHeight;
        const ctx = finalCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
          let currentY = 0;
          canvases.forEach((c, idx) => {
            ctx.drawImage(c, 0, currentY);
            currentY += c.height;
            if (idx < canvases.length - 1) {
              ctx.strokeStyle = '#cccccc';
              ctx.lineWidth = 2;
              ctx.setLineDash([8, 8]);
              ctx.beginPath();
              ctx.moveTo(16, currentY + separatorHeight / 2);
              ctx.lineTo(w - 16, currentY + separatorHeight / 2);
              ctx.stroke();
              currentY += separatorHeight;
            }
          });
        }
      }

      const imgData = finalCanvas.toDataURL('image/png');
      const base64Data = imgData.replace('data:image/png;base64,', '');
      const encoded = encodeURI(base64Data);
      window.location.href = `intent:${encoded}#Intent;scheme=rawbt:base64;package=ru.a402d.rawbtprinter;end;`;
    } catch (err) {
      console.error('Error al generar etiquetas para RawBT:', err);
      alert('Error al generar las etiquetas.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (productsToPrint.length === 0) return;
    setIsPrinting(true);
    try {
      const canvases = await generateAllLabelCanvases();
      if (canvases.length === 0) return;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [80, 88]
      });

      canvases.forEach((canvas, idx) => {
        if (idx > 0) pdf.addPage([80, 88], 'portrait');
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        pdf.addImage(imgData, 'JPEG', 0, 0, 80, 88);
      });

      const filename = productsToPrint.length === 1 
        ? `etiqueta-${productsToPrint[0].sku}.pdf` 
        : `etiquetas-${productsToPrint.length}-productos.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('Error generando PDF:', err);
      alert('Error generando el PDF');
    } finally {
      setIsPrinting(false);
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

  const allFilteredSelected = filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id));
  const someFilteredSelected = filteredProducts.some(p => selectedProductIds.includes(p.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredIds = new Set(filteredProducts.map(p => p.id));
      setSelectedProductIds(prev => prev.filter(id => !filteredIds.has(id)));
    } else {
      const newIds = new Set([...selectedProductIds, ...filteredProducts.map(p => p.id)]);
      setSelectedProductIds(Array.from(newIds));
      if (filteredProducts.length > 0) {
        setSelectedProduct(filteredProducts[0]);
        setPreviewIndex(0);
      }
    }
  };

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
      <div className="flex-1 flex flex-col xl:flex-row gap-6 items-start">
        
        {/* Table */}
        <div className="flex-1 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col min-h-[400px] xl:min-h-0 w-full">
          <div className="overflow-x-auto flex-1 custom-scrollbar">
            <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
              <thead className="bg-surface-container-low sticky top-0 z-10 border-b border-outline-variant">
                <tr>
                  <th className="p-4 w-12 text-center">
                    <input 
                      type="checkbox" 
                      checked={allFilteredSelected}
                      ref={el => {
                        if (el) el.indeterminate = !allFilteredSelected && someFilteredSelected;
                      }}
                      onChange={toggleSelectAll}
                      className="rounded border-outline-variant text-primary focus:ring-primary cursor-pointer w-4 h-4" 
                      title={allFilteredSelected ? 'Deseleccionar todos' : 'Seleccionar todos los visibles'}
                    />
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
                {filteredProducts.map((p, i) => {
                  const isSelected = selectedProductIds.includes(p.id) || selectedProduct?.id === p.id;
                  return (
                    <tr 
                      key={p.id || i} 
                      onClick={() => handleRowClick(p)} 
                      className={`hover:bg-surface-container-low transition-colors cursor-pointer group ${isSelected ? 'bg-primary-fixed/20' : ''}`}
                    >
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedProductIds.includes(p.id)} 
                          onChange={() => toggleSelectProduct(p)} 
                          className="rounded border-outline-variant text-primary focus:ring-primary cursor-pointer w-4 h-4" 
                        />
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
                      <td className="p-4 text-right text-data-mono text-on-surface font-semibold">${p.price}</td>
                      <td className="p-4 text-right text-data-mono text-on-surface-variant">${p.ml_price}</td>
                      <td className="p-4 text-center">
                        <div className={`inline-flex items-center w-8 h-4 rounded-full transition-colors ${p.active ? 'bg-secondary-fixed' : 'bg-surface-variant'}`}>
                          <span className={`w-3 h-3 rounded-full shadow-sm transition-transform ${p.active ? 'bg-secondary translate-x-[18px]' : 'bg-outline translate-x-[2px]'}`}></span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className={`flex justify-center gap-3 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'}`}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setProductToEdit(p); setShowAddModal(true); }}
                            className="text-on-surface-variant hover:text-primary transition-colors p-1"
                            title="Editar producto"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteProduct(p); }}
                            className="text-on-surface-variant hover:text-error transition-colors p-1"
                            title="Eliminar producto"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="bg-surface-container-lowest border-t border-outline-variant p-3 flex justify-between items-center flex-wrap gap-2">
            <span className="text-body-sm text-on-surface-variant">Mostrando {filteredProducts.length} productos</span>
            {selectedProductIds.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-body-sm font-semibold text-primary">
                  {selectedProductIds.length} producto{selectedProductIds.length > 1 ? 's' : ''} seleccionado{selectedProductIds.length > 1 ? 's' : ''}
                </span>
                <button 
                  type="button" 
                  onClick={() => { setSelectedProductIds([]); setPreviewIndex(0); }}
                  className="text-xs text-error hover:underline transition-colors cursor-pointer font-medium"
                >
                  Deseleccionar todos
                </button>
              </div>
            )}
          </div>
        </div>

        {/* QR Preview Sidebar */}
        <div className="w-full xl:w-80 shrink-0 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm flex flex-col overflow-hidden xl:sticky xl:top-4 self-start">
          <div className="p-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="text-title-md text-on-surface">Vista Previa de Etiqueta</h3>
              {productsToPrint.length > 1 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary text-on-primary">
                  {productsToPrint.length}
                </span>
              )}
            </div>
            <span className="text-label-caps font-bold text-on-surface-variant bg-surface-variant px-2.5 py-1 rounded">
              80 mm
            </span>
          </div>
          <div className="p-5 flex-1 flex flex-col items-center justify-center bg-surface relative">
            {productsToPrint.length > 1 && (
              <div className="flex items-center justify-between w-full max-w-[260px] mb-3 px-1">
                <span className="text-xs font-semibold text-on-surface-variant">
                  Etiqueta {previewIndex + 1} de {productsToPrint.length}
                </span>
                <div className="flex items-center gap-1">
                  <button 
                    type="button"
                    onClick={() => setPreviewIndex(prev => (prev > 0 ? prev - 1 : productsToPrint.length - 1))}
                    className="p-1 rounded-md hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
                    title="Etiqueta anterior"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button 
                    type="button"
                    onClick={() => setPreviewIndex(prev => (prev < productsToPrint.length - 1 ? prev + 1 : 0))}
                    className="p-1 rounded-md hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
                    title="Siguiente etiqueta"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

            <LabelCard product={currentPreviewProduct} id="qr-preview-container" />

            <p className="text-body-sm text-on-surface-variant text-center mt-4">
              {productsToPrint.length === 0 
                ? 'Selecciona uno o más productos para imprimir.'
                : productsToPrint.length === 1
                  ? 'Vista previa para 1 producto seleccionado.'
                  : `Vista previa (${previewIndex + 1}/${productsToPrint.length}) para ${productsToPrint.length} productos seleccionados.`}
            </p>
          </div>
          <div className="p-4 border-t border-outline-variant bg-surface-container-lowest flex flex-col gap-3">
            <button 
              onClick={handlePrint} 
              disabled={productsToPrint.length === 0 || isPrinting} 
              className="w-full bg-primary text-on-primary h-12 rounded-lg text-title-md flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isPrinting ? <Loader2 size={20} className="animate-spin" /> : <Printer size={20} />}
              {isPrinting ? 'Generando...' : `Imprimir ${productsToPrint.length > 1 ? `Etiquetas (${productsToPrint.length})` : 'Etiqueta'} (Web)`}
            </button>
            <button 
              onClick={handlePrintRawBT} 
              disabled={productsToPrint.length === 0 || isPrinting} 
              className="w-full bg-secondary text-on-secondary h-12 rounded-lg text-title-md flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isPrinting ? <Loader2 size={20} className="animate-spin" /> : <Receipt size={20} />}
              {isPrinting ? 'Preparando...' : `Imprimir Bluetooth ${productsToPrint.length > 1 ? `(${productsToPrint.length})` : ''} (Móvil)`}
            </button>
            <button 
              onClick={handleDownloadPDF} 
              disabled={productsToPrint.length === 0 || isPrinting} 
              className="w-full bg-surface-container-lowest border border-outline-variant text-primary h-12 rounded-lg text-title-md flex items-center justify-center gap-2 hover:bg-surface-container-low transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download size={20} />
              Descargar PDF {productsToPrint.length > 1 ? `(${productsToPrint.length})` : ''}
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Hidden batch container for off-screen label generation */}
      <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', pointerEvents: 'none', zIndex: -1 }}>
        {productsToPrint.map(p => (
          <LabelCard key={p.id} product={p} id={`batch-label-${p.id}`} />
        ))}
      </div>

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
