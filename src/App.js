

import './App.css';
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import BulkQRGenerator from './BulkQRGenerator';
import Reports from './Reports';

import Login from './Login';
import Dashboard from './Dashboard';
import Users from './Users';
import SidebarLayout from './SidebarLayout';

function App() {
  const [user, setUser] = useState(() => {
    const u = sessionStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });

  const handleLogin = (userObj) => {
    setUser(userObj);
    sessionStorage.setItem('user', JSON.stringify(userObj));
  };

  const handleLogout = () => {
    setUser(null);
    sessionStorage.removeItem('user');
  };

  function PrivateRoute({ children }) {
    return user ? children : <Navigate to="/login" replace />;
  }

  function PublicRoute({ children }) {
    return !user ? children : <Navigate to="/dashboard" replace />;
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
          <Route path="/users" element={<Users />} />
          <Route path="/bulk-qr-generator" element={<BulkQRGenerator />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
