import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Star, GitFork, BookOpen, Activity, Award,
  Heart, RefreshCw, Layers, Compass, Cpu, FileText
} from 'lucide-react';
import Header from '../components/Header';
import HealthScoreGauge from '../components/HealthScoreGauge';
import ArchitectureDiagram from '../components/ArchitectureDiagram';

interface RepoDetail {
  id: number;
  fullName: string;
  owner: string;
  description: string;
  stars: number;
  forks: number;
  openIssues: number;
  primaryLanguage: string;
  readmePreview: string;
  topics: string[];
  languageBreakdown: { [lang: string]: number };
  repoCreatedAt: string;
  repoPushedAt: string;
}

interface AISummaryData {
  overview: string;
  mainPurpose: string;
  architectureSummary: string;
  keyTechnologies: string;
  learningValue: string;
  modelVersion: string;
  generatedAt: string;
}

interface HealthScoreData {
  overallScore: number;
  breakdown: {
    documentationScore: number;
    commitActivityScore: number;
    issuesScore: number;
    popularityScore: number;
    maturityScore: number;
  };
  computedAt: string;
}

interface SimilarRepo {
  id: number;
  fullName: string;
  owner: string;
  description: string;
  stars: number;
  forks: number;
  primaryLanguage: string;
  similarityScore: number;
  reason: string;
}

interface ResumeAnalysisData {
  resumeScore: number;
  strengths: string;
  weaknesses: string;
  industryRelevance: string;
  suggestedImprovements: string;
  generatedAt: string;
}

