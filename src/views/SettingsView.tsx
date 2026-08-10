import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Settings, Users, Store, Shield, Plus, Loader2, Edit2, Trash2, Check, X } from 'lucide-react';

export function SettingsView() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingUser, setAddingUser] = useState(false);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState({ name: '', role: '', branch_id: '', pin: '', active: true });

  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  const [editBranchForm, setEditBranchForm] = useState({ name: '', location: '', type: '' });

  const [motives, setMotives] = useState<any[]>([]);
  const [newMotive, setNewMotive] = useState('');
  const [editingMotiveId, setEditingMotiveId] = useState<string | null>(null);
  const [editMotiveName, setEditMotiveName] = useState('');

  const [newUser, setNewUser] = useState({
    username: '',
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
      const [usersRes, branchesRes, motivesRes] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('branches').select('*'),
        supabase.from('expense_categories').select('*').order('name')
      ]);
      if (usersRes.data) setUsers(usersRes.data);
      if (branchesRes.data) setBranches(branchesRes.data);
      if (motivesRes.data) setMotives(motivesRes.data);
      
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
      setNewUser({ username: '', name: '', pin: '', role: 'cashier', branch_id: branches[0]?.id || '' });
      fetchData();
    } catch (err) {
      console.error(err);
      alert(`Error creando usuario: ${err.message || 'Error desconocido'}`);
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
      alert(`Error creando sucursal: ${err.message || 'Error desconocido'}`);
    } finally {
      setAddingUser(false);
    }
  };

  const startEditUser = (user: any) => {
    setEditingUserId(user.id);
    setEditUserForm({ username: user.username || '', name: user.name || user.full_name || '', role: user.role || 'cashier', branch_id: user.branch_id || '', pin: '', active: user.active });
  };

  const handleUpdateUser = async () => {
    try {
      const updateData: any = { 
        username: editUserForm.username,
        name: editUserForm.name, 
        role: editUserForm.role, 
        branch_id: editUserForm.branch_id,
        active: editUserForm.active
      };
      if (editUserForm.pin) updateData.pin = editUserForm.pin;
      
      const { error } = await supabase.from('users').update(updateData).eq('id', editingUserId);
      if (error) throw error;
      setEditingUserId(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error actualizando usuario');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    try {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error eliminando usuario. Es posible que tenga ventas asociadas.');
    }
  };

  const startEditBranch = (branch: any) => {
    setEditingBranchId(branch.id);
    setEditBranchForm({ name: branch.name || '', location: branch.location || '', type: branch.type || 'physical' });
  };

  const handleUpdateBranch = async () => {
    try {
      const { error } = await supabase.from('branches').update(editBranchForm).eq('id', editingBranchId);
      if (error) throw error;
      setEditingBranchId(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error actualizando sucursal');
    }
  };

  const handleDeleteBranch = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta sucursal?')) return;
    try {
      const { error } = await supabase.from('branches').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error eliminando sucursal. Es posible que tenga productos o ventas asociadas.');
    }
  };

  const handleAddMotive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMotive.trim()) return;
    try {
      const { error } = await supabase.from('expense_categories').insert([{ name: newMotive.trim() }]);
      if (error) throw error;
      setNewMotive('');
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error agregando motivo (puede que ya exista)');
    }
  };

  const handleUpdateMotive = async () => {
    if (!editMotiveName.trim()) return;
    try {
      const { error } = await supabase.from('expense_categories').update({ name: editMotiveName.trim() }).eq('id', editingMotiveId);
      if (error) throw error;
      setEditingMotiveId(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error actualizando motivo');
    }
  };

  const handleDeleteMotive = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este motivo?')) return;
    try {
      const { error } = await supabase.from('expense_categories').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error eliminando motivo');
    }
  };

  return (
    <main className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      {/* Settings layout */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        
        {/* Sidebar */}
        <div className="w-full lg:w-64 border-r border-outline-variant bg-surface-container-lowest shrink-0">
          <div className="p-6 border-b border-outline-variant">
            <h2 className="text-title-lg font-bold text-on-surface">Configuración del Sistema</h2>
            <p className="text-body-sm text-on-surface-variant mt-1">Administra usuarios, sucursales y preferencias</p>
          </div>
          <nav className="p-4 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible">
            <button 
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-3 p-3 rounded-lg text-left transition-colors whitespace-nowrap ${activeTab === 'users' ? 'bg-primary-fixed text-on-primary-fixed' : 'hover:bg-surface-variant text-on-surface'}`}
            >
              <Users size={20} /> <span className="text-title-md font-medium">Usuarios y Cajeros</span>
            </button>
            <button 
              onClick={() => setActiveTab('branches')}
              className={`flex items-center gap-3 p-3 rounded-lg text-left transition-colors whitespace-nowrap ${activeTab === 'branches' ? 'bg-primary-fixed text-on-primary-fixed' : 'hover:bg-surface-variant text-on-surface'}`}
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
              onClick={() => setActiveTab('motives')}
              className={`flex items-center gap-3 w-full p-3 rounded-lg text-left transition-colors ${activeTab === 'motives' ? 'bg-primary-fixed text-on-primary-fixed' : 'hover:bg-surface-variant text-on-surface'}`}
            >
              <Settings size={20} /> <span className="text-title-md font-medium">Motivos de Gasto</span>
            </button>
            <button 
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-3 w-full p-3 rounded-lg text-left transition-colors ${activeTab === 'general' ? 'bg-primary-fixed text-on-primary-fixed' : 'hover:bg-surface-variant text-on-surface'}`}
            >
              <Settings size={20} /> <span className="text-title-md font-medium">General</span>
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 lg:pb-8">
          <div className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm min-h-[500px]">
            
            {activeTab === 'motives' && (
              <div className="space-y-6">
                <h3 className="text-title-lg text-on-surface border-b border-outline-variant pb-2">Motivos de Gasto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-title-md text-on-surface mb-4">Agregar Nuevo Motivo</h4>
                    <form onSubmit={handleAddMotive} className="space-y-4">
                      <div>
                        <label className="text-label-caps text-on-surface-variant block mb-1">Nombre del Motivo</label>
                        <input required value={newMotive} onChange={e => setNewMotive(e.target.value)} type="text" className="w-full bg-surface border border-outline-variant rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none" />
                      </div>
                      <button type="submit" className="bg-primary text-on-primary px-4 py-2 rounded-lg flex items-center justify-center gap-2 w-full hover:opacity-90">
                        <Plus size={18} /> Guardar Motivo
                      </button>
                    </form>
                  </div>
                  <div>
                    <h4 className="text-title-md text-on-surface mb-4">Motivos Actuales</h4>
                    <div className="space-y-3">
                      {loading ? (
                        <p className="text-on-surface-variant text-body-sm">Cargando...</p>
                      ) : (
                        motives.map(m => (
                          <div key={m.id} className="flex items-center justify-between p-3 border border-outline-variant rounded-lg bg-surface">
                            {editingMotiveId === m.id ? (
                              <input value={editMotiveName} onChange={e => setEditMotiveName(e.target.value)} className="bg-surface-container border border-outline-variant rounded p-1 flex-1 mr-2 text-on-surface outline-none" />
                            ) : (
                              <div className="flex-1">
                                <p className="font-bold text-on-surface">{m.name}</p>
                              </div>
                            )}
                            
                            <div className="flex gap-2">
                              {editingMotiveId === m.id ? (
                                <>
                                  <button onClick={handleUpdateMotive} className="text-primary hover:bg-surface-variant p-2 rounded-lg transition-colors"><Check size={18} /></button>
                                  <button onClick={() => setEditingMotiveId(null)} className="text-error hover:bg-error/10 p-2 rounded-lg transition-colors"><X size={18} /></button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => { setEditingMotiveId(m.id); setEditMotiveName(m.name); }} className="text-on-surface-variant hover:bg-surface-variant p-2 rounded-lg transition-colors"><Edit2 size={18} /></button>
                                  <button onClick={() => handleDeleteMotive(m.id)} className="text-error hover:bg-error/10 p-2 rounded-lg transition-colors"><Trash2 size={18} /></button>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="space-y-6">
                <h3 className="text-title-lg text-on-surface border-b border-outline-variant pb-2">Gestión de Usuarios</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h4 className="text-title-md text-on-surface mb-4">Agregar Nuevo Usuario</h4>
                    <form onSubmit={handleAddUser} className="space-y-4">
                      <div>
                        <label className="text-label-caps text-on-surface-variant block mb-1">Usuario (Alias / ID)</label>
                        <input required value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value.toLowerCase().replace(/\s+/g, '')})} type="text" placeholder="ej. juanperez" className="w-full bg-surface border border-outline-variant rounded-lg p-2 focus:ring-2 focus:ring-primary outline-none" />
                      </div>
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
                          <div key={u.id} className="p-3 bg-surface rounded-lg border border-outline-variant flex flex-col gap-2">
                            {editingUserId === u.id ? (
                              <div className="space-y-2">
                                <input value={editUserForm.username} onChange={e => setEditUserForm({...editUserForm, username: e.target.value.toLowerCase().replace(/\s+/g, '')})} className="w-full bg-surface-container-lowest border border-outline-variant rounded p-1 text-sm outline-none" placeholder="Usuario (Alias)" />
                                <input value={editUserForm.name} onChange={e => setEditUserForm({...editUserForm, name: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded p-1 text-sm outline-none" placeholder="Nombre completo" />
                                <input type="password" value={editUserForm.pin} onChange={e => setEditUserForm({...editUserForm, pin: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded p-1 text-sm outline-none" placeholder="Nuevo PIN (Opcional)" />
                                <div className="flex gap-2">
                                  <select value={editUserForm.role} onChange={e => setEditUserForm({...editUserForm, role: e.target.value})} className="w-1/2 bg-surface-container-lowest border border-outline-variant rounded p-1 text-sm outline-none">
                                    <option value="cashier">Cajero</option>
                                    <option value="admin">Administrador</option>
                                  </select>
                                  <select value={editUserForm.branch_id} onChange={e => setEditUserForm({...editUserForm, branch_id: e.target.value})} className="w-1/2 bg-surface-container-lowest border border-outline-variant rounded p-1 text-sm outline-none">
                                    {branches.map(b => (
                                      <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex justify-end gap-2 mt-2">
                                  <button onClick={() => setEditingUserId(null)} className="p-1 text-on-surface-variant hover:bg-surface-variant rounded"><X size={16} /></button>
                                  <button onClick={handleUpdateUser} className="p-1 text-primary hover:bg-primary-container rounded"><Check size={16} /></button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-body-md font-bold text-on-surface">{u.name}</p>
                                  <p className="text-body-sm text-on-surface-variant uppercase text-[10px]">{u.role}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`w-2 h-2 rounded-full ${u.active ? 'bg-green-500' : 'bg-red-500'} mr-2`}></span>
                                  <button onClick={() => startEditUser(u)} className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-md transition-colors"><Edit2 size={16} /></button>
                                  <button onClick={() => handleDeleteUser(u.id)} className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container rounded-md transition-colors"><Trash2 size={16} /></button>
                                </div>
                              </div>
                            )}
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
                          <div key={b.id} className="p-3 bg-surface rounded-lg border border-outline-variant flex flex-col gap-2">
                            {editingBranchId === b.id ? (
                              <div className="space-y-2">
                                <input value={editBranchForm.name} onChange={e => setEditBranchForm({...editBranchForm, name: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded p-1 text-sm outline-none" placeholder="Nombre de sucursal" />
                                <input value={editBranchForm.location} onChange={e => setEditBranchForm({...editBranchForm, location: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded p-1 text-sm outline-none" placeholder="Ubicación" />
                                <select value={editBranchForm.type} onChange={e => setEditBranchForm({...editBranchForm, type: e.target.value})} className="w-full bg-surface-container-lowest border border-outline-variant rounded p-1 text-sm outline-none">
                                  <option value="physical">Física (Tienda)</option>
                                  <option value="virtual">Virtual (E-commerce / ML)</option>
                                  <option value="warehouse">Almacén Central</option>
                                </select>
                                <div className="flex justify-end gap-2 mt-2">
                                  <button onClick={() => setEditingBranchId(null)} className="p-1 text-on-surface-variant hover:bg-surface-variant rounded"><X size={16} /></button>
                                  <button onClick={handleUpdateBranch} className="p-1 text-primary hover:bg-primary-container rounded"><Check size={16} /></button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-body-md font-bold text-on-surface">{b.name}</p>
                                  <p className="text-body-sm text-on-surface-variant">{b.location} &bull; <span className="uppercase text-[10px] text-primary">{b.type}</span></p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => startEditBranch(b)} className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-variant rounded-md transition-colors"><Edit2 size={16} /></button>
                                  <button onClick={() => handleDeleteBranch(b.id)} className="p-1.5 text-on-surface-variant hover:text-error hover:bg-error-container rounded-md transition-colors"><Trash2 size={16} /></button>
                                </div>
                              </div>
                            )}
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
