const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'attendance.db');

let db = null;

// Save database to disk periodically and on changes
function saveDb() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  }
}

async function initDb() {
  const SQL = await initSqlJs();

  // Load existing DB or create new one
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('📂 Loaded existing database from', DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('🆕 Created new database');
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // ── Schema Creation ──────────────────────────────────────────────────
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roll_no TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      department TEXT,
      year INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      event_date DATE NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      duration_minutes INTEGER NOT NULL,
      min_attendance_percent REAL NOT NULL DEFAULT 75.0,
      session_token TEXT UNIQUE NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS attendance_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      roll_no TEXT NOT NULL,
      event_id INTEGER NOT NULL,
      check_in_time DATETIME,
      check_out_time DATETIME,
      duration_minutes REAL,
      status TEXT DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(roll_no, event_id),
      FOREIGN KEY (roll_no) REFERENCES students(roll_no),
      FOREIGN KEY (event_id) REFERENCES events(id)
    )
  `);

  // Indexes
  db.run('CREATE INDEX IF NOT EXISTS idx_attendance_event ON attendance_logs(event_id)');
  db.run('CREATE INDEX IF NOT EXISTS idx_attendance_roll ON attendance_logs(roll_no)');
  db.run('CREATE INDEX IF NOT EXISTS idx_students_roll ON students(roll_no)');

  // ── Seed default admin ─────────────────────────────────────────────
  const adminCheck = db.exec("SELECT id FROM admins WHERE username = 'admin'");
  if (adminCheck.length === 0 || adminCheck[0].values.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', ['admin', hash]);
    console.log('✅ Default admin created — username: admin / password: admin123');
  }

  saveDb();
  return db;
}

// ── Helper functions (mimic better-sqlite3 API for route compatibility) ──────

function getOne(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  if (stmt.step()) {
    const cols = stmt.getColumnNames();
    const vals = stmt.get();
    stmt.free();
    const row = {};
    cols.forEach((col, i) => { row[col] = vals[i]; });
    return row;
  }
  stmt.free();
  return null;
}

function getAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  const cols = stmt.getColumnNames();
  while (stmt.step()) {
    const vals = stmt.get();
    const row = {};
    cols.forEach((col, i) => { row[col] = vals[i]; });
    rows.push(row);
  }
  stmt.free();
  return rows;
}

function runSql(sql, params = []) {
  db.run(sql, params);
  const changes = db.getRowsModified();
  // Get last insert rowid
  const lastId = getOne('SELECT last_insert_rowid() as id');
  saveDb();
  return { changes, lastInsertRowid: lastId ? lastId.id : 0 };
}

function execSql(sql) {
  db.exec(sql);
  saveDb();
}

module.exports = { initDb, getOne, getAll, runSql, execSql, saveDb };
