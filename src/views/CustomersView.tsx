import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Search, Filter } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  rfc: string;
  regimen_fiscal: string;
  codigo_postal: string;
  uso_cfdi: string;
  branch_id: string;
}

export function CustomersView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', address: '', rfc: '', regimen_fiscal: '', codigo_postal: '', uso_cfdi: ''
  });

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [selectedBranch]);

  async function fetchBranches() {
    const { data } = await supabase.from('branches').select('id, name');
    if (data) setBranches(data);
  }

  async function fetchCustomers() {
    setLoading(true);
    let query = supabase.from('customers').select('*').order('name');
    if (selectedBranch !== 'all') {
      query = query.eq('branch_id', selectedBranch);
    }
    const { data, error } = await query;
    if (!error && data) {
      setCustomers(data);
    }
    setLoading(false);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const payload = {
      ...formData,
      branch_id: selectedBranch === 'all' ? (branches[0]?.id || null) : selectedBranch
    };

    if (editingCustomer) {
      await supabase.from('customers').update(payload).eq('id', editingCustomer.id);
    } else {
      await supabase.from('customers').insert([payload]);
    }
    setShowModal(false);
    fetchCustomers();
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar cliente?')) {
      await supabase.from('customers').delete().eq('id', id);
      fetchCustomers();
    }
  };

  const openEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      rfc: customer.rfc || '',
      regimen_fiscal: customer.regimen_fiscal || '',
      codigo_postal: customer.codigo_postal || '',
      uso_cfdi: customer.uso_cfdi || ''
    });
    setShowModal(true);
  };

  const openNew = () => {
    setEditingCustomer(null);
    setFormData({ name: '', email: '', phone: '', address: '', rfc: '', regimen_fiscal: '', codigo_postal: '', uso_cfdi: '' });
    setShowModal(true);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.rfc && c.rfc.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background pb-24 md:pb-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-display-lg font-bold text-on-surface tracking-tight">Directorio de Clientes</h2>
            <p className="text-body-md text-on-surface-variant mt-1">Gestiona los datos de tus clientes y facturación.</p>
          </div>
          <button onClick={openNew} className="flex items-center justify-center gap-2 h-10 px-4 bg-primary text-on-primary rounded-lg text-title-md hover:opacity-90 shadow-sm w-full sm:w-auto">
            <Plus size={20} /> Nuevo Cliente
          </button>
        </div>

        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-2 flex flex-wrap gap-2 items-center shadow-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-low rounded-lg border border-transparent">
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
          <div className="flex-1"></div>
          <div className="relative w-full sm:w-64 mt-2 sm:mt-0">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o RFC..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full h-9 pl-9 pr-3 bg-surface border border-outline-variant rounded-lg text-body-sm text-on-surface focus:ring-1 focus:ring-primary outline-none"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-8"><div className="animate-pulse text-on-surface-variant">Cargando...</div></div>
        ) : (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse whitespace-nowrap min-w-[800px]">
                <thead className="bg-surface-container-low sticky top-0 z-10 border-b border-outline-variant">
                  <tr>
                    <th className="p-4 text-label-caps text-on-surface-variant tracking-wider">Nombre</th>
                    <th className="p-4 text-label-caps text-on-surface-variant tracking-wider">Contacto</th>
                    <th className="p-4 text-label-caps text-on-surface-variant tracking-wider">RFC</th>
                    <th className="p-4 text-label-caps text-on-surface-variant tracking-wider">Dirección</th>
                    <th className="p-4 text-label-caps text-on-surface-variant tracking-wider text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {filteredCustomers.map((c, i) => (
                    <tr key={i} className="hover:bg-surface-container-low transition-colors group">
                      <td className="p-4 text-title-md text-on-surface font-semibold">{c.name}</td>
                      <td className="p-4 text-body-sm text-on-surface-variant">
                        <div>{c.phone || 'Sin teléfono'}</div>
                        <div className="text-[12px] opacity-70">{c.email}</div>
                      </td>
                      <td className="p-4 text-data-mono text-on-surface">{c.rfc || '-'}</td>
                      <td className="p-4 text-body-sm text-on-surface-variant truncate max-w-[200px]">{c.address || '-'}</td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(c)} className="text-on-surface-variant hover:text-primary transition-colors p-1" title="Editar cliente">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="text-on-surface-variant hover:text-error transition-colors p-1" title="Eliminar cliente">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-on-surface-variant">No se encontraron clientes.</td>
                    </tr>
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
              <h3 className="text-title-md font-bold text-on-surface">{editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
            </div>
            <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
              <div>
                <label className="text-label-caps text-on-surface-variant mb-1 block">Nombre Completo o Empresa *</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} type="text" className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm outline-none focus:border-primary" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-1 block">Teléfono</label>
                  <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} type="text" className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-1 block">RFC</label>
                  <input value={formData.rfc} onChange={e => setFormData({...formData, rfc: e.target.value})} type="text" className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm outline-none focus:border-primary text-data-mono uppercase" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-1 block">Régimen Fiscal</label>
                  <select value={formData.regimen_fiscal} onChange={e => setFormData({...formData, regimen_fiscal: e.target.value})} className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm outline-none focus:border-primary">
                    <option value="">Seleccione Régimen</option>
                    <option value="601">601 - General de Ley Personas Morales</option>
                    <option value="612">612 - Personas Físicas con Actividades Empresariales</option>
                    <option value="616">616 - Sin obligaciones fiscales</option>
                    <option value="626">626 - RESICO</option>
                  </select>
                </div>
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-1 block">Uso CFDI</label>
                  <select value={formData.uso_cfdi} onChange={e => setFormData({...formData, uso_cfdi: e.target.value})} className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm outline-none focus:border-primary">
                    <option value="">Seleccione Uso</option>
                    <option value="G01">G01 - Adquisición de mercancias</option>
                    <option value="G03">G03 - Gastos en general</option>
                    <option value="S01">S01 - Sin efectos fiscales</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-1 block">Código Postal</label>
                  <input value={formData.codigo_postal} onChange={e => setFormData({...formData, codigo_postal: e.target.value})} type="text" className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm outline-none focus:border-primary text-data-mono" maxLength={5} />
                </div>
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-1 block">Correo Electrónico</label>
                  <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} type="email" className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="text-label-caps text-on-surface-variant mb-1 block">Dirección de Facturación</label>
                <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full bg-surface border border-outline-variant rounded-lg p-3 text-body-sm outline-none focus:border-primary resize-none h-24" />
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-on-surface-variant hover:bg-surface-variant rounded-lg transition-colors font-bold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
