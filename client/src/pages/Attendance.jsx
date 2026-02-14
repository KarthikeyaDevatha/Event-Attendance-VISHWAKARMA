import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';

export default function Attendance() {
  const { id: eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Auto-refresh every 5s
    return () => clearInterval(interval);
  }, [eventId]);

  const loadData = async () => {
    try {
      const [attendanceRes, statsRes] = await Promise.all([
        api.get(`/attendance/event/${eventId}`),
        api.get(`/events/${eventId}/stats`)
      ]);
      setEvent(attendanceRes.data.event);
      setAttendance(attendanceRes.data.attendance);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async (logId, newStatus) => {
    try {
      await api.put(`/attendance/${logId}/override`, { status: newStatus });
      loadData();
    } catch (err) {
      alert('Failed to override status');
    }
  };

  const handleFinalize = async () => {
    if (!confirm('This will mark all PENDING students as ABSENT and deactivate the event. Continue?')) return;
    try {
      const res = await api.post(`/events/${eventId}/finalize`);
      alert(res.data.message);
      loadData();
    } catch (err) {
      alert('Failed to finalize event');
    }
  };

  const handleExport = () => {
    const token = localStorage.getItem('token');
    window.open(`http://localhost:3001/api/attendance/event/${eventId}/export?token=${token}`, '_blank');
  };

  const downloadCSVManual = async () => {
    try {
      const res = await api.get(`/attendance/event/${eventId}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_${event?.title || 'report'}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export CSV');
    }
  };

  const filtered = attendance.filter(log => {
    const matchFilter = filter === 'ALL' || log.status === filter;
    const matchSearch = !searchTerm ||
      log.roll_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.student_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchFilter && matchSearch;
  });

  if (loading) {
    return <div className="page"><div className="loading-state"><div className="spinner"></div></div></div>;
  }

  return (
    <Layout>
      <main className="container">
        <div className="page-header">
          <div>
            <h1>📊 Attendance Report</h1>
            <p className="subtitle">{event?.title} — {event?.event_date}</p>
          </div>
          <div className="header-actions">
            <button onClick={downloadCSVManual} className="btn btn-secondary">📥 Export CSV</button>
            {event?.is_active === 1 && (
              <button onClick={handleFinalize} className="btn btn-danger">🔒 Finalize Event</button>
            )}
          </div>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="attendance-stats">
            <div className="stat-card">
              <div className="stat-card-value">{stats.total_scans}</div>
              <div className="stat-card-label">Total Scanned</div>
            </div>
            <div className="stat-card stat-card-present">
              <div className="stat-card-value">{stats.present}</div>
              <div className="stat-card-label">Present</div>
            </div>
            <div className="stat-card stat-card-absent">
              <div className="stat-card-value">{stats.absent}</div>
              <div className="stat-card-label">Absent</div>
            </div>
            <div className="stat-card stat-card-pending">
              <div className="stat-card-value">{stats.pending}</div>
              <div className="stat-card-label">Pending</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="attendance-toolbar">
          <div className="filter-tabs">
            {['ALL', 'PRESENT', 'ABSENT', 'PENDING'].map(f => (
              <button
                key={f}
                className={`tab ${filter === f ? 'tab-active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f} {f === 'ALL' ? `(${attendance.length})` :
                  f === 'PRESENT' ? `(${stats?.present || 0})` :
                  f === 'ABSENT' ? `(${stats?.absent || 0})` :
                  `(${stats?.pending || 0})`}
              </button>
            ))}
          </div>
          <input
            type="text"
            className="search-input"
            placeholder="Search by name or roll no..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Attendance table */}
        <div className="table-container">
          <table className="attendance-table">
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Name</th>
                <th>Department</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="empty-table">No records found</td></tr>
              ) : (
                filtered.map(log => (
                  <tr key={log.id}>
                    <td className="mono">{log.roll_no}</td>
                    <td>{log.student_name}</td>
                    <td>{log.department || '—'}</td>
                    <td className="mono">{log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString() : '—'}</td>
                    <td className="mono">{log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString() : '—'}</td>
                    <td className="mono">{log.duration_minutes ? `${log.duration_minutes.toFixed(1)} min` : '—'}</td>
                    <td>
                      <span className={`badge badge-${log.status.toLowerCase()}`}>{log.status}</span>
                    </td>
                    <td>
                      <div className="action-btns">
                        {log.status !== 'PRESENT' && (
                          <button onClick={() => handleOverride(log.id, 'PRESENT')} className="btn btn-xs btn-present" title="Mark Present">✓</button>
                        )}
                        {log.status !== 'ABSENT' && (
                          <button onClick={() => handleOverride(log.id, 'ABSENT')} className="btn btn-xs btn-absent" title="Mark Absent">✗</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </Layout>
  );
}
