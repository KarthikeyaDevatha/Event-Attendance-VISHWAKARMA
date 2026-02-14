import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EventForm from './pages/EventForm';
import Scanner from './pages/Scanner';
import Attendance from './pages/Attendance';
import Students from './pages/Students';
import ErrorBoundary from './components/ErrorBoundary';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/events/new" element={<ProtectedRoute><EventForm /></ProtectedRoute>} />
          <Route path="/events/:id/edit" element={<ProtectedRoute><EventForm /></ProtectedRoute>} />
          <Route path="/events/:id/scan" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
          <Route path="/events/:id/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
          <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
