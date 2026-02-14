const express = require('express');
const { stringify } = require('csv-stringify/sync');
const { getOne, getAll, runSql } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// GET /api/attendance/event/:id — Live attendance list
router.get('/event/:id', (req, res) => {
  try {
    const event = getOne('SELECT * FROM events WHERE id = ?', [Number(req.params.id)]);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const logs = getAll(
      `SELECT al.*, s.name as student_name, s.department, s.year
       FROM attendance_logs al
       JOIN students s ON al.roll_no = s.roll_no
       WHERE al.event_id = ?
       ORDER BY al.check_in_time DESC`,
      [Number(req.params.id)]
    );

    res.json({ event, attendance: logs });
  } catch (err) {
    console.error('Attendance list error:', err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// GET /api/attendance/event/:id/export — Download CSV report
router.get('/event/:id/export', (req, res) => {
  try {
    const event = getOne('SELECT * FROM events WHERE id = ?', [Number(req.params.id)]);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const logs = getAll(
      `SELECT al.roll_no, s.name, s.department, s.year,
              al.check_in_time, al.check_out_time, al.duration_minutes, al.status
       FROM attendance_logs al
       JOIN students s ON al.roll_no = s.roll_no
       WHERE al.event_id = ?
       ORDER BY s.roll_no`,
      [Number(req.params.id)]
    );

    const csvData = stringify(logs, {
      header: true,
      columns: [
        { key: 'roll_no', header: 'Roll No' },
        { key: 'name', header: 'Student Name' },
        { key: 'department', header: 'Department' },
        { key: 'year', header: 'Year' },
        { key: 'check_in_time', header: 'Check-In Time' },
        { key: 'check_out_time', header: 'Check-Out Time' },
        { key: 'duration_minutes', header: 'Duration (min)' },
        { key: 'status', header: 'Status' }
      ]
    });

    const filename = `attendance_${event.title.replace(/\s+/g, '_')}_${event.event_date}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvData);
  } catch (err) {
    console.error('Export error:', err);
    res.status(500).json({ error: 'Failed to export attendance' });
  }
});

// PUT /api/attendance/:id/override — Manual status override
router.put('/:id/override', (req, res) => {
  try {
    const { status } = req.body;
    if (!['PRESENT', 'ABSENT', 'PENDING'].includes(status)) {
      return res.status(400).json({ error: 'Status must be PRESENT, ABSENT, or PENDING' });
    }

    const log = getOne('SELECT * FROM attendance_logs WHERE id = ?', [Number(req.params.id)]);
    if (!log) return res.status(404).json({ error: 'Attendance record not found' });

    runSql('UPDATE attendance_logs SET status = ? WHERE id = ?', [status, Number(req.params.id)]);
    const updated = getOne('SELECT * FROM attendance_logs WHERE id = ?', [Number(req.params.id)]);

    res.json({ message: 'Status overridden', attendance: updated });
  } catch (err) {
    console.error('Override error:', err);
    res.status(500).json({ error: 'Failed to override status' });
  }
});

module.exports = router;
