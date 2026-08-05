import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, PackageSearch, Store, TerminalSquare, LogOut } from 'lucide-react';

const FinanzasModule = () => (
  <div className="glass-panel" style={{ padding: '2.5rem', flex: 1, minHeight: '100%', overflowY: 'auto' }}>
    <h2 style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: '2rem' }}>Dashboard Financiero</h2>
    
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Ventas del Día</p>
        <h3 style={{ fontSize: '2.5rem', color: 'var(--success)', marginTop: '0.5rem' }}>$4,250.00</h3>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Órdenes Totales</p>
        <h3 style={{ fontSize: '2.5rem', color: 'var(--primary)', marginTop: '0.5rem' }}>128</h3>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Ticket Promedio</p>
        <h3 style={{ fontSize: '2.5rem', color: '#fff', marginTop: '0.5rem' }}>$33.20</h3>
      </div>
    </div>
    
    <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '1.3rem' }}>Últimas Transacciones (Global)</h3>
    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--primary)', background: 'rgba(255,255,255,0.02)' }}>
            <th style={{ padding: '1.2rem' }}>ID Transacción</th>
            <th style={{ padding: '1.2rem' }}>Fecha/Hora</th>
            <th style={{ padding: '1.2rem' }}>Canal / Sucursal</th>
            <th style={{ padding: '1.2rem' }}>Monto</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <td style={{ padding: '1.2rem' }}>#TX-1042</td>
            <td style={{ padding: '1.2rem' }}>Hoy, 14:32:05</td>
            <td style={{ padding: '1.2rem' }}>POS - Sucursal Central</td>
            <td style={{ padding: '1.2rem', color: 'var(--success)', fontWeight: 'bold' }}>$45.00</td>
          </tr>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <td style={{ padding: '1.2rem' }}>#ML-99882</td>
            <td style={{ padding: '1.2rem' }}>Hoy, 14:10:00</td>
            <td style={{ padding: '1.2rem', color: '#ffe600' }}>Mercado Libre</td>
            <td style={{ padding: '1.2rem', color: 'var(--success)', fontWeight: 'bold' }}>$125.00</td>
          </tr>
          <tr>
            <td style={{ padding: '1.2rem' }}>#TX-1041</td>
            <td style={{ padding: '1.2rem' }}>Hoy, 13:28:10</td>
            <td style={{ padding: '1.2rem' }}>POS - Sucursal Norte</td>
            <td style={{ padding: '1.2rem', color: 'var(--success)', fontWeight: 'bold' }}>$12.50</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const InventarioModule = () => (
  <div className="glass-panel" style={{ padding: '2.5rem', flex: 1, minHeight: '100%', overflowY: 'auto' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '2rem', color: 'var(--primary)' }}>Gestión de Inventario</h2>
      <button className="glass-btn success" style={{ width: 'auto', padding: '1rem 2rem' }}>+ Nuevo Producto</button>
    </div>
    
    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--primary)', background: 'rgba(255,255,255,0.02)' }}>
            <th style={{ padding: '1.2rem' }}>SKU</th>
            <th style={{ padding: '1.2rem' }}>Producto</th>
            <th style={{ padding: '1.2rem' }}>Precio Base</th>
            <th style={{ padding: '1.2rem' }}>Stock Físico</th>
            <th style={{ padding: '1.2rem' }}>Stock e-Commerce</th>
            <th style={{ padding: '1.2rem' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <td style={{ padding: '1.2rem', color: 'var(--text-muted)' }}>123456</td>
            <td style={{ padding: '1.2rem', fontWeight: 'bold' }}>Ramen Tonkotsu</td>
            <td style={{ padding: '1.2rem' }}>$15.00</td>
            <td style={{ padding: '1.2rem', color: 'var(--success)' }}>50 uds</td>
            <td style={{ padding: '1.2rem', color: 'var(--primary)' }}>20 uds</td>
            <td style={{ padding: '1.2rem' }}>
              <button className="glass-btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', width: 'auto' }}>Editar</button>
            </td>
          </tr>
          <tr>
            <td style={{ padding: '1.2rem', color: 'var(--text-muted)' }}>789012</td>
            <td style={{ padding: '1.2rem', fontWeight: 'bold' }}>Gyoza (Orden 5pz)</td>
            <td style={{ padding: '1.2rem' }}>$8.50</td>
            <td style={{ padding: '1.2rem', color: 'var(--danger)' }}>5 uds</td>
            <td style={{ padding: '1.2rem', color: 'var(--text-muted)' }}>N/A</td>
            <td style={{ padding: '1.2rem' }}>
              <button className="glass-btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', width: 'auto' }}>Editar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

const SucursalesModule = () => (
  <div className="glass-panel" style={{ padding: '2.5rem', flex: 1, minHeight: '100%', overflowY: 'auto' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '2rem', color: 'var(--primary)' }}>Sucursales y Cajeros</h2>
      <button className="glass-btn success" style={{ width: 'auto', padding: '1rem 2rem' }}>+ Agregar Sucursal</button>
    </div>
    
    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid var(--glass-border)', overflow: 'hidden' }}>
      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--primary)', background: 'rgba(255,255,255,0.02)' }}>
            <th style={{ padding: '1.2rem' }}>ID Sucursal</th>
            <th style={{ padding: '1.2rem' }}>Nombre</th>
            <th style={{ padding: '1.2rem' }}>Ubicación</th>
            <th style={{ padding: '1.2rem' }}>Cajeros Activos</th>
            <th style={{ padding: '1.2rem' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '1.2rem', color: 'var(--text-muted)' }}>001</td>
            <td style={{ padding: '1.2rem', fontWeight: 'bold' }}>Sucursal Central</td>
            <td style={{ padding: '1.2rem' }}>CDMX Centro</td>
            <td style={{ padding: '1.2rem', color: 'var(--success)' }}>3</td>
            <td style={{ padding: '1.2rem' }}>
              <button className="glass-btn" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', width: 'auto' }}>Gestionar Personal</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'finanzas' | 'inventario' | 'sucursales'>('finanzas');
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Background Blobs para mantener el estilo consistente */}
      <div className="bg-blob cyan" style={{ top: '-10%', left: '20%', width: '600px', height: '600px', filter: 'blur(120px)' }}></div>
      <div className="bg-blob green" style={{ bottom: '-10%', right: '10%', width: '500px', height: '500px', filter: 'blur(120px)' }}></div>

      {/* Sidebar de Navegación */}
      <aside className="glass-panel" style={{ width: '300px', margin: '1rem', display: 'flex', flexDirection: 'column', borderRadius: '24px', zIndex: 1 }}>
        <div style={{ padding: '2rem 1.5rem', borderBottom: '1px solid var(--glass-border)', textAlign: 'center' }}>
          <h1 style={{ color: 'var(--primary)', fontSize: '2.5rem', marginBottom: '0' }}>RAIMEN</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.5rem', letterSpacing: '2px' }}>ERP BACKOFFICE</p>
        </div>

        <nav style={{ flex: 1, padding: '2rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <button 
            onClick={() => setActiveTab('finanzas')}
            style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: activeTab === 'finanzas' ? 'rgba(69,243,255,0.1)' : 'transparent', color: activeTab === 'finanzas' ? 'var(--primary)' : '#fff', border: '1px solid', borderColor: activeTab === 'finanzas' ? 'var(--primary)' : 'transparent', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.3s', fontSize: '1.1rem', fontWeight: activeTab === 'finanzas' ? '600' : 'normal' }}
          >
            <LayoutDashboard size={24} />
            Finanzas
          </button>
          
          <button 
            onClick={() => setActiveTab('inventario')}
            style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: activeTab === 'inventario' ? 'rgba(69,243,255,0.1)' : 'transparent', color: activeTab === 'inventario' ? 'var(--primary)' : '#fff', border: '1px solid', borderColor: activeTab === 'inventario' ? 'var(--primary)' : 'transparent', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.3s', fontSize: '1.1rem', fontWeight: activeTab === 'inventario' ? '600' : 'normal' }}
          >
            <PackageSearch size={24} />
            Inventario
          </button>
          
          <button 
            onClick={() => setActiveTab('sucursales')}
            style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.2rem', background: activeTab === 'sucursales' ? 'rgba(69,243,255,0.1)' : 'transparent', color: activeTab === 'sucursales' ? 'var(--primary)' : '#fff', border: '1px solid', borderColor: activeTab === 'sucursales' ? 'var(--primary)' : 'transparent', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.3s', fontSize: '1.1rem', fontWeight: activeTab === 'sucursales' ? '600' : 'normal' }}
          >
            <Store size={24} />
            Sucursales
          </button>
        </nav>

        <div style={{ padding: '1.5rem 1.2rem', borderTop: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <button 
            onClick={() => navigate('/pos')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', padding: '1.2rem', background: 'var(--primary)', color: '#000', border: 'none', borderRadius: '16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}
          >
            <TerminalSquare size={22} />
            Ir a POS
          </button>
          <button 
            onClick={() => navigate('/login')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', padding: '1rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--glass-border)', borderRadius: '16px', cursor: 'pointer', fontSize: '1rem' }}
          >
            <LogOut size={20} />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '1rem 1rem 1rem 0', display: 'flex', flexDirection: 'column', zIndex: 1, overflow: 'hidden' }}>
        {activeTab === 'finanzas' && <FinanzasModule />}
        {activeTab === 'inventario' && <InventarioModule />}
        {activeTab === 'sucursales' && <SucursalesModule />}
      </main>
    </div>
  );
}
