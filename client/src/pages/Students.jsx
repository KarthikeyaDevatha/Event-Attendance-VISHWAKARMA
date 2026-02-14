import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';

export default function Students() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [form, setForm] = useState({ roll_no: '', name: '', department: '', year: '' });
  const [bulkText, setBulkText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      const res = await api.get('/students');
      setStudents(res.data);
    } catch (err) {
      console.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const searchStudents = async () => {
    try {
      const res = await api.get(`/students?search=${encodeURIComponent(search)}`);
      setStudents(res.data);
    } catch (err) {
      console.error('Search failed');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search) searchStudents();
      else loadStudents();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const addStudent = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/students', {
        ...form,
        year: form.year ? Number(form.year) : null
      });
      setForm({ roll_no: '', name: '', department: '', year: '' });
      setShowForm(false);
      loadStudents();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add student');
    }
  };

  const bulkImport = async () => {
    setError('');
    try {
      // Parse CSV-like text: each line is "roll_no, name, department, year"
      const lines = bulkText.trim().split('\n').filter(l => l.trim());
      const studentList = lines.map(line => {
        const parts = line.split(',').map(s => s.trim());
        return {
          roll_no: parts[0],
          name: parts[1] || '',
          department: parts[2] || null,
          year: parts[3] ? Number(parts[3]) : null
        };
      });

      const res = await api.post('/students/bulk', { students: studentList });
      alert(res.data.message);
      setBulkText('');
      setShowBulk(false);
      loadStudents();
    } catch (err) {
      setError(err.response?.data?.error || 'Bulk import failed');
    }
  };

  const deleteStudent = async (rollNo) => {
    if (!confirm(`Delete student ${rollNo}?`)) return;
    try {
      await api.delete(`/students/${rollNo}`);
      setStudents(students.filter(s => s.roll_no !== rollNo));
    } catch (err) {
      alert('Failed to delete student');
    }
  };

  return (
    <Layout>
      <main className="container">
        <div className="page-header">
          <div>
            <h1>👥 Student Registry</h1>
            <p className="subtitle">{students.length} students registered</p>
          </div>
          <div className="header-actions">
            <button onClick={() => { setShowForm(!showForm); setShowBulk(false); }} className="btn btn-primary">
              + Add Student
            </button>
            <button onClick={() => { setShowBulk(!showBulk); setShowForm(false); }} className="btn btn-secondary">
              📋 Bulk Import
            </button>
          </div>
        </div>

        {/* Add Student Form */}
        {showForm && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3>Add New Student</h3>
            <form onSubmit={addStudent} className="form form-inline">
              {error && <div className="error-msg">{error}</div>}
              <div className="form-row">
                <input placeholder="Roll Number *" value={form.roll_no} onChange={e => setForm({...form, roll_no: e.target.value})} required />
                <input placeholder="Full Name *" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                <input placeholder="Department" value={form.department} onChange={e => setForm({...form, department: e.target.value})} />
                <input placeholder="Year" type="number" value={form.year} onChange={e => setForm({...form, year: e.target.value})} min={1} max={6} />
                <button type="submit" className="btn btn-primary">Add</button>
              </div>
            </form>
          </div>
        )}

        {/* Bulk Import */}
        {showBulk && (
          <div className="card" style={{ marginBottom: '1.5rem' }}>
            <h3>Bulk Import Students</h3>
            <p className="muted">Enter one student per line: <code>RollNo, Name, Department, Year</code></p>
            {error && <div className="error-msg">{error}</div>}
            <textarea
              rows={8}
              className="bulk-textarea"
              placeholder={"CS101, John Doe, CSE, 3\nEC102, Jane Smith, ECE, 2\nME103, Bob Wilson, MECH, 4"}
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
            />
            <button onClick={bulkImport} className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
              Import Students
            </button>
          </div>
        )}

        {/* Search */}
        <div className="search-bar">
          <input
            type="text"
            className="search-input search-full"
            placeholder="🔍 Search by roll number or name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Students table */}
        {loading ? (
          <div className="loading-state"><div className="spinner"></div></div>
        ) : (
          <div className="table-container">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Roll No</th>
                  <th>Name</th>
                  <th>Department</th>
                  <th>Year</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr><td colSpan={5} className="empty-table">No students found</td></tr>
                ) : (
                  students.map(s => (
                    <tr key={s.roll_no}>
                      <td className="mono">{s.roll_no}</td>
                      <td>{s.name}</td>
                      <td>{s.department || '—'}</td>
                      <td>{s.year || '—'}</td>
                      <td>
                        <button onClick={() => deleteStudent(s.roll_no)} className="btn btn-xs btn-danger" title="Delete">🗑️</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </Layout>
  );
}
