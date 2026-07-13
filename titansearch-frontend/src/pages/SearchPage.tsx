import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Star, GitFork, BookOpen, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
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

export default function SearchPage() {
  const [query, setQuery] = useState('spring');
  const [language, setLanguage] = useState('');
  const [minStars, setMinStars] = useState(100);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<RepositorySummary[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const navigate = useNavigate();

  const performSearch = async (pageNum = 0) => {
    setLoading(true);
    setError('');
    
    // Construct query parameters
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (language) params.append('language', language);
    if (minStars) params.append('minStars', minStars.toString());
    params.append('page', pageNum.toString());
    params.append('size', '10');

    try {
      const response = await fetch(`http://localhost:8080/api/v1/repositories/search?${params.toString()}`);
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error?.message || 'Search failed');
      }

      setResults(json.data.content || []);
      setTotalPages(json.data.totalPages || 0);
      setTotalElements(json.data.totalElements || 0);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch search results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    performSearch(0);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(0);
  };

  const handleRepoClick = (fullName: string) => {
    navigate(`/repository/${fullName}`);
  };

  return (
    <div>
      <Header />
      <div className="glow-spot-1" />
      <div className="glow-spot-2" />

      <main style={{ maxWidth: '1000px', margin: '40px auto', padding: '0 24px' }}>
        
        {/* Search Bar & Filters Form */}
        <form onSubmit={handleSearchSubmit} className="git-card" style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '44px', height: '50px' }}
                placeholder="Search repository names, descriptions, or topics..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                required
              />
              <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '16px', top: '16px' }} />
            </div>
            <button type="submit" className="btn btn-primary" style={{ padding: '0 24px', height: '50px' }}>
              Search
            </button>
          </div>

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SlidersHorizontal size={14} color="var(--text-muted)" />
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Filters:</span>
            </div>

            <div style={{ display: 'flex', gap: '16px', flex: 1, flexWrap: 'wrap' }}>
              {/* Language Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Language:</span>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  style={{
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    padding: '6px 12px',
                    fontFamily: 'inherit',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                >
                  <option value="">Any Language</option>
                  <option value="Java">Java</option>
                  <option value="Python">Python</option>
                  <option value="JavaScript">JavaScript</option>
                  <option value="TypeScript">TypeScript</option>
                  <option value="Go">Go</option>
                  <option value="C++">C++</option>
                  <option value="Rust">Rust</option>
                </select>
              </div>

              {/* Min Stars Slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '200px' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Min Stars:</span>
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="100"
                  value={minStars}
                  onChange={(e) => setMinStars(parseInt(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--accent-teal)' }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-teal)' }}>{minStars}+</span>
              </div>
            </div>
          </div>
        </form>

        {/* Results Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Showing {totalElements} repository records in database
          </span>
        </div>

        {/* Loading / Error States */}
        {loading && (
          <div className="flex-center" style={{ minHeight: '200px', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid var(--border-glass)',
              borderTopColor: 'var(--accent-teal)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <span style={{ color: 'var(--text-secondary)' }}>Searching repository database...</span>
          </div>
        )}

        {error && (
          <div className="git-card" style={{ color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}>
            <span>{error}</span>
          </div>
        )}

        {/* Results List */}
        {!loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {results.length === 0 ? (
              <div className="git-card flex-center" style={{ minHeight: '200px', flexDirection: 'column', color: 'var(--text-secondary)' }}>
                <span>No repositories match your search filters.</span>
              </div>
            ) : (
              results.map((repo) => (
                <div
                  key={repo.id}
                  className="git-card"
                  onClick={() => handleRepoClick(repo.fullName)}
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    transition: 'transform 0.2s ease, border-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = 'var(--accent-blue)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = 'var(--border-default)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BookOpen size={18} color="var(--text-muted)" />
                      <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-indigo)' }}>
                        {repo.fullName}
                      </h3>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <Star size={14} fill="currentColor" color="#eab308" />
                        <span>{repo.stars.toLocaleString()}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <GitFork size={14} color="var(--text-muted)" />
                        <span>{repo.forks.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    {repo.description || 'No description provided.'}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {repo.topics.slice(0, 5).map((topic, i) => (
                        <span key={i} className="badge badge-topic">{topic}</span>
                      ))}
                    </div>

                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Updated {new Date(repo.lastUpdated).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginTop: '20px' }}>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px' }}
                  disabled={page === 0}
                  onClick={() => performSearch(page - 1)}
                >
                  <ChevronLeft size={16} /> Prev
                </button>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px' }}
                  disabled={page === totalPages - 1}
                  onClick={() => performSearch(page + 1)}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Spinner animation keyframe injected dynamically */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
