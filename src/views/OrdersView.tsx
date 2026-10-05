import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingCart, ExternalLink, Box, Truck, User, Receipt, X, Loader2, RefreshCw, Trash2, Edit3, DollarSign, Calendar, Clock, FileText } from 'lucide-react';
import { ExchangeModal } from '../components/ExchangeModal';
import { AdminOverrideModal } from '../components/AdminOverrideModal';

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
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTicketId, setLoadingTicketId] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [isExchangeOpen, setIsExchangeOpen] = useState(false);
  const [adminAction, setAdminAction] = useState<{action: string, payload?: any} | null>(null);

  // Edit sale states
  const [editingSale, setEditingSale] = useState<any | null>(null);
  const [editPaymentMethod, setEditPaymentMethod] = useState('Efectivo');
  const [editCreatedAt, setEditCreatedAt] = useState('');
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editDiscount, setEditDiscount] = useState<number>(0);
  const [savingSaleEdit, setSavingSaleEdit] = useState(false);

  const getLocalDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return getLocalDateString(d);
  });
  
  const [endDate, setEndDate] = useState(() => {
    return getLocalDateString(new Date());
  });

  const formatISOForLocalDatetime = (isoStr?: string) => {
    if (!isoStr) return '';
    const dt = new Date(isoStr);
    const tzOffset = dt.getTimezoneOffset() * 60000;
    return new Date(dt.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const fetchSalesData = async () => {
    setLoading(true);
    try {
      // Parse dates explicitly in local time to avoid UTC shift bug
      const [sYear, sMonth, sDay] = startDate.split('-').map(Number);
      const s = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);

      const [eYear, eMonth, eDay] = endDate.split('-').map(Number);
      const e = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);

      const [salesRes, productsRes, custRes] = await Promise.all([
        supabase.from('sales').select('*')
          .gte('created_at', s.toISOString())
          .lte('created_at', e.toISOString())
          .order('created_at', { ascending: false }),
        supabase.from('products').select('*'),
        supabase.from('customers').select('*')
      ]);
      
      if (salesRes.error) throw salesRes.error;
      if (productsRes.error) throw productsRes.error;
      
      setSales(salesRes.data || []);
      setProducts(productsRes.data || []);
      setCustomers(custRes.data || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();

    // Subscribe to realtime sales insertions/updates
    const channel = supabase
      .channel('realtime_orders_view')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, () => {
        fetchSalesData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [startDate, endDate]);

  const handleDeleteSale = async (saleId: string) => {
    try {
      setLoading(true);
      await supabase.from('sale_items').delete().eq('sale_id', saleId);
      const { error } = await supabase.from('sales').delete().eq('id', saleId);
      if (error) throw error;
      
      setSales(sales.filter(s => s.id !== saleId));
      setAdminAction(null);
    } catch (err) {
      console.error('Error deleting sale:', err);
      alert('Error al eliminar la venta.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditSale = async (sale: Sale) => {
    setLoadingTicketId(sale.id);
    try {
      const { data, error } = await supabase.from('sale_items').select('*').eq('sale_id', sale.id);
      if (error) throw error;

      const items = (data || []).map(item => {
        const product = products.find(p => p.id === item.product_id);
        return {
          id: item.id,
          product_id: item.product_id,
          name: product ? product.name : 'Producto',
          quantity: item.quantity,
          price_at_time: item.price_at_time
        };
      });

      const itemsSum = items.reduce((acc, it) => acc + (Number(it.quantity) * Number(it.price_at_time)), 0);
      const initialDiscount = Math.max(0, itemsSum - Number(sale.total));

      setEditingSale(sale);
      setEditPaymentMethod(sale.payment_method || 'Efectivo');
      setEditCreatedAt(formatISOForLocalDatetime(sale.created_at));
      setEditItems(items);
      setEditDiscount(parseFloat(initialDiscount.toFixed(2)));
    } catch (err) {
      console.error(err);
      alert('Error cargando detalles de la venta para edición');
    } finally {
      setLoadingTicketId(null);
    }
  };

  const handleSaveSaleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSale) return;

    setSavingSaleEdit(true);
    try {
      const itemsSum = editItems.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.price_at_time)), 0);
      const discountVal = Math.max(0, parseFloat(editDiscount.toString()) || 0);
      const newTotal = Math.max(0, itemsSum - discountVal);
      const createdAtISO = new Date(editCreatedAt).toISOString();

      const { error: saleErr } = await supabase
        .from('sales')
        .update({
          payment_method: editPaymentMethod,
          created_at: createdAtISO,
          total: newTotal
        })
        .eq('id', editingSale.id);

      if (saleErr) throw saleErr;

      for (const item of editItems) {
        if (item.id) {
          const { error: itemErr } = await supabase
            .from('sale_items')
            .update({
              quantity: Number(item.quantity),
              price_at_time: Number(item.price_at_time)
            })
            .eq('id', item.id);
          if (itemErr) console.warn('Error actualizando item:', itemErr);
        }
      }

      alert('Ticket de venta actualizado con éxito.');
      setEditingSale(null);
      fetchSalesData();
    } catch (err: any) {
      console.error(err);
      alert('Error al guardar edición del ticket: ' + (err.message || err.toString()));
    } finally {
      setSavingSaleEdit(false);
    }
  };

  const handleViewTicket = async (sale: any) => {
    if (loadingTicketId) return;
    setLoadingTicketId(sale.id);
    try {
      const { data, error } = await supabase.from('sale_items').select('*').eq('sale_id', sale.id);
      if (error) throw error;
      
      const items = (data || []).map(item => {
        const product = products.find(p => p.id === item.product_id);
        const fallbackName = !item.product_id ? 'Abono / Liquidación de Apartado' : 'Producto';
        return {
          id: item.id,
          product_id: item.product_id,
          name: product ? product.name : fallbackName,
          qty: item.quantity,
          price: item.price_at_time
        };
      });

      const sumProducts = items.reduce((acc, it) => acc + (Number(it.qty) * Number(it.price)), 0);
      const discountAmount = Math.max(0, sumProducts - Number(sale.total));
      const hasDiscount = discountAmount > 0.05;

      const is5Percent = hasDiscount && Math.abs(discountAmount - (sumProducts * 0.05)) < 0.5;
      const discountLabel = is5Percent ? 'Descuento (5%)' : `Descuento Cliente (-$${discountAmount.toFixed(2)})`;

      const subtotal = sale.total / 1.16;
      const taxes = sale.total - subtotal;
      const customer = customers.find(c => c.id === sale.customer_id);

      setCompletedSale({
        id: sale.id,
        items,
        sumProducts,
        discountAmount,
        hasDiscount,
        discountLabel,
        total: Number(sale.total),
        subtotal,
        taxes,
        payment_method: sale.payment_method || 'Efectivo',
        date: new Date(sale.created_at).toLocaleString('es-MX'),
        customer
      });
    } catch (err) {
      console.error(err);
      alert('Error cargando los detalles de la venta');
    } finally {
      setLoadingTicketId(null);
    }
  };

  const exportToCSV = () => {
    if (sales.length === 0) return;
    const headers = ['ID Venta', 'Fecha', 'Tipo', 'Pago', 'Total'];
    const rows = sales.map(s => [
      s.id,
      new Date(s.created_at).toLocaleString('es-MX'),
      'Local',
      s.payment_method,
      s.total.toFixed(2)
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ventas_${startDate}_al_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [generatingReport, setGeneratingReport] = useState(false);

  const buildSalesReportHTML = (saleItems: any[] = [], sessionUser: any = {}) => {
    let totalAmount = 0;
    let cashCount = 0, cashAmount = 0;
    let cardCount = 0, cardAmount = 0;
    let transferCount = 0, transferAmount = 0;
    let otherCount = 0, otherAmount = 0;

    sales.forEach(s => {
      const tot = Number(s.total) || 0;
      totalAmount += tot;
      const pm = (s.payment_method || '').toLowerCase();
      if (pm.includes('efectivo') || pm.includes('cash')) {
        cashCount++;
        cashAmount += tot;
      } else if (pm.includes('tarjeta') || pm.includes('card') || pm.includes('débito') || pm.includes('debito') || pm.includes('crédito') || pm.includes('credito')) {
        cardCount++;
        cardAmount += tot;
      } else if (pm.includes('transferencia') || pm.includes('spei') || pm.includes('transfer')) {
        transferCount++;
        transferAmount += tot;
      } else {
        otherCount++;
        otherAmount += tot;
      }
    });

    const avgTicket = sales.length > 0 ? totalAmount / sales.length : 0;
    const safeTotal = totalAmount > 0 ? totalAmount : 1;
    const cashPct = totalAmount > 0 ? ((cashAmount / safeTotal) * 100).toFixed(1) : '0.0';
    const cardPct = totalAmount > 0 ? ((cardAmount / safeTotal) * 100).toFixed(1) : '0.0';
    const transferPct = totalAmount > 0 ? ((transferAmount / safeTotal) * 100).toFixed(1) : '0.0';
    const otherPct = totalAmount > 0 ? ((otherAmount / safeTotal) * 100).toFixed(1) : '0.0';

    // Aggregate Top Products
    const itemMap: { [productId: string]: { sku: string; name: string; qty: number; subtotal: number } } = {};
    saleItems.forEach(item => {
      const prod = products.find(p => p.id === item.product_id);
      const sku = prod?.sku || 'SKU-DESC';
      const name = prod?.name || item.name || 'Artículo Desconocido';
      const q = Number(item.quantity) || 1;
      const price = Number(item.price_at_time) || 0;
      const pId = item.product_id || item.id || Math.random().toString();
      
      if (!itemMap[pId]) {
        itemMap[pId] = { sku, name, qty: 0, subtotal: 0 };
      }
      itemMap[pId].qty += q;
      itemMap[pId].subtotal += (q * price);
    });

    const topProducts = Object.values(itemMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    const nowFormatted = new Date().toLocaleString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const folioCode = `REP-VEN-${startDate.replace(/-/g, '')}-${endDate.replace(/-/g, '')}-${sales.length.toString().padStart(3, '0')}`;
    const emisorName = sessionUser.name || 'Administración RAIMEN';

    const topProductsHTML = topProducts.length > 0 ? topProducts.map((p, idx) => `
      <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
        <td style="padding: 7px 10px; font-size: 11px; font-weight: 600; color: #64748b; text-align: center;">${idx + 1}</td>
        <td style="padding: 7px 10px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; font-weight: 700; color: #1e293b;">${p.sku}</td>
        <td style="padding: 7px 10px; font-size: 11px; font-weight: 600; color: #0f172a;">${p.name}</td>
        <td style="padding: 7px 10px; font-size: 11px; font-weight: 700; color: #2563eb; text-align: center;">${p.qty} pzas</td>
        <td style="padding: 7px 10px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; font-weight: 700; color: #059669; text-align: right;">$${p.subtotal.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `).join('') : `
      <tr>
        <td colspan="5" style="text-align: center; padding: 18px 10px; color: #64748b; font-size: 11px; font-style: italic;">
          No se registraron artículos vendidos en las ventas seleccionadas.
        </td>
      </tr>
    `;

    const operationsRowsHTML = sales.map((s, idx) => {
      const cust = customers.find(c => c.id === s.customer_id);
      const customerName = cust ? cust.name : 'Público en General';
      const dateFormatted = new Date(s.created_at).toLocaleString('es-MX', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      const folioShort = `#VEN-${(s.id || '').substring(0, 8).toUpperCase()}`;
      const pm = s.payment_method || 'Efectivo';

      return `
        <tr style="border-bottom: 1px solid #e2e8f0; ${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
          <td style="padding: 6px 8px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10.5px; font-weight: 700; color: #1e293b;">${folioShort}</td>
          <td style="padding: 6px 8px; font-size: 10.5px; color: #475569; white-space: nowrap;">${dateFormatted}</td>
          <td style="padding: 6px 8px; font-size: 10.5px; font-weight: 600; color: #0f172a; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${customerName}</td>
          <td style="padding: 6px 8px; font-size: 10px; color: #64748b;">MATRIZ CENTRAL</td>
          <td style="padding: 6px 8px; font-size: 10px;">
            <span style="display: inline-block; padding: 2px 7px; border-radius: 4px; font-weight: 600; background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0;">
              ${pm}
            </span>
          </td>
          <td style="padding: 6px 8px; font-size: 10px; text-align: center;">
            <span style="display: inline-block; padding: 2px 6px; border-radius: 9999px; font-weight: 700; font-size: 9.5px; background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;">
              COMPLETADA
            </span>
          </td>
          <td style="padding: 6px 8px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11px; font-weight: 700; text-align: right; color: #0f172a;">
            $${Number(s.total).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </td>
        </tr>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Reporte Ejecutivo de Ventas - RAIMEN</title>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #0f172a;
            color: #0f172a;
            min-height: 100vh;
            padding-bottom: 40px;
          }
          /* Top Dark Toolbar */
          .toolbar {
            position: sticky;
            top: 0;
            z-index: 100;
            background: #0f172a;
            border-bottom: 1px solid #1e293b;
            padding: 10px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
          }
          .toolbar-left {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .pdf-badge {
            background: #ef4444;
            color: #ffffff;
            font-weight: 900;
            font-size: 11px;
            padding: 4px 7px;
            border-radius: 4px;
            letter-spacing: 0.5px;
          }
          .toolbar-title {
            color: #ffffff;
            font-weight: 700;
            font-size: 14px;
          }
          .toolbar-pill {
            background: #1e293b;
            color: #93c5fd;
            border: 1px solid rgba(59, 130, 246, 0.4);
            font-size: 11px;
            font-weight: 600;
            padding: 2px 10px;
            border-radius: 9999px;
          }
          .toolbar-actions {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .t-btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 7px 14px;
            font-size: 12.5px;
            font-weight: 600;
            border-radius: 6px;
            border: none;
            cursor: pointer;
            transition: all 0.15s ease-in-out;
          }
          .t-btn-blue {
            background: #2563eb;
            color: #ffffff;
          }
          .t-btn-blue:hover { background: #1d4ed8; }
          .t-btn-green {
            background: #10b981;
            color: #ffffff;
          }
          .t-btn-green:hover { background: #059669; }
          .t-btn-gray {
            background: #334155;
            color: #f1f5f9;
          }
          .t-btn-gray:hover { background: #475569; }

          /* White Document Sheet */
          .document-wrapper {
            padding: 20px 14px;
          }
          .document-sheet {
            max-width: 900px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 4px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
            padding: 36px 40px;
            position: relative;
            overflow: hidden;
          }
          .watermark-img {
            position: absolute;
            top: 42%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 440px;
            opacity: 0.035;
            pointer-events: none;
            z-index: 1;
          }
          .doc-content {
            position: relative;
            z-index: 2;
          }

          /* Header Section */
          .doc-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 16px;
          }
          .brand-box {
            display: flex;
            align-items: center;
            gap: 14px;
          }
          .brand-logo-img {
            width: 60px;
            height: 60px;
            object-fit: contain;
          }
          .brand-name {
            font-size: 20px;
            font-weight: 900;
            letter-spacing: -0.5px;
            color: #0f172a;
            line-height: 1.1;
          }
          .brand-sys {
            font-size: 10px;
            font-weight: 800;
            color: #475569;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-top: 3px;
          }
          .brand-desc {
            font-size: 9.5px;
            color: #64748b;
            font-weight: 500;
          }
          .report-tag-box {
            text-align: right;
            display: flex;
            flex-direction: column;
            align-items: flex-end;
          }
          .report-tag {
            background: #0f172a;
            color: #ffffff;
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.5px;
            padding: 4px 10px;
            border-radius: 4px;
            text-transform: uppercase;
          }
          .report-folio {
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 11px;
            font-weight: 700;
            color: #1e293b;
            margin-top: 5px;
          }
          .report-audit-pill {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            background: #ecfdf5;
            color: #047857;
            border: 1px solid #a7f3d0;
            font-size: 10px;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 9999px;
            margin-top: 5px;
          }

          /* Meta Card Box */
          .meta-box {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px 16px;
            margin: 16px 0 20px 0;
          }
          .meta-item-label {
            font-size: 9px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
          }
          .meta-item-val {
            font-size: 11.5px;
            font-weight: 700;
            color: #0f172a;
          }

          /* 4 KPI Cards */
          .kpi-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 20px;
          }
          .kpi-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 12px 14px;
          }
          .kpi-c-blue { border-left: 4px solid #2563eb; }
          .kpi-c-green { border-left: 4px solid #059669; }
          .kpi-c-purple { border-left: 4px solid #7c3aed; }
          .kpi-c-amber { border-left: 4px solid #d97706; }

          .kpi-label {
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
            margin-bottom: 3px;
          }
          .kpi-val {
            font-size: 19px;
            font-weight: 900;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            line-height: 1.1;
          }
          .kpi-sub {
            font-size: 9.5px;
            color: #64748b;
            margin-top: 3px;
            font-weight: 500;
          }

          /* Dual Breakdown Tables Grid */
          .dual-tables-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 22px;
          }
          .section-heading {
            font-size: 11.5px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .report-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            overflow: hidden;
          }
          .report-table th {
            background: #f1f5f9;
            color: #475569;
            font-size: 9.5px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.4px;
            padding: 6px 8px;
            border-bottom: 1px solid #cbd5e1;
            text-align: left;
          }
          .report-table td {
            padding: 5px 8px;
            color: #1e293b;
          }
          .report-table tfoot td {
            background: #f8fafc;
            border-top: 2px solid #cbd5e1;
            font-weight: 800;
            padding: 6px 8px;
          }

          /* Consolidated Bottom Bar */
          .consolidated-bar {
            background: #0f172a;
            color: #ffffff;
            padding: 10px 16px;
            border-radius: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 13.5px;
            font-weight: 800;
            margin-top: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .consolidated-bar-title {
            letter-spacing: 0.5px;
            font-size: 12px;
            color: #cbd5e1;
            text-transform: uppercase;
          }
          .consolidated-bar-amount {
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 17px;
            color: #34d399;
          }

          /* Signature Blocks */
          .signatures-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-top: 28px;
            padding-top: 14px;
          }
          .signature-box {
            text-align: center;
            padding: 0 10px;
          }
          .signature-line {
            border-bottom: 1px solid #94a3b8;
            width: 80%;
            margin: 32px auto 8px auto;
          }
          .signature-title {
            font-size: 10px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .signature-name {
            font-size: 10px;
            font-weight: 600;
            color: #475569;
            margin-top: 2px;
          }
          .signature-sub {
            font-size: 9px;
            color: #94a3b8;
            margin-top: 1px;
            font-style: italic;
          }

          /* Document Footer */
          .doc-footer {
            margin-top: 22px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 9.5px;
            color: #94a3b8;
          }

          /* Print Overrides */
          @media print {
            body {
              background: #ffffff !important;
              padding: 0 !important;
            }
            .no-print {
              display: none !important;
            }
            .document-wrapper {
              padding: 0 !important;
            }
            .document-sheet {
              box-shadow: none !important;
              border: none !important;
              max-width: 100% !important;
              padding: 10mm !important;
              width: 100% !important;
            }
            tr {
              page-break-inside: avoid;
            }
            thead {
              display: table-header-group;
            }
          }
        </style>
      </head>
      <body>
        <!-- Top Toolbar -->
        <div class="toolbar no-print">
          <div class="toolbar-left">
            <span class="pdf-badge">PDF</span>
            <span class="toolbar-title">Reporte Ejecutivo de Ventas y Facturación</span>
            <span class="toolbar-pill">Formato PDF / Carta</span>
          </div>
          <div class="toolbar-actions">
            <button id="btn-download" onclick="downloadReportPDF()" class="t-btn t-btn-blue">
              📥 Descargar PDF
            </button>
            <button onclick="window.print()" class="t-btn t-btn-green">
              🖨️ Imprimir / Guardar como PDF
            </button>
            <button onclick="window.close()" class="t-btn t-btn-gray">
              ✕ Cerrar
            </button>
          </div>
        </div>

        <div class="document-wrapper">
          <div class="document-sheet" id="report-document">
            <img src="/MARCA DE AGUA.png" class="watermark-img" alt="" onerror="this.style.display='none'" />
            
            <div class="doc-content">
              <!-- Header -->
              <div class="doc-header">
                <div class="brand-box">
                  <img src="/logo.png" class="brand-logo-img" alt="RAIMEN" onerror="this.style.display='none'" />
                  <div>
                    <h1 class="brand-name">RAIMEN STORE</h1>
                    <div class="brand-sys">RAIMEN RETAIL MANAGEMENT & POS SYSTEM</div>
                    <div class="brand-desc">Sistema ERP & Control Integral de Sucursales</div>
                  </div>
                </div>
                <div class="report-tag-box">
                  <div class="report-tag">REPORTE OFICIAL DE VENTAS</div>
                  <div class="report-folio">Folio: ${folioCode}</div>
                  <div class="report-audit-pill">● AUDITADO & CONCILIADO</div>
                </div>
              </div>

              <!-- Meta Box -->
              <div class="meta-box">
                <div>
                  <div class="meta-item-label">SUCURSAL / PLAZA</div>
                  <div class="meta-item-val">MATRIZ CENTRAL - PLAZA</div>
                </div>
                <div>
                  <div class="meta-item-label">PERÍODO EVALUADO</div>
                  <div class="meta-item-val">${startDate} AL ${endDate}</div>
                </div>
                <div>
                  <div class="meta-item-label">FECHA Y HORA EMISIÓN</div>
                  <div class="meta-item-val">${nowFormatted}</div>
                </div>
                <div>
                  <div class="meta-item-label">GENERADO POR</div>
                  <div class="meta-item-val">${emisorName}</div>
                </div>
              </div>

              <!-- 4 KPI Cards -->
              <div class="kpi-row">
                <div class="kpi-card kpi-c-blue">
                  <div class="kpi-label">VENTAS REGISTRADAS</div>
                  <div class="kpi-val" style="color: #1e3a8a;">${sales.length}</div>
                  <div class="kpi-sub">Operaciones concluidas</div>
                </div>
                <div class="kpi-card kpi-c-green">
                  <div class="kpi-label">MONTO TOTAL VENDIDO</div>
                  <div class="kpi-val" style="color: #065f46;">$${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div class="kpi-sub">Ingreso bruto facturado</div>
                </div>
                <div class="kpi-card kpi-c-purple">
                  <div class="kpi-label">TICKET PROMEDIO</div>
                  <div class="kpi-val" style="color: #581c87;">$${avgTicket.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div class="kpi-sub">Por cliente / orden</div>
                </div>
                <div class="kpi-card kpi-c-amber">
                  <div class="kpi-label">EFECTIVO EN CAJA</div>
                  <div class="kpi-val" style="color: #92400e;">$${cashAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div class="kpi-sub">${cashPct}% del total ingresado</div>
                </div>
              </div>

              <!-- Dual Breakdown Tables -->
              <div class="dual-tables-grid">
                <div>
                  <div class="section-heading">1. Desglose por Método de Pago</div>
                  <table class="report-table">
                    <thead>
                      <tr>
                        <th>Método</th>
                        <th style="text-align: center;">Opers.</th>
                        <th style="text-align: right;">Monto</th>
                        <th style="text-align: right;">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Efectivo</strong></td>
                        <td style="text-align: center;">${cashCount}</td>
                        <td style="text-align: right; font-family: ui-monospace, monospace;">$${cashAmount.toFixed(2)}</td>
                        <td style="text-align: right; font-weight: 600;">${cashPct}%</td>
                      </tr>
                      <tr style="background: #f8fafc;">
                        <td><strong>Tarjeta Débito / Crédito</strong></td>
                        <td style="text-align: center;">${cardCount}</td>
                        <td style="text-align: right; font-family: ui-monospace, monospace;">$${cardAmount.toFixed(2)}</td>
                        <td style="text-align: right; font-weight: 600;">${cardPct}%</td>
                      </tr>
                      <tr>
                        <td><strong>Transferencia SPEI</strong></td>
                        <td style="text-align: center;">${transferCount}</td>
                        <td style="text-align: right; font-family: ui-monospace, monospace;">$${transferAmount.toFixed(2)}</td>
                        <td style="text-align: right; font-weight: 600;">${transferPct}%</td>
                      </tr>
                      <tr style="background: #f8fafc;">
                        <td><strong>Otros / Apartados</strong></td>
                        <td style="text-align: center;">${otherCount}</td>
                        <td style="text-align: right; font-family: ui-monospace, monospace;">$${otherAmount.toFixed(2)}</td>
                        <td style="text-align: right; font-weight: 600;">${otherPct}%</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>TOTAL CONCILIADO</td>
                        <td style="text-align: center;">${sales.length}</td>
                        <td style="text-align: right; font-family: ui-monospace, monospace; color: #047857;">$${totalAmount.toFixed(2)}</td>
                        <td style="text-align: right;">100.0%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div>
                  <div class="section-heading">2. Modalidad Comercial</div>
                  <table class="report-table">
                    <thead>
                      <tr>
                        <th>Modalidad</th>
                        <th style="text-align: center;">Opers.</th>
                        <th style="text-align: right;">Monto</th>
                        <th style="text-align: right;">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Venta en Mostrador / Tienda</strong></td>
                        <td style="text-align: center;">${sales.length}</td>
                        <td style="text-align: right; font-family: ui-monospace, monospace;">$${totalAmount.toFixed(2)}</td>
                        <td style="text-align: right; font-weight: 600;">100.0%</td>
                      </tr>
                      <tr style="background: #f8fafc;">
                        <td><strong>Sistema de Apartado</strong></td>
                        <td style="text-align: center;">0</td>
                        <td style="text-align: right; font-family: ui-monospace, monospace;">$0.00</td>
                        <td style="text-align: right; font-weight: 600;">0.0%</td>
                      </tr>
                      <tr>
                        <td><strong>Venta en Línea / Envíos</strong></td>
                        <td style="text-align: center;">0</td>
                        <td style="text-align: right; font-family: ui-monospace, monospace;">$0.00</td>
                        <td style="text-align: right; font-weight: 600;">0.0%</td>
                      </tr>
                      <tr style="background: #f8fafc;">
                        <td><strong>Mayoreo / Especial</strong></td>
                        <td style="text-align: center;">0</td>
                        <td style="text-align: right; font-family: ui-monospace, monospace;">$0.00</td>
                        <td style="text-align: right; font-weight: 600;">0.0%</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>TOTAL TRANSACCIONES</td>
                        <td style="text-align: center;">${sales.length}</td>
                        <td style="text-align: right; font-family: ui-monospace, monospace; color: #047857;">$${totalAmount.toFixed(2)}</td>
                        <td style="text-align: right;">100.0%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <!-- Section 3: Top Articles -->
              <div style="margin-bottom: 22px;">
                <div class="section-heading">3. Top Artículos y Productos Vendidos en el Período</div>
                <table class="report-table">
                  <thead>
                    <tr>
                      <th style="width: 32px; text-align: center;">#</th>
                      <th style="width: 140px;">SKU / Código</th>
                      <th>Descripción del Artículo</th>
                      <th style="width: 100px; text-align: center;">Unidades</th>
                      <th style="width: 120px; text-align: right;">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${topProductsHTML}
                  </tbody>
                </table>
              </div>

              <!-- Section 4: Operations Detailed -->
              <div style="margin-bottom: 16px;">
                <div class="section-heading">4. Relación Detallada de Operaciones (${sales.length} registros)</div>
                <table class="report-table">
                  <thead>
                    <tr>
                      <th style="width: 105px;">Folio</th>
                      <th style="width: 125px;">Fecha / Hora</th>
                      <th>Cliente</th>
                      <th style="width: 110px;">Vendedor / Suc</th>
                      <th style="width: 105px;">Tipo / Pago</th>
                      <th style="width: 90px; text-align: center;">Estado</th>
                      <th style="width: 100px; text-align: right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${operationsRowsHTML || '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #94a3b8;">No se registraron ventas en el periodo.</td></tr>'}
                  </tbody>
                </table>

                <div class="consolidated-bar">
                  <span class="consolidated-bar-title">Monto Neto Vendido Consolidado:</span>
                  <span class="consolidated-bar-amount">$${totalAmount.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</span>
                </div>
              </div>

              <!-- Section 5: Signatures -->
              <div class="signatures-grid">
                <div class="signature-box">
                  <div class="signature-line"></div>
                  <div class="signature-title">CAJERO / RESPONSABLE DE TURNO</div>
                  <div class="signature-name">${emisorName}</div>
                  <div class="signature-sub">Firma y Entrega de Corte</div>
                </div>
                <div class="signature-box">
                  <div class="signature-line"></div>
                  <div class="signature-title">DIRECCIÓN GENERAL / AUDITORÍA ADMINISTRATIVA</div>
                  <div class="signature-name">Supervisión & Control Interno</div>
                  <div class="signature-sub">Revisión, Verificación y Archivo Contable</div>
                </div>
              </div>

              <!-- Footer -->
              <div class="doc-footer">
                <span>Documento confidencial generado por RAIMEN ERP & POS &bull; Válido para control contable y arqueo interno.</span>
                <span>Página 1</span>
              </div>
            </div>
          </div>
        </div>

        <script>
          function downloadReportPDF() {
            const btn = document.getElementById('btn-download');
            if (btn) {
              btn.innerText = '⏳ Generando PDF...';
              btn.disabled = true;
            }
            const element = document.getElementById('report-document');
            const opt = {
              margin: [6, 6, 6, 6],
              filename: 'Reporte_Ejecutivo_Ventas_RAIMEN_${startDate}_al_${endDate}.pdf',
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true, logging: false },
              jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
            };
            if (window.html2pdf) {
              window.html2pdf().set(opt).from(element).save().then(() => {
                if (btn) {
                  btn.innerText = '📥 Descargar PDF';
                  btn.disabled = false;
                }
              }).catch(err => {
                console.error(err);
                window.print();
                if (btn) {
                  btn.innerText = '📥 Descargar PDF';
                  btn.disabled = false;
                }
              });
            } else {
              window.print();
              if (btn) {
                btn.innerText = '📥 Descargar PDF';
                btn.disabled = false;
              }
            }
          }
        </script>
      </body>
      </html>
    `;
  };

  const handleViewSalesReportPDF = async () => {
    if (sales.length === 0) {
      alert('No hay ventas registradas en el periodo seleccionado para generar el reporte.');
      return;
    }
    setGeneratingReport(true);
    try {
      const saleIds = sales.map(s => s.id);
      let allSaleItems: any[] = [];
      const chunkSize = 100;
      for (let i = 0; i < saleIds.length; i += chunkSize) {
        const chunk = saleIds.slice(i, i + chunkSize);
        const { data: itemsChunk, error: itemsErr } = await supabase
          .from('sale_items')
          .select('*')
          .in('sale_id', chunk);
        if (itemsErr) console.warn('Error fetching sale items chunk:', itemsErr);
        if (itemsChunk) {
          allSaleItems.push(...itemsChunk);
        }
      }

      const sessionUser = JSON.parse(localStorage.getItem('raimen_pos_user') || '{}');
      const html = buildSalesReportHTML(allSaleItems, sessionUser);
      const win = window.open('', '_blank', 'width=1120,height=900,menubar=no,toolbar=no,location=no,status=no');
      if (win) {
        win.document.open();
        win.document.write(html);
        win.document.close();
        win.focus();
      } else {
        alert('Por favor permite abrir ventanas emergentes para visualizar el reporte.');
      }
    } catch (err: any) {
      console.error('Error generando reporte PDF:', err);
      alert('Error preparando datos del reporte: ' + (err.message || err.toString()));
    } finally {
      setGeneratingReport(false);
    }
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 bg-background">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-headline-lg text-on-surface">Historial de Ventas</h2>
            <p className="text-body-sm text-on-surface-variant mt-1">Registro de todas las transacciones locales y en línea</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-label-caps text-on-surface-variant">Desde</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-surface border border-outline-variant rounded-lg px-3 py-2 outline-none focus:border-primary text-body-sm"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-label-caps text-on-surface-variant">Hasta</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-surface border border-outline-variant rounded-lg px-3 py-2 outline-none focus:border-primary text-body-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleViewSalesReportPDF}
                disabled={generatingReport || loading}
                className="h-[42px] px-4 bg-secondary-container text-on-secondary-container hover:bg-secondary hover:text-on-secondary rounded-lg text-title-md flex items-center gap-2 transition-colors shadow-sm font-semibold disabled:opacity-50"
                title="Ver e imprimir Reporte Ejecutivo de Ventas en PDF"
              >
                {generatingReport ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />} 
                {generatingReport ? 'Generando Reporte...' : 'Ver Reporte PDF'}
              </button>
              <button onClick={exportToCSV} className="h-[42px] px-4 bg-primary text-on-primary rounded-lg text-title-md flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm font-semibold">
                <ExternalLink size={18} /> Exportar CSV
              </button>
            </div>
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
                    <th className="p-4 text-label-caps text-on-surface-variant text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {sales.map((sale) => (
                    <tr onClick={() => handleViewTicket(sale)} key={sale.id} className={`hover:bg-surface-container-low transition-colors cursor-pointer group ${loadingTicketId === sale.id ? 'opacity-50' : ''}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-surface-variant flex items-center justify-center text-on-surface shrink-0">
                            {loadingTicketId === sale.id ? <Loader2 size={18} className="animate-spin" /> : <ShoppingCart size={18} />}
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
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center items-center gap-1">
                          <button 
                            onClick={() => setAdminAction({ action: 'editar venta', payload: sale })}
                            className="text-on-surface-variant hover:text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors"
                            title="Editar Ticket (Requiere Admin)"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button 
                            onClick={() => setAdminAction({ action: 'eliminar venta', payload: sale.id })} 
                            className="text-error hover:bg-error-container p-2 rounded-lg transition-colors" 
                            title="Eliminar Venta"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sales.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-on-surface-variant">
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

      {/* Ticket Modal */}
      {completedSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="p-4 bg-primary text-on-primary flex justify-between items-center shrink-0">
              <h3 className="font-bold flex items-center gap-2"><Receipt size={20}/> Ticket de Venta</h3>
              <button onClick={() => setCompletedSale(null)} className="hover:bg-primary-fixed hover:text-on-primary-fixed rounded-full p-1"><X size={20}/></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 font-mono text-sm bg-white text-black" id="printable-ticket">
              <div className="text-center mb-4 pb-4 border-b border-black/20 flex flex-col items-center">
                <img src="/logo.png" alt="RAIMEN" className="w-14 h-14 object-contain mx-auto mb-2" />
                <h2 className="text-xl font-bold">RAIMEN STORE</h2>
                <p>Sucursal Principal</p>
                <p>Fecha: {completedSale.date}</p>
                <p>Ticket: {completedSale.id.substring(0,8).toUpperCase()}</p>
              </div>

              <div className="mb-4 pb-4 border-b border-black/20">
                <p><span className="font-bold">Cliente:</span> {completedSale.customer?.name || 'Público en General'}</p>
                {completedSale.customer?.rfc && completedSale.customer.rfc !== 'XAXX010101000' && (
                  <p>RFC: {completedSale.customer.rfc}</p>
                )}
                {completedSale.customer?.email && (
                  <p>Email: {completedSale.customer.email}</p>
                )}
                {completedSale.customer?.phone && (
                  <p>Tel: {completedSale.customer.phone}</p>
                )}
              </div>
              
              {completedSale.hasDiscount && (
                <div className="text-center mb-4 py-2 border-y-2 border-dashed border-black">
                  <p className="font-bold text-lg">🎉 ¡Descuento Aplicado! 🎉</p>
                  <p className="text-sm font-bold mt-1">{completedSale.discountLabel || 'Obtuviste un descuento especial'}</p>
                </div>
              )}

              <div className="border-t border-b border-black/20 py-2 mb-4">
                <table className="w-full">
                  <thead>
                    <tr className="text-left"><th className="pb-2">Cant</th><th className="pb-2">Descripción</th><th className="text-right pb-2">Importe</th></tr>
                  </thead>
                  <tbody>
                    {completedSale.items.map((item: any) => (
                      <tr key={item.id}>
                        <td className="align-top py-1 pr-2">{item.qty}</td>
                        <td className="align-top py-1">{item.name}</td>
                        <td className="align-top text-right py-1">${(item.price * item.qty).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {completedSale.hasDiscount && (
                <div className="flex justify-between text-sm mt-2">
                  <span>Subtotal:</span>
                  <span>${completedSale.sumProducts.toFixed(2)}</span>
                </div>
              )}
              {completedSale.hasDiscount && (
                <div className="flex justify-between text-sm font-bold">
                  <span>{completedSale.discountLabel || 'Descuento'}:</span>
                  <span>-${completedSale.discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between font-bold text-lg mt-2 pt-2 border-t border-black/20"><span>TOTAL:</span><span>${completedSale.total.toFixed(2)}</span></div>
              <div className="text-center mt-6 text-xs text-black/60">
                <p>PAGO EN: {completedSale.payment_method.toUpperCase()}</p>
                <p className="mt-3 font-semibold text-[11px] leading-tight text-black/80">Para cualquier cambio o aclaración es indispensable presentar este ticket.</p>
                <p className="mt-2">¡Gracias por su compra!</p>
              </div>
            </div>
            <div className="p-4 bg-surface-container-low border-t border-outline-variant flex flex-col gap-3 shrink-0">
              <div className="flex gap-2">
                <button onClick={() => setCompletedSale(null)} className="flex-1 py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-variant transition-colors font-medium text-xs">Cerrar</button>
                
                <button 
                  onClick={() => {
                    const saleToEdit = sales.find(s => s.id === completedSale.id);
                    if (saleToEdit) {
                      setCompletedSale(null);
                      setAdminAction({ action: 'editar venta', payload: saleToEdit });
                    }
                  }} 
                  className="flex-1 py-2 rounded-lg bg-surface-variant text-on-surface hover:bg-surface-container-highest transition-colors font-bold text-xs flex justify-center items-center gap-1"
                >
                  <Edit3 size={15} /> Editar
                </button>

                <button onClick={() => setIsExchangeOpen(true)} className="flex-1 py-2 rounded-lg bg-secondary text-on-secondary hover:bg-on-secondary-fixed-variant transition-colors font-medium text-xs flex justify-center items-center gap-1">
                  <RefreshCw size={15} /> Cambio
                </button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => {
                  const printContent = document.getElementById('printable-ticket');
                  const win = window.open('', '', 'width=300,height=600');
                  if(win && printContent) {
                    win.document.write('<html><head><title>Imprimir Ticket</title><style>body { font-family: monospace; font-size: 12px; margin: 0; padding: 10px; } table { width: 100%; border-collapse: collapse; } th { text-align: left; border-bottom: 1px dashed #000; } td { padding-top: 4px; } .text-right { text-align: right; } .text-center { text-align: center; } .font-bold { font-weight: bold; } .font-semibold { font-weight: 600; } .text-xl { font-size: 16px; } .text-lg { font-size: 14px; } .border-t { border-top: 1px dashed #000; } .border-b { border-bottom: 1px dashed #000; } .my-4 { margin: 10px 0; } .py-2 { padding: 5px 0; } .mt-1 { margin-top: 4px; } .mt-2 { margin-top: 8px; } .mt-3 { margin-top: 12px; }</style></head><body>');
                    win.document.write(printContent.innerHTML);
                    win.document.write('</body></html>');
                    win.document.close();
                    win.focus();
                    setTimeout(() => { win.print(); win.close(); }, 250);
                  }
                }} className="flex-1 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary/90 transition-colors font-medium text-xs flex justify-center items-center gap-1">
                  <Receipt size={16} /> Imprimir
                </button>
                <button onClick={() => {
                  let text = "RAIMEN STORE\n";
                  text += "Sucursal Principal\n";
                  text += `Fecha: ${completedSale.date}\n`;
                  text += `Ticket: ${completedSale.id.substring(0,8).toUpperCase()}\n`;
                  text += "--------------------------------\n";
                  text += `Cliente: ${completedSale.customer?.name || 'Publico en General'}\n`;
                  text += "--------------------------------\n";
                  
                  if (completedSale.hasDiscount) {
                    text += "*** ¡Descuento Aplicado! ***\n";
                    text += `${completedSale.discountLabel || 'Descuento especial'}\n`;
                    text += "--------------------------------\n";
                  }

                  completedSale.items.forEach((item: any) => {
                    text += `${item.qty}x ${item.name}\n$${(item.price * item.qty).toFixed(2)}\n`;
                  });
                  text += "--------------------------------\n";
                  
                  if (completedSale.hasDiscount) {
                    text += `Subtotal: $${completedSale.sumProducts.toFixed(2)}\n`;
                    text += `${completedSale.discountLabel || 'Descuento'}: -$${completedSale.discountAmount.toFixed(2)}\n`;
                  }

                  text += `TOTAL: $${completedSale.total.toFixed(2)}\n`;
                  text += "--------------------------------\n";
                  text += `PAGO EN: ${completedSale.payment_method.toUpperCase()}\n`;
                  text += "Para cualquier cambio o aclaracion\nes indispensable presentar este ticket.\n";
                  text += "Gracias por su compra!\n\n\n";

                  const encoded = encodeURI(text);
                  window.location.href = `intent:${encoded}#Intent;scheme=rawbt;package=ru.a402d.rawbtprinter;end;`;
                }} className="flex-1 py-2 rounded-lg bg-secondary text-on-secondary hover:bg-on-secondary-fixed-variant transition-colors font-medium text-xs flex justify-center items-center gap-1">
                  <Receipt size={16} /> BT Móvil
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sale Modal */}
      {editingSale && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-outline-variant max-h-[90vh]">
            <div className="p-4 bg-primary text-on-primary flex justify-between items-center shrink-0">
              <h3 className="font-bold text-title-md flex items-center gap-2">
                <Edit3 size={20} /> Editar Ticket de Venta
              </h3>
              <button 
                onClick={() => setEditingSale(null)}
                className="hover:bg-primary-fixed hover:text-on-primary-fixed rounded-full p-1 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveSaleEdit} className="p-6 flex flex-col gap-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-1 block">Método de Pago</label>
                  <select
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm font-semibold outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Transfer">Transferencia</option>
                  </select>
                </div>
                <div>
                  <label className="text-label-caps text-on-surface-variant mb-1 block">Fecha y Hora</label>
                  <input
                    type="datetime-local"
                    required
                    value={editCreatedAt}
                    onChange={(e) => setEditCreatedAt(e.target.value)}
                    className="w-full bg-surface border border-outline-variant rounded-lg h-10 px-3 text-body-sm font-semibold outline-none focus:border-primary cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="text-label-caps text-on-surface-variant mb-2 block font-bold">Ítems del Ticket</label>
                <div className="border border-outline-variant rounded-xl overflow-hidden bg-surface-container-low divide-y divide-outline-variant/30">
                  {editItems.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-body-sm font-bold text-on-surface">{item.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20">
                          <span className="text-[10px] text-on-surface-variant block">Cant</span>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value) || 1);
                              setEditItems(editItems.map((it, i) => i === idx ? { ...it, quantity: val } : it));
                            }}
                            className="w-full bg-surface border border-outline-variant rounded-lg h-8 px-2 text-center text-body-sm font-bold outline-none"
                          />
                        </div>
                        <div className="w-24">
                          <span className="text-[10px] text-on-surface-variant block">Precio U. ($)</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.price_at_time}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setEditItems(editItems.map((it, i) => i === idx ? { ...it, price_at_time: val } : it));
                            }}
                            className="w-full bg-surface border border-outline-variant rounded-lg h-8 px-2 text-right text-body-sm font-bold outline-none text-data-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desglose y Descuento del Ticket */}
              {(() => {
                const itemsSumCalc = editItems.reduce((acc, it) => acc + (Number(it.quantity) * Number(it.price_at_time)), 0);
                const finalTotalCalc = Math.max(0, itemsSumCalc - (parseFloat(editDiscount.toString()) || 0));

                return (
                  <div className="bg-surface-container-high p-3.5 rounded-xl border border-outline-variant space-y-2.5 text-body-sm">
                    <div className="flex justify-between text-on-surface-variant font-medium">
                      <span>Subtotal de productos:</span>
                      <span className="font-mono font-bold text-on-surface">
                        ${itemsSumCalc.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4 pt-2 border-t border-outline-variant/60">
                      <div>
                        <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                          <span>🏷️ Descuento al Cliente ($):</span>
                        </label>
                        <span className="text-[10px] text-on-surface-variant block">Monto en $ descontado al ticket</span>
                      </div>
                      <div className="relative w-32">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={itemsSumCalc}
                          value={editDiscount}
                          onChange={(e) => setEditDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full pl-6 pr-2 py-1.5 bg-surface border border-outline-variant rounded-lg text-right font-mono font-bold text-body-sm outline-none focus:border-primary text-primary"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-primary/20 flex items-center justify-between bg-primary/10 -mx-3.5 -mb-3.5 p-3 rounded-b-xl">
                      <span className="text-body-md font-bold text-primary">Total Recalculado:</span>
                      <span className="text-title-lg font-extrabold text-primary text-data-mono">
                        ${finalTotalCalc.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setEditingSale(null)}
                  className="flex-1 py-3 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-variant font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingSaleEdit}
                  className="flex-1 py-3 rounded-lg bg-primary text-on-primary hover:bg-primary/90 font-bold transition-colors shadow disabled:opacity-50"
                >
                  {savingSaleEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Exchange Modal */}
      {isExchangeOpen && completedSale && (
        <ExchangeModal
          originalSale={completedSale}
          onClose={() => setIsExchangeOpen(false)}
          onSuccess={() => {
            setIsExchangeOpen(false);
            setCompletedSale(null);
            fetchSalesData();
          }}
        />
      )}

      {adminAction && (
        <AdminOverrideModal 
          actionName={adminAction.action}
          onCancel={() => setAdminAction(null)}
          onSuccess={() => {
            if (adminAction.action === 'eliminar venta') {
              handleDeleteSale(adminAction.payload);
            } else if (adminAction.action === 'editar venta') {
              handleStartEditSale(adminAction.payload);
              setAdminAction(null);
            }
          }}
        />
      )}
    </main>
  );
}
