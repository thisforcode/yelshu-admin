
import logo from './logo.svg';
import './App.css';
import React, { useState } from 'react';
import { auth } from './firebase';
import Login from './Login';


function App() {
  const [user, setUser] = useState(null);

  const handleLogin = (user) => {
    setUser(user);
  };

  const handleLogout = () => {
    auth.signOut();
    setUser(null);
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        {user ? (
          <>
            <p>Welcome, {user.email}!</p>
            <button onClick={handleLogout}>Logout</button>
          </>
        ) : (
          <Login onLogin={handleLogin} />
        )}
      </header>
    </div>
  );
}

export default App;
