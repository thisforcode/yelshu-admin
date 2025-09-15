

import './App.css';
import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { TenantProvider, useTenant } from './TenantContext';

import BulkQRGenerator from './BulkQRGenerator';
import Events from './Events';
import CreateEvent from './CreateEvent';
import EditEvent from './EditEvent';
import PublicRegister from './PublicRegister';

import Login from './Login';
import Dashboard from './Dashboard';
import Users from './Users';
import SidebarLayout from './SidebarLayout';

function AppContent() {
  const { isAuthenticated, loading } = useTenant();
  const [user, setUser] = useState(() => {
    const u = sessionStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });

  const handleLogin = (userObj) => {
    setUser(userObj);
    sessionStorage.setItem('user', JSON.stringify(userObj));
  };

  const handleLogout = async () => {
    try {
      // Sign out from Firebase to ensure auth state changes propagate to TenantContext
      await signOut(auth);
    } catch (err) {
      console.error('Error signing out:', err);
    }
    // Clear local session state regardless
    setUser(null);
    sessionStorage.removeItem('user');
  };

  function PrivateRoute({ children }) {
    if (loading) return <div>Loading...</div>;
    return (isAuthenticated || user) ? children : <Navigate to="/login" replace />;
  }

  function PublicRoute({ children }) {
    if (loading) return <div>Loading...</div>;
    return (!isAuthenticated && !user) ? children : <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#f8fafc'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40,
            height: 40,
            border: '4px solid #e2e8f0',
            borderTopColor: '#16233a',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#64748b', fontSize: '16px' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          <PublicRoute>
            <Login onLogin={handleLogin} />
          </PublicRoute>
        } />
        <Route element={<PrivateRoute><SidebarLayout onLogout={handleLogout} /></PrivateRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/events" element={<Events />} />
          <Route path="/create-event" element={<CreateEvent />} />
          <Route path="/edit-event/:eventId" element={<EditEvent />} />
          <Route path="/users" element={<Users />} />
          <Route path="/bulk-qr-generator" element={<BulkQRGenerator />} />
{/* ...existing code... */}
        </Route>
  {/* Public registration route (no auth required) */}
  <Route path="/r/:tenantId/:eventId/:token" element={<PublicRegister />} />
        <Route path="*" element={<Navigate to={(isAuthenticated || user) ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <TenantProvider>
      <AppContent />
    </TenantProvider>
  );
}

export default App;
