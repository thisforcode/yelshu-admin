
import React, { useEffect, useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import './SidebarLayout.css';
import logo from './assets/logo.jpeg';
import HeaderBar from './HeaderBar';

export default function SidebarLayout({ onLogout }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close the sidebar on route change (useful for mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="dashboard-container">
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`} aria-label="Sidebar Navigation">
        <div className="sidebar-title">
          <img src={logo} alt="Logo" style={{ width: 80, height: 80, objectFit: 'contain' }} />
        </div>
        <nav className="sidebar-nav">
          <Link className={`nav-item${location.pathname === '/dashboard' ? ' active' : ''}`} to="/dashboard" onClick={() => setSidebarOpen(false)}><span className="nav-icon"><i className="fas fa-home"></i></span>Dashboard</Link>
          <Link className={`nav-item${location.pathname === '/events' ? ' active' : ''}`} to="/events" onClick={() => setSidebarOpen(false)}><span className="nav-icon"><i className="fas fa-calendar-alt"></i></span>Events</Link>
          <Link className={`nav-item${location.pathname === '/users' ? ' active' : ''}`} to="/users" onClick={() => setSidebarOpen(false)}><span className="nav-icon"><i className="fas fa-users"></i></span>Users</Link>
          <Link className={`nav-item${location.pathname === '/bulk-qr-generator' ? ' active' : ''}`} to="/bulk-qr-generator" onClick={() => setSidebarOpen(false)}><span className="nav-icon"><i className="fas fa-th"></i></span>Bulk QR Generator</Link>

        </nav>
      </aside>
      {/* Backdrop for mobile when sidebar is open */}
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}

      <main className="main-content">
        {onLogout && (
          <HeaderBar onLogout={onLogout} onToggleSidebar={() => setSidebarOpen((v) => !v)} />
        )}
        <Outlet />
      </main>
    </div>
  );
}
