import React, { useState } from 'react';

const Dashboard: React.FC = () => {
  const [salesData] = useState([
    { id: 1, item: 'Ramen Bowl A', localSales: 150, mlSales: 45, localPrice: 12.99 },
    { id: 2, item: 'Ramen Bowl B', localSales: 200, mlSales: 60, localPrice: 14.99 },
    { id: 3, item: 'Spicy Noodle', localSales: 120, mlSales: 80, localPrice: 11.99 },
  ]);

  return (
    <div className="dashboard-container" style={{ padding: '20px' }}>
      <h1>Financial Analytics Dashboard</h1>
      
      <div className="kpi-cards" style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
        <div className="card" style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '8px', flex: 1 }}>
          <h3>Total Local Sales</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>$6,385.50</p>
        </div>
        <div className="card" style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '8px', flex: 1 }}>
          <h3>Total ML Sales</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>$2,442.15</p>
        </div>
        <div className="card" style={{ padding: '15px', border: '1px solid #ccc', borderRadius: '8px', flex: 1 }}>
          <h3>Top Selling Item</h3>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>Ramen Bowl B</p>
        </div>
      </div>

      <div className="data-table">
        <h2>Sales Correlation: Local vs Mercado Libre</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5', textAlign: 'left' }}>
              <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Item Name</th>
              <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Local Price</th>
              <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Local Sales (Qty)</th>
              <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>ML Sales (Qty)</th>
              <th style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>Total Revenue</th>
            </tr>
          </thead>
          <tbody>
            {salesData.map((data) => (
              <tr key={data.id}>
                <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{data.item}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>${data.localPrice}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{data.localSales}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{data.mlSales}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                  ${((data.localSales + data.mlSales) * data.localPrice).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;
