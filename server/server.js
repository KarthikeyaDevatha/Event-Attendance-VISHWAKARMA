const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rate limiting on scan endpoint (anti-fraud)
const scanLimiter = rateLimit({
  windowMs: 1000,
  max: 10,
  message: { error: 'Too many scan requests, slow down' }
});

// ── Routes ───────────────────────────────────────────────────────────────────
const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const scanRoutes = require('./routes/scan');
const attendanceRoutes = require('./routes/attendance');
const studentRoutes = require('./routes/students');

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/scan', scanLimiter, scanRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/students', studentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Start (async for sql.js init) ────────────────────────────────────────────
async function start() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`\n🚀 Event Attendance Server running on http://localhost:${PORT}`);
    console.log(`   API Base: http://localhost:${PORT}/api`);
    console.log(`   Health:   http://localhost:${PORT}/api/health\n`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
