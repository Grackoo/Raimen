import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, Package, DollarSign, AlertCircle, RefreshCw } from 'lucide-react';

export function ReportsView() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProductsSold: 0,
    lowStockItems: 0,
  });
  
  const [topProducts, setTopProducts] = useState<any[]>([]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Fetch total sales
      const { data: salesData } = await supabase.from('sales').select('total, created_at');
      const totalSales = salesData?.reduce((acc, sale) => acc + (sale.total || 0), 0) || 0;

      // Fetch products to check stock and calculate top products
      // We will do a simple join or manual count for top products
      // Due to the schema, sale_items has product_id and quantity
      const { data: saleItems } = await supabase.from('sale_items').select('product_id, quantity');
      
      const productCounts: Record<string, number> = {};
      let totalProductsSold = 0;
      
      if (saleItems) {
        saleItems.forEach(item => {
          productCounts[item.product_id] = (productCounts[item.product_id] || 0) + item.quantity;
          totalProductsSold += item.quantity;
        });
      }

      // Fetch all products
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

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 bg-background flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-display-lg font-bold text-on-surface tracking-tight">Reportes y Estadísticas</h2>
          <p className="text-body-md text-on-surface-variant mt-1">Resumen general del rendimiento del negocio.</p>
        </div>
        <button onClick={fetchReports} className="flex items-center gap-2 px-4 py-2 bg-surface-container-low hover:bg-surface-container-high rounded-lg text-primary transition-colors font-bold">
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-on-surface-variant">Cargando datos...</div>
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
              <p className="text-display-lg font-black text-on-surface mt-2">{stats.lowStockItems} <span className="text-title-md font-normal text-on-surface-variant">productos</span></p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <Package className="text-primary" size={24} />
                <h3 className="text-title-lg font-bold text-on-surface">Top 5 Productos Más Vendidos</h3>
              </div>
              
              {topProducts.length === 0 ? (
                <p className="text-on-surface-variant">No hay suficientes datos de ventas aún.</p>
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
