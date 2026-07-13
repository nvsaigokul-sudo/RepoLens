import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Heart, History, LogOut, Terminal } from 'lucide-react';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('accessToken');
  const email = localStorage.getItem('userEmail');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="app-header">
      <div className="header-container">
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={{
            background: 'var(--accent-gradient)',
            borderRadius: '8px',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--accent-glow)'
          }}>
            <Terminal size={20} color="#0b0f19" />
          </div>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.025em' }}>
            <span style={{ color: 'var(--text-primary)' }}>Titan</span>
            <span style={{ color: 'var(--accent-teal)' }}>Search</span>
          </span>
        </Link>

        <nav className="nav-links">
          {token ? (
            <>
              <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Search size={16} /> Search
              </Link>
              <Link to="/favorites" className={`nav-link ${isActive('/favorites') ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Heart size={16} /> Favorites
              </Link>
              <Link to="/history" className={`nav-link ${isActive('/history') ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <History size={16} /> History
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '12px', borderLeft: '1px solid var(--border-glass)', paddingLeft: '20px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{email}</span>
                <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Sign In</Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>Sign Up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
