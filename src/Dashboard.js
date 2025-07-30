import React from 'react';
import './Dashboard.css';

const Dashboard = ({ onLogout }) => {
  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-title">
          <img src={require('./assets/logo.jpeg')} alt="Logo" style={{ width: 80, height: 80, objectFit: 'contain' }} />
        </div>
        <nav className="sidebar-nav">
          <a className="nav-item active" href="#"><span className="nav-icon"><i className="fas fa-home"></i></span>Dashboard</a>
          <a className="nav-item" href="#"><span className="nav-icon"><i className="fas fa-users"></i></span>Users</a>
          <a className="nav-item" href="#"><span className="nav-icon"><i className="fas fa-th"></i></span>Bulk QR Generator</a>
          <a className="nav-item" href="#"><span className="nav-icon"><i className="fas fa-chart-bar"></i></span>Reports</a>
        </nav>
      </aside>
      <main className="main-content">
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button onClick={onLogout} style={{ background: '#22325a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 16, fontWeight: 500, cursor: 'pointer', boxShadow: '0 2px 8px #0001' }}>Logout</button>
        </div>
        <h1 className="dashboard-title">Admin Dashboard</h1>
        <div className="dashboard-cards">
          <div className="dashboard-card">
            <div className="card-label">Total Events</div>
            <div className="card-value">12</div>
          </div>
          <div className="dashboard-card">
            <div className="card-label">Total Users</div>
            <div className="card-value">350</div>
          </div>
          <div className="dashboard-card">
            <div className="card-label">Total QR Codes Generated</div>
            <div className="card-value">1.250</div>
          </div>
          <div className="dashboard-card">
            <div className="card-label">Total Reports</div>
            <div className="card-value">8</div>
          </div>
        </div>
        <div className="event-overview-section">
          <div className="event-overview-title">Event Overview</div>
          <div className="event-overview-chart">
            <svg width="100%" height="120" viewBox="0 0 400 120">
              <polyline
                fill="rgba(24, 92, 167, 0.07)"
                stroke="none"
                points="0,100 40,80 80,90 120,60 160,80 200,50 240,70 280,60 320,100 360,40 400,80 400,120 0,120"
              />
              <polyline
                fill="none"
                stroke="#185ca7"
                strokeWidth="3"
                points="0,100 40,80 80,90 120,60 160,80 200,50 240,70 280,60 320,100 360,40 400,80"
              />
              {
                [
                  [0,100],[40,80],[80,90],[120,60],[160,80],[200,50],[240,70],[280,60],[320,100],[360,40],[400,80]
                ].map(([x,y],i) => (
                  <circle key={i} cx={x} cy={y} r="4" fill="#fff" stroke="#185ca7" strokeWidth="2" />
                ))
              }
            </svg>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
