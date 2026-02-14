import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import QrScanner from '../components/QrScanner';
import Layout from '../components/Layout';

export default function Scanner() {
  const { id: eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [stats, setStats] = useState(null);
  const [processingUI, setProcessingUI] = useState(false);
  const processingRef = useRef(false);
  const lastScanTime = useRef(0);
  const lastScanValue = useRef('');

  useEffect(() => {
    loadEvent();
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const res = await api.get(`/events/${eventId}`);
      setEvent(res.data);
    } catch (err) {
      console.error('Failed to load event');
    }
  };

  const loadStats = async () => {
    try {
      const res = await api.get(`/events/${eventId}/stats`);
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load stats');
    }
  };

  const handleScan = useCallback(async (decodedText) => {
    // Debounce: ignore same QR within 3 seconds
    const now = Date.now();
    if (decodedText === lastScanValue.current && (now - lastScanTime.current) < 3000) {
      return;
    }
    lastScanTime.current = now;
    lastScanValue.current = decodedText;
    
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessingUI(true);

    try {
      const res = await api.post('/scan', {
        roll_no: decodedText.trim(),
        event_id: Number(eventId)
      });

      setLastResult({ success: true, data: res.data });
      setRecentScans(prev => [res.data, ...prev].slice(0, 20));
      loadStats();
    } catch (err) {
      const data = err.response?.data || { error: 'Scan failed' };
      setLastResult({
        success: false,
        data: { 
          ...data, 
          action: data.action || 'ERROR', 
          message: data.message || data.error || data.detail || 'Scan failed',
          roll_no: decodedText.trim() // Ensure roll_no is shown even on error
        }
      });
    } finally {
      processingRef.current = false;
      setProcessingUI(false);
    }
  }, [eventId]);

  const getResultClass = () => {
    if (!lastResult) return '';
    if (!lastResult.success) {
      return lastResult.data.action === 'DUPLICATE_BLOCKED' ? 'result-warning' : 'result-error';
    }
    if (lastResult.data.action === 'CHECK_IN') return 'result-checkin';
    if (lastResult.data.status === 'PRESENT') return 'result-present';
    return 'result-absent';
  };

  // Lyra Phase 3: USB Scanner (Keyboard Wedge) Listener
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = 0;

    const handleKeyDown = (e) => {
        const now = Date.now();
        const char = e.key;

        // Reset if too slow (manual typing)
        if (now - lastKeyTime > 100) { 
            buffer = ""; 
        }
        lastKeyTime = now;

        if (char === 'Enter') {
            if (buffer.length > 3) { // Min length filter
                console.log("USB Scan Detected:", buffer);
                handleScan(buffer);
            }
            buffer = "";
        } else if (char.length === 1) {
            buffer += char;
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleScan]);

  if (!event) {
    return <div className="page"><div className="loading-state"><div className="spinner"></div></div></div>;
  }

  return (
    <Layout>
      <main className="container">
        <div className="page-header">
          <div>
            <h1>📷 QR Scanner</h1>
            <p className="subtitle">{event.title} — {event.event_date}</p>
          </div>
        </div>

        <div className="scanner-layout">
          <div className="scanner-main">
            <div className="card scanner-card">
              {!scanning ? (
                <div className="scanner-start">
                  <div className="scanner-start-icon">📷</div>
                  <h3>Ready to Scan</h3>
                  <p>Click the button below to start the QR scanner</p>
                  <button onClick={() => setScanning(true)} className="btn btn-primary btn-lg">
                    Start Scanning
                  </button>
                </div>
              ) : (
                <>
                  <QrScanner onScan={handleScan} scanning={scanning} />
                  <button onClick={() => setScanning(false)} className="btn btn-danger btn-full" style={{ marginTop: '1rem' }}>
                    Stop Scanner
                  </button>
                </>
              )}
            </div>

            {/* Last scan result */}
            {lastResult && (
              <div className={`scan-result ${getResultClass()}`}>
                <div className="result-message">{lastResult.data.message}</div>
                {(lastResult.data.student_name || lastResult.data.roll_no) && (
                  <div className="result-details">
                    <span>ID: {lastResult.data.roll_no}</span>
                    {lastResult.data.student_name && <span>{lastResult.data.student_name}</span>}
                    {lastResult.data.duration_minutes !== undefined && (
                      <span>{lastResult.data.duration_minutes?.toFixed(1)} min</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {processingUI && (
              <div className="processing-indicator">
                <div className="spinner-small"></div>
                <span>Processing scan...</span>
              </div>
            )}
          </div>

          <div className="scanner-sidebar">
            {/* Live stats */}
            {stats && (
              <div className="card stats-card">
                <h3>Live Stats</h3>
                <div className="stats-grid">
                  <div className="mini-stat">
                    <span className="mini-stat-value">{stats.total_scans}</span>
                    <span className="mini-stat-label">Scanned</span>
                  </div>
                  <div className="mini-stat present">
                    <span className="mini-stat-value">{stats.present}</span>
                    <span className="mini-stat-label">Present</span>
                  </div>
                  <div className="mini-stat absent">
                    <span className="mini-stat-value">{stats.absent}</span>
                    <span className="mini-stat-label">Absent</span>
                  </div>
                  <div className="mini-stat pending">
                    <span className="mini-stat-value">{stats.pending}</span>
                    <span className="mini-stat-label">Pending</span>
                  </div>
                </div>
              </div>
            )}

            {/* Recent scans feed */}
            <div className="card recent-scans">
              <h3>Recent Scans</h3>
              {recentScans.length === 0 ? (
                <p className="muted">No scans yet</p>
              ) : (
                <ul className="scan-feed">
                  {recentScans.map((scan, i) => (
                    <li key={i} className={`scan-item ${scan.action === 'CHECK_IN' ? 'scan-in' : 'scan-out'}`}>
                      <span className="scan-action">{scan.action === 'CHECK_IN' ? '→' : '←'}</span>
                      <span className="scan-name">{scan.student_name}</span>
                      <span className="scan-roll">{scan.roll_no}</span>
                      {scan.status && scan.status !== 'PENDING' && (
                        <span className={`scan-status ${scan.status === 'PRESENT' ? 'status-present' : 'status-absent'}`}>
                          {scan.status}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
