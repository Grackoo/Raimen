import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Filter } from 'lucide-react';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  branch_id: string;
  user_id: string;
}

export function ExpensesView() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('month'); // today, week, month, year

  const [formData, setFormData] = useState({
    description: '', amount: '', category: 'Operativo', customCategory: ''
  });

  const sessionUser = JSON.parse(localStorage.getItem('raimen_pos_user') || '{}');

  const baseCategories = ['Operativo', 'Administrativo', 'Nómina', 'Marketing', 'Mantenimiento', 'Insumos', 'Renta', 'Luz', 'Agua', 'Internet', 'Teléfono', 'Impuestos', 'Otro'];
  const dynamicCategories = Array.from(new Set([...baseCategories, ...allCategories, ...expenses.map(e => e.category).filter(Boolean)]));

  const [allCategories, setAllCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchBranches();
    fetchAllCategories();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [selectedBranch, dateFilter]);

  async function fetchBranches() {
    const { data } = await supabase.from('branches').select('id, name');
    if (data) setBranches(data);
  }

  async function fetchAllCategories() {
    const { data } = await supabase.from('expenses').select('category');
    if (data) {
      const unique = Array.from(new Set(data.map(d => d.category).filter(Boolean)));
      setAllCategories(unique);
    }
  }

  async function fetchExpenses() {
    setLoading(true);
    let query = supabase.from('expenses').select('*').order('date', { ascending: false });
    
    if (selectedBranch !== 'all') {
      query = query.eq('branch_id', selectedBranch);
    }

    // Date filtering
    const now = new Date();
    let startDate = new Date();
    if (dateFilter === 'today') startDate.setHours(0,0,0,0);
    else if (dateFilter === 'week') startDate.setDate(now.getDate() - 7);
    else if (dateFilter === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (dateFilter === 'year') startDate.setFullYear(now.getFullYear() - 1);

    query = query.gte('date', startDate.toISOString());

    const { data, error } = await query;
    if (!error && data) setExpenses(data);
    setLoading(false);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount) return;

    const finalCategory = formData.category === 'NEW' ? formData.customCategory : formData.category;

    const payload = {
      description: formData.description,
      amount: parseFloat(formData.amount),
      category: finalCategory || 'Otro',
      branch_id: selectedBranch === 'all' ? (branches[0]?.id || null) : selectedBranch,
      user_id: sessionUser.id || null
    };

    await supabase.from('expenses').insert([payload]);
    setShowModal(false);
    setFormData({ description: '', amount: '', category: 'Operativo', customCategory: '' });
    fetchExpenses();
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar gasto de forma permanente?')) {
      await supabase.from('expenses').delete().eq('id', id);
      fetchExpenses();
    }
  };

  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-display-lg font-bold text-on-surface tracking-tight">Control de Gastos</h2>
            <p className="text-body-md text-on-surface-variant mt-1">Registra salidas de efectivo y gastos operativos.</p>
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center justify-center gap-2 h-10 px-4 bg-error text-white rounded-lg text-title-md hover:opacity-90 shadow-sm w-full sm:w-auto">
            <Plus size={20} /> Registrar Gasto
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
            <span className="text-label-caps text-on-surface-variant">PERIODO:</span>
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-transparent text-body-sm font-semibold text-on-surface outline-none cursor-pointer">
              <option value="today">Hoy</option>
              <option value="week">Últimos 7 días</option>
              <option value="month">Último mes</option>
              <option value="year">Último año</option>
            </select>
          </div>
          <div className="flex-1"></div>
          <div className="px-4 py-1.5 bg-error/10 text-error font-bold rounded-lg border border-error/20 flex items-center gap-2">
            Total Gastos: <span className="text-lg">${totalExpenses.toFixed(2)}</span>
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
                    <th className="p-4 text-label-caps text-on-surface-variant tracking-wider">Fecha</th>
                    <th className="p-4 text-label-caps text-on-surface-variant tracking-wider">Descripción</th>
                    <th className="p-4 text-label-caps text-on-surface-variant tracking-wider">Categoría</th>
                    <th className="p-4 text-label-caps text-on-surface-variant tracking-wider text-right">Monto</th>
                    <th className="p-4 text-label-caps text-on-surface-variant tracking-wider text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {expenses.map((e, i) => (
                    <tr key={i} className="hover:bg-surface-container-low transition-colors group">
                      <td className="p-4 text-body-sm text-on-surface-variant">{new Date(e.date).toLocaleString()}</td>
                      <td className="p-4 text-title-md text-on-surface font-semibold">{e.description}</td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-surface-variant text-on-surface-variant rounded text-label-caps">{e.category}</span>
                      </td>
                      <td className="p-4 text-right text-data-mono font-bold text-error">-${e.amount.toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleDelete(e.id)} className="text-on-surface-variant hover:text-error transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-on-surface-variant">No hay gastos registrados en este periodo.</td></tr>
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
              <h3 className="text-title-md font-bold text-on-surface">Registrar Salida de Efectivo / Gasto</h3>
            </div>
            <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-label-caps text-on-surface-variant mb-1 block">Motivo / Descripción *</label>
                <input required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} type="text" className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm outline-none focus:border-primary" placeholder="Ej. Pago de luz" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-1 block">Monto ($) *</label>
                  <input required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} type="number" step="0.01" min="0" className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm outline-none focus:border-error text-data-mono" />
                </div>
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-1 block">Categoría</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm outline-none focus:border-primary mb-2">
                    {dynamicCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    <option value="NEW">+ Nueva Categoría...</option>
                  </select>
                  {formData.category === 'NEW' && (
                    <input 
                      type="text" 
                      required
                      placeholder="Escribe la categoría..."
                      value={formData.customCategory} 
                      onChange={e => setFormData({...formData, customCategory: e.target.value})} 
                      className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm outline-none focus:border-primary" 
                    />
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-on-surface-variant hover:bg-surface-variant rounded-lg transition-colors font-bold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-error text-white font-bold rounded-lg hover:opacity-90">Registrar Gasto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
