import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin') {
      navigate('/admin');
    } else {
      navigate('/pos');
    }
  };

  return (
    <div className="page-center">
      {/* Formas orgánicas de fondo (Blobs) */}
      <div className="bg-blob cyan"></div>
      <div className="bg-blob green"></div>

      {/* Tarjeta de Cristal */}
      <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', padding: '3.5rem 2.5rem', textAlign: 'center', zIndex: 1 }}>
        <h1 style={{ marginBottom: '0.2rem', fontSize: '3rem', color: 'var(--primary)' }}>RAIMEN</h1>
        <h2 style={{ marginBottom: '3rem', fontSize: '1.1rem', color: 'var(--text-muted)' }}>OMNICHANNEL POS</h2>
        
        <form onSubmit={handleLogin}>
          <input
            type="text"
            className="glass-input"
            placeholder="Usuario (cajero o admin)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            className="glass-input"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="glass-btn" style={{ marginTop: '1rem' }}>
            INGRESAR
          </button>
        </form>
      </div>
    </div>
  );
}
