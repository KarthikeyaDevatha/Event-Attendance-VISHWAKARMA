const express = require('express');
const { getOne, runSql } = require('../db');

const router = express.Router();

// POST /api/scan — Core Attendance Engine
router.post('/', (req, res) => {
  try {
    const { roll_no, event_id } = req.body;

    if (!roll_no || !event_id) {
      return res.status(400).json({ error: 'roll_no and event_id are required' });
    }

    const cleanRollNo = String(roll_no).trim().toUpperCase();

    // Validate event
    const event = getOne('SELECT * FROM events WHERE id = ?', [Number(event_id)]);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    if (!event.is_active) {
      return res.status(400).json({ error: 'Event is no longer active' });
    }

    // Validate student
    const student = getOne('SELECT * FROM students WHERE roll_no = ?', [cleanRollNo]);
    if (!student) {
      return res.status(404).json({
        error: 'Student not found',
        roll_no: cleanRollNo,
        message: `No student registered with roll number: ${cleanRollNo}`
      });
    }

    // Check existing attendance log
    const log = getOne('SELECT * FROM attendance_logs WHERE roll_no = ? AND event_id = ?', [cleanRollNo, Number(event_id)]);

    if (!log) {
      // ═══ FIRST SCAN → CHECK-IN ═══
      const now = new Date().toISOString();
      runSql(
        "INSERT INTO attendance_logs (roll_no, event_id, check_in_time, status) VALUES (?, ?, ?, 'PENDING')",
        [cleanRollNo, Number(event_id), now]
      );

      return res.status(201).json({
        action: 'CHECK_IN',
        roll_no: cleanRollNo,
        student_name: student.name,
        department: student.department,
        check_in_time: now,
        message: `✅ ${student.name} checked in successfully`
      });
    }

    if (!log.check_out_time) {
      // ═══ SECOND SCAN → CHECK-OUT + VALIDATE ═══
      const checkOut = new Date();
      const checkIn = new Date(log.check_in_time);
      const durationMs = checkOut.getTime() - checkIn.getTime();
      const durationMinutes = Math.round((durationMs / 60000) * 100) / 100;

      const requiredMinutes = event.duration_minutes * (event.min_attendance_percent / 100);
      const status = durationMinutes >= requiredMinutes ? 'PRESENT' : 'ABSENT';

      const checkOutISO = checkOut.toISOString();
      runSql(
        'UPDATE attendance_logs SET check_out_time = ?, duration_minutes = ?, status = ? WHERE roll_no = ? AND event_id = ?',
        [checkOutISO, durationMinutes, status, cleanRollNo, Number(event_id)]
      );

      return res.json({
        action: 'CHECK_OUT',
        roll_no: cleanRollNo,
        student_name: student.name,
        department: student.department,
        check_in_time: log.check_in_time,
        check_out_time: checkOutISO,
        duration_minutes: durationMinutes,
        required_minutes: requiredMinutes,
        status: status,
        message: status === 'PRESENT'
          ? `✅ ${student.name} — PRESENT (${durationMinutes.toFixed(1)} min)`
          : `❌ ${student.name} — ABSENT (${durationMinutes.toFixed(1)} min < ${requiredMinutes.toFixed(1)} min required)`
      });
    }

    // ═══ ALREADY COMPLETED → DUPLICATE BLOCKED ═══
    return res.status(409).json({
      action: 'DUPLICATE_BLOCKED',
      roll_no: cleanRollNo,
      student_name: student.name,
      status: log.status,
      message: `⚠️ ${student.name} has already checked in and out for this event`,
      check_in_time: log.check_in_time,
      check_out_time: log.check_out_time,
      duration_minutes: log.duration_minutes
    });

  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Duplicate scan detected' });
    }
    console.error('Scan error:', err);
    res.status(500).json({ error: 'Failed to process scan' });
  }
});

module.exports = router;
