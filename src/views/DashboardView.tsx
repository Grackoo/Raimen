import React, { useState, useEffect } from 'react';
import { Plus, DollarSign, TrendingUp, TrendingDown, Box, Info, ShoppingBag, Receipt, AlertCircle, Calendar, Award, Flame, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ProductModal } from '../components/ProductModal';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface DashboardProps {
  onViewChange?: (view: string) => void;
}

interface TopProduct {
  id: string;
  name: string;
  sku: string;
  category: string;
  image?: string;
  totalQty: number;
  totalRevenue: number;
}

export function DashboardView({ onViewChange }: DashboardProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('month');
  
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [kpis, setKpis] = useState({
    ventasTotales: 0,
    gastosTotales: 0,
    utilidad: 0,
    stockActivo: 0,
    numVentas: 0
  });
  
  const getLocalDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper: Get last day of previous month
  const getLastDayOfPreviousMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 0);
  };

  // Helper: Get last day of current month
  const getLastDayOfCurrentMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 0);
  };

  const [customStartDate, setCustomStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [stockAlertThreshold, setStockAlertThreshold] = useState<number>(10);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    calculateDashboard();
  }, [selectedBranch, dateFilter, customStartDate, customEndDate, stockAlertThreshold]);

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
    else if (dateFilter === 'last_month_end_to_this_month_end') {
      const prevLast = getLastDayOfPreviousMonth();
      return new Date(prevLast.getFullYear(), prevLast.getMonth(), prevLast.getDate(), 0, 0, 0, 0);
    }
    else if (dateFilter === 'custom') {
      const [sy, sm, sd] = (customStartDate || '').split('-').map(Number);
      return new Date(sy, sm - 1, sd, 0, 0, 0, 0);
    }
    return startDate;
  }

  function getEndDate() {
    if (dateFilter === 'last_month_end_to_this_month_end') {
      const currLast = getLastDayOfCurrentMonth();
      return new Date(currLast.getFullYear(), currLast.getMonth(), currLast.getDate(), 23, 59, 59, 999);
    }
    if (dateFilter === 'custom') {
      const [ey, em, ed] = (customEndDate || '').split('-').map(Number);
      return new Date(ey, em - 1, ed, 23, 59, 59, 999);
    }
    return new Date();
  }

  async function calculateDashboard() {
    setLoading(true);
    const startObj = getStartDate();
    const endObj = getEndDate();
    const startDate = startObj.toISOString();
    const endDate = endObj.toISOString();

    let salesQuery = supabase.from('sales').select('id, total, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);
    if (selectedBranch !== 'all') salesQuery = salesQuery.eq('branch_id', selectedBranch);
    const { data: sales } = await salesQuery;

    let expensesQuery = supabase.from('expenses').select('amount, date')
      .gte('date', startDate)
      .lte('date', endDate);
    if (selectedBranch !== 'all') expensesQuery = expensesQuery.eq('branch_id', selectedBranch);
    const { data: expenses } = await expensesQuery;

    const saleIds = sales?.map(s => s.id) || [];
    const ventasTotales = sales?.reduce((acc, s) => acc + s.total, 0) || 0;
    const numVentas = sales?.length || 0;
    const gastosTotales = expenses?.reduce((acc, e) => acc + e.amount, 0) || 0;

    let stockQuery = supabase.from('products').select('id, name, sku, stock, category, image').eq('active', true);
    if (selectedBranch !== 'all') stockQuery = stockQuery.eq('branch_id', selectedBranch);
    const { data: products } = await stockQuery;
    const stockActivo = products?.reduce((acc, p) => acc + p.stock, 0) || 0;

    const productMap = new Map((products || []).map(p => [p.id, p]));

    // Top Selling Products in selected period
    let cogs = 0;
    const productSalesAgg: Record<string, { qty: number; revenue: number }> = {};

    if (saleIds.length > 0) {
      // Chunk saleIds to avoid URL length issues if large number of sales
      const chunkSize = 100;
      for (let i = 0; i < saleIds.length; i += chunkSize) {
        const chunk = saleIds.slice(i, i + chunkSize);
        const { data: items } = await supabase
          .from('sale_items')
          .select('product_id, quantity, price_at_time, products(cost)')
          .in('sale_id', chunk);

        items?.forEach(item => {
          const cost = (item.products as any)?.cost || 0;
          cogs += cost * (Number(item.quantity) || 0);

          if (item.product_id) {
            if (!productSalesAgg[item.product_id]) {
              productSalesAgg[item.product_id] = { qty: 0, revenue: 0 };
            }
            const q = Number(item.quantity) || 0;
            productSalesAgg[item.product_id].qty += q;
            productSalesAgg[item.product_id].revenue += q * (Number(item.price_at_time) || 0);
          }
        });
      }
    }

    const sortedTopProducts: TopProduct[] = Object.entries(productSalesAgg)
      .map(([prodId, agg]) => {
        const p = productMap.get(prodId);
        return {
          id: prodId,
          name: p?.name || 'Producto General',
          sku: p?.sku || 'N/A',
          category: p?.category || 'General',
          image: p?.image,
          totalQty: agg.qty,
          totalRevenue: agg.revenue
        };
      })
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 6);

    setTopProducts(sortedTopProducts);

    // Low stock products (Alerts)
    // Filter products with stock <= threshold (default 10 or custom)
    const lowStock = (products || [])
      .filter(p => p.stock <= stockAlertThreshold)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 8);
    setLowStockProducts(lowStock);

    const utilidad = ventasTotales - cogs - gastosTotales;
    setKpis({ ventasTotales, gastosTotales, utilidad, stockActivo, numVentas });

    // Generate Chart Data
    const days = Math.max(1, Math.round((endObj.getTime() - startObj.getTime()) / (1000 * 60 * 60 * 24)));
    const dataMap: Record<string, { name: string, Ventas: number, Gastos: number }> = {};
    
    sales?.forEach(s => {
      const d = new Date(s.created_at);
      const key = days <= 35 ? `${d.getDate()}/${d.getMonth()+1}` : `${d.getMonth()+1}/${d.getFullYear()}`;
      if (!dataMap[key]) dataMap[key] = { name: key, Ventas: 0, Gastos: 0 };
      dataMap[key].Ventas += s.total;
    });

    expenses?.forEach(e => {
      const d = new Date(e.date);
      const key = days <= 35 ? `${d.getDate()}/${d.getMonth()+1}` : `${d.getMonth()+1}/${d.getFullYear()}`;
      if (!dataMap[key]) dataMap[key] = { name: key, Ventas: 0, Gastos: 0 };
      dataMap[key].Gastos += e.amount;
    });

    const finalChart = Object.values(dataMap);
    setChartData(finalChart);
    
    setLoading(false);
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 bg-background flex flex-col gap-6 relative">
      {/* Premium background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-primary/5 to-transparent -z-10 pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto space-y-8 w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white/40 p-6 rounded-2xl backdrop-blur-md border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div>
            <h2 className="text-display-lg text-on-surface font-black tracking-tight">Dashboard de Operaciones</h2>
            <p className="text-body-md text-on-surface-variant mt-1">Métricas y KPIs en tiempo real.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-label-caps text-on-surface-variant">Sucursal</span>
              <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="bg-white border border-outline-variant/30 rounded-lg h-10 px-3 text-title-md font-bold text-primary shadow-sm outline-none focus:border-primary transition-colors cursor-pointer">
                <option value="all">Todas las Sucursales</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-label-caps text-on-surface-variant">Periodo</span>
              <div className="flex items-center gap-2">
                <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="bg-white border border-outline-variant/30 rounded-lg h-10 px-3 text-title-md font-bold text-on-surface shadow-sm outline-none focus:border-primary transition-colors cursor-pointer max-w-[280px]">
                  <option value="last_month_end_to_this_month_end">
                    Últ. día mes ant. al últ. día mes actual ({getLocalDateString(getLastDayOfPreviousMonth())} al {getLocalDateString(getLastDayOfCurrentMonth())})
                  </option>
                  <option value="today">Hoy</option>
                  <option value="week">Últimos 7 días</option>
                  <option value="month">Este Mes</option>
                  <option value="quarter">Este Trimestre</option>
                  <option value="semester">Este Semestre</option>
                  <option value="year">Este Año</option>
                  <option value="custom">Personalizado (Rango específico)</option>
                </select>
                {dateFilter === 'custom' && (
                  <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border border-outline-variant/30 shadow-sm">
                    <span className="text-[11px] font-semibold text-on-surface-variant">Desde:</span>
                    <input 
                      type="date" 
                      value={customStartDate} 
                      onChange={e => setCustomStartDate(e.target.value)}
                      className="h-8 px-2 bg-transparent text-body-sm outline-none cursor-pointer"
                    />
                    <span className="text-[11px] font-semibold text-on-surface-variant">Hasta:</span>
                    <input 
                      type="date" 
                      value={customEndDate} 
                      onChange={e => setCustomEndDate(e.target.value)}
                      className="h-8 px-2 bg-transparent text-body-sm outline-none cursor-pointer"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><div className="animate-pulse text-on-surface-variant font-bold flex items-center gap-3"><TrendingUp className="animate-bounce"/> Calculando métricas...</div></div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[
                { label: 'Ingresos Brutos', value: `$${kpis.ventasTotales.toFixed(2)}`, sub: `${kpis.numVentas} tickets emitidos`, icon: DollarSign, color: 'text-primary', bg: 'bg-primary/10' },
                { label: 'Utilidad Neta', value: `$${kpis.utilidad.toFixed(2)}`, sub: 'Ventas - Costos - Gastos', icon: TrendingUp, color: kpis.utilidad >= 0 ? 'text-secondary' : 'text-error', bg: kpis.utilidad >= 0 ? 'bg-secondary/10' : 'bg-error/10' },
                { label: 'Gastos Operativos', value: `-$${kpis.gastosTotales.toFixed(2)}`, sub: 'Salidas de efectivo', icon: TrendingDown, color: 'text-error', bg: 'bg-error/10' },
                { label: 'Stock Activo', value: kpis.stockActivo.toString(), sub: 'Unidades valorizadas', icon: Box, color: 'text-tertiary', bg: 'bg-tertiary/10' },
              ].map((card, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-6 border border-outline-variant/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
                  <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${card.bg} blur-2xl group-hover:scale-150 transition-transform duration-500`}></div>
                  <div className="flex justify-between items-start mb-6">
                    <p className="text-label-caps text-on-surface-variant z-10">{card.label}</p>
                    <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center z-10`}>
                      <card.icon size={20} className={card.color} />
                    </div>
                  </div>
                  <div className="z-10">
                    <h3 className={`text-display-lg mb-1 text-data-mono font-black ${card.color}`}>
                      {card.value}
                    </h3>
                    <div className="text-body-sm text-on-surface-variant font-medium">{card.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white border border-outline-variant/20 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-title-lg font-bold text-on-surface">Rendimiento Histórico Financiero</h3>
                    <p className="text-body-sm text-on-surface-variant">Comparativa de ingresos vs gastos en el periodo actual.</p>
                  </div>
                </div>
                <div className="w-full h-[320px]">
                  {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#000000" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ba1a1a" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#ba1a1a" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#71717a', fontSize: 12}} tickFormatter={(value) => `$${value}`} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number) => [`$${value.toFixed(2)}`, undefined]}
                        />
                        <Area type="monotone" dataKey="Ventas" stroke="#000000" strokeWidth={3} fillOpacity={1} fill="url(#colorVentas)" />
                        <Area type="monotone" dataKey="Gastos" stroke="#ba1a1a" strokeWidth={3} fillOpacity={1} fill="url(#colorGastos)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-body-md bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant">
                      No hay datos suficientes para graficar.
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white border border-outline-variant/20 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="text-tertiary" size={22} />
                    <h3 className="text-title-lg font-bold text-on-surface">Alertas de Inventario</h3>
                  </div>
                  <div className="flex items-center gap-1.5 bg-surface-container-low px-2 py-1 rounded-lg border border-outline-variant/30 text-xs">
                    <span className="text-[10px] font-semibold text-on-surface-variant">Mín:</span>
                    <select
                      value={stockAlertThreshold}
                      onChange={(e) => setStockAlertThreshold(Number(e.target.value))}
                      className="bg-transparent font-bold text-tertiary outline-none cursor-pointer text-xs"
                      title="Umbral de stock para generar alerta"
                    >
                      <option value={3}>≤ 3 unidades</option>
                      <option value={5}>≤ 5 unidades</option>
                      <option value={10}>≤ 10 unidades</option>
                      <option value={15}>≤ 15 unidades</option>
                      <option value={20}>≤ 20 unidades</option>
                    </select>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2 max-h-[300px]">
                  {lowStockProducts.length > 0 ? (
                    lowStockProducts.map((item, i) => (
                      <div key={i} className="p-3 rounded-xl border border-tertiary/20 bg-tertiary/5 flex justify-between items-center hover:bg-tertiary/10 transition-colors">
                        <div className="min-w-0 pr-2">
                          <h4 className="font-bold text-on-surface text-body-sm truncate">{item.name}</h4>
                          <p className="text-[11px] text-on-surface-variant">SKU: {item.sku}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${item.stock === 0 ? 'bg-error/10 text-error' : 'bg-tertiary/10 text-tertiary'}`}>
                            Stock: {item.stock}
                          </span>
                          <p className="text-[10px] text-on-surface-variant mt-0.5">Alerta: ≤ {stockAlertThreshold}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="w-full h-full min-h-[160px] flex flex-col items-center justify-center text-on-surface-variant text-center p-4">
                      <Box className="opacity-20 mb-2" size={32} />
                      <p className="text-body-sm font-semibold">¡Todo en orden!</p>
                      <p className="text-label-caps mt-1 text-[11px]">No hay productos con stock ≤ {stockAlertThreshold}.</p>
                    </div>
                  )}
                </div>
                <button onClick={() => onViewChange && onViewChange('inventory')} className="mt-4 w-full h-9 bg-surface-container-high rounded-lg text-body-sm font-bold text-on-surface hover:bg-surface-container-highest transition-colors">
                  Ir al Inventario
                </button>
              </div>
            </div>

            {/* Top Selling Products in Period Section */}
            <div className="bg-white border border-outline-variant/20 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <Flame className="text-amber-500" size={24} />
                    <h3 className="text-title-lg font-bold text-on-surface">Productos Más Vendidos</h3>
                  </div>
                  <p className="text-body-sm text-on-surface-variant mt-0.5">
                    Ranking de productos con mayor desplazamiento en el periodo seleccionado.
                  </p>
                </div>
                <div className="px-3 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold rounded-lg text-xs border border-amber-500/20">
                  {topProducts.length} productos destacados
                </div>
              </div>

              {topProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topProducts.map((prod, index) => (
                    <div key={prod.id} className="p-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest hover:border-primary/40 hover:shadow-md transition-all flex items-center gap-4 relative overflow-hidden group">
                      <div className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-full font-black text-xs bg-surface-variant text-on-surface-variant group-hover:bg-primary group-hover:text-on-primary transition-colors">
                        #{index + 1}
                      </div>

                      <div className="w-14 h-14 rounded-lg bg-surface-container-low overflow-hidden shrink-0 border border-outline-variant/20 flex items-center justify-center">
                        {prod.image ? (
                          <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={22} className="text-on-surface-variant opacity-60" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pr-5">
                        <h4 className="font-bold text-on-surface text-body-sm truncate" title={prod.name}>
                          {prod.name}
                        </h4>
                        <div className="text-[11px] text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                          <span className="bg-surface-variant px-1.5 py-0.2 rounded font-mono text-[10px]">{prod.sku}</span>
                          <span className="truncate">{prod.category}</span>
                        </div>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-outline-variant/30 text-xs">
                          <span className="font-extrabold text-primary text-data-mono">
                            {prod.totalQty} {prod.totalQty === 1 ? 'vendido' : 'vendidos'}
                          </span>
                          <span className="text-on-surface-variant font-mono font-medium">
                            ${prod.totalRevenue.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant text-on-surface-variant">
                  <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-body-sm font-semibold">No hay ventas registradas en el periodo seleccionado.</p>
                  <p className="text-label-caps mt-1 text-[11px]">Elige otro rango de fechas o sucursal para ver los productos más vendidos.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
