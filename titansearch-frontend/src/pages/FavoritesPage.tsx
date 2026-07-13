import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Heart, BookOpen, Star, GitFork, Trash2 } from 'lucide-react';
import Header from '../components/Header';

interface RepositorySummary {
  id: number;
  fullName: string;
  owner: string;
  description: string;
  stars: number;
  forks: number;
  topics: string[];
  lastUpdated: string;
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<RepositorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const token = localStorage.getItem('accessToken');

  const fetchFavorites = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/v1/favorites`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to load favorites');
      setFavorites(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch favorites');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (repoId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`http://localhost:8080/api/v1/favorites/${repoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setFavorites(favorites.filter(f => f.id !== repoId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (token) {
      fetchFavorites();
    } else {
      setLoading(false);
      setError('You must be signed in to view favorites');
    }
  }, []);

  return (
    <div>
      <Header />
      <div className="glow-spot-1" />
      <div className="glow-spot-2" />

      <main style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 24px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Heart size={24} color="var(--color-danger)" fill="var(--color-danger)" />
          Your Favorite Repositories
        </h2>

        {loading ? (
          <div className="flex-center" style={{ minHeight: '200px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid var(--border-glass)',
              borderTopColor: 'var(--accent-teal)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        ) : error ? (
          <div className="glass-panel" style={{ color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <span>{error}</span>
          </div>
        ) : favorites.length === 0 ? (
          <div className="glass-panel flex-center" style={{ minHeight: '200px', flexDirection: 'column', color: 'var(--text-muted)' }}>
            <BookOpen size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <span>You haven't saved any repositories to favorites yet.</span>
            <Link to="/" className="btn btn-primary" style={{ marginTop: '20px' }}>Explore Repositories</Link>
          </div>
        ) : (
          <div className="grid-container">
            {favorites.map((repo) => (
              <Link
                key={repo.id}
                to={`/repository/${repo.fullName}`}
                className="glass-panel"
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  transition: 'transform 0.2s ease, border-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'rgba(0, 242, 254, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--border-glass)';
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={16} color="var(--text-muted)" />
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-indigo)' }}>
                      {repo.fullName}
                    </h3>
                  </div>

                  <button
                    onClick={(e) => handleRemoveFavorite(repo.id, e)}
                    className="btn btn-danger"
                    style={{ padding: '6px', borderRadius: '6px' }}
                    title="Remove from favorites"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', minHeight: '36px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {repo.description || 'No description provided.'}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: '1px solid var(--border-glass)', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <Star size={12} fill="currentColor" color="#eab308" />
                      <span>{repo.stars.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <GitFork size={12} color="var(--text-muted)" />
                      <span>{repo.forks.toLocaleString()}</span>
                    </div>
                  </div>

                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Pushed {new Date(repo.lastUpdated).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
