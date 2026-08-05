import React, { useState, useEffect } from 'react';
import { Lock, Unlock, Monitor, Clock, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface POSLoginViewProps {
  onLogin: () => void;
}

interface User {
  id: string;
  username: string;
  full_name: string;
  role: string;
}

export function POSLoginView({ onLogin }: POSLoginViewProps) {
  const [timeStr, setTimeStr] = useState('');
  const [isOpening, setIsOpening] = useState(false);
  const [isOpened, setIsOpened] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  
  const [selectedUsername, setSelectedUsername] = useState('');
  const [pin, setPin] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(`${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const { data, error } = await supabase.from('users').select('id, username, full_name, role');
        if (error) throw error;
        setUsers(data || []);
        if (data && data.length > 0) {
          setSelectedUsername(data[0].username);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoadingUsers(false);
      }
    }
    fetchUsers();
  }, []);

  const handleOpen = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpening(true);
    setErrorMsg('');

    try {
      // Validate with Supabase
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', selectedUsername)
        .eq('pin', pin)
        .single();

      if (error || !data) {
        throw new Error('PIN incorrecto o usuario no encontrado');
      }

      // Success
      setIsOpening(false);
      setIsOpened(true);
      // In a real app we'd save the logged in user/cashier to a global state/context here.
      setTimeout(() => {
        onLogin();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de autenticación');
      setIsOpening(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-background text-on-background w-full">
      <div className="w-full max-w-lg">
        {/* Logo Section */}
        <div className="hidden md:flex flex-col items-center justify-center mb-8">
          <span className="text-display-lg font-bold text-primary">RAIMEN</span>
          <p className="text-body-sm text-on-surface-variant mt-2">Retail Management System</p>
        </div>

        {/* Login Card */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 md:p-8 shadow-md w-full">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-container">
            <h1 className="text-title-md text-on-surface">Gestión de Caja</h1>
            
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${isOpened ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'}`}>
              {isOpened ? <Unlock size={16} /> : <Lock size={16} />}
              <span className="text-label-caps">{isOpened ? 'Caja Abierta' : 'Caja Cerrada'}</span>
            </div>
          </div>

          <form onSubmit={handleOpen} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-label-caps text-on-surface-variant">Operador</label>
              <select 
                disabled={isOpened || loadingUsers}
                value={selectedUsername}
                onChange={(e) => setSelectedUsername(e.target.value)}
                className="w-full bg-surface border border-outline-variant rounded-lg h-12 px-4 text-on-surface focus:ring-primary focus:border-primary text-body-md outline-none"
              >
                {loadingUsers ? (
                  <option>Cargando usuarios...</option>
                ) : (
                  users.map(u => (
                    <option key={u.id} value={u.username}>{u.full_name || u.username} - {u.role}</option>
                  ))
                )}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-label-caps text-on-surface-variant">PIN de Acceso</label>
              <input 
                type="password"
                disabled={isOpened}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-surface border border-outline-variant rounded-lg h-12 px-4 text-on-surface focus:ring-primary focus:border-primary text-body-md outline-none"
              />
            </div>

            <div className="flex flex-col gap-2 pt-4 border-t border-surface-container">
              <label className="text-label-caps text-on-surface-variant">Monto Inicial (Apertura)</label>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-data-mono text-on-surface-variant">$</span>
                <input 
                  type="number" 
                  disabled={isOpened}
                  required
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(e.target.value)}
                  step="0.01"
                  placeholder="0.00"
                  className="w-full bg-surface border border-outline-variant rounded-lg h-16 pl-10 pr-4 text-on-surface focus:ring-primary focus:border-primary text-data-mono text-xl outline-none"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="text-error text-body-sm font-semibold">{errorMsg}</div>
            )}

            <div className="flex items-center gap-2 text-on-surface-variant bg-surface-container-low p-3 rounded-lg">
              <Clock size={18} />
              <span className="text-data-mono text-xs">{timeStr}</span>
            </div>

            <button 
              type="submit"
              disabled={isOpening || isOpened || loadingUsers}
              className={`w-full h-12 mt-2 rounded-lg text-title-md flex items-center justify-center gap-2 transition-all shadow-sm ${
                isOpened 
                  ? 'bg-secondary text-on-secondary' 
                  : 'bg-primary text-on-primary hover:bg-on-surface active:scale-95'
              } disabled:opacity-50`}
            >
              {isOpened ? (
                <>Caja Abierta Exitosamente</>
              ) : isOpening ? (
                <><Loader2 className="animate-spin" size={20} /> Procesando...</>
              ) : (
                <>
                  <Monitor size={20} />
                  Apertura de Caja
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 flex justify-center gap-4">
          <button className="text-on-surface-variant text-label-caps hover:text-primary transition-colors">SOPORTE TÉCNICO</button>
          <span className="text-outline-variant">•</span>
          <button className="text-on-surface-variant text-label-caps hover:text-primary transition-colors">CAMBIAR TURNO</button>
          <span className="text-outline-variant">•</span>
          <button onClick={() => window.location.hash = 'tienda'} className="text-on-surface-variant text-label-caps hover:text-primary transition-colors font-bold">VISITAR TIENDA EN LÍNEA</button>
        </div>
      </div>
    </div>
  );
}
