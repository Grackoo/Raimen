import React, { useState } from 'react';
import { Lock, Loader2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AdminOverrideModalProps {
  onSuccess: () => void;
  onCancel: () => void;
  actionName?: string;
}

export function AdminOverrideModal({ onSuccess, onCancel, actionName = 'esta acción' }: AdminOverrideModalProps) {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // Find a user with role 'admin' and this PIN
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('pin', pin)
        .eq('role', 'admin')
        .single();

      if (error || !data) {
        throw new Error('PIN incorrecto o no tienes permisos de administrador');
      }

      onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 bg-error text-on-error flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2"><Lock size={20} /> Autorización Requerida</h3>
          <button onClick={onCancel} className="hover:bg-error-container hover:text-on-error-container rounded-full p-1 transition-colors"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-body-sm text-on-surface-variant mb-4">
            Se requieren permisos de Administrador para {actionName}.
          </p>
          <div className="flex flex-col gap-2 mb-6">
            <label className="text-label-caps text-on-surface-variant">PIN de Administrador</label>
            <input 
              type="password" 
              required
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-full bg-surface border border-outline-variant rounded-lg h-12 px-4 text-center tracking-[0.5em] text-title-lg focus:ring-2 focus:ring-error focus:border-error outline-none"
            />
            {errorMsg && <p className="text-error text-label-caps font-bold">{errorMsg}</p>}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-variant transition-colors font-medium">Cancelar</button>
            <button type="submit" disabled={loading || !pin} className="flex-1 py-3 rounded-lg bg-error text-on-error hover:bg-error/90 transition-colors font-medium flex justify-center items-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Autorizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
