import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { printReceiptAndOpenDrawerUSB, openCashDrawerUSB } from '../lib/hardware';
import { useNavigate } from 'react-router-dom';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

const MOCK_LOCAL_STOCK: Record<string, Product> = {
  '123456': { id: '123456', name: 'Ramen Tonkotsu', price: 15.00, stock: 50 },
  '789012': { id: '789012', name: 'Gyoza', price: 8.50, stock: 30 },
};

export function PosTerminal() {
  const [cart, setCart] = useState<(Product & { quantity: number })[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const startScanner = async () => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode("reader");
    }
    try {
      setIsScanning(true);
      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          handleScan(decodedText);
        },
        (_error: any) => { /* Ignore regular frame errors */ }
      );
    } catch (err) {
      console.error("Failed to start scanner:", err);
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
  };

  const handleScan = (sku: string) => {
    const product = MOCK_LOCAL_STOCK[sku];
    if (product) {
      if (product.stock > 0) {
        setCart(prev => {
          const existing = prev.find(p => p.id === product.id);
          if (existing) {
            return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
          }
          return [...prev, { ...product, quantity: 1 }];
        });
        MOCK_LOCAL_STOCK[sku].stock -= 1;
      } else {
        alert("¡Agotado!");
      }
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    let receipt = `FECHA: ${new Date().toLocaleString()}\n`;
    receipt += `--------------------------\n`;
    cart.forEach(item => {
      receipt += `${item.name} x${item.quantity}  $${(item.price * item.quantity).toFixed(2)}\n`;
    });
    receipt += `--------------------------\n`;
    receipt += `TOTAL: $${total.toFixed(2)}\n`;
    receipt += `¡GRACIAS POR SU COMPRA!\n`;

    const success = await printReceiptAndOpenDrawerUSB(receipt);
    if (!success) {
      alert("Terminal sin impresora USB detectada. Procesando venta lógicamente.");
    } else {
      alert("¡Venta completada! Gaveta abierta.");
    }
    setCart([]);
  };

  return (
    <div className="pos-container">
      {/* Fondos */}
      <div className="bg-blob cyan" style={{ top: '-10%', left: '-5%', width: '450px', height: '450px' }}></div>
      <div className="bg-blob green" style={{ bottom: '-10%', right: '-5%', width: '350px', height: '350px' }}></div>

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', zIndex: 1 }}>
        <h1 style={{ fontSize: '2rem', color: 'var(--primary)' }}>RAIMEN POS</h1>
        <button onClick={() => navigate('/login')} style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: '#fff', padding: '8px 20px', borderRadius: '12px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600 }}>Salir</button>
      </header>

      {/* Contenedor Principal Glass */}
      <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.5rem', overflow: 'hidden', zIndex: 1 }}>
        
        {/* Zona del Escáner */}
        <div style={{ marginBottom: '1.5rem', textAlign: 'center', position: 'relative' }}>
          <div style={{ position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, background: 'linear-gradient(45deg, var(--primary), transparent, var(--success))', zIndex: -1, borderRadius: '26px', opacity: isScanning ? 1 : 0.3, transition: 'opacity 0.3s' }}></div>
          <div id="reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto', borderRadius: '24px', overflow: 'hidden', background: 'var(--bg-color)', border: '2px solid rgba(0,0,0,0.5)' }}></div>
          
          <button 
            onClick={isScanning ? stopScanner : startScanner}
            className={`glass-btn ${isScanning ? 'danger' : ''}`}
            style={{ marginTop: '15px', maxWidth: '400px', padding: '12px' }}
          >
            {isScanning ? 'Detener Escáner' : 'Escanear Producto'}
          </button>
        </div>

        {/* Zona del Carrito */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', padding: '0 5px' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '15px', color: 'var(--text-muted)' }}>Ticket Actual</h2>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--glass-border)', fontSize: '1.2rem' }}>El carrito está vacío</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {cart.map(item => (
                <li key={item.id} className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', marginBottom: '12px', background: 'rgba(255,255,255,0.06)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: '600', fontSize: '1.1rem', letterSpacing: '0.5px' }}>{item.name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>SKU: {item.id}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <span style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', padding: '4px 12px', borderRadius: '8px' }}>x{item.quantity}</span>
                    <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '1.3rem' }}>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Zona de Cobro */}
        <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>TOTAL</span>
            <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--success)' }}>${total.toFixed(2)}</span>
          </div>
          
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="glass-btn success"
            style={{ padding: '20px', fontSize: '1.4rem' }}
          >
            COBRAR Y ABRIR GAVETA
          </button>
          
          <button 
            onClick={openCashDrawerUSB}
            className="glass-btn"
            style={{ marginTop: '12px', padding: '12px', background: 'transparent', border: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}
          >
            Gaveta Manual (WebUSB)
          </button>
        </div>
      </div>
    </div>
  );
}
