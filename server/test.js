// ─────────────────────────────────────────────────────────────────────────────
// test.js — Automated API Test Script
// Simulates full attendance workflow: login → create event → add students →
// check-in → check-out → verify status → edge cases
// ─────────────────────────────────────────────────────────────────────────────

const BASE = 'http://localhost:3001/api';

async function request(method, path, body = null, token = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

let passed = 0, failed = 0;
function assert(condition, msg) {
  if (condition) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ FAIL: ${msg}`); }
}

async function runTests() {
  console.log('\n🧪 Event Attendance System — API Tests\n');

  // ── 1. Health Check ────────────────────────────────────────────────────
  console.log('1️⃣  Health Check');
  let r = await request('GET', '/health');
  assert(r.status === 200 && r.data.status === 'ok', 'Health endpoint returns ok');

  // ── 2. Auth ────────────────────────────────────────────────────────────
  console.log('\n2️⃣  Authentication');
  r = await request('POST', '/auth/login', { username: 'wrong', password: 'wrong' });
  assert(r.status === 401, 'Invalid creds rejected');

  r = await request('POST', '/auth/login', { username: 'admin', password: 'admin123' });
  assert(r.status === 200 && r.data.token, 'Admin login success');
  const token = r.data.token;

  r = await request('GET', '/auth/me', null, token);
  assert(r.status === 200 && r.data.admin.username === 'admin', 'Token verification works');

  // ── 3. Students ────────────────────────────────────────────────────────
  console.log('\n3️⃣  Student Management');
  r = await request('POST', '/students', { roll_no: 'TEST001', name: 'Alice Johnson', department: 'CSE', year: 3 }, token);
  assert(r.status === 201, 'Add student Alice');

  r = await request('POST', '/students', { roll_no: 'TEST002', name: 'Bob Smith', department: 'ECE', year: 2 }, token);
  assert(r.status === 201, 'Add student Bob');

  r = await request('POST', '/students', { roll_no: 'TEST003', name: 'Charlie Brown', department: 'MECH', year: 4 }, token);
  assert(r.status === 201, 'Add student Charlie');

  r = await request('POST', '/students', { roll_no: 'TEST001', name: 'Duplicate' }, token);
  assert(r.status === 409, 'Duplicate student rejected');

  r = await request('POST', '/students/bulk', { students: [
    { roll_no: 'TEST004', name: 'Diana Prince', department: 'CSE', year: 1 },
    { roll_no: 'TEST005', name: 'Eve Wilson', department: 'IT', year: 2 }
  ]}, token);
  assert(r.status === 201 && r.data.added === 2, 'Bulk import 2 students');

  r = await request('GET', '/students', null, token);
  assert(r.status === 200 && r.data.length >= 5, 'List students returns 5+');

  // ── 4. Create Event ────────────────────────────────────────────────────
  console.log('\n4️⃣  Event Management');
  r = await request('POST', '/events', {
    title: 'Test Seminar',
    description: 'Automated test event',
    event_date: '2026-02-15',
    start_time: '10:00',
    end_time: '12:00',
    duration_minutes: 120,
    min_attendance_percent: 75
  }, token);
  assert(r.status === 201 && r.data.id, 'Create event');
  const eventId = r.data.id;

  r = await request('GET', `/events/${eventId}`, null, token);
  assert(r.status === 200 && r.data.title === 'Test Seminar', 'Get event details');

  // ── 5. Scan — Check-In ─────────────────────────────────────────────────
  console.log('\n5️⃣  QR Scan — Check-In');
  r = await request('POST', '/scan', { roll_no: 'TEST001', event_id: eventId });
  assert(r.status === 201 && r.data.action === 'CHECK_IN', 'Alice check-in');

  r = await request('POST', '/scan', { roll_no: 'TEST002', event_id: eventId });
  assert(r.status === 201 && r.data.action === 'CHECK_IN', 'Bob check-in');

  r = await request('POST', '/scan', { roll_no: 'TEST003', event_id: eventId });
  assert(r.status === 201 && r.data.action === 'CHECK_IN', 'Charlie check-in (will only check-in)');

  // Unknown student
  r = await request('POST', '/scan', { roll_no: 'UNKNOWN999', event_id: eventId });
  assert(r.status === 404, 'Unknown student rejected');

  // ── 6. Scan — Check-Out ────────────────────────────────────────────────
  console.log('\n6️⃣  QR Scan — Check-Out');
  // Wait a tiny bit to get nonzero duration
  r = await request('POST', '/scan', { roll_no: 'TEST001', event_id: eventId });
  assert(r.status === 200 && r.data.action === 'CHECK_OUT', 'Alice check-out');
  assert(r.data.duration_minutes !== undefined, 'Duration calculated');
  // Duration will be very small (< 1 min) → ABSENT since 75% of 120 min = 90 min
  assert(r.data.status === 'ABSENT', 'Short duration → ABSENT');

  r = await request('POST', '/scan', { roll_no: 'TEST002', event_id: eventId });
  assert(r.status === 200 && r.data.action === 'CHECK_OUT', 'Bob check-out');

  // ── 7. Duplicate Prevention ────────────────────────────────────────────
  console.log('\n7️⃣  Fraud Prevention');
  r = await request('POST', '/scan', { roll_no: 'TEST001', event_id: eventId });
  assert(r.status === 409 && r.data.action === 'DUPLICATE_BLOCKED', 'Duplicate scan blocked');

  // ── 8. Stats ───────────────────────────────────────────────────────────
  console.log('\n8️⃣  Stats & Attendance');
  r = await request('GET', `/events/${eventId}/stats`, null, token);
  assert(r.status === 200, 'Stats endpoint works');
  assert(r.data.total_scans === 3, 'Total scans = 3');
  assert(r.data.pending === 1, 'Pending = 1 (Charlie only checked in)');

  r = await request('GET', `/attendance/event/${eventId}`, null, token);
  assert(r.status === 200 && r.data.attendance.length === 3, 'Attendance list has 3 records');

  // ── 9. Manual Override ─────────────────────────────────────────────────
  console.log('\n9️⃣  Manual Override');
  const aliceLog = r.data.attendance.find(a => a.roll_no === 'TEST001');
  if (aliceLog) {
    r = await request('PUT', `/attendance/${aliceLog.id}/override`, { status: 'PRESENT' }, token);
    assert(r.status === 200 && r.data.attendance.status === 'PRESENT', 'Override Alice to PRESENT');
  }

  // ── 10. Finalize Event ─────────────────────────────────────────────────
  console.log('\n🔟  Finalize Event');
  r = await request('POST', `/events/${eventId}/finalize`, null, token);
  assert(r.status === 200, 'Event finalized');
  assert(r.data.finalized_count === 1, 'Charlie (PENDING) marked ABSENT');

  // Verify event is now inactive
  r = await request('GET', `/events/${eventId}`, null, token);
  assert(r.data.is_active === 0, 'Event marked inactive');

  // Scans should be rejected on inactive event
  r = await request('POST', '/scan', { roll_no: 'TEST004', event_id: eventId });
  assert(r.status === 400, 'Scan rejected on inactive event');

  // ── Cleanup ────────────────────────────────────────────────────────────
  console.log('\n🧹  Cleanup');
  r = await request('DELETE', `/events/${eventId}`, null, token);
  assert(r.status === 200, 'Event deleted');

  for (const rn of ['TEST001', 'TEST002', 'TEST003', 'TEST004', 'TEST005']) {
    await request('DELETE', `/students/${rn}`, null, token);
  }
  console.log('  Cleaned up test students');

  // ── Summary ────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log(`${'═'.repeat(50)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
