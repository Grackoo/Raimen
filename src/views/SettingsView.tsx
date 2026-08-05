import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Settings, Users, Store, Shield, Plus, Loader2 } from 'lucide-react';

export function SettingsView() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingUser, setAddingUser] = useState(false);

  const [newUser, setNewUser] = useState({
    name: '',
    pin: '',
    role: 'cashier',
    branch_id: ''
  });

  const [newBranch, setNewBranch] = useState({
    name: '',
    location: '',
    type: 'physical'
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [usersRes, branchesRes] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('branches').select('*')
      ]);
      if (usersRes.data) setUsers(usersRes.data);
      if (branchesRes.data) setBranches(branchesRes.data);
      
      if (branchesRes.data && branchesRes.data.length > 0) {
        setNewUser(prev => ({ ...prev, branch_id: branchesRes.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingUser(true);
    try {
      const { error } = await supabase.from('users').insert([
        { ...newUser, active: true }
      ]);
      if (error) throw error;
      alert('Usuario creado con éxito');
      setNewUser({ name: '', pin: '', role: 'cashier', branch_id: branches[0]?.id || '' });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error creando usuario');
    } finally {
      setAddingUser(false);
    }
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingUser(true);
    try {
      const { error } = await supabase.from('branches').insert([
        { ...newBranch }
      ]);
      if (error) throw error;
      alert('Sucursal creada con éxito');
      setNewBranch({ name: '', location: '', type: 'physical' });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error creando sucursal');
    } finally {
      setAddingUser(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-headline-lg text-on-surface">Configuración del Sistema</h2>
            <p className="text-body-sm text-on-surface-variant mt-1">Administra usuarios, sucursales y preferencias</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Tabs */}
          <div className="w-full lg:w-64 shrink-0 flex flex-col gap-2">
            <button 
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${activeTab === 'users' ? 'bg-primary-fixed text-on-primary-fixed' : 'hover:bg-surface-variant text-on-surface'}`}
            >
              <Users size={20} /> <span className="text-title-md font-medium">Usuarios y Cajeros</span>
            </button>
            <button 
              onClick={() => setActiveTab('branches')}
              className={`flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${activeTab === 'branches' ? 'bg-primary-fixed text-on-primary-fixed' : 'hover:bg-surface-variant text-on-surface'}`}
            >
              <Store size={20} /> <span className="text-title-md font-medium">Sucursales</span>
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${activeTab === 'security' ? 'bg-primary-fixed text-on-primary-fixed' : 'hover:bg-surface-variant text-on-surface'}`}
            >
              <Shield size={20} /> <span className="text-title-md font-medium">Seguridad</span>
            </button>
            <button 
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${activeTab === 'general' ? 'bg-primary-fixed text-on-primary-fixed' : 'hover:bg-surface-variant text-on-surface'}`}
            >
              <Settings size={20} /> <span className="text-title-md font-medium">General</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm min-h-[500px]">
            
            {activeTab === 'users' && (
              <div className="space-y-6">
                <h3 className="text-title-lg text-on-surface border-b border-outline-variant pb-2">Gestión de Usuarios</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-title-md text-on-surface mb-4">Agregar Nuevo Usuario</h4>
                    <form onSubmit={handleAddUser} className="space-y-4">
                      <div>
                        <label className="text-label-caps text-on-surface-variant block mb-1">Nombre Completo</label>
                        <input required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} type="text" className="w-full bg-surface border border-outline-variant rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none" />
                      </div>
                      <div>
                        <label className="text-label-caps text-on-surface-variant block mb-1">PIN de Acceso (4-6 dígitos)</label>
                        <input required value={newUser.pin} onChange={e => setNewUser({...newUser, pin: e.target.value})} type="password" pattern="\d{4,6}" className="w-full bg-surface border border-outline-variant rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none text-data-mono tracking-widest" />
                      </div>
                      <div>
                        <label className="text-label-caps text-on-surface-variant block mb-1">Rol</label>
                        <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full bg-surface border border-outline-variant rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none">
                          <option value="cashier">Cajero</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-label-caps text-on-surface-variant block mb-1">Sucursal</label>
                        <select required value={newUser.branch_id} onChange={e => setNewUser({...newUser, branch_id: e.target.value})} className="w-full bg-surface border border-outline-variant rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none">
                          {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                      <button disabled={addingUser} type="submit" className="bg-primary text-on-primary px-4 py-2 rounded-lg flex items-center justify-center gap-2 w-full hover:opacity-90 disabled:opacity-50">
                        {addingUser ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />} Guardar Usuario
                      </button>
                    </form>
                  </div>
                  
                  <div>
                    <h4 className="text-title-md text-on-surface mb-4">Usuarios Actuales</h4>
                    <div className="space-y-3">
                      {loading ? (
                        <p className="text-on-surface-variant text-body-sm">Cargando...</p>
                      ) : (
                        users.map(u => (
                          <div key={u.id} className="p-3 bg-surface rounded-lg border border-outline-variant flex justify-between items-center">
                            <div>
                              <p className="text-body-md font-bold text-on-surface">{u.name}</p>
                              <p className="text-body-sm text-on-surface-variant uppercase text-[10px]">{u.role}</p>
                            </div>
                            <span className={`w-2 h-2 rounded-full ${u.active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'branches' && (
              <div className="space-y-6">
                <h3 className="text-title-lg text-on-surface border-b border-outline-variant pb-2">Gestión de Sucursales</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-title-md text-on-surface mb-4">Agregar Sucursal</h4>
                    <form onSubmit={handleAddBranch} className="space-y-4">
                      <div>
                        <label className="text-label-caps text-on-surface-variant block mb-1">Nombre de Sucursal</label>
                        <input required value={newBranch.name} onChange={e => setNewBranch({...newBranch, name: e.target.value})} type="text" className="w-full bg-surface border border-outline-variant rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none" />
                      </div>
                      <div>
                        <label className="text-label-caps text-on-surface-variant block mb-1">Ubicación</label>
                        <input required value={newBranch.location} onChange={e => setNewBranch({...newBranch, location: e.target.value})} type="text" className="w-full bg-surface border border-outline-variant rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none" />
                      </div>
                      <div>
                        <label className="text-label-caps text-on-surface-variant block mb-1">Tipo de Sucursal</label>
                        <select value={newBranch.type} onChange={e => setNewBranch({...newBranch, type: e.target.value as any})} className="w-full bg-surface border border-outline-variant rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none">
                          <option value="physical">Física (Tienda)</option>
                          <option value="virtual">Virtual (E-commerce / ML)</option>
                          <option value="warehouse">Almacén Central</option>
                        </select>
                      </div>
                      <button disabled={addingUser} type="submit" className="bg-primary text-on-primary px-4 py-2 rounded-lg flex items-center justify-center gap-2 w-full hover:opacity-90 disabled:opacity-50">
                        {addingUser ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />} Guardar Sucursal
                      </button>
                    </form>
                  </div>
                  
                  <div>
                    <h4 className="text-title-md text-on-surface mb-4">Sucursales Actuales</h4>
                    <div className="space-y-3">
                      {loading ? (
                        <p className="text-on-surface-variant text-body-sm">Cargando...</p>
                      ) : (
                        branches.map(b => (
                          <div key={b.id} className="p-3 bg-surface rounded-lg border border-outline-variant flex justify-between items-center">
                            <div>
                              <p className="text-body-md font-bold text-on-surface">{b.name}</p>
                              <p className="text-body-sm text-on-surface-variant">{b.location} &bull; <span className="uppercase text-[10px] text-primary">{b.type}</span></p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(activeTab === 'security' || activeTab === 'general') && (
              <div className="flex items-center justify-center h-full text-on-surface-variant text-title-md">
                Próximamente
              </div>
            )}

          </div>
        </div>
      </div>
    </main>
  );
}
