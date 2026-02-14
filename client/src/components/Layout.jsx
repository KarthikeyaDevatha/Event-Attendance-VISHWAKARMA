import { Link, useNavigate } from 'react-router-dom';
import SystemStatus from './SystemStatus';

export default function Layout({ children, showNav = true }) {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    navigate('/login');
  };

  return (
    <div className="page">
      {showNav && (
        <nav className="navbar">
          <Link to="/" className="nav-brand">
            <img src="/logos/nss.png" alt="NSS" className="nav-logo" />
            <span className="brand-text">Event Attendance System</span>
            <img src="/logos/gitam.png" alt="GITAM" className="nav-logo gitam-logo" />
          </Link>
          <div className="nav-actions">
            <SystemStatus />
            <Link to="/students" className="btn btn-ghost">👥 Students</Link>
            <button onClick={logout} className="btn btn-ghost">🚪 Logout</button>
          </div>
        </nav>
      )}

      {children}

      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-logos">
            <img src="/logos/nss.png" alt="NSS" className="footer-logo" />
            <img src="/logos/gitam.png" alt="GITAM" className="footer-logo" />
          </div>
          <div className="footer-credit">
            Created by <span className="creator-name">Vishwakarma</span>
          </div>
          <div className="footer-sub">
            GITAM Deemed to be University — NSS Unit
          </div>
        </div>
      </footer>
    </div>
  );
}
