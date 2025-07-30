

import './App.css';
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';

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
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard onLogout={handleLogout} />
          </PrivateRoute>
        } />
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
