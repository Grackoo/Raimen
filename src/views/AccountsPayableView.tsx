import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, CheckCircle, Clock } from 'lucide-react';

interface AP {
  id: string;
  supplier: string;
  description: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  status: string; // pending, partial, paid
  branch_id: string;
}

export function AccountsPayableView() {
  const [payables, setPayables] = useState<AP[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    supplier: '', description: '', amount: '', due_date: ''
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchPayables();
  }, [selectedBranch, statusFilter]);

  async function fetchBranches() {
    const { data } = await supabase.from('branches').select('id, name');
    if (data) setBranches(data);
  }

  async function fetchPayables() {
    setLoading(true);
    let query = supabase.from('accounts_payable').select('*').order('due_date', { ascending: true });
    
    if (selectedBranch !== 'all') {
      query = query.eq('branch_id', selectedBranch);
    }
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (!error && data) setPayables(data);
    setLoading(false);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplier || !formData.amount || !formData.due_date) return;

    const payload = {
      supplier: formData.supplier,
      description: formData.description,
      amount: parseFloat(formData.amount),
      paid_amount: 0,
      due_date: formData.due_date,
      status: 'pending',
      branch_id: selectedBranch === 'all' ? (branches[0]?.id || null) : selectedBranch,
    };

    await supabase.from('accounts_payable').insert([payload]);
    setShowModal(false);
    setFormData({ supplier: '', description: '', amount: '', due_date: '' });
    fetchPayables();
  };

  const handlePayment = async (ap: AP) => {
    const remaining = ap.amount - ap.paid_amount;
    const payment = prompt(`Deuda actual con ${ap.supplier}: $${remaining.toFixed(2)}\n\n¿Cuánto deseas abonar?`, remaining.toString());
    
    if (payment !== null && !isNaN(parseFloat(payment))) {
      const pAmount = parseFloat(payment);
      if (pAmount <= 0) return;
      
      const newPaid = ap.paid_amount + pAmount;
      const newStatus = newPaid >= ap.amount ? 'paid' : 'partial';

      await supabase.from('accounts_payable').update({
        paid_amount: newPaid,
        status: newStatus
      }).eq('id', ap.id);

      fetchPayables();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar esta cuenta por pagar de forma permanente?')) {
      await supabase.from('accounts_payable').delete().eq('id', id);
      fetchPayables();
    }
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-display-lg font-bold text-on-surface tracking-tight">Cuentas por Pagar</h2>
            <p className="text-body-md text-on-surface-variant mt-1">Gestiona tus deudas con proveedores y vencimientos.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center justify-center gap-2 h-10 px-4 bg-primary text-on-primary rounded-lg text-title-md hover:opacity-90 shadow-sm w-full sm:w-auto">
            <Plus size={20} /> Nueva Deuda
          </button>
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-2 flex flex-wrap gap-2 items-center shadow-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg border border-transparent">
            <span className="text-label-caps text-on-surface-variant">SUCURSAL:</span>
            <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="bg-transparent text-body-sm font-semibold text-on-surface outline-none cursor-pointer">
              <option value="all">Todas</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg border border-transparent">
            <span className="text-label-caps text-on-surface-variant">ESTADO:</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-transparent text-body-sm font-semibold text-on-surface outline-none cursor-pointer">
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="partial">Abonados</option>
              <option value="paid">Pagados</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-8"><div className="animate-pulse text-on-surface-variant">Cargando...</div></div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[400px]">
            <div className="overflow-x-auto custom-scrollbar flex-1">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                <thead className="bg-surface-container-low sticky top-0 z-10 border-b border-outline-variant">
                  <tr>
                    <th className="p-4 text-label-caps text-on-surface-variant tracking-wider">Vencimiento</th>
                    <th className="p-4 text-label-caps text-on-surface-variant tracking-wider">Proveedor</th>
                    <th className="p-4 text-label-caps text-on-surface-variant tracking-wider">Concepto</th>
                    <th className="p-4 text-label-caps text-on-surface-variant tracking-wider text-right">Total</th>
                    <th className="p-4 text-label-caps text-on-surface-variant tracking-wider text-right">Abonado</th>
                    <th className="p-4 text-label-caps text-on-surface-variant tracking-wider text-right">Restante</th>
                    <th className="p-4 text-label-caps text-on-surface-variant tracking-wider text-center">Estado</th>
                    <th className="p-4 text-label-caps text-on-surface-variant tracking-wider text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {payables.map((ap, i) => {
                    const remaining = ap.amount - ap.paid_amount;
                    const isOverdue = new Date(ap.due_date) < new Date() && ap.status !== 'paid';
                    
                    return (
                      <tr key={i} className="hover:bg-surface-container-low transition-colors group">
                        <td className={`p-4 text-data-mono font-bold ${isOverdue ? 'text-error' : 'text-on-surface-variant'}`}>
                          {new Date(ap.due_date).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-title-md text-on-surface font-semibold">{ap.supplier}</td>
                        <td className="p-4 text-body-sm text-on-surface-variant">{ap.description}</td>
                        <td className="p-4 text-right text-data-mono text-on-surface">${ap.amount.toFixed(2)}</td>
                        <td className="p-4 text-right text-data-mono text-primary">${ap.paid_amount.toFixed(2)}</td>
                        <td className="p-4 text-right text-data-mono font-bold text-error">${remaining.toFixed(2)}</td>
                        <td className="p-4 text-center">
                          {ap.status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-label-caps"><CheckCircle size={14}/> Pagado</span>
                          ) : ap.status === 'partial' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-secondary/10 text-secondary rounded text-label-caps"><Clock size={14}/> Parcial</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-error/10 text-error rounded text-label-caps"><Clock size={14}/> Pendiente</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            {ap.status !== 'paid' && (
                              <button onClick={() => handlePayment(ap)} className="text-primary hover:text-primary-variant font-bold text-label-caps transition-colors">
                                Abonar
                              </button>
                            )}
                            <button onClick={() => handleDelete(ap.id)} className="text-on-surface-variant hover:text-error transition-colors">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {payables.length === 0 && (
                    <tr><td colSpan={8} className="p-8 text-center text-on-surface-variant">No hay cuentas por pagar registradas.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-outline-variant bg-surface-container-low">
              <h3 className="text-title-md font-bold text-on-surface">Nueva Deuda / Factura a Pagar</h3>
            </div>
            <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-label-caps text-on-surface-variant mb-1 block">Proveedor *</label>
                <input required value={formData.supplier} onChange={e => setFormData({...formData, supplier: e.target.value})} type="text" className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-label-caps text-on-surface-variant mb-1 block">Concepto / Referencia</label>
                <input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} type="text" className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-1 block">Total Deuda ($) *</label>
                  <input required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} type="number" step="0.01" min="0" className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm outline-none focus:border-primary text-data-mono" />
                </div>
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-1 block">Fecha Vencimiento *</label>
                  <input required value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} type="date" className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm outline-none focus:border-primary" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-on-surface-variant hover:bg-surface-variant rounded-lg transition-colors font-bold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90">Registrar Deuda</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
