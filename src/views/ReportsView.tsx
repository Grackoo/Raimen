import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TrendingUp, FileText, Download, CheckCircle, Printer, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';

export function ReportsView() {
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('month');

  // Estado de Resultados Data
  const [income, setIncome] = useState(0);
  const [cogs, setCogs] = useState(0);
  const [expenses, setExpenses] = useState(0);

  // Balance General Data
  const [cash, setCash] = useState(0); // From cash registers
  const [cardSales, setCardSales] = useState(0);
  const [transferSales, setTransferSales] = useState(0);
  const [inventoryValue, setInventoryValue] = useState(0);
  const [accountsPayable, setAccountsPayable] = useState(0);

  useEffect(() => {
    fetchBranches();
  }, []);

  useEffect(() => {
    fetchFinancials();
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

  const fetchFinancials = async () => {
    setLoading(true);
    try {
      const startDate = getStartDate();

      // 1. Ingresos por Ventas
      let salesQ = supabase.from('sales').select('id, total, payment_method').gte('created_at', startDate);
      if (selectedBranch !== 'all') salesQ = salesQ.eq('branch_id', selectedBranch);
      const { data: salesData } = await salesQ;
      
      let totalSales = 0;
      let totalCard = 0;
      let totalTransfer = 0;
      
      salesData?.forEach(s => {
        totalSales += s.total;
        if (s.payment_method === 'Tarjeta') totalCard += s.total;
        if (s.payment_method === 'Transferencia') totalTransfer += s.total;
      });
      
      setIncome(totalSales);
      setCardSales(totalCard);
      setTransferSales(totalTransfer);

      // 2. Costo de Ventas (COGS)
      const saleIds = salesData?.map(s => s.id) || [];
      let totalCogs = 0;
      if (saleIds.length > 0) {
        const { data: saleItems } = await supabase.from('sale_items').select('quantity, cost_at_time, products(cost)').in('sale_id', saleIds);
        saleItems?.forEach(item => {
          const unitCost = item.cost_at_time || ((item.products as any)?.cost || 0);
          totalCogs += unitCost * item.quantity;
        });
      }
      setCogs(totalCogs);

      // 3. Gastos Operativos
      let expQ = supabase.from('expenses').select('amount').gte('date', startDate);
      if (selectedBranch !== 'all') expQ = expQ.eq('branch_id', selectedBranch);
      const { data: expData } = await expQ;
      const totalExp = expData?.reduce((acc, e) => acc + e.amount, 0) || 0;
      setExpenses(totalExp);

      // 4. Efectivo en Caja
      let cashQ = supabase.from('cash_registers').select('actual_closing_amount').eq('status', 'closed').order('closed_at', { ascending: false }).limit(1);
      if (selectedBranch !== 'all') cashQ = cashQ.eq('branch_id', selectedBranch);
      const { data: cashData } = await cashQ;
      setCash(cashData?.[0]?.actual_closing_amount || 0);

      // 5. Valor del Inventario
      let invQ = supabase.from('products').select('stock, cost').eq('active', true);
      const { data: invData } = await invQ;
      const totalInvValue = invData?.reduce((acc, p) => acc + (p.stock * p.cost), 0) || 0;
      setInventoryValue(totalInvValue);

      // 6. Cuentas por Pagar
      let apQ = supabase.from('accounts_payable').select('amount, paid_amount').neq('status', 'paid');
      if (selectedBranch !== 'all') apQ = apQ.eq('branch_id', selectedBranch);
      const { data: apData } = await apQ;
      const totalAp = apData?.reduce((acc, ap) => acc + (ap.amount - ap.paid_amount), 0) || 0;
      setAccountsPayable(totalAp);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const grossProfit = income - cogs;
  const netProfit = grossProfit - expenses;
  const totalAssets = cash + cardSales + transferSales + inventoryValue;
  const totalLiabilities = accountsPayable;
  const equity = totalAssets - totalLiabilities; 

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'today': return 'Día Actual';
      case 'week': return 'Última Semana';
      case 'month': return 'Mensual (30 días)';
      case 'quarter': return 'Trimestral';
      case 'year': return 'Anual';
      default: return dateFilter;
    }
  };

  const getBranchLabel = () => {
    if (selectedBranch === 'all') return 'Consolidado (Todas)';
    return branches.find(b => b.id === selectedBranch)?.name || 'Sucursal';
  };

  const handlePrintPDFNative = () => {
    const reportContent = document.getElementById('financial-report-print-container');
    if (!reportContent) return;

    const win = window.open('', '', 'width=1000,height=800');
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Reporte Financiero - RAIMEN STORE</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 20px; color: #111; }
            .report-box { position: relative; background: #fff; border: 1px solid #ccc; padding: 24px; border-radius: 12px; }
            .watermark { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; opacity: 0.12; pointer-events: none; z-index: 0; }
            .watermark img { width: 450px; }
            .content { position: relative; z-index: 10; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ddd; padding-bottom: 12px; margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
            .card { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
            .card-header { padding: 12px 16px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-weight: bold; }
            .card-body { padding: 16px; font-size: 14px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 10px; }
            .row-sub { display: flex; justify-content: space-between; margin-bottom: 6px; padding-left: 16px; color: #666; font-size: 13px; }
            .row-bold { font-weight: bold; }
            .row-red { color: #dc2626; }
            .box-highlight { padding: 12px; border-radius: 8px; margin-top: 12px; font-weight: bold; display: flex; justify-content: space-between; font-size: 16px; }
            .bg-green { background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; }
            .bg-red { background: #fff1f2; border: 1px solid #fecdd3; color: #be123c; }
            .mono { font-family: monospace; font-size: 15px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div className="report-box">
            ${reportContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                window.close();
              }, 300);
            };
          </script>
        </body>
        </html>
      `);
      win.document.close();
    }
  };

  const handleDownloadPDF = async () => {
    setGeneratingPDF(true);
    try {
      const reportContent = document.getElementById('financial-report-print-container');
      if (!reportContent) return;

      const width = reportContent.offsetWidth || 850;
      const height = reportContent.offsetHeight || 1100;

      // Inline computed styles to convert all CSS rules into clean explicit inline styles
      const clone = reportContent.cloneNode(true) as HTMLElement;
      const origElems = [reportContent, ...Array.from(reportContent.querySelectorAll('*'))];
      const cloneElems = [clone, ...Array.from(clone.querySelectorAll('*'))];

      for (let i = 0; i < origElems.length; i++) {
        const origEl = origElems[i] as HTMLElement;
        const cloneEl = cloneElems[i] as HTMLElement;
        if (origEl && cloneEl && origEl.nodeType === 1) {
          const comp = window.getComputedStyle(origEl);
          cloneEl.style.backgroundColor = comp.backgroundColor;
          cloneEl.style.color = comp.color;
          cloneEl.style.borderColor = comp.borderColor;
          cloneEl.style.fontSize = comp.fontSize;
          cloneEl.style.fontFamily = comp.fontFamily;
          cloneEl.style.fontWeight = comp.fontWeight;
          cloneEl.style.padding = comp.padding;
          cloneEl.style.margin = comp.margin;
          cloneEl.style.display = comp.display;
          cloneEl.style.flexDirection = comp.flexDirection;
          cloneEl.style.justifyContent = comp.justifyContent;
          cloneEl.style.alignItems = comp.alignItems;
          cloneEl.style.width = comp.width;
          cloneEl.style.height = comp.height;
          cloneEl.style.borderRadius = comp.borderRadius;
          cloneEl.style.borderWidth = comp.borderWidth;
          cloneEl.style.borderStyle = comp.borderStyle;
        }
      }

      // Convert cloned HTML to SVG foreignObject data URI
      const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml" style="background:#ffffff; width:${width}px; height:${height}px;">
              ${clone.outerHTML}
            </div>
          </foreignObject>
        </svg>
      `;

      const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = width * 2;
            canvas.height = height * 2;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.scale(2, 2);
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, width, height);
              ctx.drawImage(img, 0, 0);

              const imgData = canvas.toDataURL('image/jpeg', 0.95);
              const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
              });

              const imgWidth = 210;
              const pageHeight = 297;
              const imgHeight = (canvas.height * imgWidth) / canvas.width;

              pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
              const branchName = selectedBranch === 'all' ? 'Consolidado' : (branches.find(b => b.id === selectedBranch)?.name || 'Sucursal');
              pdf.save(`Reporte_Financiero_${branchName}_${new Date().toISOString().slice(0, 10)}.pdf`);
            }
            URL.revokeObjectURL(url);
            resolve();
          } catch (err) {
            URL.revokeObjectURL(url);
            reject(err);
          }
        };
        img.onerror = (e) => {
          URL.revokeObjectURL(url);
          // Fallback to native print window if browser blocks SVG canvas export
          handlePrintPDFNative();
          resolve();
        };
        img.src = url;
      });

    } catch (err: any) {
      console.warn('Fallback a impresión nativa por:', err);
      handlePrintPDFNative();
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 bg-background flex flex-col gap-6 relative">
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-secondary/5 to-transparent -z-10 pointer-events-none"></div>

      <div className="max-w-7xl mx-auto w-full space-y-6">
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 bg-white/40 p-6 rounded-2xl backdrop-blur-md border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <FileText className="text-primary" size={32} />
              <h2 className="text-display-lg font-black text-on-surface tracking-tight leading-none">Reportes Financieros</h2>
            </div>
            <p className="text-body-md text-on-surface-variant">Determinación de utilidad y estados financieros formales.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
            <div className="flex-1 min-w-[180px]">
              <label className="text-label-caps text-on-surface-variant mb-1 block">Periodo</label>
              <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="w-full bg-white border border-outline-variant/30 rounded-lg h-12 px-4 text-title-md font-bold text-on-surface shadow-sm outline-none focus:border-primary transition-colors cursor-pointer">
                <option value="today">Día Actual</option>
                <option value="week">Última Semana</option>
                <option value="month">Mensual (30 días)</option>
                <option value="quarter">Trimestral</option>
                <option value="year">Anual</option>
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="text-label-caps text-on-surface-variant mb-1 block">Sucursal</label>
              <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)} className="w-full bg-white border border-outline-variant/30 rounded-lg h-12 px-4 text-title-md font-bold text-primary shadow-sm outline-none focus:border-primary transition-colors cursor-pointer">
                <option value="all">Consolidado (Todas)</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 self-end xl:self-auto mt-2 xl:mt-0">
              <button 
                onClick={handleDownloadPDF}
                disabled={generatingPDF || loading}
                className="h-12 px-5 bg-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                {generatingPDF ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                {generatingPDF ? 'Generando...' : 'Descargar PDF'}
              </button>
              <button 
                onClick={handlePrintPDFNative}
                disabled={loading}
                className="h-12 px-4 bg-surface border border-outline-variant text-on-surface font-bold rounded-lg hover:bg-surface-variant transition-colors shadow-sm flex items-center gap-2"
                title="Imprimir o Guardar como PDF (Nativo del Navegador)"
              >
                <Printer size={18} />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12"><div className="animate-pulse text-on-surface-variant font-bold flex items-center gap-3"><TrendingUp className="animate-bounce"/> Recopilando datos financieros...</div></div>
        ) : (
          /* Container printable to PDF with Watermark */
          <div id="financial-report-print-container" className="relative bg-white rounded-2xl p-6 border border-gray-200 shadow-sm overflow-hidden">
            
            {/* Watermark Background Image */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-15 overflow-hidden">
              <img src="/MARCA DE AGUA.png" alt="Marca de Agua" className="w-[450px] max-w-full object-contain" />
            </div>

            <div className="relative z-10 space-y-6">
              {/* Header Report Meta info for PDF */}
              <div className="flex justify-between items-center border-b border-gray-200 pb-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-black tracking-wider">RAIMEN STORE</h1>
                  <p className="text-xs text-gray-600 font-semibold">Reporte Financiero Oficial</p>
                </div>
                <div className="text-right text-xs text-gray-600 font-medium">
                  <p><span className="font-bold">Periodo:</span> {getDateFilterLabel()}</p>
                  <p><span className="font-bold">Sucursal:</span> {getBranchLabel()}</p>
                  <p><span className="font-bold">Generado:</span> {new Date().toLocaleString('es-MX')}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Estado de Resultados */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div>
                      <h3 className="text-title-lg font-bold text-black">Estado de Resultados</h3>
                      <p className="text-body-sm text-gray-600">Periodo seleccionado</p>
                    </div>
                    <div className="px-3 py-1 bg-gray-200 rounded-md text-label-caps font-bold text-gray-700">
                      ER
                    </div>
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="space-y-4 text-body-md">
                      <div className="flex justify-between items-center">
                        <span className="text-black">Ingresos por Ventas</span>
                        <span className="font-bold text-data-mono">${income.toFixed(2)}</span>
                      </div>
                      
                      <div className="flex justify-between items-center text-red-600 border-b border-gray-200 pb-4">
                        <span>[-] Costo de Ventas (COGS)</span>
                        <span className="font-bold text-data-mono">-${cogs.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <span className="font-bold text-black">(=) Utilidad Bruta</span>
                        <span className="font-bold text-data-mono text-title-md">${grossProfit.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between items-center text-red-600 border-b border-gray-200 pb-4 pt-2">
                        <span>[-] Gastos de Operación</span>
                        <span className="font-bold text-data-mono">-${expenses.toFixed(2)}</span>
                      </div>

                      <div className={`flex justify-between items-center p-4 rounded-xl mt-4 ${netProfit >= 0 ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-rose-50 border border-rose-200 text-rose-700'}`}>
                        <span className="font-black text-title-md">(=) Utilidad Neta del Ejercicio</span>
                        <span className="font-black text-display-lg text-data-mono">${netProfit.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Estado de Situación Financiera */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div>
                      <h3 className="text-title-lg font-bold text-black">Estado de Situación Financiera</h3>
                      <p className="text-body-sm text-gray-600">Balance General</p>
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-md text-label-caps font-bold border border-emerald-200">
                      <CheckCircle size={14} /> Cuadrado
                    </div>
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col gap-6 text-body-md overflow-y-auto custom-scrollbar">
                    
                    {/* Activos */}
                    <div>
                      <h4 className="text-label-caps text-gray-500 mb-3 border-b border-gray-200 pb-1">ACTIVO CIRCULANTE</h4>
                      <div className="space-y-3 pl-2 border-l-2 border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-black">Efectivo Equivalente (Cajas)</span>
                          <span className="font-bold text-data-mono">${cash.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-gray-600">
                          <span className="text-sm pl-4">└ Ingresos por Tarjeta (Bancos)</span>
                          <span className="font-bold text-data-mono text-sm">${cardSales.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-gray-600">
                          <span className="text-sm pl-4">└ Ingresos por Transferencia (Bancos)</span>
                          <span className="font-bold text-data-mono text-sm">${transferSales.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-black">Inventarios (Valuación a Costo)</span>
                          <span className="font-bold text-data-mono">${inventoryValue.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-3 font-bold text-black text-title-md pt-2 border-t border-gray-200">
                        <span>Total Activo</span>
                        <span className="text-data-mono">${totalAssets.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Pasivos */}
                    <div>
                      <h4 className="text-label-caps text-gray-500 mb-3 border-b border-gray-200 pb-1">PASIVO</h4>
                      <div className="space-y-3 pl-2 border-l-2 border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-black">Cuentas por Pagar (Proveedores)</span>
                          <span className="font-bold text-data-mono text-red-600">${accountsPayable.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center mt-3 font-bold text-red-600 text-title-md pt-2 border-t border-gray-200">
                        <span>Total Pasivo</span>
                        <span className="text-data-mono">${totalLiabilities.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Capital */}
                    <div>
                      <h4 className="text-label-caps text-gray-500 mb-3 border-b border-gray-200 pb-1">PATRIMONIO / CAPITAL</h4>
                      <div className="space-y-3 pl-2 border-l-2 border-gray-200">
                        <div className="flex justify-between items-center">
                          <span className="text-black">Capital Contable</span>
                          <span className="font-bold text-data-mono">${equity.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
