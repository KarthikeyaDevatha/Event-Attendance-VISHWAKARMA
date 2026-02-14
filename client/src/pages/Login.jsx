import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { username, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('admin', JSON.stringify(res.data.admin));
      navigate('/');
    } catch (err) {
      console.error("Login Error Details:", err);
      const msg = err.response?.data?.error || err.message || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-logos">
          <img src="/logos/nss.png" alt="NSS" className="login-logo" />
          <img src="/logos/gitam.png" alt="GITAM" className="login-logo" />
        </div>
        <div className="login-header">
          <h1>Event Attendance</h1>
          <p>QR-Based Check-in System</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-msg">
            {error} <br/>
            <small style={{fontSize: '0.8em', color: '#ffaaaa'}}>
              Check console for details. (Backend: http://localhost:8000)
            </small>
          </div>}
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="login-footer">
          <small>Default: admin / admin123</small>
        </div>
        <div className="login-credit">
          Created by <span className="creator-name">Vishwakarma</span>
        </div>
      </div>
    </div>
  );
}
