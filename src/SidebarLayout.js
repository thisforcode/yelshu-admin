
import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import './SidebarLayout.css';
import logo from './assets/logo.jpeg';

export default function SidebarLayout({ onLogout }) {
  const location = useLocation();
  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-title">
          <img src={logo} alt="Logo" style={{ width: 80, height: 80, objectFit: 'contain' }} />
        </div>
        <nav className="sidebar-nav">
          <Link className={`nav-item${location.pathname === '/dashboard' ? ' active' : ''}`} to="/dashboard"><span className="nav-icon"><i className="fas fa-home"></i></span>Dashboard</Link>
          <Link className={`nav-item${location.pathname === '/users' ? ' active' : ''}`} to="/users"><span className="nav-icon"><i className="fas fa-users"></i></span>Users</Link>
          <Link className={`nav-item${location.pathname === '/bulk-qr-generator' ? ' active' : ''}`} to="/bulk-qr-generator"><span className="nav-icon"><i className="fas fa-th"></i></span>Bulk QR Generator</Link>

        </nav>
      </aside>
      <main className="main-content">
        {onLogout && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={onLogout} style={{ background: '#22325a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 16, fontWeight: 500, cursor: 'pointer', boxShadow: '0 2px 8px #0001' }}>Logout</button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
