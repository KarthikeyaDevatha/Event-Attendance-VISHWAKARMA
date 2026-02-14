const express = require('express');
const { getOne, getAll, runSql } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// POST /api/students — Add single student
router.post('/', (req, res) => {
  try {
    const { roll_no, name, department, year } = req.body;

    if (!roll_no || !name) {
      return res.status(400).json({ error: 'roll_no and name are required' });
    }

    const cleanRollNo = String(roll_no).trim().toUpperCase();

    const existing = getOne('SELECT id FROM students WHERE roll_no = ?', [cleanRollNo]);
    if (existing) {
      return res.status(409).json({ error: `Student with roll number ${cleanRollNo} already exists` });
    }

    runSql('INSERT INTO students (roll_no, name, department, year) VALUES (?, ?, ?, ?)',
      [cleanRollNo, name.trim(), department || null, year || null]);

    const student = getOne('SELECT * FROM students WHERE roll_no = ?', [cleanRollNo]);
    res.status(201).json(student);
  } catch (err) {
    console.error('Add student error:', err);
    res.status(500).json({ error: 'Failed to add student' });
  }
});

// GET /api/students — List all students
router.get('/', (req, res) => {
  try {
    const { search } = req.query;
    let students;

    if (search) {
      const term = `%${search}%`;
      students = getAll('SELECT * FROM students WHERE roll_no LIKE ? OR name LIKE ? ORDER BY roll_no', [term, term]);
    } else {
      students = getAll('SELECT * FROM students ORDER BY roll_no');
    }

    res.json(students);
  } catch (err) {
    console.error('List students error:', err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// POST /api/students/bulk — Bulk import students
router.post('/bulk', (req, res) => {
  try {
    const { students } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'Provide an array of students with roll_no and name' });
    }

    let added = 0;
    let skipped = 0;

    for (const s of students) {
      if (!s.roll_no || !s.name) {
        skipped++;
        continue;
      }
      const cleanRollNo = String(s.roll_no).trim().toUpperCase();
      const existing = getOne('SELECT id FROM students WHERE roll_no = ?', [cleanRollNo]);
      if (existing) {
        skipped++;
        continue;
      }
      try {
        runSql('INSERT INTO students (roll_no, name, department, year) VALUES (?, ?, ?, ?)',
          [cleanRollNo, s.name.trim(), s.department || null, s.year || null]);
        added++;
      } catch (e) {
        skipped++;
      }
    }

    res.status(201).json({
      message: `Imported ${added} students, skipped ${skipped} (duplicates or invalid)`,
      added, skipped
    });
  } catch (err) {
    console.error('Bulk import error:', err);
    res.status(500).json({ error: 'Failed to bulk import students' });
  }
});

// DELETE /api/students/:roll_no — Delete student
router.delete('/:roll_no', (req, res) => {
  try {
    const roll_no = req.params.roll_no.toUpperCase();
    const student = getOne('SELECT * FROM students WHERE roll_no = ?', [roll_no]);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    runSql('DELETE FROM students WHERE roll_no = ?', [roll_no]);
    res.json({ message: 'Student deleted' });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

module.exports = router;
