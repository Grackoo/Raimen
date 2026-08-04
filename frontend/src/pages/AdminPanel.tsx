import React from 'react';

const AdminPanel: React.FC = () => {
  return (
    <div className="page-container" style={{ flexDirection: 'column', justifyContent: 'flex-start' }}>
      <h1 style={{ marginBottom: '2rem' }}>Panel de Administración</h1>
      
      <div className="blob-container" style={{ width: '100%', maxWidth: '800px' }}>
        <h2 style={{ marginBottom: '1rem' }}>Gestión de Sucursales</h2>
        <p style={{ marginBottom: '1rem' }}>Aquí se implementará el CRUD de sucursales, usuarios y reportes financieros.</p>
        
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc' }}>
              <th style={{ padding: '0.5rem' }}>ID</th>
              <th style={{ padding: '0.5rem' }}>Nombre</th>
              <th style={{ padding: '0.5rem' }}>Ubicación</th>
              <th style={{ padding: '0.5rem' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '0.5rem' }}>1</td>
              <td style={{ padding: '0.5rem' }}>Sucursal Central</td>
              <td style={{ padding: '0.5rem' }}>CDMX</td>
              <td style={{ padding: '0.5rem' }}>
                <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>Editar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPanel;
