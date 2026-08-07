import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingCart, ExternalLink, Box, Truck, User, Receipt, X, Loader2, RefreshCw } from 'lucide-react';
import { ExchangeModal } from '../components/ExchangeModal';

interface Sale {
  id: string;
  total: number;
  payment_method: string;
  created_at: string;
  branch_id: string;
  user_id: string;
}

export function OrdersView() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTicketId, setLoadingTicketId] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [isExchangeOpen, setIsExchangeOpen] = useState(false);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      const s = new Date(startDate);
      s.setHours(0,0,0,0);
      const e = new Date(endDate);
      e.setHours(23,59,59,999);

      const [salesRes, productsRes] = await Promise.all([
        supabase.from('sales').select('*')
          .gte('created_at', s.toISOString())
          .lte('created_at', e.toISOString())
          .order('created_at', { ascending: false }),
        supabase.from('products').select('*')
      ]);
      
      if (salesRes.error) throw salesRes.error;
      if (productsRes.error) throw productsRes.error;
      
      setSales(salesRes.data || []);
      setProducts(productsRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [startDate, endDate]);


  const handleViewTicket = async (sale: Sale) => {
    if (loadingTicketId) return;
    setLoadingTicketId(sale.id);
    try {
      const { data, error } = await supabase.from('sale_items').select('*').eq('sale_id', sale.id);
      if (error) throw error;
      
      const items = (data || []).map(item => {
        const product = products.find(p => p.id === item.product_id);
        return {
          id: item.id,
          product_id: item.product_id,
          name: product ? product.name : 'Producto Desconocido',
          qty: item.quantity,
          price: item.price_at_time
        };
      });

      const subtotal = sale.total / 1.16;
      const taxes = sale.total - subtotal;

      setCompletedSale({
        id: sale.id,
        items,
        total: sale.total,
        subtotal,
        taxes,
        payment_method: sale.payment_method,
        date: new Date(sale.created_at).toLocaleString('es-MX')
      });
    } catch (err) {
      console.error(err);
      alert('Error cargando los detalles de la venta');
    } finally {
      setLoadingTicketId(null);
    }
  };

  const exportToCSV = () => {
    if (sales.length === 0) return;
    const headers = ['ID Venta', 'Fecha', 'Tipo', 'Pago', 'Total'];
    const rows = sales.map(s => [
      s.id,
      new Date(s.created_at).toLocaleString('es-MX'),
      'Local',
      s.payment_method,
      s.total.toFixed(2)
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ventas_${startDate}_al_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-headline-lg text-on-surface">Historial de Ventas</h2>
            <p className="text-body-sm text-on-surface-variant mt-1">Registro de todas las transacciones locales y en línea</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-label-caps text-on-surface-variant">Desde</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-surface border border-outline-variant rounded-lg px-3 py-2 outline-none focus:border-primary text-body-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-caps text-on-surface-variant">Hasta</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-surface border border-outline-variant rounded-lg px-3 py-2 outline-none focus:border-primary text-body-sm"
                />
              </div>
            </div>
            <button onClick={exportToCSV} className="h-[42px] px-4 bg-primary text-on-primary rounded-lg text-title-md flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm">
              <ExternalLink size={18} /> Exportar CSV
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64 text-on-surface-variant">
            Cargando ventas...
          </div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                <thead className="bg-surface-container-low border-b border-outline-variant">
                  <tr>
                    <th className="p-4 text-label-caps text-on-surface-variant">ID Venta</th>
                    <th className="p-4 text-label-caps text-on-surface-variant">Fecha</th>
                    <th className="p-4 text-label-caps text-on-surface-variant">Tipo</th>
                    <th className="p-4 text-label-caps text-on-surface-variant">Pago</th>
                    <th className="p-4 text-label-caps text-on-surface-variant text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {sales.map((sale) => (
                    <tr onClick={() => handleViewTicket(sale)} key={sale.id} className={`hover:bg-surface-container-low transition-colors cursor-pointer group ${loadingTicketId === sale.id ? 'opacity-50' : ''}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-on-surface shrink-0">
                            {loadingTicketId === sale.id ? <Loader2 size={18} className="animate-spin" /> : <ShoppingCart size={18} />}
                          </div>
                          <span className="text-data-mono text-on-surface font-medium truncate max-w-[120px]">{sale.id}</span>
                        </div>
                      </td>
                      <td className="p-4 text-body-sm text-on-surface-variant">
                        {new Date(sale.created_at).toLocaleString('es-MX')}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-primary-fixed/20 text-primary text-[10px] uppercase font-bold rounded-full">
                          Local
                        </span>
                      </td>
                      <td className="p-4 text-body-sm text-on-surface-variant">
                        {sale.payment_method}
                      </td>
                      <td className="p-4 text-right text-data-mono font-bold text-primary">
                        ${sale.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {sales.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-on-surface-variant">
                        No hay ventas registradas aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Ticket Modal */}
      {completedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 bg-primary text-on-primary flex justify-between items-center shrink-0">
              <h3 className="font-bold flex items-center gap-2"><Receipt size={20}/> Ticket de Venta</h3>
              <button onClick={() => setCompletedSale(null)} className="hover:bg-primary-fixed hover:text-on-primary-fixed rounded-full p-1"><X size={20}/></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 font-mono text-sm bg-white text-black" id="printable-ticket">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold">RAIMEN STORE</h2>
                <p>Sucursal Principal</p>
                <p>Fecha: {completedSale.date}</p>
                <p>Ticket: {completedSale.id.substring(0,8).toUpperCase()}</p>
              </div>
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
              <div className="flex justify-between mb-1"><span>SUBTOTAL:</span><span>${completedSale.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between mb-1"><span>IVA (16% incl):</span><span>${completedSale.taxes.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-black/20"><span>TOTAL:</span><span>${completedSale.total.toFixed(2)}</span></div>
              <div className="text-center mt-6 text-xs text-black/60">
                <p>PAGO EN: {completedSale.payment_method.toUpperCase()}</p>
                <p className="mt-2">¡Gracias por su compra!</p>
              </div>
            </div>
            <div className="p-4 bg-surface-container-low border-t border-outline-variant flex flex-col gap-3 shrink-0">
              <div className="flex gap-3">
                <button onClick={() => setCompletedSale(null)} className="flex-1 py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-variant transition-colors font-medium">Cerrar</button>
                
                <button onClick={() => setIsExchangeOpen(true)} className="flex-1 py-2 rounded-lg bg-secondary text-on-secondary hover:bg-on-secondary-fixed-variant transition-colors font-medium flex justify-center items-center gap-2">
                  <RefreshCw size={18} /> Efectuar Cambio
                </button>

                <button onClick={() => {
                  const printContent = document.getElementById('printable-ticket');
                  const win = window.open('', '', 'width=300,height=600');
                  if(win && printContent) {
                    win.document.write('<html><head><title>Imprimir Ticket</title><style>body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; } table { width: 100%; border-collapse: collapse; } th { text-align: left; border-bottom: 1px dashed #000; } td { padding-top: 4px; } .text-right { text-align: right; } .text-center { text-align: center; } .font-bold { font-weight: bold; } .text-xl { font-size: 16px; } .text-lg { font-size: 14px; } .border-t { border-top: 1px dashed #000; } .border-b { border-bottom: 1px dashed #000; } .my-4 { margin: 10px 0; } .py-2 { padding: 5px 0; }</style></head><body>');
                    win.document.write(printContent.innerHTML);
                    win.document.write('</body></html>');
                    win.document.close();
                    win.focus();
                    setTimeout(() => { win.print(); win.close(); }, 250);
                  }
                }} className="flex-1 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors font-medium flex justify-center items-center gap-2">
                  <Receipt size={18} /> Imprimir
                </button>
              </div>
              <button onClick={() => {
                let text = "RAIMEN STORE\n";
                text += "Sucursal Principal\n";
                text += `Fecha: ${completedSale.date}\n`;
                text += `Ticket: ${completedSale.id.substring(0,8).toUpperCase()}\n`;
                text += "--------------------------------\n";
                text += "Cant | Descripcion | Importe\n";
                text += "--------------------------------\n";
                completedSale.items.forEach((item: any) => {
                  text += `${item.qty}x ${item.name}\n$${(item.price * item.qty).toFixed(2)}\n`;
                });
                text += "--------------------------------\n";
                text += `SUBTOTAL: $${completedSale.subtotal.toFixed(2)}\n`;
                text += `IVA (16%): $${completedSale.taxes.toFixed(2)}\n`;
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

      {/* Exchange Modal */}
      {isExchangeOpen && completedSale && (
        <ExchangeModal
          originalSale={completedSale}
          onClose={() => setIsExchangeOpen(false)}
          onSuccess={() => {
            setIsExchangeOpen(false);
            setCompletedSale(null);
            // fetch data again to refresh sales list? It will refresh next time component mounts or we can call fetchData again, but it's fine for now.
          }}
        />
      )}
    </main>
  );
}
