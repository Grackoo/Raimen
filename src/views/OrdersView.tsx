import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingCart, ExternalLink, Box, Truck, User, Receipt, X, Loader2, RefreshCw, Trash2, Edit3, DollarSign, Calendar, Clock } from 'lucide-react';
import { ExchangeModal } from '../components/ExchangeModal';
import { AdminOverrideModal } from '../components/AdminOverrideModal';

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
  const [adminAction, setAdminAction] = useState<{action: string, payload?: any} | null>(null);

  // Edit sale states
  const [editingSale, setEditingSale] = useState<any | null>(null);
  const [editPaymentMethod, setEditPaymentMethod] = useState('Efectivo');
  const [editCreatedAt, setEditCreatedAt] = useState('');
  const [editItems, setEditItems] = useState<any[]>([]);
  const [savingSaleEdit, setSavingSaleEdit] = useState(false);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const formatISOForLocalDatetime = (isoStr?: string) => {
    if (!isoStr) return '';
    const dt = new Date(isoStr);
    const tzOffset = dt.getTimezoneOffset() * 60000;
    return new Date(dt.getTime() - tzOffset).toISOString().slice(0, 16);
  };

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

  const handleDeleteSale = async (saleId: string) => {
    try {
      setLoading(true);
      await supabase.from('sale_items').delete().eq('sale_id', saleId);
      const { error } = await supabase.from('sales').delete().eq('id', saleId);
      if (error) throw error;
      
      setSales(sales.filter(s => s.id !== saleId));
      setAdminAction(null);
    } catch (err) {
      console.error('Error deleting sale:', err);
      alert('Error al eliminar la venta.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditSale = async (sale: Sale) => {
    setLoadingTicketId(sale.id);
    try {
      const { data, error } = await supabase.from('sale_items').select('*').eq('sale_id', sale.id);
      if (error) throw error;

      const items = (data || []).map(item => {
        const product = products.find(p => p.id === item.product_id);
        return {
          id: item.id,
          product_id: item.product_id,
          name: product ? product.name : 'Producto',
          quantity: item.quantity,
          price_at_time: item.price_at_time
        };
      });

      setEditingSale(sale);
      setEditPaymentMethod(sale.payment_method || 'Efectivo');
      setEditCreatedAt(formatISOForLocalDatetime(sale.created_at));
      setEditItems(items);
    } catch (err) {
      console.error(err);
      alert('Error cargando detalles de la venta para edición');
    } finally {
      setLoadingTicketId(null);
    }
  };

  const handleSaveSaleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;

    setSavingSaleEdit(true);
    try {
      const newTotal = editItems.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.price_at_time)), 0);
      const createdAtISO = new Date(editCreatedAt).toISOString();

      const { error: saleErr } = await supabase
        .from('sales')
        .update({
          payment_method: editPaymentMethod,
          created_at: createdAtISO,
          total: newTotal
        })
        .eq('id', editingSale.id);

      if (saleErr) throw saleErr;

      for (const item of editItems) {
        if (item.id) {
          const { error: itemErr } = await supabase
            .from('sale_items')
            .update({
              quantity: Number(item.quantity),
              price_at_time: Number(item.price_at_time)
            })
            .eq('id', item.id);
          if (itemErr) console.warn('Error actualizando item:', itemErr);
        }
      }

      alert('Ticket de venta actualizado con éxito.');
      setEditingSale(null);
      fetchSalesData();
    } catch (err: any) {
      console.error(err);
      alert('Error al guardar edición del ticket: ' + (err.message || err.toString()));
    } finally {
      setSavingSaleEdit(false);
    }
  };

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
                    <th className="p-4 text-label-caps text-on-surface-variant text-center">Acciones</th>
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
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center items-center gap-1">
                          <button 
                            onClick={() => setAdminAction({ action: 'editar venta', payload: sale })}
                            className="text-on-surface-variant hover:text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors"
                            title="Editar Ticket (Requiere Admin)"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button 
                            onClick={() => setAdminAction({ action: 'eliminar venta', payload: sale.id })} 
                            className="text-error hover:bg-error-container p-2 rounded-lg transition-colors" 
                            title="Eliminar Venta"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sales.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-on-surface-variant">
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
                <p className="mt-3 font-semibold text-[11px] leading-tight text-black/80">Para cualquier cambio o aclaración es indispensable presentar este ticket.</p>
                <p className="mt-2">¡Gracias por su compra!</p>
              </div>
            </div>
            <div className="p-4 bg-surface-container-low border-t border-outline-variant flex flex-col gap-3 shrink-0">
              <div className="flex gap-2">
                <button onClick={() => setCompletedSale(null)} className="flex-1 py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-variant transition-colors font-medium text-xs">Cerrar</button>
                
                <button 
                  onClick={() => {
                    const saleToEdit = sales.find(s => s.id === completedSale.id);
                    if (saleToEdit) {
                      setCompletedSale(null);
                      setAdminAction({ action: 'editar venta', payload: saleToEdit });
                    }
                  }} 
                  className="flex-1 py-2 rounded-lg bg-surface-variant text-on-surface hover:bg-surface-container-highest transition-colors font-bold text-xs flex justify-center items-center gap-1"
                >
                  <Edit3 size={15} /> Editar
                </button>

                <button onClick={() => setIsExchangeOpen(true)} className="flex-1 py-2 rounded-lg bg-secondary text-on-secondary hover:bg-on-secondary-fixed-variant transition-colors font-medium text-xs flex justify-center items-center gap-1">
                  <RefreshCw size={15} /> Cambio
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => {
                  const printContent = document.getElementById('printable-ticket');
                  const win = window.open('', '', 'width=300,height=600');
                  if(win && printContent) {
                    win.document.write('<html><head><title>Imprimir Ticket</title><style>body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; } table { width: 100%; border-collapse: collapse; } th { text-align: left; border-bottom: 1px dashed #000; } td { padding-top: 4px; } .text-right { text-align: right; } .text-center { text-align: center; } .font-bold { font-weight: bold; } .font-semibold { font-weight: 600; } .text-xl { font-size: 16px; } .text-lg { font-size: 14px; } .border-t { border-top: 1px dashed #000; } .border-b { border-bottom: 1px dashed #000; } .my-4 { margin: 10px 0; } .py-2 { padding: 5px 0; } .mt-1 { margin-top: 4px; } .mt-2 { margin-top: 8px; } .mt-3 { margin-top: 12px; }</style></head><body>');
                    win.document.write(printContent.innerHTML);
                    win.document.write('</body></html>');
                    win.document.close();
                    win.focus();
                    setTimeout(() => { win.print(); win.close(); }, 250);
                  }
                }} className="flex-1 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors font-medium text-xs flex justify-center items-center gap-1">
                  <Receipt size={16} /> Imprimir
                </button>
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
                  text += "Para cualquier cambio o aclaracion\nes indispensable presentar este ticket.\n";
                  text += "Gracias por su compra!\n\n\n";

                  const encoded = encodeURI(text);
                  window.location.href = `intent:${encoded}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
                }} className="flex-1 py-2 rounded-lg bg-secondary text-on-secondary hover:bg-on-secondary-fixed-variant transition-colors font-medium text-xs flex justify-center items-center gap-1">
                  <Receipt size={16} /> BT Móvil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sale Modal */}
      {editingSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-outline-variant max-h-[90vh]">
            <div className="p-4 bg-primary text-on-primary flex justify-between items-center shrink-0">
              <h3 className="font-bold text-title-md flex items-center gap-2">
                <Edit3 size={20} /> Editar Ticket de Venta
              </h3>
              <button 
                onClick={() => setEditingSale(null)}
                className="hover:bg-primary-fixed hover:text-on-primary-fixed rounded-full p-1 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSaleEdit} className="p-6 flex flex-col gap-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-1 block">Método de Pago</label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm font-semibold outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Transfer">Transferencia</option>
                  </select>
                </div>
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-1 block">Fecha y Hora</label>
                  <input
                    type="datetime-local"
                    required
                    value={editCreatedAt}
                    onChange={(e) => setEditCreatedAt(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm font-semibold outline-none focus:border-primary cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-label-caps text-on-surface-variant mb-2 block font-bold">Ítems del Ticket</label>
                <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface-container-low divide-y divide-outline-variant/30">
                  {editItems.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-body-sm font-bold text-on-surface">{item.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20">
                          <span className="text-[10px] text-on-surface-variant block">Cant</span>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              setEditItems(editItems.map((it, i) => i === idx ? { ...it, quantity: val } : it));
                            }}
                            className="w-full bg-surface border border-outline-variant rounded-lg h-8 px-2 text-center text-body-sm font-bold outline-none"
                          />
                        </div>
                        <div className="w-24">
                          <span className="text-[10px] text-on-surface-variant block">Precio U. ($)</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.price_at_time}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setEditItems(editItems.map((it, i) => i === idx ? { ...it, price_at_time: val } : it));
                            }}
                            className="w-full bg-surface border border-outline-variant rounded-lg h-8 px-2 text-right text-body-sm font-bold outline-none text-data-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-primary/10 border border-primary/30 p-3 rounded-xl flex items-center justify-between">
                <span className="text-body-md font-bold text-primary">Nuevo Total Recalculado:</span>
                <span className="text-title-lg font-extrabold text-primary text-data-mono">
                  ${editItems.reduce((acc, it) => acc + (Number(it.quantity) * Number(it.price_at_time)), 0).toFixed(2)}
                </span>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="flex-1 py-3 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-variant font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSaleEdit}
                  className="flex-1 py-3 rounded-lg bg-primary text-on-primary hover:bg-primary/90 font-bold transition-colors shadow disabled:opacity-50"
                >
                  {savingSaleEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
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
            fetchSalesData();
          }}
        />
      )}

      {adminAction && (
        <AdminOverrideModal 
          actionName={adminAction.action}
          onCancel={() => setAdminAction(null)}
          onSuccess={() => {
            if (adminAction.action === 'eliminar venta') {
              handleDeleteSale(adminAction.payload);
            } else if (adminAction.action === 'editar venta') {
              handleStartEditSale(adminAction.payload);
              setAdminAction(null);
            }
          }}
        />
      )}
    </main>
  );
}
