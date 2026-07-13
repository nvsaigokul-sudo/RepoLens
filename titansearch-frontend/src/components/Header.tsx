import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Search, Heart, History, LogOut, GitBranch } from 'lucide-react';

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
      <div className="header-container" style={{ maxWidth: '1280px', padding: '12px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
            <div style={{
              background: '#21262d',
              border: '1px solid var(--border-default)',
              borderRadius: '50%',
              padding: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-white)'
            }}>
              <GitBranch size={20} />
            </div>
            <span style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-white)', letterSpacing: '-0.015em' }}>
              RepoLens
            </span>
          </Link>

          {token && (
            <div style={{ position: 'relative', width: '240px', marginLeft: '12px' }} className="header-search-bar">
              <input
                type="text"
                disabled
                placeholder="Type / to search repositories"
                style={{
                  width: '100%',
                  background: '#0d1117',
                  border: '1px solid var(--border-default)',
                  borderRadius: '6px',
                  color: 'var(--text-secondary)',
                  padding: '5px 12px 5px 32px',
                  fontSize: '0.8rem',
                  cursor: 'not-allowed'
                }}
              />
              <Search size={12} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '9px' }} />
            </div>
          )}
        </div>

        <nav className="nav-links">
          {token ? (
            <>
              <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
                <Search size={15} /> Explore
              </Link>
              <Link to="/favorites" className={`nav-link ${isActive('/favorites') ? 'active' : ''}`}>
                <Heart size={15} /> Favorites
              </Link>
              <Link to="/history" className={`nav-link ${isActive('/history') ? 'active' : ''}`}>
                <History size={15} /> History
              </Link>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '8px', borderLeft: '1px solid var(--border-default)', paddingLeft: '16px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{email}</span>
                <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                  <LogOut size={12} /> Sign Out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link" style={{ fontSize: '0.85rem' }}>Sign In</Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.8rem' }}>Sign Up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
