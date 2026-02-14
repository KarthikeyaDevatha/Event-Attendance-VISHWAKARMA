import { useState, useEffect } from 'react';
import api from '../api';

export default function SystemStatus() {
  const [status, setStatus] = useState('checking');
  const [details, setDetails] = useState(null);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  const checkHealth = async () => {
    try {
      const res = await api.get('/health/full');
      if (res.data.status === 'healthy') {
        setStatus('online');
      } else {
        setStatus('issues');
      }
      setDetails(res.data);
    } catch (err) {
      setStatus('offline');
    }
  };

  const getStatusColor = () => {
    if (status === 'online') return '#22c55e'; // Green
    if (status === 'issues') return '#eab308'; // Yellow
    if (status === 'offline') return '#ef4444'; // Red
    return '#64748b'; // Gray
  };

  return (
    <div className="system-status" style={{
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px',
        fontSize: '0.8rem',
        color: '#888'
    }}>
      <div style={{
          width: '8px', 
          height: '8px', 
          borderRadius: '50%', 
          backgroundColor: getStatusColor(),
          boxShadow: status === 'online' ? '0 0 5px #22c55e' : 'none'
      }}></div>
      <span>{status === 'checking' ? 'System...' : status.toUpperCase()}</span>
    </div>
  );
}
