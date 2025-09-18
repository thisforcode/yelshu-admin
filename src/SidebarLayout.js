
import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import './SidebarLayout.css';
import logo from './assets/logo.jpeg';
import HeaderBar from './HeaderBar';

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
          <Link className={`nav-item${location.pathname === '/events' ? ' active' : ''}`} to="/events"><span className="nav-icon"><i className="fas fa-calendar-alt"></i></span>Events</Link>
          <Link className={`nav-item${location.pathname === '/users' ? ' active' : ''}`} to="/users"><span className="nav-icon"><i className="fas fa-users"></i></span>Users</Link>
          <Link className={`nav-item${location.pathname === '/bulk-qr-generator' ? ' active' : ''}`} to="/bulk-qr-generator"><span className="nav-icon"><i className="fas fa-th"></i></span>Bulk QR Generator</Link>

        </nav>
      </aside>
      <main className="main-content">
        {onLogout && (
          <HeaderBar onLogout={onLogout} />
        )}
        <Outlet />
      </main>
    </div>
  );
}
