
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import logo from './assets/logo.jpeg';



function Login({ onLogin }) {
  const [email, setEmail] = useState('admin25@hrtc.com');
  const [password, setPassword] = useState('2025@Hrtc#');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    // Basic client-side validation
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      onLogin(userCredential.user);
    } catch (err) {
      // Handle Firebase Auth errors with user-friendly messages
      let msg = 'Login failed. Please try again.';
      if (err.code) {
        switch (err.code) {
          case 'auth/invalid-email':
            msg = 'Invalid email address.';
            break;
          case 'auth/user-disabled':
            msg = 'This user account has been disabled.';
            break;
          case 'auth/user-not-found':
            msg = 'No account found with this email.';
            break;
          case 'auth/wrong-password':
            msg = 'Incorrect password.';
            break;
          case 'auth/invalid-credential':
            msg = 'Invalid email or password.';
            break;
          default:
            msg = err.message.replace('Firebase: ', '').replace(/\(auth\/.+\)/, '').trim();
        }
      }
      setError(msg);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: '#faf8f4',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 0
    }}>
      <div style={{
        background: 'white',
        borderRadius: 20,
        boxShadow: '0 4px 32px #0002',
        padding: 40,
        width: '90vw',
        maxWidth: 400,
        minWidth: 0,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 1
      }}>
        <img src={logo} alt="Logo" style={{ width: 220, marginBottom: 24, marginTop: 8 }} />
        <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: -3, height: '100%', display: 'flex', alignItems: 'center' }}>
              <i className="far fa-envelope" style={{ fontSize: 20, opacity: 0.7, color: '#222', display: 'block' }}></i>
            </span>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 12px 12px 48px',
                borderRadius: 10,
                border: '1px solid #ddd',
                fontSize: 18,
                outline: 'none',
                marginBottom: 8,
                textAlign: 'left',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: -2, height: '100%', display: 'flex', alignItems: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', opacity: 0.7 }}>
                <rect x="4" y="11" width="16" height="9" rx="2"/>
                <path d="M8 11V7a4 4 0 1 1 8 0v4"/>
              </svg>
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px 12px 12px 48px',
                borderRadius: 10,
                border: '1px solid #ddd',
                fontSize: 18,
                outline: 'none',
                marginBottom: 8,
                textAlign: 'left',
                boxSizing: 'border-box'
              }}
            />
            <span
              onClick={() => setShowPassword((v) => !v)}
              style={{ position: 'absolute', right: 16, top: 14, cursor: 'pointer', opacity: 0.7, fontSize: 20, color: '#222', display: 'flex', alignItems: 'center' }}
              title={showPassword ? 'Hide Password' : 'Show Password'}
            >
              {showPassword ? (
                <i className="far fa-eye-slash"></i>
              ) : (
                <i className="far fa-eye"></i>
              )}
            </span>
          </div>
          <button type="submit" style={{
            width: '100%',
            background: '#185ca7',
            color: 'white',
            border: 'none',
            borderRadius: 16,
            padding: '14px 0',
            fontSize: 22,
            fontWeight: 600,
            marginTop: 8,
            marginBottom: 8,
            cursor: 'pointer',
            boxShadow: '0 2px 8px #0002'
          }}>Log In</button>
          {error && <p style={{ color: 'red', textAlign: 'center', margin: 0 }}>{error}</p>}
        </form>
      </div>
    </div>
  );
}

export default Login;
