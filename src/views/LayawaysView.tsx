import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Bookmark, Search, Calendar, User, DollarSign, Clock, CheckCircle2, AlertTriangle, Receipt, X, Loader2, PlusCircle, Trash2 } from 'lucide-react';

interface LayawayItem {
  id: string;
  product_id: string;
  quantity: number;
  price: number;
  product_name?: string;
}

interface LayawayPayment {
  id: string;
  created_at: string;
  amount: number;
  payment_method: string;
  notes?: string;
}

interface Layaway {
  id: string;
  code: string;
  created_at: string;
  customer_name: string;
  customer_phone?: string;
  total: number;
  paid_amount: number;
  remaining_amount: number;
  expiration_date: string;
  status: 'pending' | 'completed' | 'cancelled' | 'expired';
  payment_method: string;
  notes?: string;
}

export function LayawaysView() {
  const [layaways, setLayaways] = useState<Layaway[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal detail & payment state
  const [selectedLayaway, setSelectedLayaway] = useState<Layaway | null>(null);
  const [layawayItems, setLayawayItems] = useState<LayawayItem[]>([]);
  const [layawayPayments, setLayawayPayments] = useState<LayawayPayment[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Abono modal state
  const [showAbonoModal, setShowAbonoModal] = useState(false);
  const [abonoAmount, setAbonoAmount] = useState('');
  const [abonoMethod, setAbonoMethod] = useState('Efectivo');
  const [processingAbono, setProcessingAbono] = useState(false);

  const sessionUser = JSON.parse(localStorage.getItem('raimen_pos_user') || '{}');

  const fetchLayaways = async () => {
    setLoading(true);
    try {
      let query = supabase.from('layaways').select('*').order('created_at', { ascending: false });
      if (sessionUser.branch_id) {
        query = query.eq('branch_id', sessionUser.branch_id);
      }
      const { data, error } = await query;
      if (error) throw error;

      // Update status if expired
      const now = new Date();
      const updatedList = (data || []).map((l: Layaway) => {
        if (l.status === 'pending' && new Date(l.expiration_date) < now) {
          return { ...l, status: 'expired' as const };
        }
        return l;
      });

      setLayaways(updatedList);
    } catch (err) {
      console.error('Error fetching layaways:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLayaways();
  }, []);

  const handleOpenDetail = async (layaway: Layaway) => {
    setSelectedLayaway(layaway);
    setLoadingDetails(true);
    try {
      const [itemsRes, paymentsRes, prodRes] = await Promise.all([
        supabase.from('layaway_items').select('*').eq('layaway_id', layaway.id),
        supabase.from('layaway_payments').select('*').eq('layaway_id', layaway.id).order('created_at', { ascending: true }),
        supabase.from('products').select('id, name')
      ]);

      const productsMap = new Map((prodRes.data || []).map(p => [p.id, p.name]));
      const itemsWithNames = (itemsRes.data || []).map(item => ({
        ...item,
        product_name: productsMap.get(item.product_id) || 'Producto'
      }));

      setLayawayItems(itemsWithNames);
      setLayawayPayments(paymentsRes.data || []);
    } catch (err) {
      console.error('Error loading layaway details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleRegisterAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLayaway) return;
    const amount = parseFloat(abonoAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Ingresa un monto de abono válido.');
      return;
    }
    if (amount > selectedLayaway.remaining_amount) {
      alert(`El monto no puede exceder la resta pendiente ($${selectedLayaway.remaining_amount.toFixed(2)}).`);
      return;
    }

    setProcessingAbono(true);
    try {
      // 1. Insert layaway_payment
      const { error: payErr } = await supabase.from('layaway_payments').insert([{
        layaway_id: selectedLayaway.id,
        amount: amount,
        payment_method: abonoMethod,
        cashier_id: sessionUser.id
      }]);
      if (payErr) throw payErr;

      // 2. Update layaway total paid and remaining
      const newPaid = selectedLayaway.paid_amount + amount;
      const newRemaining = Math.max(0, selectedLayaway.total - newPaid);
      const newStatus = newRemaining === 0 ? 'completed' : selectedLayaway.status;

      const { error: updateErr } = await supabase
        .from('layaways')
        .update({
          paid_amount: newPaid,
          remaining_amount: newRemaining,
          status: newStatus,
          payment_method: abonoMethod
        })
        .eq('id', selectedLayaway.id);

      if (updateErr) throw updateErr;

      // Update local state
      const updatedLayaway = {
        ...selectedLayaway,
        paid_amount: newPaid,
        remaining_amount: newRemaining,
        status: newStatus as any
      };

      setSelectedLayaway(updatedLayaway);
      setShowAbonoModal(false);
      setAbonoAmount('');
      fetchLayaways();
      handleOpenDetail(updatedLayaway);

      alert(newRemaining === 0 ? '¡Apartado liquidado con éxito!' : 'Abono registrado correctamente.');
    } catch (err) {
      console.error('Error al registrar abono:', err);
      alert('Error al registrar el abono.');
    } finally {
      setProcessingAbono(false);
    }
  };

  const handleCancelLayaway = async (layaway: Layaway) => {
    if (!window.confirm(`¿Seguro que deseas cancelar el apartado ${layaway.code}? Se devolverá el stock a inventario.`)) {
      return;
    }
    try {
      // Fetch items to restore stock
      const { data: items } = await supabase.from('layaway_items').select('*').eq('layaway_id', layaway.id);
      if (items && items.length > 0) {
        for (const item of items) {
          const { data: prod } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
          if (prod) {
            await supabase.from('products').update({ stock: (prod.stock || 0) + item.quantity }).eq('id', item.product_id);
          }
        }
      }

      await supabase.from('layaways').update({ status: 'cancelled' }).eq('id', layaway.id);
      alert('Apartado cancelado y stock restaurado.');
      setSelectedLayaway(null);
      fetchLayaways();
    } catch (err) {
      console.error('Error al cancelar apartado:', err);
      alert('Error al cancelar el apartado.');
    }
  };

  const filteredLayaways = layaways.filter(l => {
    const matchSearch = l.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        l.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || l.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const printTicket = () => {
    const printContent = document.getElementById('printable-layaway-ticket');
    const win = window.open('', '', 'width=300,height=600');
    if (win && printContent) {
      win.document.write('<html><head><title>Imprimir Ticket de Apartado</title><style>body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; } table { width: 100%; border-collapse: collapse; } th { text-align: left; border-bottom: 1px dashed #000; } td { padding-top: 4px; } .text-right { text-align: right; } .text-center { text-align: center; } .font-bold { font-weight: bold; } .font-semibold { font-weight: 600; } .text-xl { font-size: 16px; } .text-lg { font-size: 14px; } .border-t { border-top: 1px dashed #000; } .border-b { border-bottom: 1px dashed #000; } .border-y-2 { border-top: 2px dashed #000; border-bottom: 2px dashed #000; }</style></head><body>');
      win.document.write(printContent.innerHTML);
      win.document.write('</body></html>');
      win.document.close();
      win.focus();
      setTimeout(() => { win.print(); win.close(); }, 250);
    }
  };

  const printRawBT = () => {
    if (!selectedLayaway) return;
    let text = "RAIMEN STORE\n";
    text += "--- NOTA DE APARTADO ---\n";
    text += `Folio: ${selectedLayaway.code}\n`;
    text += `Fecha: ${new Date(selectedLayaway.created_at).toLocaleDateString('es-MX')}\n`;
    text += `Vence: ${new Date(selectedLayaway.expiration_date).toLocaleDateString('es-MX')}\n`;
    text += "--------------------------------\n";
    text += `Cliente: ${selectedLayaway.customer_name}\n`;
    if (selectedLayaway.customer_phone) text += `Tel: ${selectedLayaway.customer_phone}\n`;
    text += "--------------------------------\n";

    layawayItems.forEach((item) => {
      text += `${item.quantity}x ${item.product_name}\n$${(item.price * item.quantity).toFixed(2)}\n`;
    });
    text += "--------------------------------\n";
    text += `TOTAL COMPRA: $${selectedLayaway.total.toFixed(2)}\n`;
    text += `MONTO A CUENTA: $${selectedLayaway.paid_amount.toFixed(2)}\n`;
    text += `RESTA PENDIENTE: $${selectedLayaway.remaining_amount.toFixed(2)}\n`;
    text += "--------------------------------\n";
    text += "Tiene 1 mes a partir de expedicion\npara liquidar y recoger su apartado.\n";
    text += "¡Gracias por su preferencia!\n\n\n";

    const encoded = encodeURI(text);
    window.location.href = `intent:${encoded}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-container-low p-4 lg:p-6 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-headline-sm font-bold text-primary flex items-center gap-2">
            <Bookmark className="text-primary" size={28} />
            Sistema de Apartados
          </h1>
          <p className="text-body-sm text-on-surface-variant">
            Administra los productos apartados por clientes, registra abonos y consulta saldos pendientes.
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-surface-container-lowest p-4 rounded-xl shadow-sm border border-outline-variant mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente o código de folio..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary outline-none text-body-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'pending', label: 'Pendientes' },
            { id: 'completed', label: 'Liquidados' },
            { id: 'expired', label: 'Vencidos' },
            { id: 'cancelled', label: 'Cancelados' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              className={`px-3 py-1.5 rounded-full text-label-caps whitespace-nowrap border transition-colors ${
                statusFilter === f.id
                  ? 'bg-primary text-on-primary border-primary'
                  : 'bg-surface text-on-surface-variant border-outline-variant hover:bg-surface-variant'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Layaways Grid/Table */}
      {loading ? (
        <div className="flex-1 flex justify-center items-center py-12 text-on-surface-variant">
          <Loader2 className="animate-spin mr-2" size={24} /> Cargando apartados...
        </div>
      ) : filteredLayaways.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl p-12 text-center text-on-surface-variant border border-outline-variant">
          <Bookmark size={48} className="mx-auto mb-3 text-outline" />
          <p className="font-semibold">No se encontraron apartados registrados.</p>
          <p className="text-xs text-on-surface-variant mt-1">Puedes generar apartados directamente desde el POS al momento de vender.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLayaways.map((l) => {
            const isPending = l.status === 'pending';
            const isCompleted = l.status === 'completed';
            const isExpired = l.status === 'expired';

            return (
              <div key={l.id} className="bg-surface-container-lowest rounded-xl p-5 shadow-sm border border-outline-variant flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="inline-flex items-center text-xs font-extrabold font-mono text-white bg-slate-900 border border-slate-700 px-2.5 py-1 rounded shadow-sm tracking-wider">
                        {l.code}
                      </span>
                      <h3 className="text-body-lg font-bold text-on-surface mt-1.5 flex items-center gap-1.5">
                        <User size={16} className="text-on-surface-variant" />
                        {l.customer_name}
                      </h3>
                      {l.customer_phone && (
                        <p className="text-xs text-on-surface-variant pl-5 font-mono">Tel: {l.customer_phone}</p>
                      )}
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      isCompleted ? 'bg-emerald-100 text-emerald-800' :
                      isExpired ? 'bg-red-100 text-red-800' :
                      l.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {isCompleted ? 'Liquidado' : isExpired ? 'Vencido' : l.status === 'cancelled' ? 'Cancelado' : 'Pendiente'}
                    </span>
                  </div>

                  <div className="bg-surface p-3 rounded-lg border border-outline-variant/60 my-3 flex justify-between text-body-sm">
                    <div>
                      <p className="text-[11px] text-on-surface-variant font-semibold">Total Compra</p>
                      <p className="text-data-mono font-bold text-on-surface">${l.total.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-on-surface-variant font-semibold">A Cuenta</p>
                      <p className="text-data-mono font-bold text-emerald-600">${l.paid_amount.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-on-surface-variant font-bold">Resta Pendiente</p>
                      <p className="text-data-mono font-extrabold text-primary">${l.remaining_amount.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="text-xs text-on-surface-variant flex flex-col gap-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      <span>Apartado el: {new Date(l.created_at).toLocaleDateString('es-MX')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-semibold text-amber-700">
                      <Clock size={14} />
                      <span>Vence: {new Date(l.expiration_date).toLocaleDateString('es-MX')} (1 mes)</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-outline-variant flex gap-2">
                  <button
                    onClick={() => handleOpenDetail(l)}
                    className="flex-1 py-2 px-3 bg-surface-container hover:bg-surface-variant rounded-lg text-body-sm font-semibold text-on-surface transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Receipt size={16} /> Ver Ticket
                  </button>
                  {isPending && (
                    <button
                      onClick={() => {
                        setSelectedLayaway(l);
                        setShowAbonoModal(true);
                      }}
                      className="py-2 px-3 bg-primary text-on-primary hover:bg-primary/90 rounded-lg text-body-sm font-bold transition-colors flex items-center justify-center gap-1 shadow-sm"
                    >
                      <PlusCircle size={16} /> Abonar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Detail & Ticket */}
      {selectedLayaway && !showAbonoModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-primary text-on-primary flex justify-between items-center shrink-0">
              <h3 className="font-bold flex items-center gap-2 text-title-md">
                <Bookmark size={20} /> Detalle de Apartado #{selectedLayaway.code}
              </h3>
              <button onClick={() => setSelectedLayaway(null)} className="hover:bg-primary-fixed hover:text-on-primary-fixed rounded-full p-1">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Ticket printable content */}
              <div id="printable-layaway-ticket" className="bg-white p-4 text-black font-mono text-sm border border-gray-200 rounded-lg">
                <div className="text-center mb-3 pb-3 border-b border-black/20">
                  <h2 className="text-xl font-bold">RAIMEN STORE</h2>
                  <p className="font-bold text-sm">--- NOTA DE APARTADO ---</p>
                  <p className="text-xs">Folio: {selectedLayaway.code}</p>
                  <p className="text-xs">Fecha: {new Date(selectedLayaway.created_at).toLocaleString('es-MX')}</p>
                  <p className="text-xs font-bold text-red-600">Fecha Límite: {new Date(selectedLayaway.expiration_date).toLocaleDateString('es-MX')}</p>
                </div>

                <div className="mb-3 pb-3 border-b border-black/20 text-xs">
                  <p><span className="font-bold">Cliente:</span> {selectedLayaway.customer_name}</p>
                  {selectedLayaway.customer_phone && <p><span className="font-bold">Teléfono:</span> {selectedLayaway.customer_phone}</p>}
                </div>

                <div className="border-b border-black/20 pb-3 mb-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left border-b border-black/20"><th className="pb-1">Cant</th><th className="pb-1">Producto</th><th className="text-right pb-1">Importe</th></tr>
                    </thead>
                    <tbody>
                      {layawayItems.map((item) => (
                        <tr key={item.id}>
                          <td className="py-1 align-top">{item.quantity}</td>
                          <td className="py-1 align-top">{item.product_name}</td>
                          <td className="py-1 text-right align-top">${(item.price * item.quantity).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-1 text-xs mb-3 pb-3 border-b border-black/20">
                  <div className="flex justify-between font-bold text-sm">
                    <span>TOTAL DE LA COMPRA:</span>
                    <span>${selectedLayaway.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>MONTO A CUENTA (ABONADO):</span>
                    <span>${selectedLayaway.paid_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-extrabold text-base text-primary pt-1 border-t border-dashed border-black/30">
                    <span>RESTA PENDIENTE:</span>
                    <span>${selectedLayaway.remaining_amount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-center text-[10px] text-black/70 leading-tight">
                  <p className="font-bold">¡IMPORTANTE!</p>
                  <p>El cliente tiene 1 mes a partir de la fecha de expedición para liquidar su apartado.</p>
                  <p className="mt-1 font-semibold">¡Gracias por su preferencia!</p>
                </div>
              </div>

              {/* Payment History Log */}
              <div>
                <h4 className="font-bold text-title-sm text-primary mb-3">Historial de Abonos</h4>
                {layawayPayments.length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic">No hay historial de abonos registrado.</p>
                ) : (
                  <div className="space-y-2">
                    {layawayPayments.map((p, idx) => (
                      <div key={p.id} className="flex justify-between items-center p-2.5 rounded-lg bg-surface border border-outline-variant text-xs">
                        <div>
                          <span className="font-bold">Abono #{idx + 1} ({p.payment_method})</span>
                          <p className="text-[10px] text-on-surface-variant">{new Date(p.created_at).toLocaleString('es-MX')}</p>
                        </div>
                        <span className="font-bold text-emerald-600 text-sm">${p.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions footer */}
            <div className="p-4 bg-surface-container-low border-t border-outline-variant flex flex-col gap-2 shrink-0">
              <div className="flex gap-2">
                <button onClick={printTicket} className="flex-1 py-2 bg-primary text-on-primary rounded-lg text-body-sm font-semibold hover:bg-primary/90 flex justify-center items-center gap-1.5">
                  <Receipt size={16} /> Imprimir Web
                </button>
                <button onClick={printRawBT} className="flex-1 py-2 bg-secondary text-on-secondary rounded-lg text-body-sm font-semibold hover:bg-on-secondary-fixed-variant flex justify-center items-center gap-1.5">
                  <Receipt size={16} /> Imprimir Bluetooth
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                {selectedLayaway.status === 'pending' && (
                  <>
                    <button
                      onClick={() => setShowAbonoModal(true)}
                      className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-body-sm font-bold hover:bg-emerald-700 transition-colors"
                    >
                      + Registrar Abono
                    </button>
                    <button
                      onClick={() => handleCancelLayaway(selectedLayaway)}
                      className="py-2 px-3 bg-error-container text-error rounded-lg text-body-sm font-semibold hover:bg-error/20 transition-colors"
                    >
                      Cancelar Apartado
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Abono */}
      {showAbonoModal && selectedLayaway && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-2xl shadow-2xl p-6 border border-outline-variant">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-title-md font-bold text-primary flex items-center gap-2">
                <DollarSign size={20} /> Registrar Abono a Apartado #{selectedLayaway.code}
              </h3>
              <button onClick={() => setShowAbonoModal(false)} className="text-on-surface-variant hover:bg-surface-variant p-1 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="bg-surface p-3 rounded-lg mb-4 text-body-sm space-y-1">
              <div className="flex justify-between">
                <span>Cliente:</span>
                <span className="font-bold">{selectedLayaway.customer_name}</span>
              </div>
              <div className="flex justify-between text-primary font-bold">
                <span>Resta Pendiente actual:</span>
                <span>${selectedLayaway.remaining_amount.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleRegisterAbono} className="space-y-4">
              <div>
                <label className="block text-body-sm font-semibold text-on-surface mb-1">Monto del Abono ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={selectedLayaway.remaining_amount}
                  value={abonoAmount}
                  onChange={(e) => setAbonoAmount(e.target.value)}
                  placeholder={`Máximo $${selectedLayaway.remaining_amount.toFixed(2)}`}
                  required
                  className="w-full p-3 border border-outline-variant rounded-xl bg-surface focus:ring-2 focus:ring-primary outline-none font-mono text-lg font-bold"
                />
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-on-surface mb-1">Forma de Pago</label>
                <select
                  value={abonoMethod}
                  onChange={(e) => setAbonoMethod(e.target.value)}
                  className="w-full p-3 border border-outline-variant rounded-xl bg-surface focus:ring-2 focus:ring-primary outline-none text-body-sm"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Transfer">Transferencia</option>
                </select>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAbonoModal(false)}
                  className="flex-1 py-3 border border-outline-variant rounded-xl font-semibold hover:bg-surface-variant"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={processingAbono}
                  className="flex-1 py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary/90 flex justify-center items-center gap-2"
                >
                  {processingAbono ? <Loader2 className="animate-spin" size={18} /> : 'Guardar Abono'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
