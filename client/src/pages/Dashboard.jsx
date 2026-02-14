import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const res = await api.get('/events');
      setEvents(res.data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (id) => {
    try {
      await api.delete(`/events/${id}`);
      setEvents(events.filter(e => e.id !== id));
      setDeletingId(null);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete event');
      setDeletingId(null);
    }
  };

  return (
    <Layout>
      <main className="container">
        <div className="page-header">
          <div>
            <h1>Events Dashboard</h1>
            <p className="subtitle">Manage events and track attendance</p>
          </div>
          <Link to="/events/new" className="btn btn-primary">+ New Event</Link>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <h3>No Events Yet</h3>
            <p>Create your first event to start tracking attendance</p>
            <Link to="/events/new" className="btn btn-primary">Create Event</Link>
          </div>
        ) : (
          <div className="events-grid">
            {events.map(event => (
              <EventCard 
                key={event.id} 
                event={event} 
                onDelete={deleteEvent} 
                deletingId={deletingId} 
                setDeletingId={setDeletingId} 
              />
            ))}
          </div>
        )}
      </main>
    </Layout>
  );
}

function EventCard({ event, onDelete, deletingId, setDeletingId }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const res = await api.get(`/events/${event.id}/stats`);
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load stats');
    }
  };

  const isActive = event.is_active === 1;

  return (
    <div className={`event-card ${isActive ? 'active' : 'inactive'}`}>
      <div className="event-card-header">
        <div className="event-status-badge">
          <span className={`status-dot ${isActive ? 'dot-active' : 'dot-inactive'}`}></span>
          {isActive ? 'Active' : 'Ended'}
        </div>
        <span className="event-date">{event.event_date}</span>
      </div>
      <h3 className="event-title">{event.title}</h3>
      {event.description && <p className="event-desc">{event.description}</p>}
      <div className="event-meta">
        <span>⏱ {event.duration_minutes} min</span>
        <span>📊 ≥{event.min_attendance_percent}%</span>
      </div>
      {stats && (
        <div className="event-stats">
          <div className="stat">
            <span className="stat-value">{stats.total_scans}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat stat-present">
            <span className="stat-value">{stats.present}</span>
            <span className="stat-label">Present</span>
          </div>
          <div className="stat stat-absent">
            <span className="stat-value">{stats.absent}</span>
            <span className="stat-label">Absent</span>
          </div>
          <div className="stat stat-pending">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
      )}
      <div className="event-actions">
        <Link to={`/events/${event.id}/scan`} className="btn btn-scan">📷 Scan</Link>
        <button onClick={() => window.open(`http://${window.location.hostname}:8000/api/attendance/event/${event.id}/export`, '_blank')} className="btn btn-outline btn-sm">📥 CSV</button>
        <Link to={`/events/${event.id}/edit`} className="btn btn-ghost btn-sm">✏️</Link>
        {deletingId === event.id ? (
          <div className="delete-confirm">
             <button onClick={() => onDelete(event.id)} className="btn btn-xs btn-danger">Confirm?</button>
             <button onClick={() => setDeletingId(null)} className="btn btn-xs btn-ghost">Cancel</button>
          </div>
        ) : (
          <button onClick={() => setDeletingId(event.id)} className="btn btn-ghost btn-sm btn-danger">🗑️</button>
        )}
      </div>
    </div>
  );
}
