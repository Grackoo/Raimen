import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Dummy login logic for now
    if (username === 'admin') {
      navigate('/admin');
    } else {
      alert('Login fallido (usa admin para pruebas)');
    }
  };

  return (
    <div className="page-container">
      <div className="blob-container" style={{ width: '100%', maxWidth: '400px', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '2rem' }}>RAIMEN POS</h1>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            className="input-field"
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            type="password"
            className="input-field"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" className="btn" style={{ width: '100%', marginTop: '1rem' }}>
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
