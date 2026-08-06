import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, Package, DollarSign, AlertCircle, RefreshCw } from 'lucide-react';

export function ReportsView() {
  const [loading, setLoading] = useState(true);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('month'); // today, week, month, quarter, semester, year

  const [stats, setStats] = useState({
    totalSales: 0,
    totalProductsSold: 0,
    lowStockItems: 0,
  });
  
  const [topProducts, setTopProducts] = useState<any[]>([]);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [selectedBranch, dateFilter]);

  async function fetchBranches() {
    const { data } = await supabase.from('branches').select('id, name');
    if (data) setBranches(data);
  }

  function getStartDate() {
    const now = new Date();
    let startDate = new Date();
    if (dateFilter === 'today') startDate.setHours(0,0,0,0);
    else if (dateFilter === 'week') startDate.setDate(now.getDate() - 7);
    else if (dateFilter === 'month') startDate.setMonth(now.getMonth() - 1);
    else if (dateFilter === 'quarter') startDate.setMonth(now.getMonth() - 3);
    else if (dateFilter === 'semester') startDate.setMonth(now.getMonth() - 6);
    else if (dateFilter === 'year') startDate.setFullYear(now.getFullYear() - 1);
    return startDate.toISOString();
  }

  const fetchReports = async () => {
    setLoading(true);
    try {
      const startDate = getStartDate();

      // Fetch total sales
      let salesQuery = supabase.from('sales').select('id, total, created_at').gte('created_at', startDate);
      if (selectedBranch !== 'all') {
        salesQuery = salesQuery.eq('branch_id', selectedBranch);
      }
      
      const { data: salesData } = await salesQuery;
      const totalSales = salesData?.reduce((acc, sale) => acc + (sale.total || 0), 0) || 0;
      const saleIds = salesData?.map(s => s.id) || [];

      // Fetch sale items for top products
      let productCounts: Record<string, number> = {};
      let totalProductsSold = 0;

      if (saleIds.length > 0) {
        const { data: saleItems } = await supabase.from('sale_items').select('product_id, quantity').in('sale_id', saleIds);
        if (saleItems) {
          saleItems.forEach(item => {
            productCounts[item.product_id] = (productCounts[item.product_id] || 0) + item.quantity;
            totalProductsSold += item.quantity;
          });
        }
      }

      // Fetch all products to get names and check low stock
      const { data: products } = await supabase.from('products').select('id, name, stock');
      let lowStock = 0;
      const productsMap: Record<string, any> = {};
      
      if (products) {
        products.forEach(p => {
          productsMap[p.id] = p;
          if (p.stock < 10) lowStock++;
        });
      }

      // Sort top products
      const top = Object.entries(productCounts)
        .map(([id, qty]) => ({
          name: productsMap[id]?.name || 'Producto Eliminado',
          quantity: qty
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      setTopProducts(top);
      setStats({
        totalSales,
        totalProductsSold,
        lowStockItems: lowStock
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 bg-background flex flex-col gap-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-display-lg font-bold text-on-surface tracking-tight">Reportes y Estadísticas</h2>
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <div className="flex items-center gap-2">
              <span className="text-body-sm text-on-surface-variant font-bold">SUCURSAL:</span>
              <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="bg-surface-container-low border border-outline-variant rounded-md text-body-sm px-2 py-1 outline-none">
                <option value="all">Todas</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-body-sm text-on-surface-variant font-bold">PERIODO:</span>
              <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="bg-surface-container-low border border-outline-variant rounded-md text-body-sm px-2 py-1 outline-none">
                <option value="today">Hoy</option>
                <option value="week">Últimos 7 días</option>
                <option value="month">Este Mes</option>
                <option value="quarter">Este Trimestre</option>
                <option value="semester">Este Semestre</option>
                <option value="year">Este Año</option>
              </select>
            </div>
          </div>
        </div>
        <button onClick={fetchReports} className="flex items-center gap-2 px-4 py-2 bg-surface-container-low hover:bg-surface-container-high rounded-lg text-primary transition-colors font-bold">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-on-surface-variant">Calculando estadísticas...</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col gap-2">
              <div className="flex items-center gap-3 text-on-surface-variant">
                <div className="p-2 bg-primary-container text-on-primary-container rounded-lg"><DollarSign size={24} /></div>
                <h3 className="text-title-md font-bold">Ventas Totales</h3>
              </div>
              <p className="text-display-lg font-black text-on-surface mt-2">${stats.totalSales.toFixed(2)}</p>
            </div>
            
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col gap-2">
              <div className="flex items-center gap-3 text-on-surface-variant">
                <div className="p-2 bg-secondary-container text-on-secondary-container rounded-lg"><TrendingUp size={24} /></div>
                <h3 className="text-title-md font-bold">Artículos Vendidos</h3>
              </div>
              <p className="text-display-lg font-black text-on-surface mt-2">{stats.totalProductsSold}</p>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col gap-2">
              <div className="flex items-center gap-3 text-on-surface-variant">
                <div className="p-2 bg-error-container text-on-error-container rounded-lg"><AlertCircle size={24} /></div>
                <h3 className="text-title-md font-bold">Stock Bajo</h3>
              </div>
              <p className="text-display-lg font-black text-on-surface mt-2">{stats.lowStockItems} <span className="text-title-md font-normal text-on-surface-variant">productos globales</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <Package className="text-primary" size={24} />
                <h3 className="text-title-lg font-bold text-on-surface">Top 5 Productos Más Vendidos</h3>
              </div>
              
              {topProducts.length === 0 ? (
                <p className="text-on-surface-variant">No hay suficientes datos de ventas en este periodo.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {topProducts.map((prod, index) => {
                    const maxQty = topProducts[0]?.quantity || 1;
                    const percentage = Math.round((prod.quantity / maxQty) * 100);
                    return (
                      <div key={index} className="flex flex-col gap-1">
                        <div className="flex justify-between items-center text-body-sm font-bold text-on-surface">
                          <span>{index + 1}. {prod.name}</span>
                          <span>{prod.quantity} uds</span>
                        </div>
                        <div className="w-full bg-surface-variant h-3 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full rounded-full transition-all duration-1000" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
