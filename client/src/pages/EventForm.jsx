import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';

export default function EventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    title: '',
    description: '',
    event_date: new Date().toISOString().split('T')[0],
    start_time: '',
    end_time: '',
    duration_minutes: 120,
    min_attendance_percent: 75
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEdit) {
      loadEvent();
    }
  }, [id]);

  const loadEvent = async () => {
    try {
      const res = await api.get(`/events/${id}`);
      setForm({
        title: res.data.title,
        description: res.data.description || '',
        event_date: res.data.event_date,
        start_time: res.data.start_time,
        end_time: res.data.end_time,
        duration_minutes: res.data.duration_minutes,
        min_attendance_percent: res.data.min_attendance_percent
      });
    } catch (err) {
      setError('Failed to load event');
    }
  };

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // Auto-calculate duration when start/end times change
  const handleTimeChange = (field, value) => {
    const updated = { ...form, [field]: value };
    if (updated.start_time && updated.end_time) {
      const start = new Date(`2000-01-01T${updated.start_time}`);
      const end = new Date(`2000-01-01T${updated.end_time}`);
      if (end > start) {
        updated.duration_minutes = Math.round((end - start) / 60000);
      }
    }
    setForm(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isEdit) {
        await api.put(`/events/${id}`, form);
      } else {
        await api.post('/events', form);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <main className="container container-sm">
        <div className="page-header">
          <h1>{isEdit ? 'Edit Event' : 'Create New Event'}</h1>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="form">
            {error && <div className="error-msg">{error}</div>}

            <div className="form-group">
              <label htmlFor="title">Event Title *</label>
              <input
                id="title"
                type="text"
                value={form.title}
                onChange={e => updateField('title', e.target.value)}
                placeholder="e.g., Tech Symposium 2026"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={form.description}
                onChange={e => updateField('description', e.target.value)}
                placeholder="Brief description of the event"
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="event_date">Event Date *</label>
                <input
                  id="event_date"
                  type="date"
                  value={form.event_date}
                  onChange={e => updateField('event_date', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="start_time">Start Time *</label>
                <input
                  id="start_time"
                  type="time"
                  value={form.start_time}
                  onChange={e => handleTimeChange('start_time', e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="end_time">End Time *</label>
                <input
                  id="end_time"
                  type="time"
                  value={form.end_time}
                  onChange={e => handleTimeChange('end_time', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="duration">Duration (minutes)</label>
                <input
                  id="duration"
                  type="number"
                  value={form.duration_minutes}
                  onChange={e => updateField('duration_minutes', Number(e.target.value))}
                  min={1}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="min_percent">Min Attendance %</label>
                <input
                  id="min_percent"
                  type="number"
                  value={form.min_attendance_percent}
                  onChange={e => updateField('min_attendance_percent', Number(e.target.value))}
                  min={1}
                  max={100}
                  required
                />
              </div>
            </div>

            <div className="info-box">
              ℹ️ Students must be present for at least <strong>{Math.round(form.duration_minutes * form.min_attendance_percent / 100)} minutes</strong> ({form.min_attendance_percent}% of {form.duration_minutes} min) to be marked present.
            </div>

            <div className="form-actions">
              <Link to="/" className="btn btn-ghost">Cancel</Link>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : (isEdit ? 'Update Event' : 'Create Event')}
              </button>
            </div>
          </form>
        </div>
      </main>
    </Layout>
  );
}
