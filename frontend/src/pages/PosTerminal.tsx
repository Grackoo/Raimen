import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { printReceiptAndOpenDrawerUSB, openCashDrawerUSB } from '../lib/hardware';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

// Mocked local stock
const MOCK_LOCAL_STOCK: Record<string, Product> = {
  '123456': { id: '123456', name: 'Ramen Tonkotsu', price: 15.00, stock: 50 },
  '789012': { id: '789012', name: 'Gyoza', price: 8.50, stock: 30 },
};

export function PosTerminal() {
  const [cart, setCart] = useState<(Product & { quantity: number })[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup scanner on unmount
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
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          handleScan(decodedText);
          // Optional: automatically stop scanning after successful scan
          // stopScanner();
        },
        (error) => {
          // console.warn("QR Error:", error);
        }
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
        // Decrease mock stock
        MOCK_LOCAL_STOCK[sku].stock -= 1;
      } else {
        alert("Out of stock!");
      }
    } else {
      console.warn("Product not found:", sku);
    }
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    // Format receipt text
    let receipt = `DATE: ${new Date().toLocaleString()}\n`;
    receipt += `--------------------------\n`;
    cart.forEach(item => {
      receipt += `${item.name} x${item.quantity}  $${(item.price * item.quantity).toFixed(2)}\n`;
    });
    receipt += `--------------------------\n`;
    receipt += `TOTAL: $${total.toFixed(2)}\n`;
    receipt += `THANK YOU FOR YOUR PURCHASE!\n`;

    const success = await printReceiptAndOpenDrawerUSB(receipt);
    if (!success) {
      alert("Failed to connect to printer. Trying to just open drawer via USB fallback, or simulate.");
      // In a real app we might fallback or show instructions
    } else {
      alert("Checkout successful! Drawer opened.");
    }
    
    setCart([]);
  };

  return (
    <div style={{
      backgroundColor: '#121212', 
      color: '#ffffff', 
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      padding: '1rem',
      fontFamily: 'Inter, sans-serif'
    }}>
      <h1 style={{ fontFamily: '"Black Ops One", "Stardos Stencil", sans-serif', textAlign: 'center', marginBottom: '1rem' }}>
        RAIMEN POS
      </h1>

      <div style={{
        backgroundColor: '#ffffff',
        color: '#121212',
        borderRadius: '20px',
        padding: '1rem',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
      }}>
        
        {/* Scanner Area */}
        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
          <div id="reader" style={{ width: '100%', maxWidth: '400px', margin: '0 auto', borderRadius: '10px', overflow: 'hidden' }}></div>
          {!isScanning ? (
            <button 
              onClick={startScanner}
              style={{ padding: '10px 20px', marginTop: '10px', backgroundColor: '#007bff', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}
            >
              Start Scanner
            </button>
          ) : (
            <button 
              onClick={stopScanner}
              style={{ padding: '10px 20px', marginTop: '10px', backgroundColor: '#dc3545', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold' }}
            >
              Stop Scanner
            </button>
          )}
        </div>

        {/* Cart Area */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem', borderTop: '1px solid #ccc', paddingTop: '1rem' }}>
          <h2 style={{ marginTop: 0, fontSize: '1.2rem' }}>Current Order</h2>
          {cart.length === 0 ? (
            <p style={{ color: '#666' }}>No items scanned yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {cart.map(item => (
                <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px dashed #eee' }}>
                  <span>{item.name} (x{item.quantity})</span>
                  <span>${(item.price * item.quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Total & Checkout */}
        <div style={{ borderTop: '2px solid #333', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0}
            style={{
              width: '100%',
              padding: '15px',
              backgroundColor: cart.length === 0 ? '#ccc' : '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              cursor: cart.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            CHARGE & OPEN DRAWER
          </button>
        </div>
        
        {/* Drawer manual open */}
        <button 
          onClick={openCashDrawerUSB}
          style={{
            width: '100%',
            padding: '10px',
            marginTop: '10px',
            backgroundColor: '#6c757d',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          OPEN DRAWER (MANUAL)
        </button>
      </div>
    </div>
  );
}
