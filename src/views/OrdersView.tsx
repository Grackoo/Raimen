import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingCart, ExternalLink, Box, Truck, User } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSales() {
      try {
        const { data, error } = await supabase
          .from('sales')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setSales(data || []);
      } catch (err) {
        console.error('Error fetching sales:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSales();
  }, []);

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-headline-lg text-on-surface">Historial de Ventas</h2>
            <p className="text-body-sm text-on-surface-variant mt-1">Registro de todas las transacciones locales y en línea</p>
          </div>
          <div className="hidden sm:flex gap-2">
            <button className="px-4 py-2 bg-primary text-on-primary rounded-lg text-title-md flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm">
              <ExternalLink size={18} /> Exportar Reporte
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
                    <tr key={sale.id} className="hover:bg-surface-container-low transition-colors cursor-pointer group">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-on-surface shrink-0">
                            <ShoppingCart size={18} />
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
    </main>
  );
}
