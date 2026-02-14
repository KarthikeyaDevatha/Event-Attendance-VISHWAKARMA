const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getOne, getAll, runSql } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// POST /api/events — Create event
router.post('/', (req, res) => {
  try {
    const { title, description, event_date, start_time, end_time, duration_minutes, min_attendance_percent } = req.body;

    if (!title || !event_date || !start_time || !end_time || !duration_minutes) {
      return res.status(400).json({ error: 'title, event_date, start_time, end_time, and duration_minutes are required' });
    }

    const session_token = uuidv4();
    const minPercent = min_attendance_percent || 75.0;

    const result = runSql(
      `INSERT INTO events (title, description, event_date, start_time, end_time, duration_minutes, min_attendance_percent, session_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description || '', event_date, start_time, end_time, duration_minutes, minPercent, session_token]
    );

    const event = getOne('SELECT * FROM events WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json(event);
  } catch (err) {
    console.error('Create event error:', err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// GET /api/events — List all events
router.get('/', (req, res) => {
  try {
    const events = getAll('SELECT * FROM events ORDER BY event_date DESC, start_time DESC');
    res.json(events);
  } catch (err) {
    console.error('List events error:', err);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/events/:id — Get single event
router.get('/:id', (req, res) => {
  try {
    const event = getOne('SELECT * FROM events WHERE id = ?', [Number(req.params.id)]);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json(event);
  } catch (err) {
    console.error('Get event error:', err);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// PUT /api/events/:id — Update event
router.put('/:id', (req, res) => {
  try {
    const event = getOne('SELECT * FROM events WHERE id = ?', [Number(req.params.id)]);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const { title, description, event_date, start_time, end_time, duration_minutes, min_attendance_percent, is_active } = req.body;

    runSql(
      `UPDATE events SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        event_date = COALESCE(?, event_date),
        start_time = COALESCE(?, start_time),
        end_time = COALESCE(?, end_time),
        duration_minutes = COALESCE(?, duration_minutes),
        min_attendance_percent = COALESCE(?, min_attendance_percent),
        is_active = COALESCE(?, is_active)
      WHERE id = ?`,
      [
        title || null, description !== undefined ? description : null, event_date || null,
        start_time || null, end_time || null, duration_minutes || null,
        min_attendance_percent || null, is_active !== undefined ? is_active : null,
        Number(req.params.id)
      ]
    );

    const updated = getOne('SELECT * FROM events WHERE id = ?', [Number(req.params.id)]);
    res.json(updated);
  } catch (err) {
    console.error('Update event error:', err);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE /api/events/:id — Delete event
router.delete('/:id', (req, res) => {
  try {
    const event = getOne('SELECT * FROM events WHERE id = ?', [Number(req.params.id)]);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    runSql('DELETE FROM attendance_logs WHERE event_id = ?', [Number(req.params.id)]);
    runSql('DELETE FROM events WHERE id = ?', [Number(req.params.id)]);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error('Delete event error:', err);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// GET /api/events/:id/stats — Aggregate attendance stats
router.get('/:id/stats', (req, res) => {
  try {
    const event = getOne('SELECT * FROM events WHERE id = ?', [Number(req.params.id)]);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const total = getOne('SELECT COUNT(*) as count FROM attendance_logs WHERE event_id = ?', [Number(req.params.id)]);
    const present = getOne("SELECT COUNT(*) as count FROM attendance_logs WHERE event_id = ? AND status = 'PRESENT'", [Number(req.params.id)]);
    const absent = getOne("SELECT COUNT(*) as count FROM attendance_logs WHERE event_id = ? AND status = 'ABSENT'", [Number(req.params.id)]);
    const pending = getOne("SELECT COUNT(*) as count FROM attendance_logs WHERE event_id = ? AND status = 'PENDING'", [Number(req.params.id)]);

    res.json({
      event_id: event.id,
      title: event.title,
      total_scans: total.count,
      present: present.count,
      absent: absent.count,
      pending: pending.count
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// POST /api/events/:id/finalize — Bulk-mark PENDING as ABSENT
router.post('/:id/finalize', (req, res) => {
  try {
    const event = getOne('SELECT * FROM events WHERE id = ?', [Number(req.params.id)]);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const result = runSql("UPDATE attendance_logs SET status = 'ABSENT' WHERE event_id = ? AND status = 'PENDING'", [Number(req.params.id)]);
    runSql('UPDATE events SET is_active = 0 WHERE id = ?', [Number(req.params.id)]);

    res.json({ message: `Finalized. ${result.changes} records marked as ABSENT.`, finalized_count: result.changes });
  } catch (err) {
    console.error('Finalize error:', err);
    res.status(500).json({ error: 'Failed to finalize event' });
  }
});

module.exports = router;
