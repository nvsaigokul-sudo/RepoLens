import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search, Star, GitFork, BookOpen, SlidersHorizontal,
  ChevronLeft, ChevronRight, Layers, Bell, Moon,
  Settings, ArrowRight
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'repositories' | 'projects' | 'saved' | 'settings'>('overview');
  const [query, setQuery] = useState('spring');
  const [language, setLanguage] = useState('');
  const [minStars, setMinStars] = useState(100);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<RepositorySummary[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [headerSearch, setHeaderSearch] = useState('');

  const navigate = useNavigate();

  const performSearch = async (pageNum = 0) => {
    setLoading(true);
    setError('');
    
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

  const handleHeaderSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headerSearch.trim()) return;
    
    // If it contains a slash, assume it's a full repo path e.g. "owner/repo"
    if (headerSearch.includes('/')) {
      navigate(`/repository/${headerSearch.trim()}`);
    } else {
      setQuery(headerSearch);
      setActiveTab('repositories');
      performSearch(0);
    }
  };

  const handleRepoClick = (fullName: string) => {
    navigate(`/repository/${fullName}`);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      {/* Top Header */}
      <header style={{
        background: '#161b22',
        borderBottom: '1px solid var(--border-default)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        height: '60px'
      }}>
        {/* Left: Brand Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#58a6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--bg-main)',
              fontWeight: 800,
              fontSize: '1rem'
            }}>
              RL
            </div>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-white)' }}>
              GitHub Clone
            </span>
          </Link>

          {/* Inline Search Bar */}
          <form onSubmit={handleHeaderSearchSubmit} style={{ position: 'relative', width: '280px', marginLeft: '12px' }}>
            <input
              type="text"
              placeholder="Search or jump to... (e.g. owner/repo)"
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                padding: '6px 12px 6px 32px',
                fontSize: '0.85rem',
                color: 'var(--text-white)',
                outline: 'none',
                height: '32px'
              }}
            />
            <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '9px' }} />
          </form>
        </div>

        {/* Right Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button 
              onClick={() => setActiveTab('overview')} 
              style={{ background: 'none', border: 'none', color: activeTab === 'overview' ? 'var(--text-white)' : 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: activeTab === 'overview' ? 600 : 400 }}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('repositories')} 
              style={{ background: 'none', border: 'none', color: activeTab === 'repositories' ? 'var(--text-white)' : 'var(--text-secondary)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: activeTab === 'repositories' ? 600 : 400 }}
            >
              Repositories
            </button>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'not-allowed' }}>Pull Requests</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'not-allowed' }}>Issues</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid var(--border-default)', paddingLeft: '16px' }}>
            <Bell size={16} color="var(--text-secondary)" style={{ cursor: 'pointer' }} />
            <Moon size={16} color="var(--text-secondary)" style={{ cursor: 'pointer' }} />
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#238636',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-white)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}>
              SG
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Wrapper */}
      <div style={{
        maxWidth: '1280px',
        width: '100%',
        margin: '24px auto',
        padding: '0 24px',
        display: 'grid',
        gridTemplateColumns: '280px 1fr',
        gap: '24px',
        flex: 1
      }}>
        
        {/* Left Column Sidebar */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* User Profile Card */}
          <div className="git-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '24px' }}>
            {/* Avatar matching screenshot style */}
            <div style={{
              width: '100px',
              height: '100px',
              borderRadius: '50%',
              background: '#0d1117',
              border: '2px solid var(--border-default)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              position: 'relative'
            }}>
              <div style={{
                width: '84px',
                height: '84px',
                borderRadius: '50%',
                background: '#52b788',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '2rem',
                fontWeight: 700
              }}>
                S
              </div>
            </div>

            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-white)' }}>
              Sai Gokul N
            </h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              @nvsaigokul
            </span>

            {/* Repos & Stars Boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%' }}>
              <div style={{
                background: '#0d1117',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                padding: '8px'
              }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-white)' }}>24</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Repos</div>
              </div>
              <div style={{
                background: '#0d1117',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                padding: '8px'
              }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-white)' }}>182</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Stars</div>
              </div>
            </div>
          </div>

          {/* Navigation Vertical List */}
          <nav className="git-card" style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onClick={() => setActiveTab('overview')}
              className={`sidebar-menu-item ${activeTab === 'overview' ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'left',
                background: activeTab === 'overview' ? '#21262d' : 'transparent',
                color: activeTab === 'overview' ? 'var(--text-white)' : 'var(--text-secondary)'
              }}
            >
              <BookOpen size={16} /> Overview
            </button>
            <button
              onClick={() => setActiveTab('repositories')}
              className={`sidebar-menu-item ${activeTab === 'repositories' ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'left',
                background: activeTab === 'repositories' ? '#21262d' : 'transparent',
                color: activeTab === 'repositories' ? 'var(--text-white)' : 'var(--text-secondary)'
              }}
            >
              <Search size={16} /> Repositories
            </button>
            <button
              onClick={() => setActiveTab('projects')}
              className={`sidebar-menu-item ${activeTab === 'projects' ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'left',
                background: activeTab === 'projects' ? '#21262d' : 'transparent',
                color: activeTab === 'projects' ? 'var(--text-white)' : 'var(--text-secondary)'
              }}
            >
              <Layers size={16} /> Projects
            </button>
            <button
              onClick={() => setActiveTab('saved')}
              className={`sidebar-menu-item ${activeTab === 'saved' ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'left',
                background: activeTab === 'saved' ? '#21262d' : 'transparent',
                color: activeTab === 'saved' ? 'var(--text-white)' : 'var(--text-secondary)'
              }}
            >
              <Star size={16} /> Saved
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`sidebar-menu-item ${activeTab === 'settings' ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'left',
                background: activeTab === 'settings' ? '#21262d' : 'transparent',
                color: activeTab === 'settings' ? 'var(--text-white)' : 'var(--text-secondary)'
              }}
            >
              <Settings size={16} /> Settings
            </button>
          </nav>
        </aside>

        {/* Right Column Content Area */}
        <main style={{ minWidth: 0 }}>
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Build and deploy banner matching screenshot */}
              <div className="git-card" style={{
                position: 'relative',
                padding: '32px',
                background: 'linear-gradient(135deg, #1f2937, #111827)',
                overflow: 'hidden',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ zIndex: 1, maxWidth: '65%' }}>
                  <h2 style={{ margin: '0 0 8px 0', fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-white)', letterSpacing: '-0.02em' }}>
                    Build, train, and deploy RepoLens
                  </h2>
                  <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                    A polished GitHub clone and repository analytics workspace. Sync files, trigger AI reviews, audit tech stacks, and generate resume summaries live.
                  </p>
                  <button onClick={() => setActiveTab('repositories')} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    Explore Repositories <ArrowRight size={14} />
                  </button>
                </div>

                {/* Contribution Streak Card */}
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '20px',
                  minWidth: '220px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(8px)',
                  zIndex: 1
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                    Contribution streak
                  </div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#52b788', display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0 8px 0' }}>
                    42 days 🔥
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Keep it going! You're in the top 5% of authors this week.
                  </div>
                </div>

                {/* Styled background decor */}
                <div style={{
                  position: 'absolute',
                  right: '-10%',
                  top: '-20%',
                  width: '300px',
                  height: '300px',
                  background: 'radial-gradient(circle, rgba(88,166,255,0.08) 0%, transparent 70%)',
                  borderRadius: '50%'
                }} />
              </div>

              {/* Side-by-Side: Top Repositories & Open PRs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                {/* Top Repos Panel */}
                <div className="git-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-white)' }}>
                    Top Repositories
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { name: 'Cyber-Sentinel', desc: 'Secure repository auditor and threat modeling interface.', lang: 'Java', stars: 18, owner: 'nvsaigokul-sudo' },
                      { name: 'RepoLens', desc: 'Stateless workspace analyzer for GitHub repositories.', lang: 'TypeScript', stars: 12, owner: 'nvsaigokul-sudo' },
                      { name: 'spring-boot-stateless', desc: 'Sample template showcasing cache-backed architectures.', lang: 'Java', stars: 8, owner: 'nvsaigokul-sudo' }
                    ].map((r, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleRepoClick(`${r.owner}/${r.name}`)}
                        style={{
                          background: '#0d1117',
                          border: '1px solid var(--border-default)',
                          borderRadius: '6px',
                          padding: '12px 16px',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-default)'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-blue)' }}>{r.name}</span>
                          <span className="badge" style={{ background: 'rgba(46,160,67,0.15)', color: '#52b788', border: '1px solid rgba(46,160,67,0.25)', fontSize: '0.65rem', padding: '1px 6px' }}>Active</span>
                        </div>
                        <p style={{ margin: '0 0 10px 0', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                          {r.desc}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: r.lang === 'Java' ? '#b07219' : '#3178c6' }} />
                            {r.lang}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Star size={12} /> {r.stars}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Open Pull Requests Panel */}
                <div className="git-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-white)' }}>
                    Open Pull Requests
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {[
                      { title: 'Fix login flow', time: 'Today', status: 'Approved' },
                      { title: 'Refactor database layer', time: 'Yesterday', status: 'Changes requested' },
                      { title: 'Add AI Chat module', time: '2 days ago', status: 'In review' }
                    ].map((p, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#0d1117',
                          border: '1px solid var(--border-default)',
                          borderRadius: '6px',
                          padding: '12px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-white)', marginBottom: '4px' }}>
                            {p.title}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                            Created {p.time}
                          </div>
                        </div>
                        <span className="badge" style={{
                          background: p.status === 'Approved' ? 'rgba(46,160,67,0.1)' : p.status === 'In review' ? 'rgba(56,139,253,0.1)' : 'rgba(210,153,34,0.1)',
                          color: p.status === 'Approved' ? '#3fb950' : p.status === 'In review' ? '#58a6ff' : '#d29922',
                          borderColor: p.status === 'Approved' ? 'rgba(46,160,67,0.2)' : p.status === 'In review' ? 'rgba(56,139,253,0.2)' : 'rgba(210,153,34,0.2)',
                          fontSize: '0.7rem'
                        }}>
                          {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: REPOSITORIES (SEARCH WORKSPACE) */}
          {activeTab === 'repositories' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Search Bar & Filters Form */}
              <form onSubmit={handleSearchSubmit} className="git-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input
                      type="text"
                      className="form-control"
                      style={{ paddingLeft: '36px', height: '40px', fontSize: '0.85rem' }}
                      placeholder="Search repository names, descriptions, or topics..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      required
                    />
                    <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '13px' }} />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0 20px', height: '40px' }}>
                    Search
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center', borderTop: '1px solid var(--border-default)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SlidersHorizontal size={13} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Filters:</span>
                  </div>

                  <div style={{ display: 'flex', gap: '16px', flex: 1, flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                    {/* Language Dropdown */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Language:</span>
                      <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        style={{
                          background: 'var(--bg-input)',
                          border: '1px solid var(--border-default)',
                          borderRadius: '6px',
                          color: 'var(--text-primary)',
                          padding: '4px 8px',
                          fontFamily: 'inherit',
                          fontSize: '0.8rem',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, maxWidth: '280px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Min Stars:</span>
                      <input
                        type="range"
                        min="0"
                        max="10000"
                        step="100"
                        value={minStars}
                        onChange={(e) => setMinStars(parseInt(e.target.value))}
                        style={{ flex: 1, accentColor: '#58a6ff' }}
                      />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#58a6ff' }}>{minStars}+</span>
                    </div>
                  </div>
                </div>
              </form>

              {/* Results count info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Showing {totalElements} repositories on GitHub
                </span>
              </div>

              {/* Loading / Error States */}
              {loading && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '160px', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    border: '3px solid rgba(88,166,255,0.1)',
                    borderTopColor: '#58a6ff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Searching GitHub...</span>
                </div>
              )}

              {error && (
                <div style={{ background: 'rgba(248,81,73,0.1)', border: '1px solid rgba(248,81,73,0.2)', padding: '16px', borderRadius: '6px', color: '#ff7b72', fontSize: '0.85rem' }}>
                  {error}
                </div>
              )}

              {/* Results Grid List */}
              {!loading && !error && results.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', background: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-default)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No repositories found. Try modifying your filters.</span>
                </div>
              )}

              {!loading && !error && results.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {results.map((repo) => (
                    <div
                      key={repo.id}
                      onClick={() => handleRepoClick(repo.fullName)}
                      style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-default)',
                        borderRadius: '6px',
                        padding: '16px 20px',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s ease, transform 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#8b949e';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-default)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-blue)' }}>
                            {repo.fullName}
                          </h4>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {repo.description || 'No description provided.'}
                          </p>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Updated {new Date(repo.lastUpdated).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Info footer */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid rgba(240,246,252,0.05)', paddingTop: '10px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {repo.topics.slice(0, 4).map((t, i) => (
                            <span key={i} className="badge badge-topic" style={{ fontSize: '0.65rem', padding: '2px 8px' }}>{t}</span>
                          ))}
                        </div>

                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Star size={13} /> {repo.stars.toLocaleString()}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <GitFork size={13} /> {repo.forks.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Pagination Section */}
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                      <button
                        onClick={() => performSearch(page - 1)}
                        disabled={page === 0}
                        className="btn btn-secondary"
                        style={{ height: '32px', padding: '0 12px' }}
                      >
                        <ChevronLeft size={14} /> Prev
                      </button>
                      <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0 8px' }}>
                        Page {page + 1} of {totalPages}
                      </span>
                      <button
                        onClick={() => performSearch(page + 1)}
                        disabled={page >= totalPages - 1}
                        className="btn btn-secondary"
                        style={{ height: '32px', padding: '0 12px' }}
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROJECTS (MOCK VIEW) */}
          {activeTab === 'projects' && (
            <div className="git-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>🗂️</div>
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-white)', fontSize: '1.15rem' }}>Create your first project boards</h3>
              <p style={{ margin: '0 auto 24px auto', maxWidth: '400px', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Track issues, pull requests, and tasks visually using RepoLens board columns.
              </p>
              <button disabled className="btn btn-primary" style={{ cursor: 'not-allowed', opacity: 0.6 }}>Create board</button>
            </div>
          )}

          {/* TAB 4: SAVED (MOCK VIEW) */}
          {activeTab === 'saved' && (
            <div className="git-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>⭐</div>
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-white)', fontSize: '1.15rem' }}>Your saved repositories</h3>
              <p style={{ margin: '0 auto 24px auto', maxWidth: '400px', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                Quickly bookmark repositories you audit frequently to view them directly.
              </p>
              <button onClick={() => setActiveTab('repositories')} className="btn btn-secondary">Find repositories</button>
            </div>
          )}

          {/* TAB 5: SETTINGS (MOCK VIEW) */}
          {activeTab === 'settings' && (
            <div className="git-card" style={{ padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: 'var(--text-white)', borderBottom: '1px solid var(--border-default)', paddingBottom: '10px' }}>
                Profile Settings
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
                <div>
                  <label className="form-label">Full Name</label>
                  <input type="text" className="form-control" defaultValue="Sai Gokul N" readOnly />
                </div>
                <div>
                  <label className="form-label">Username</label>
                  <input type="text" className="form-control" defaultValue="nvsaigokul" readOnly />
                </div>
                <div>
                  <label className="form-label">Default Analytics View</label>
                  <select disabled className="form-control" style={{ cursor: 'not-allowed' }}>
                    <option>Tech Stack & Architecture Details</option>
                  </select>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
