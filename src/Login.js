
import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';
import logo from './assets/logo.jpeg';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import EmailOutlined from '@mui/icons-material/EmailOutlined';
import LockOutlined from '@mui/icons-material/LockOutlined';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    try {
      setSubmitting(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      onLogin(userCredential.user);
    } catch (err) {
      let msg = 'Login failed. Please try again.';
      if (err.code) {
        switch (err.code) {
          case 'auth/invalid-email':
            msg = 'Invalid email address.'; break;
          case 'auth/user-disabled':
            msg = 'This user account has been disabled.'; break;
          case 'auth/user-not-found':
            msg = 'No account found with this email.'; break;
          case 'auth/wrong-password':
            msg = 'Incorrect password.'; break;
          case 'auth/invalid-credential':
            msg = 'Invalid email or password.'; break;
          default:
            msg = (err.message || '').replace('Firebase: ', '').replace(/\(auth\/.+\)/, '').trim();
        }
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <Paper sx={{ p: 4, width: '100%', border: '1px solid #e2e8f0' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
          <img src={logo} alt="Logo" style={{ width: 160, height: 'auto' }} />
          <Typography variant="h2" sx={{ mt: 1, fontWeight: 700 }}>Sign in</Typography>
          <Typography variant="body2" color="text.secondary">Use your admin account to continue</Typography>
        </Box>
        <Box component="form" onSubmit={handleLogin} noValidate sx={{ display: 'grid', gap: 2 }}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailOutlined />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockOutlined />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((v) => !v)} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {error && (
            <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>
          )}
          <Button type="submit" variant="contained" color="primary" size="large" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}

export default Login;