export default function RepositoryDetailPage() {
  const { owner, repo } = useParams();
  const repoFullName = `${owner}/${repo}`;

  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data states
  const [detail, setDetail] = useState<RepoDetail | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [techStack, setTechStack] = useState<any[]>([]);
  const [healthScore, setHealthScore] = useState<HealthScoreData | null>(null);
  const [architecture, setArchitecture] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState<AISummaryData | null>(null);
  const [similarRepos, setSimilarRepos] = useState<SimilarRepo[]>([]);
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysisData | null>(null);

  // Poll states
  const [aiSummaryPending, setAiSummaryPending] = useState(false);
  const [resumePending, setResumePending] = useState(false);
  const [regeneratingSummary, setRegeneratingSummary] = useState(false);
  const [actionError, setActionError] = useState('');

  const token = localStorage.getItem('accessToken');

  const fetchDetail = async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/v1/repositories/${repoFullName}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message || 'Failed to fetch details');
      setDetail(json.data);
      
      // Check if favorited
      if (token) {
        checkFavoriteStatus(json.data.id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load repository detail');
    } finally {
      setLoading(false);
    }
  };

  const checkFavoriteStatus = async (repoId: number) => {
    try {
      const res = await fetch(`http://localhost:8080/api/v1/favorites`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (res.ok) {
        const favorited = json.data.some((f: any) => f.id === repoId);
        setIsFavorited(favorited);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!detail) return;
    try {
      const method = isFavorited ? 'DELETE' : 'POST';
      const res = await fetch(`http://localhost:8080/api/v1/favorites/${detail.id}`, {
        method,
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setIsFavorited(!isFavorited);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // 1. Fetch Tech Stack
  const fetchTechStack = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/v1/repositories/${repoFullName}/tech-stack`);
      const json = await res.json();
      if (res.ok) setTechStack(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  // 2. Fetch Health Score
  const fetchHealthScore = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/v1/repositories/${repoFullName}/health-score`);
      const json = await res.json();
      if (res.ok) setHealthScore(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  // 3. Fetch Architecture
  const fetchArchitecture = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/v1/repositories/${repoFullName}/architecture`);
      const json = await res.json();
      if (res.ok) setArchitecture(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  // 4. Fetch Similar Repos
  const fetchSimilar = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/v1/repositories/${repoFullName}/similar`);
      const json = await res.json();
      if (res.ok) setSimilarRepos(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  // 5. Fetch AI Summary (with Async Polling)
  const fetchAiSummary = async () => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:8080/api/v1/repositories/${repoFullName}/ai-summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      
      if (res.status === 202 || (json.error && json.error.code === 'PENDING')) {
        setAiSummaryPending(true);
      } else if (res.ok && json.data) {
        setAiSummary(json.data);
        setAiSummaryPending(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRegenerateSummary = async () => {
    setActionError('');
    setRegeneratingSummary(true);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/ai-summary/regenerate?owner=${owner}&repo=${repo}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to trigger summary regeneration');
      }
      setAiSummaryPending(true);
      setAiSummary(null);
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setRegeneratingSummary(false);
    }
  };

  // 6. Fetch Resume Analysis (with Async Polling)
  const triggerResumeAnalysis = async () => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:8080/api/v1/repositories/${repoFullName}/resume-analysis`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      
      if (res.status === 202 || (json.error && json.error.code === 'PENDING')) {
        setResumePending(true);
      } else if (res.ok && json.data) {
        setResumeAnalysis(json.data);
        setResumePending(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Sync / Force Re-sync
  const [syncing, setSyncing] = useState(false);
  const handleForceSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/repositories/${repoFullName}/sync`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchDetail();
        // Clear all cached components to force reload
        setTechStack([]);
        setHealthScore(null);
        setArchitecture(null);
        setAiSummary(null);
        setResumeAnalysis(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  // Polling loops
  useEffect(() => {
    let intervalId: any;
    if (aiSummaryPending) {
      intervalId = setInterval(() => {
        fetchAiSummary();
      }, 3000);
    }
    return () => clearInterval(intervalId);
  }, [aiSummaryPending]);

  useEffect(() => {
    let intervalId: any;
    if (resumePending) {
      intervalId = setInterval(() => {
        triggerResumeAnalysis();
      }, 3000);
    }
    return () => clearInterval(intervalId);
  }, [resumePending]);

  // Main details loading hook
  useEffect(() => {
    fetchDetail();
  }, [repoFullName]);

  // Tab change content loading triggers
  useEffect(() => {
    if (!detail) return;
    
    if (activeTab === 'tech-stack' && techStack.length === 0) {
      fetchTechStack();
    } else if (activeTab === 'health-score' && !healthScore) {
      fetchHealthScore();
    } else if (activeTab === 'architecture' && !architecture) {
      fetchArchitecture();
    } else if (activeTab === 'ai-summary' && !aiSummary) {
      fetchAiSummary();
    } else if (activeTab === 'similar-repos' && similarRepos.length === 0) {
      fetchSimilar();
    } else if (activeTab === 'resume-value' && !resumeAnalysis) {
      triggerResumeAnalysis();
    }
  }, [activeTab, detail]);

  if (loading) {
    return (
      <div>
        <Header />
        <div className="flex-center" style={{ minHeight: 'calc(100vh - 100px)' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid var(--border-glass)',
            borderTopColor: 'var(--accent-teal)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div>
        <Header />
        <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px' }}>
          <div className="git-card" style={{ color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <h3>Failed to load repository</h3>
            <p>{error || 'An unexpected error occurred.'}</p>
            <Link to="/" className="btn btn-secondary">Back to Search</Link>
          </div>
        </div>
      </div>
    );
  }

  // Language color mapping
  const langColors: { [lang: string]: string } = {
    'Java': '#b07219',
    'Python': '#3572A5',
    'JavaScript': '#f1e05a',
    'TypeScript': '#3178c6',
    'HTML': '#e34c26',
    'CSS': '#563d7c',
    'Go': '#00ADD8',
    'C++': '#f34b7d',
    'Rust': '#dea584'
  };

  return (
    <div>
      <Header />

      {/* GitHub Repository Header */}
      <div style={{ background: '#161b22', borderBottom: '1px solid var(--border-default)', padding: '20px 0 0 0' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 32px' }}>
          
          {/* Title & Actions Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" fill="currentColor">
                  <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 11-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8z"></path>
                </svg>
              </div>
              <span style={{ fontSize: '1.25rem', color: 'var(--accent-blue)', fontWeight: 400 }}>
                <a href={`https://github.com/` + owner} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>{owner}</a>
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: '1.25rem' }}>/</span>
              <span style={{ fontSize: '1.25rem', color: 'var(--text-white)', fontWeight: 600 }}>
                <a href={`https://github.com/${owner}/${repo}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>{repo}</a>
              </span>
              <span className="badge" style={{ background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-default)', padding: '2px 8px', fontSize: '0.7rem' }}>
                Public
              </span>
            </div>

            {/* GitHub Actions Counters */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {token && (
                <>
                  <button onClick={handleForceSync} className="btn btn-secondary" disabled={syncing} style={{ height: '30px', padding: '0 12px', fontSize: '0.75rem' }}>
                    <RefreshCw size={12} className={syncing ? 'spin-icon' : ''} /> {syncing ? 'Syncing...' : 'Sync'}
                  </button>
                  <button onClick={handleFavoriteToggle} className="btn btn-secondary" style={{ height: '30px', padding: '0 12px', fontSize: '0.75rem', borderColor: isFavorited ? 'var(--color-warning)' : 'var(--border-default)' }}>
                    <Heart size={12} fill={isFavorited ? 'var(--color-warning)' : 'none'} color={isFavorited ? 'var(--color-warning)' : 'var(--accent-blue)'} />
                    {isFavorited ? 'Unfavorite' : 'Favorite'}
                  </button>
                </>
              )}

              {/* GitHub Star & Fork Counters */}
              <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: '6px', height: '30px', overflow: 'hidden' }}>
                <div style={{ background: '#21262d', padding: '0 10px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                  <Star size={12} /> Star
                </div>
                <div style={{ background: '#161b22', borderLeft: '1px solid var(--border-default)', padding: '0 10px', display: 'flex', alignItems: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-white)' }}>
                  {detail.stars.toLocaleString()}
                </div>
              </div>

              <div style={{ display: 'flex', border: '1px solid var(--border-default)', borderRadius: '6px', height: '30px', overflow: 'hidden' }}>
                <div style={{ background: '#21262d', padding: '0 10px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                  <GitFork size={12} /> Fork
                </div>
                <div style={{ background: '#161b22', borderLeft: '1px solid var(--border-default)', padding: '0 10px', display: 'flex', alignItems: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-white)' }}>
                  {detail.forks.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          <p style={{ margin: '0 0 16px 0', color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '900px', lineHeight: '1.5' }}>
            {detail.description || 'No description, website, or topics provided.'}
          </p>

          {/* Navigation Tabs (GitHub Identical Layout) */}
          <div style={{ display: 'flex', overflowX: 'auto', gap: '4px', marginTop: '10px' }}>
            {[
              { id: 'overview', label: 'Overview', icon: BookOpen },
              { id: 'tech-stack', label: 'Tech Stack', icon: Cpu },
              { id: 'ai-summary', label: 'AI Summary', icon: FileText, authRequired: true },
              { id: 'health-score', label: 'Health Score', icon: Activity },
              { id: 'architecture', label: 'Architecture', icon: Layers },
              { id: 'similar-repos', label: 'Similar Repos', icon: Compass },
              { id: 'resume-value', label: 'Resume Value', icon: Award, authRequired: true }
            ].map(tab => {
              if (tab.authRequired && !token) return null;
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: isSelected ? '2px solid #fd8c73' : '2px solid transparent',
                    color: isSelected ? 'var(--text-white)' : 'var(--text-secondary)',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: isSelected ? 600 : 400,
                    fontSize: '0.85rem',
                    outline: 'none',
                    transition: 'color 0.2s ease',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Icon size={14} color={isSelected ? 'var(--text-white)' : 'var(--text-secondary)'} />
                  {tab.label}
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* Main Body Layout */}
      <div style={{ maxWidth: '1280px', margin: '30px auto 60px auto', padding: '0 32px' }}>
        
        {/* Tab Contents */}
        <div>
          {/* 1. OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '24px', alignItems: 'start' }}>
              {/* Left Column: README.md Container */}
              <div className="readme-box">
                <div className="readme-header">
                  <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" fill="currentColor">
                    <path d="M1.5 1.75a.25.25 0 01.25-.25h8.5a.25.25 0 01.25.25v12.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25V1.75zM0 1.75C0 .784.784 0 1.75 0h8.5C11.216 0 12 .784 12 1.75v12.5c0 .966-.784 1.75-1.75 1.75h-8.5C.784 16 0 15.216 0 14.25V1.75z"></path>
                    <path d="M5 4.75a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5A.75.75 0 015 4.75zm0 3a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5A.75.75 0 015 7.75zm0 3a.75.75 0 01.75-.75h4.5a.75.75 0 010 1.5h-4.5a.75.75 0 01-.75-.75z"></path>
                  </svg>
                  <span>README.md</span>
                </div>
                <div className="readme-body">
                  <pre style={{
                    margin: 0,
                    padding: '20px',
                    background: '#0d1117',
                    border: '1px solid var(--border-default)',
                    borderRadius: '6px',
                    color: 'var(--text-primary)',
                    fontFamily: 'monospace',
                    fontSize: '0.85rem',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '520px',
                    overflowY: 'auto'
                  }}>
                    {detail.readmePreview || 'No README file synced for this repository.'}
                  </pre>
                </div>
              </div>

              {/* Right Column: Metadata details & Languages */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Languages Breakdown */}
                <div className="git-card">
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-white)' }}>Languages</h4>
                  <div style={{ display: 'flex', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
                    {Object.entries(detail.languageBreakdown).map(([lang, pct], idx) => (
                      <div
                        key={idx}
                        style={{
                          width: `${pct}%`,
                          background: langColors[lang] || '#64748b'
                        }}
                        title={`${lang}: ${pct}%`}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.entries(detail.languageBreakdown).map(([lang, pct], idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: langColors[lang] || '#64748b' }} />
                          <span style={{ fontWeight: 500, color: 'var(--text-white)' }}>{lang}</span>
                        </div>
                        <span style={{ color: 'var(--text-secondary)' }}>{pct.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Topics */}
                <div className="git-card">
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-white)' }}>Topics</h4>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {detail.topics.length === 0 ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No topics tagged.</span>
                    ) : (
                      detail.topics.map((t, idx) => (
                        <span key={idx} className="badge badge-topic">{t}</span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. TECH STACK TAB */}
          {activeTab === 'tech-stack' && (
            <div className="git-card">
              <h3 style={{ margin: '0 0 20px 0' }}>Detected Tech Stack</h3>
              {techStack.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Analyzing technology signatures...</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
                  {['FRONTEND', 'BACKEND', 'DATABASE', 'INFRA'].map(cat => {
                    const items = techStack.filter(t => t.category === cat);
                    return (
                      <div key={cat} style={{ background: 'rgba(15, 23, 42, 0.3)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                          {cat}
                        </h4>
                        {items.length === 0 ? (
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Not detected</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {items.map((item, i) => (
                              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className="badge badge-tech">{item.technology}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {(item.confidence * 100).toFixed(0)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 3. AI SUMMARY TAB */}
          {activeTab === 'ai-summary' && (
            <div className="git-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>AI Repository Summary</h3>
                <button
                  onClick={handleRegenerateSummary}
                  className="btn btn-secondary"
                  disabled={regeneratingSummary || aiSummaryPending}
                  style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                >
                  <RefreshCw size={14} className={regeneratingSummary ? 'spin-icon' : ''} />
                  {regeneratingSummary ? 'Triggering...' : 'Regenerate'}
                </button>
              </div>

              {actionError && (
                <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>{actionError}</div>
              )}

              {aiSummaryPending ? (
                <div className="flex-center" style={{ minHeight: '200px', flexDirection: 'column', gap: '12px' }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    border: '3px solid var(--border-glass)',
                    borderTopColor: 'var(--accent-teal)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Gemini AI is analyzing the repository. This may take up to 15 seconds...
                  </span>
                </div>
              ) : aiSummary ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {[
                    { label: 'Overview', text: aiSummary.overview },
                    { label: 'Main Purpose', text: aiSummary.mainPurpose },
                    { label: 'Architecture Summary', text: aiSummary.architectureSummary },
                    { label: 'Key Technologies', text: aiSummary.keyTechnologies },
                    { label: 'Learning Value', text: aiSummary.learningValue }
                  ].map((sec, idx) => (
                    <div key={idx} style={{ borderBottom: idx < 4 ? '1px solid var(--border-glass)' : 'none', paddingBottom: idx < 4 ? '20px' : '0' }}>
                      <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--accent-teal)' }}>{sec.label}</h4>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                        {sec.text}
                      </p>
                    </div>
                  ))}

                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-glass)', paddingTop: '12px', marginTop: '10px' }}>
                    Generated by {aiSummary.modelVersion} at {new Date(aiSummary.generatedAt).toLocaleString()}
                  </div>
                </div>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>AI summary loading...</span>
              )}
            </div>
          )}

          {/* 4. HEALTH SCORE TAB */}
          {activeTab === 'health-score' && (
            <div>
              {healthScore ? (
                <HealthScoreGauge overallScore={healthScore.overallScore} breakdown={healthScore.breakdown} />
              ) : (
                <div className="git-card flex-center" style={{ minHeight: '200px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Calculating repository health score...</span>
                </div>
              )}
            </div>
          )}

          {/* 5. ARCHITECTURE DIAGRAM TAB */}
          {activeTab === 'architecture' && (
            <ArchitectureDiagram diagramData={architecture} />
          )}

          {/* 6. SIMILAR REPOS TAB */}
          {activeTab === 'similar-repos' && (
            <div className="git-card">
              <h3 style={{ margin: '0 0 20px 0' }}>Similar Repositories (Jaccard Index)</h3>
              {similarRepos.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No similar repositories synced yet.</p>
              ) : (
                <div className="grid-container">
                  {similarRepos.map((item) => (
                    <div
                      key={item.id}
                      className="git-card"
                      style={{
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Link to={`/repository/${item.fullName}`} style={{ color: 'var(--accent-teal)', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>
                          {item.fullName}
                        </Link>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-indigo)' }}>
                          {(item.similarityScore * 100).toFixed(0)}% Match
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', minHeight: '40px' }}>
                        {item.description || 'No description.'}
                      </p>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-glass)', paddingTop: '8px', marginTop: '4px' }}>
                        {item.reason}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 7. RESUME VALUE TAB */}
          {activeTab === 'resume-value' && (
            <div className="git-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '16px' }}>
                <h3 style={{ margin: 0 }}>Resume & Portfolio Quality Assessment</h3>
                {resumeAnalysis && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Score:</span>
                    <span style={{
                      fontSize: '1.5rem',
                      fontWeight: 800,
                      color: resumeAnalysis.resumeScore >= 7.5 ? 'var(--color-success)' : resumeAnalysis.resumeScore >= 5.0 ? 'var(--color-warning)' : 'var(--color-danger)',
                      background: 'rgba(255,255,255,0.05)',
                      padding: '4px 12px',
                      borderRadius: '8px'
                    }}>
                      {resumeAnalysis.resumeScore}/10
                    </span>
                  </div>
                )}
              </div>

              {resumePending ? (
                <div className="flex-center" style={{ minHeight: '200px', flexDirection: 'column', gap: '12px' }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    border: '3px solid var(--border-glass)',
                    borderTopColor: 'var(--accent-teal)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Recruiter agent is evaluating codebase quality and mapping industry fit...
                  </span>
                </div>
              ) : resumeAnalysis ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {/* Left Column: Strengths and Weaknesses */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-success)', fontSize: '0.95rem', fontWeight: 600 }}>Strengths</h4>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        {resumeAnalysis.strengths}
                      </p>
                    </div>

                    <div style={{ background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '12px', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-danger)', fontSize: '0.95rem', fontWeight: 600 }}>Weaknesses / Risks</h4>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        {resumeAnalysis.weaknesses}
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Relevance & Improvements */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ background: 'rgba(59, 130, 246, 0.03)', border: '1px solid rgba(59, 130, 246, 0.1)', borderRadius: '12px', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-info)', fontSize: '0.95rem', fontWeight: 600 }}>Industry Relevance</h4>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        {resumeAnalysis.industryRelevance}
                      </p>
                    </div>

                    <div style={{ background: 'rgba(245, 158, 11, 0.03)', border: '1px solid rgba(245, 158, 11, 0.1)', borderRadius: '12px', padding: '16px' }}>
                      <h4 style={{ margin: '0 0 8px 0', color: 'var(--color-warning)', fontSize: '0.95rem', fontWeight: 600 }}>Suggested Improvements</h4>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                        {resumeAnalysis.suggestedImprovements}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>Resume assessment loading...</span>
              )}
            </div>
          )}
        </div>

      </div>

      <style>{`
        .spin-icon {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
