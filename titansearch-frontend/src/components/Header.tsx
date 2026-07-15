import { Link, useLocation } from 'react-router-dom';
import { Search, GitBranch } from 'lucide-react';

export default function Header() {
  const location = useLocation();
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
        </div>

        <nav className="nav-links">
          <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
            <Search size={15} /> Explore
          </Link>
        </nav>
      </div>
    </header>
  );
}
