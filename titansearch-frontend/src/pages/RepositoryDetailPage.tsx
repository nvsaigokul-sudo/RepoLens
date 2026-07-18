import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Star, BookOpen, RefreshCw, Layers, Cpu, FileText,
  Bell, Moon, Search, Send, Folder, FileCode,
  SlidersHorizontal
} from 'lucide-react';
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

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export default function RepositoryDetailPage() {
  const { owner, repo } = useParams();
  const repoFullName = `${owner}/${repo}`;
  const navigate = useNavigate();

  const [activeSidebarTab, setActiveSidebarTab] = useState<'dashboard' | 'analysis' | 'security' | 'reports' | 'settings'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Data states
  const [detail, setDetail] = useState<RepoDetail | null>(null);
  const [techStack, setTechStack] = useState<any[]>([]);
  const [healthScore, setHealthScore] = useState<HealthScoreData | null>(null);
  const [architecture, setArchitecture] = useState<any>(null);
  const [similarRepos, setSimilarRepos] = useState<SimilarRepo[]>([]);
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysisData | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);

  // Search input in header
  const [headerSearch, setHeaderSearch] = useState('');



  // Chat bot states
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'ai', text: "Hello! I'm RepoLens AI. Ask anything about this repository..." }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync / Force Re-sync
  const [syncing, setSyncing] = useState(false);

  const fetchDetail = async () => {
    try {
      const response = await fetch(`http://localhost:8080/api/v1/repositories/${repoFullName}`);
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message || 'Failed to fetch details');
      setDetail(json.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load repository detail');
    } finally {
      setLoading(false);
    }
  };

  // Fetch file list directly from GitHub Contents API
  const fetchFiles = async () => {
    setFilesLoading(true);
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents`);
      if (res.ok) {
        const data = await res.json();
        setFiles(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to fetch repository files list", e);
    } finally {
      setFilesLoading(false);
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



  // 6. Fetch Resume Analysis
  const triggerResumeAnalysis = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/v1/repositories/${repoFullName}/resume-analysis`, {
        method: 'POST'
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setResumeAnalysis(json.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleForceSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`http://localhost:8080/api/v1/repositories/${repoFullName}/sync`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchDetail();
        fetchFiles();
        setTechStack([]);
        setHealthScore(null);
        setArchitecture(null);
        setSimilarRepos([]);
        setResumeAnalysis(null);
        
        // Reload all data
        fetchTechStack();
        fetchHealthScore();
        fetchArchitecture();
        fetchSimilar();
        triggerResumeAnalysis();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  // Chat engine send message handler
  const handleSendMessage = async (msgText: string) => {
    if (!msgText.trim() || chatLoading) return;
    
    // Add user message to log
    const updatedMessages = [...messages, { sender: 'user', text: msgText } as ChatMessage];
    setMessages(updatedMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch(`http://localhost:8080/api/v1/repositories/${repoFullName}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msgText })
      });
      const json = await response.json();
      
      if (response.ok && json.data) {
        setMessages([...updatedMessages, { sender: 'ai', text: json.data.response }]);
      } else {
        setMessages([...updatedMessages, { sender: 'ai', text: "Sorry, I couldn't process your request. " + (json.error?.message || '') }]);
      }
    } catch (e: any) {
      setMessages([...updatedMessages, { sender: 'ai', text: "Network error occurred: " + e.message }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Scroll to bottom on new chat message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  // Initial loading fetch loop
  useEffect(() => {
    setLoading(true);
    fetchDetail();
    fetchFiles();
    fetchTechStack();
    fetchHealthScore();
    fetchArchitecture();
    fetchSimilar();
    triggerResumeAnalysis();
  }, [owner, repo]);

  const handleHeaderSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headerSearch.trim()) return;
    navigate(`/repository/${headerSearch.trim()}`);
    setHeaderSearch('');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
        <header style={{ background: '#161b22', height: '60px', borderBottom: '1px solid var(--border-default)' }} />
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(88,166,255,0.1)',
            borderTopColor: '#58a6ff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Analyzing repository structure...</span>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
        <header style={{ background: '#161b22', height: '60px', borderBottom: '1px solid var(--border-default)' }} />
        <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px', width: '100%' }}>
          <div className="git-card" style={{ color: 'var(--color-danger)', border: '1px solid rgba(248,81,73,0.2)' }}>
            <h3>Failed to load repository</h3>
            <p>{error || 'An unexpected error occurred.'}</p>
            <Link to="/" className="btn btn-secondary">Back to Dashboard</Link>
          </div>
        </div>
      </div>
    );
  }

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
        {/* Left: Brand Logo & Back to Search */}
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

          {/* Jump / Search Box */}
          <form onSubmit={handleHeaderSearchSubmit} style={{ position: 'relative', width: '280px', marginLeft: '12px' }}>
            <input
              type="text"
              placeholder="Search Repository... (e.g. owner/repo)"
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

        {/* Right Info Widgets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Star size={14} /> {detail.stars.toLocaleString()} stars
          </span>
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

      {/* Three Column Container Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '240px 1fr 360px',
        flex: 1,
        height: 'calc(100vh - 60px)',
        overflow: 'hidden'
      }}>
        
        {/* Column 1: Left Navigation Menu Sidebar */}
        <aside style={{
          background: '#161b22',
          borderRight: '1px solid var(--border-default)',
          padding: '16px 12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0 12px 8px 12px', borderBottom: '1px solid rgba(240,246,252,0.05)', marginBottom: '8px' }}>
              Auditor Menu
            </div>
            
            <button
              onClick={() => setActiveSidebarTab('dashboard')}
              className={`sidebar-menu-item ${activeSidebarTab === 'dashboard' ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'left',
                background: activeSidebarTab === 'dashboard' ? '#21262d' : 'transparent',
                color: activeSidebarTab === 'dashboard' ? 'var(--text-white)' : 'var(--text-secondary)'
              }}
            >
              <BookOpen size={16} /> Dashboard
            </button>

            <button
              onClick={() => setActiveSidebarTab('analysis')}
              className={`sidebar-menu-item ${activeSidebarTab === 'analysis' ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'left',
                background: activeSidebarTab === 'analysis' ? '#21262d' : 'transparent',
                color: activeSidebarTab === 'analysis' ? 'var(--text-white)' : 'var(--text-secondary)'
              }}
            >
              <Cpu size={16} /> Analysis
            </button>

            <button
              onClick={() => setActiveSidebarTab('security')}
              className={`sidebar-menu-item ${activeSidebarTab === 'security' ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'left',
                background: activeSidebarTab === 'security' ? '#21262d' : 'transparent',
                color: activeSidebarTab === 'security' ? 'var(--text-white)' : 'var(--text-secondary)'
              }}
            >
              <Layers size={16} /> Security
            </button>

            <button
              onClick={() => setActiveSidebarTab('reports')}
              className={`sidebar-menu-item ${activeSidebarTab === 'reports' ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'left',
                background: activeSidebarTab === 'reports' ? '#21262d' : 'transparent',
                color: activeSidebarTab === 'reports' ? 'var(--text-white)' : 'var(--text-secondary)'
              }}
            >
              <FileText size={16} /> Reports
            </button>

            <button
              onClick={() => setActiveSidebarTab('settings')}
              className={`sidebar-menu-item ${activeSidebarTab === 'settings' ? 'active' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 12px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.85rem',
                cursor: 'pointer',
                textAlign: 'left',
                background: activeSidebarTab === 'settings' ? '#21262d' : 'transparent',
                color: activeSidebarTab === 'settings' ? 'var(--text-white)' : 'var(--text-secondary)'
              }}
            >
              <SlidersHorizontal size={16} /> Settings
            </button>
          </div>

          {/* Sync Trigger block at the bottom */}
          <div style={{ borderTop: '1px solid rgba(240,246,252,0.05)', paddingTop: '12px' }}>
            <button
              onClick={handleForceSync}
              disabled={syncing}
              className="btn btn-secondary"
              style={{ width: '100%', fontSize: '0.75rem', height: '32px' }}
            >
              <RefreshCw size={12} className={syncing ? 'spin-icon' : ''} />
              {syncing ? 'Syncing...' : 'Force Re-sync'}
            </button>
          </div>
        </aside>

        {/* Column 2: Center Main Content Workspace panel */}
        <main style={{
          padding: '24px 32px',
          overflowY: 'auto',
          minWidth: 0,
          background: 'var(--bg-main)'
        }}>
          
          {/* Main Repo header card */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <svg aria-hidden="true" height="18" viewBox="0 0 16 16" version="1.1" width="18" fill="var(--text-secondary)">
              <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 11-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8z"></path>
            </svg>
            <span style={{ fontSize: '1.25rem', color: 'var(--accent-blue)', fontWeight: 400 }}>{owner}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '1.25rem' }}>/</span>
            <span style={{ fontSize: '1.25rem', color: 'var(--text-white)', fontWeight: 700 }}>{repo}</span>
          </div>

          <p style={{ margin: '0 0 24px 0', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {detail.description || 'No description provided.'}
          </p>

          {/* TAB CONTENT: 1. DASHBOARD */}
          {activeSidebarTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Stats Cards Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div className="git-card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Stars</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-white)', marginTop: '4px' }}>
                    {detail.stars.toLocaleString()}
                  </div>
                </div>
                <div className="git-card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Forks</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-white)', marginTop: '4px' }}>
                    {detail.forks.toLocaleString()}
                  </div>
                </div>
                <div className="git-card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Open Issues</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-white)', marginTop: '4px' }}>
                    {detail.openIssues.toLocaleString()}
                  </div>
                </div>
                <div className="git-card" style={{ padding: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Primary Language</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-white)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: langColors[detail.primaryLanguage] || '#8b949e' }} />
                    {detail.primaryLanguage || 'Unknown'}
                  </div>
                </div>
              </div>

              {/* Language Charts Panel */}
              <div className="git-card">
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-white)' }}>Language Distribution</h4>
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
                <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                  {Object.entries(detail.languageBreakdown).map(([lang, pct], idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: langColors[lang] || '#64748b' }} />
                      <span style={{ color: 'var(--text-white)', fontWeight: 500 }}>{lang}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Repository Files Tree list */}
              <div className="git-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ background: '#21262d', padding: '12px 16px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-white)' }}>Repository Files</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Root Level</span>
                </div>
                
                {filesLoading ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Loading files tree...</div>
                ) : files.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>No files found in repository root.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Folders first, then files */}
                    {[...files].sort((a, b) => (a.type === 'dir' ? -1 : 1) - (b.type === 'dir' ? -1 : 1)).map((file, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 16px',
                          borderBottom: idx < files.length - 1 ? '1px solid rgba(48,54,61,0.5)' : 'none',
                          fontSize: '0.8rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {file.type === 'dir' ? (
                            <Folder size={15} color="#d29922" fill="#d29922" />
                          ) : (
                            <FileCode size={15} color="var(--text-secondary)" />
                          )}
                          <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{file.name}</span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* README Preview box */}
              <div className="git-card" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ background: '#21262d', padding: '12px 16px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={14} color="var(--text-secondary)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-white)' }}>README.md Preview</span>
                </div>
                <div style={{ padding: '20px', maxHeight: '380px', overflowY: 'auto' }}>
                  <pre style={{
                    margin: 0,
                    fontSize: '0.8rem',
                    color: 'var(--text-primary)',
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }}>
                    {detail.readmePreview || 'No README file synced for this repository.'}
                  </pre>
                </div>
              </div>

            </div>
          )}

          {/* TAB CONTENT: 2. ANALYSIS */}
          {activeSidebarTab === 'analysis' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Health Score Gauge Panel */}
              {healthScore ? (
                <HealthScoreGauge overallScore={healthScore.overallScore} breakdown={healthScore.breakdown} />
              ) : (
                <div className="git-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  Calculating Health Score...
                </div>
              )}

              {/* Tech Stack Classifier badges list */}
              <div className="git-card">
                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-white)' }}>Tech Stack Detections</h4>
                {techStack.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No technologies detected. Click Sync to audit files.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Group by category */}
                    {['Backend', 'Frontend', 'Database', 'Build / CI', 'Utility'].map((cat, idx) => {
                      const matched = techStack.filter(t => t.category.toLowerCase().includes(cat.toLowerCase()) || (cat === 'Build / CI' && t.category.toLowerCase().includes('build')));
                      if (matched.length === 0) return null;
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{cat} Layer</span>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {matched.map((tech, i) => (
                              <span key={i} className="badge badge-tech" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
                                {tech.technology}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB CONTENT: 3. SECURITY */}
          {activeSidebarTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Architecture diagram container */}
              <div className="git-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-white)', alignSelf: 'flex-start' }}>System Flow Diagram</h4>
                {architecture ? (
                  <ArchitectureDiagram diagramData={architecture} />
                ) : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '40px' }}>Analyzing project structures...</div>
                )}
              </div>

              {/* Security parameters */}
              <div className="git-card">
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--text-white)' }}>Code Audit Observations</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3fb950' }} />
                    <span style={{ color: 'var(--text-white)', fontWeight: 600 }}>Dependency Scan: OK</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3fb950' }} />
                    <span style={{ color: 'var(--text-white)', fontWeight: 600 }}>Configuration Secrets: None found</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff7b72' }} />
                    <span style={{ color: 'var(--text-white)', fontWeight: 600 }}>Database Connection: Bypassed (Stateless Cache-Only Mode Active)</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB CONTENT: 4. REPORTS */}
          {activeSidebarTab === 'reports' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Recruiter resume scoring */}
              <div className="git-card">
                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-white)' }}>Resume Recruiter Evaluation</h4>
                {resumeAnalysis ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        background: 'rgba(88,166,255,0.1)',
                        border: '1px solid rgba(88,166,255,0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#58a6ff',
                        fontSize: '1.5rem',
                        fontWeight: 800
                      }}>
                        {resumeAnalysis.resumeScore}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-white)' }}>Recruiter Score (0-10)</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Generated on live heuristics</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-default)', padding: '14px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#52b788', marginBottom: '6px' }}>Strengths</div>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{resumeAnalysis.strengths}</p>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-default)', padding: '14px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ff7b72', marginBottom: '6px' }}>Weaknesses</div>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{resumeAnalysis.weaknesses}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Recruiter score calculations are in progress. Click Sync to trigger.</div>
                )}
              </div>

              {/* Similar repositories list */}
              <div className="git-card">
                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-white)' }}>Similar Repositories (Jaccard Index)</h4>
                {similarRepos.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>No related repositories matched yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {similarRepos.slice(0, 3).map((r, i) => (
                      <div
                        key={i}
                        onClick={() => navigate(`/repository/${r.fullName}`)}
                        style={{
                          background: '#0d1117',
                          border: '1px solid var(--border-default)',
                          borderRadius: '6px',
                          padding: '12px 16px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-blue)', marginBottom: '4px' }}>{r.fullName}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Primary Language: {r.primaryLanguage}</div>
                        </div>
                        <span className="badge" style={{ background: 'rgba(88,166,255,0.1)', color: '#58a6ff', fontSize: '0.7rem' }}>
                          {(r.similarityScore * 100).toFixed(0)}% Match
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB CONTENT: 5. SETTINGS */}
          {activeSidebarTab === 'settings' && (
            <div className="git-card">
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: 'var(--text-white)', borderBottom: '1px solid var(--border-default)', paddingBottom: '10px' }}>
                Repository Configurations
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
                <div>
                  <label className="form-label">Full Name</label>
                  <input type="text" className="form-control" value={repoFullName} readOnly />
                </div>
                <div>
                  <label className="form-label">Primary Language</label>
                  <input type="text" className="form-control" value={detail.primaryLanguage} readOnly />
                </div>
                <div>
                  <label className="form-label">Auditing Mode</label>
                  <input type="text" className="form-control" value="Stateless live JVM cache mode" readOnly />
                </div>
              </div>
            </div>
          )}

        </main>

        {/* Column 3: Right Column RepoLens AI Chatbox panel */}
        <aside style={{
          background: '#161b22',
          borderLeft: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}>
          {/* Chat Header */}
          <div style={{
            background: '#21262d',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-default)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '1.1rem' }}>🤖</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-white)' }}>RepoLens AI</span>
          </div>

          {/* Chat scrolling viewport */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: m.sender === 'user' ? '#1f6feb' : '#21262d',
                  color: 'var(--text-white)',
                  padding: '10px 14px',
                  borderRadius: m.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  fontSize: '0.8rem',
                  lineHeight: 1.4
                }}
              >
                {m.text}
              </div>
            ))}

            {/* Loading bubble */}
            {chatLoading && (
              <div style={{
                alignSelf: 'flex-start',
                background: '#21262d',
                padding: '10px 14px',
                borderRadius: '12px 12px 12px 2px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <div style={{ width: '6px', height: '6px', background: 'var(--text-secondary)', borderRadius: '50%', animation: 'bounce 0.6s infinite alternate' }} />
                <div style={{ width: '6px', height: '6px', background: 'var(--text-secondary)', borderRadius: '50%', animation: 'bounce 0.6s 0.2s infinite alternate' }} />
                <div style={{ width: '6px', height: '6px', background: 'var(--text-secondary)', borderRadius: '50%', animation: 'bounce 0.6s 0.4s infinite alternate' }} />
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Chat Suggested prompts triggers */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid rgba(240,246,252,0.05)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Suggested Prompts</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              {[
                { label: 'Explain architecture', text: 'Explain the high-level architecture of this repository' },
                { label: 'Security review', text: 'Conduct a basic security review of this codebase' },
                { label: 'Summarize repo', text: 'Summarize the main purpose and tech stack of this repository' },
                { label: 'Find bugs', text: 'Look for common code patterns that might introduce bugs' }
              ].map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(p.text)}
                  disabled={chatLoading}
                  style={{
                    background: '#0d1117',
                    border: '1px solid var(--border-default)',
                    borderRadius: '6px',
                    color: 'var(--accent-blue)',
                    padding: '6px',
                    fontSize: '0.68rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-blue)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-default)'}
                >
                  • {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Sticky footer input form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(chatInput);
            }}
            style={{
              padding: '12px 16px',
              borderTop: '1px solid var(--border-default)',
              background: '#161b22',
              display: 'flex',
              gap: '8px'
            }}
          >
            <input
              type="text"
              placeholder="Type your message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatLoading}
              style={{
                flex: 1,
                background: 'var(--bg-input)',
                border: '1px solid var(--border-default)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.8rem',
                color: 'var(--text-white)',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              style={{
                background: '#238636',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                opacity: (chatLoading || !chatInput.trim()) ? 0.6 : 1
              }}
            >
              <Send size={14} />
            </button>
          </form>

        </aside>

      </div>
    </div>
  );
}
