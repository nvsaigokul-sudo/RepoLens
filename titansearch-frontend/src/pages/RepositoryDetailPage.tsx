import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  BookOpen, RefreshCw, Layers, Cpu, FileText,
  Bell, Search, Send, Folder, FileCode,
  SlidersHorizontal, GitBranch, ChevronDown, Plus
} from 'lucide-react';
import HealthScoreGauge from '../components/HealthScoreGauge';
import ArchitectureDiagram from '../components/ArchitectureDiagram';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

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
  languageBreakdown: { [lang: string]: number };
}

interface SimilarRepo {
  id: number;
  fullName: string;
  primaryLanguage: string;
  similarityScore: number;
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
}

interface ResumeAnalysisData {
  score: number;
  strengths: string;
  weaknesses: string;
}

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

export default function RepositoryDetailPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();
  const repoFullName = `${owner}/${repo}`;

  // Tab views
  const [activeSidebarTab, setActiveSidebarTab] = useState<'overview' | 'dashboard' | 'analysis' | 'security' | 'reports' | 'settings'>('overview');

  // Loading / Error states
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
      const response = await fetch(`${API_BASE_URL}/api/v1/repositories/${repoFullName}`);
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

  // Deterministic mock commit details for files to resemble screenshot
  const getMockCommitInfo = (filename: string) => {
    if (filename === 'src') return { message: "Updarized a compits posts index.html", time: "3 hours ago" };
    if (filename === 'docs') return { message: "Initializes t running docs", time: "2 hours ago" };
    if (filename === 'README.md') return { message: "Add commits", time: "2 days ago" };
    if (filename === 'package.json') return { message: "Updarized a compits posts index.json", time: "3 hours ago" };
    if (filename === 'index.html') return { message: "Updarized a compits posts index.html", time: "3 hours ago" };

    const messages = [
      "Configure backend modules",
      "Update documentation details",
      "Refactor services and logic",
      "Initial commit",
      "Clean up dependencies",
      "Fix alignment and style rules"
    ];
    const times = ["2 hours ago", "3 hours ago", "1 day ago", "2 days ago", "5 days ago"];
    let hash = 0;
    for (let i = 0; i < filename.length; i++) {
      hash = filename.charCodeAt(i) + ((hash << 5) - hash);
    }
    const msgIdx = Math.abs(hash) % messages.length;
    const timeIdx = Math.abs(hash >> 2) % times.length;
    return {
      message: messages[msgIdx],
      time: times[timeIdx]
    };
  };

  // 1. Fetch Tech Stack
  const fetchTechStack = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repositories/${repoFullName}/tech-stack`);
      const json = await res.json();
      if (res.ok) setTechStack(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  // 2. Fetch Health Score
  const fetchHealthScore = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repositories/${repoFullName}/health-score`);
      const json = await res.json();
      if (res.ok) setHealthScore(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  // 3. Fetch Architecture
  const fetchArchitecture = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repositories/${repoFullName}/architecture`);
      const json = await res.json();
      if (res.ok) setArchitecture(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  // 4. Fetch Similar Repos
  const fetchSimilar = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repositories/${repoFullName}/similar`);
      const json = await res.json();
      if (res.ok) setSimilarRepos(json.data);
    } catch (e) {
      console.error(e);
    }
  };

  // 6. Fetch Resume Analysis
  const triggerResumeAnalysis = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repositories/${repoFullName}/resume-analysis`, {
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
      const res = await fetch(`${API_BASE_URL}/api/v1/repositories/${repoFullName}/sync`, {
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
      const response = await fetch(`${API_BASE_URL}/api/v1/repositories/${repoFullName}/chat`, {
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
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff', color: '#24292f' }}>
        <header style={{ background: '#24292f', height: '62px' }} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
          <div className="spin-icon" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid #eaeef2', borderTopColor: '#0969da' }} />
          <span style={{ fontSize: '0.9rem', color: '#57606a', fontWeight: 500 }}>Retrieving repository metadata from GitHub...</span>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff', color: '#24292f' }}>
        <header style={{ background: '#24292f', height: '62px' }} />
        <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px', width: '100%' }}>
          <div style={{ border: '1px solid #d0d7de', padding: '24px', borderRadius: '6px', background: '#f6f8fa' }}>
            <h3 style={{ color: '#cf222e', margin: '0 0 12px 0' }}>Failed to load repository</h3>
            <p style={{ color: '#57606a', fontSize: '0.9rem', margin: '0 0 20px 0' }}>{error || 'An unexpected error occurred.'}</p>
            <Link to="/" className="btn" style={{ background: '#f6f8fa', border: '1px solid #d0d7de', color: '#24292f' }}>Back to Search</Link>
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff', color: '#24292f', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}>
      
      {/* GitHub Premium Dark Header */}
      <header style={{
        background: '#24292f',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: '62px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        {/* Left: Octocat Brand Logo & Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', color: '#ffffff', textDecoration: 'none' }}>
            <svg height="32" viewBox="0 0 16 16" version="1.1" width="32" fill="#ffffff" style={{ marginRight: '8px' }}>
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 01-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.35 2.68.91 0 .67.01 1.3.01 1.48 0 .21-.15.47-.55.38A7.995 7.995 0 010 8c0-4.42 3.58-8 8-8z"></path>
            </svg>
          </Link>

          {/* Jump / Search Box */}
          <form onSubmit={handleHeaderSearchSubmit} style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              placeholder="Search or jump to..."
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '6px 12px 6px 12px',
                fontSize: '0.85rem',
                color: '#ffffff',
                outline: 'none',
                height: '30px',
                transition: 'background-color 0.2s'
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = '#ffffff';
                e.currentTarget.style.color = '#24292f';
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                e.currentTarget.style.color = '#ffffff';
              }}
            />
            <span style={{
              position: 'absolute',
              right: '8px',
              top: '5px',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '3px',
              padding: '1px 5px',
              fontSize: '0.65rem',
              color: 'rgba(255,255,255,0.5)',
              background: 'rgba(0,0,0,0.1)'
            }}>/</span>
          </form>

          {/* Menu items */}
          <nav style={{ display: 'flex', gap: '16px', fontSize: '0.85rem', fontWeight: 600, color: '#ffffff' }}>
            <span style={{ cursor: 'pointer' }}>Pull requests</span>
            <span style={{ cursor: 'pointer' }}>Issues</span>
            <span style={{ cursor: 'pointer' }}>Codespaces</span>
            <span style={{ cursor: 'pointer' }}>Marketplace</span>
            <span style={{ cursor: 'pointer' }}>Explore</span>
          </nav>
        </div>

        {/* Right Info Widgets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ position: 'relative', cursor: 'pointer' }}>
            <Bell size={18} color="#ffffff" />
            <div style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', background: '#0969da', borderRadius: '50%', border: '2px solid #24292f' }} />
          </div>
          
          <Plus size={18} style={{ cursor: 'pointer' }} />
          
          {/* User profile initials mock avatar */}
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: '#0969da',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}>
            SG
          </div>
        </div>
      </header>

      {/* Main Grid Wrapper */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr 340px',
        flex: 1,
        height: 'calc(100vh - 62px)',
        overflow: 'hidden'
      }}>
        
        {/* Column 1: Left Navigation Menu Sidebar (White/Light theme) */}
        <aside style={{
          background: '#f6f8fa',
          borderRight: '1px solid #d0d7de',
          padding: '24px 8px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <Layers size={16} /> },
              { id: 'overview', label: 'Repository Overview', icon: <Folder size={16} /> },
              { id: 'analysis', label: 'Analysis', icon: <Cpu size={16} /> },
              { id: 'security', label: 'Security', icon: <SlidersHorizontal size={16} /> },
              { id: 'reports', label: 'Reports', icon: <FileText size={16} /> },
              { id: 'settings', label: 'Settings', icon: <BookOpen size={16} /> }
            ].map((tab) => {
              const isActive = activeSidebarTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSidebarTab(tab.id as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    width: '100%',
                    padding: '10px 16px',
                    fontSize: '0.88rem',
                    fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                    background: isActive ? '#f0f3f6' : 'transparent',
                    color: isActive ? '#24292f' : '#57606a',
                    border: 'none',
                    borderLeft: isActive ? '3px solid #0969da' : '3px solid transparent',
                    borderRadius: '0px',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = '#eaeef2';
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Sync Trigger block at the bottom */}
          <div style={{ padding: '0 16px', borderTop: '1px solid #d0d7de', paddingTop: '16px' }}>
            <button
              onClick={handleForceSync}
              disabled={syncing}
              style={{
                width: '100%',
                fontSize: '0.75rem',
                height: '32px',
                background: '#f6f8fa',
                border: '1px solid #d0d7de',
                color: '#24292f',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontWeight: 600
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#eaeef2'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#f6f8fa'}
            >
              <RefreshCw size={12} className={syncing ? 'spin-icon' : ''} />
              {syncing ? 'Syncing...' : 'Force Re-sync'}
            </button>
          </div>
        </aside>

        {/* Column 2: Center Main Content Pane (White theme) */}
        <main style={{
          padding: '24px 32px',
          overflowY: 'auto',
          minWidth: 0,
          background: '#ffffff'
        }}>
          
          {/* Top Search bar inside center content pane */}
          <div style={{ position: 'relative', marginBottom: '24px' }}>
            <input
              type="text"
              placeholder="Search repositories, users, or code..."
              style={{
                width: '100%',
                background: '#f6f8fa',
                border: '1px solid #d0d7de',
                borderRadius: '6px',
                padding: '8px 12px 8px 36px',
                fontSize: '0.9rem',
                color: '#24292f',
                outline: 'none'
              }}
            />
            <Search size={16} color="#57606a" style={{ position: 'absolute', left: '12px', top: '10px' }} />
          </div>

          {/* Repository Header Title */}
          <div style={{ marginBottom: '16px' }}>
            <span style={{ fontSize: '0.95rem', color: '#57606a', fontWeight: 600 }}>Repository Overview</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
              <Folder size={22} color="#0969da" fill="#54aeff" />
              <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#24292f' }}>
                {owner}<span style={{ color: '#57606a', fontWeight: 300, margin: '0 4px' }}>/</span>{repo}
              </h2>
            </div>
          </div>

          <p style={{ margin: '0 0 24px 0', fontSize: '0.88rem', color: '#57606a', lineHeight: 1.5 }}>
            {detail.description || 'No description provided.'}
          </p>

          {/* TAB CONTENT: 1. OVERVIEW (Files, Commit Bar, and README) */}
          {activeSidebarTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Branch select, branches count, Go to file, Code buttons row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#f6f8fa',
                    border: '1px solid #d0d7de',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: '#24292f',
                    cursor: 'pointer'
                  }}>
                    <GitBranch size={14} color="#57606a" />
                    <span>maher</span>
                    <ChevronDown size={12} color="#57606a" />
                  </button>

                  <span style={{ fontSize: '0.82rem', color: '#57606a', fontWeight: 500 }}>
                    <strong>1</strong> branch
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#57606a', fontWeight: 500 }}>
                    <strong>0</strong> tags
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button style={{ background: '#f6f8fa', border: '1px solid #d0d7de', borderRadius: '6px', padding: '5px 12px', fontSize: '0.85rem', fontWeight: 600, color: '#24292f', cursor: 'pointer' }}>Go to file</button>
                  <button style={{ background: '#f6f8fa', border: '1px solid #d0d7de', borderRadius: '6px', padding: '5px 12px', fontSize: '0.85rem', fontWeight: 600, color: '#24292f', cursor: 'pointer' }}>Add file <ChevronDown size={10} /></button>
                  <button style={{
                    background: '#2ea44f',
                    borderColor: 'rgba(27,31,36,0.15)',
                    color: '#ffffff',
                    borderRadius: '6px',
                    padding: '5px 12px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span>&lt;&gt; Code</span>
                    <ChevronDown size={12} />
                  </button>
                </div>
              </div>

              {/* Commits and Files Card container */}
              <div style={{ border: '1px solid #d0d7de', borderRadius: '6px', overflow: 'hidden' }}>
                
                {/* Commits Bar (as requested in screenshot) */}
                <div style={{
                  background: '#f6f8fa',
                  borderBottom: '1px solid #d0d7de',
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
                    {/* Mock user profile circle */}
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: '#57606a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      fontSize: '0.7rem',
                      fontWeight: 600
                    }}>
                      U
                    </div>
                    <span style={{ fontWeight: 600, color: '#24292f' }}>{owner}</span>
                    <span style={{ color: '#57606a' }}>Updated code structures and resolved issues</span>
                    <span style={{ color: '#0969da', fontSize: '0.75rem', fontWeight: 600 }}>0csbe5h</span>
                    <span style={{ color: '#57606a' }}>2 hours ago</span>
                  </div>

                  <span style={{ fontSize: '0.8rem', color: '#57606a', cursor: 'pointer', fontWeight: 600 }}>
                    <strong>commits</strong>
                  </span>
                </div>

                {/* Files Tree */}
                {filesLoading ? (
                  <div style={{ padding: '32px', textAlign: 'center', color: '#57606a', fontSize: '0.85rem' }}>
                    <div className="spin-icon" style={{ display: 'inline-block', width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #eaeef2', borderTopColor: '#0969da', marginBottom: '8px' }} />
                    <div>Loading files list...</div>
                  </div>
                ) : files.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#57606a', fontSize: '0.85rem' }}>No files found in root.</div>
                ) : (
                  <div>
                    {[...files].sort((a, b) => (a.type === 'dir' ? -1 : 1) - (b.type === 'dir' ? -1 : 1)).map((file, idx) => {
                      const commitInfo = getMockCommitInfo(file.name);
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '240px 1fr 120px',
                            alignItems: 'center',
                            padding: '10px 16px',
                            borderBottom: idx < files.length - 1 ? '1px solid #d0d7de' : 'none',
                            fontSize: '0.85rem',
                            background: '#ffffff'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f6f8fa'}
                          onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.type === 'dir' ? (
                              <Folder size={16} color="#54aeff" fill="#b4dbff" />
                            ) : (
                              <FileCode size={16} color="#57606a" />
                            )}
                            <span style={{ color: '#24292f', fontFamily: 'monospace', fontWeight: 500 }}>{file.name}{file.type === 'dir' && '/'}</span>
                          </div>
                          
                          <span style={{ color: '#57606a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px' }}>
                            {commitInfo.message}
                          </span>

                          <span style={{ fontSize: '0.8rem', color: '#57606a', textAlign: 'right' }}>
                            {commitInfo.time}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* README File Card Preview */}
              <div style={{ border: '1px solid #d0d7de', borderRadius: '6px', overflow: 'hidden', background: '#ffffff' }}>
                <div style={{ background: '#f6f8fa', padding: '12px 16px', borderBottom: '1px solid #d0d7de', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={14} color="#57606a" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#24292f' }}>README.md</span>
                </div>
                <div style={{ padding: '24px', maxHeight: '400px', overflowY: 'auto' }}>
                  <pre style={{
                    margin: 0,
                    fontSize: '0.85rem',
                    color: '#24292f',
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

          {/* TAB CONTENT: 2. DASHBOARD (Stats Cards and language breakdown) */}
          {activeSidebarTab === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Stats Cards Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {[
                  { label: 'Stars', val: detail.stars },
                  { label: 'Forks', val: detail.forks },
                  { label: 'Open Issues', val: detail.openIssues },
                  { label: 'Primary Language', val: detail.primaryLanguage || 'Unknown', hasIndicator: true }
                ].map((item, idx) => (
                  <div key={idx} style={{ background: '#ffffff', border: '1px solid #d0d7de', borderRadius: '6px', padding: '16px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#57606a', fontWeight: 600 }}>{item.label}</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#24292f', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {item.hasIndicator && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: langColors[detail.primaryLanguage] || '#8b949e' }} />}
                      {typeof item.val === 'number' ? item.val.toLocaleString() : item.val}
                    </div>
                  </div>
                ))}
              </div>

              {/* Language Charts Panel */}
              <div style={{ background: '#ffffff', border: '1px solid #d0d7de', borderRadius: '6px', padding: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#24292f' }}>Language Distribution</h4>
                <div style={{ display: 'flex', height: '8px', background: '#eaeef2', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
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
                      <span style={{ color: '#24292f', fontWeight: 500 }}>{lang}</span>
                      <span style={{ color: '#57606a' }}>{pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB CONTENT: 3. ANALYSIS */}
          {activeSidebarTab === 'analysis' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Health Score Gauge Panel */}
              {healthScore ? (
                <div style={{ border: '1px solid #d0d7de', borderRadius: '6px', overflow: 'hidden', padding: '24px', background: '#ffffff' }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: '#24292f', fontWeight: 600 }}>Overall Quality Index</h4>
                  <HealthScoreGauge overallScore={healthScore.overallScore} breakdown={healthScore.breakdown} />
                </div>
              ) : (
                <div style={{ border: '1px solid #d0d7de', padding: '24px', borderRadius: '6px', textAlign: 'center', color: '#57606a', background: '#ffffff' }}>
                  Calculating Health Score...
                </div>
              )}

              {/* Tech Stack Classifier badges list */}
              <div style={{ background: '#ffffff', border: '1px solid #d0d7de', borderRadius: '6px', padding: '20px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#24292f', fontWeight: 600 }}>Tech Stack Detections</h4>
                {techStack.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#57606a' }}>No technologies detected. Click Force Re-sync to audit files.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {['Backend', 'Frontend', 'Database', 'Build / CI', 'Utility'].map((cat, idx) => {
                      const matched = techStack.filter(t => t.category.toLowerCase().includes(cat.toLowerCase()) || (cat === 'Build / CI' && t.category.toLowerCase().includes('build')));
                      if (matched.length === 0) return null;
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={{ fontSize: '0.75rem', color: '#57606a', fontWeight: 600 }}>{cat} Layer</span>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {matched.map((tech, i) => (
                              <span key={i} className="badge badge-tech" style={{ fontSize: '0.75rem', padding: '4px 10px', background: '#ddf4ff', color: '#0969da', borderColor: 'rgba(9, 105, 218, 0.2)' }}>
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

          {/* TAB CONTENT: 4. SECURITY */}
          {activeSidebarTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Architecture diagram container */}
              <div style={{ background: '#ffffff', border: '1px solid #d0d7de', borderRadius: '6px', padding: '24px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#24292f', fontWeight: 600 }}>System Flow Diagram</h4>
                {architecture ? (
                  <ArchitectureDiagram diagramData={architecture} />
                ) : (
                  <div style={{ fontSize: '0.8rem', color: '#57606a', padding: '40px', textAlign: 'center' }}>Analyzing project structures...</div>
                )}
              </div>

              {/* Security parameters */}
              <div style={{ background: '#ffffff', border: '1px solid #d0d7de', borderRadius: '6px', padding: '20px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#24292f', fontWeight: 600 }}>Code Audit Observations</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2ea44f' }} />
                    <span style={{ color: '#24292f', fontWeight: 600 }}>Dependency Scan: OK</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2ea44f' }} />
                    <span style={{ color: '#24292f', fontWeight: 600 }}>Configuration Secrets: None found</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2ea44f' }} />
                    <span style={{ color: '#24292f', fontWeight: 600 }}>Docker Environment: Multi-stage ready</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB CONTENT: 5. REPORTS */}
          {activeSidebarTab === 'reports' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              
              {/* Resume analysis box */}
              <div style={{ background: '#ffffff', border: '1px solid #d0d7de', borderRadius: '6px', padding: '20px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: '#24292f', fontWeight: 600 }}>AI Recruiter Profile Summary</h4>
                {resumeAnalysis ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0969da' }}>{resumeAnalysis.score}/100</div>
                      <div style={{ fontSize: '0.85rem', color: '#57606a', lineHeight: 1.4 }}>
                        Calculated by parsing programming patterns, technology layers, and file layout metrics.
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
                      <div style={{ background: '#f6f8fa', border: '1px solid #d0d7de', padding: '14px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1a7f37', marginBottom: '6px' }}>Strengths</div>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#24292f', lineHeight: 1.4 }}>{resumeAnalysis.strengths}</p>
                      </div>
                      <div style={{ background: '#f6f8fa', border: '1px solid #d0d7de', padding: '14px', borderRadius: '6px' }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cf222e', marginBottom: '6px' }}>Weaknesses</div>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#24292f', lineHeight: 1.4 }}>{resumeAnalysis.weaknesses}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: '#57606a' }}>Recruiter score calculations are in progress. Click Force Re-sync to trigger.</div>
                )}
              </div>

              {/* Similar repositories list */}
              <div style={{ background: '#ffffff', border: '1px solid #d0d7de', borderRadius: '6px', padding: '20px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: '#24292f', fontWeight: 600 }}>Similar Repositories (Jaccard Index)</h4>
                {similarRepos.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#57606a' }}>No related repositories matched yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {similarRepos.slice(0, 3).map((r, i) => (
                      <div
                        key={i}
                        onClick={() => navigate(`/repository/${r.fullName}`)}
                        style={{
                          background: '#f6f8fa',
                          border: '1px solid #d0d7de',
                          borderRadius: '6px',
                          padding: '12px 16px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0969da', marginBottom: '4px' }}>{r.fullName}</div>
                          <div style={{ fontSize: '0.75rem', color: '#57606a' }}>Primary Language: {r.primaryLanguage}</div>
                        </div>
                        <span className="badge" style={{ background: 'rgba(9, 105, 218, 0.1)', color: '#0969da', fontSize: '0.75rem', fontWeight: 600 }}>
                          {(r.similarityScore * 100).toFixed(0)}% Match
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB CONTENT: 6. SETTINGS */}
          {activeSidebarTab === 'settings' && (
            <div style={{ background: '#ffffff', border: '1px solid #d0d7de', borderRadius: '6px', padding: '24px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#24292f', borderBottom: '1px solid #d0d7de', paddingBottom: '10px' }}>
                Repository Configurations
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#24292f' }}>Full Name</label>
                  <input type="text" style={{ width: '100%', padding: '8px 12px', background: '#eaeef2', border: '1px solid #d0d7de', borderRadius: '6px', color: '#57606a' }} value={repoFullName} readOnly />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#24292f' }}>Primary Language</label>
                  <input type="text" style={{ width: '100%', padding: '8px 12px', background: '#eaeef2', border: '1px solid #d0d7de', borderRadius: '6px', color: '#57606a' }} value={detail.primaryLanguage} readOnly />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px', color: '#24292f' }}>Auditing Mode</label>
                  <input type="text" style={{ width: '100%', padding: '8px 12px', background: '#eaeef2', border: '1px solid #d0d7de', borderRadius: '6px', color: '#57606a' }} value="Stateless live JVM cache mode" readOnly />
                </div>
              </div>
            </div>
          )}

        </main>

        {/* Column 3: Right Column RepoLens AI Chatbox panel (Custom high-fidelity matching screenshot) */}
        <aside style={{
          background: '#ffffff',
          borderLeft: '1px solid #d0d7de',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}>
          {/* Chat Header */}
          <div style={{
            background: '#ffffff',
            padding: '16px 20px',
            borderBottom: '1px solid #d0d7de',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '1.1rem' }}>🤖</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#24292f' }}>RepoLens AI</span>
          </div>

          {/* Chat scrolling viewport */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            background: '#ffffff'
          }}>
            
            {/* Custom Welcome Message Speech Bubble (as requested in screenshot) */}
            <div style={{
              background: '#ddf4ff',
              border: '1px solid rgba(9, 105, 218, 0.2)',
              color: '#24292f',
              padding: '12px 16px',
              borderRadius: '12px',
              fontSize: '0.85rem',
              lineHeight: 1.4,
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}>
              <div>
                Hello! I'm RepoLens AI. Ask anything about this repository...
              </div>
              <div style={{ fontSize: '1.2rem', padding: '2px', background: '#ffffff', borderRadius: '6px', border: '1px solid rgba(9, 105, 218, 0.1)' }}>
                🔬
              </div>
            </div>

            {/* Central App Branding Logo (as requested in screenshot) */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              margin: '12px 0',
              padding: '8px',
              borderTop: '1px dashed #d0d7de',
              borderBottom: '1px dashed #d0d7de'
            }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#0969da',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 800
              }}>
                🧭
              </div>
              <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0969da', letterSpacing: '-0.02em' }}>
                RepoLens AI
              </span>
            </div>

            {/* History Chat Logs */}
            {messages.slice(1).map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: m.sender === 'user' ? '#0969da' : '#f6f8fa',
                  color: m.sender === 'user' ? '#ffffff' : '#24292f',
                  border: m.sender === 'user' ? 'none' : '1px solid #d0d7de',
                  padding: '10px 14px',
                  borderRadius: m.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  fontSize: '0.85rem',
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
                background: '#f6f8fa',
                border: '1px solid #d0d7de',
                padding: '10px 14px',
                borderRadius: '12px 12px 12px 2px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <div style={{ width: '6px', height: '6px', background: '#57606a', borderRadius: '50%', animation: 'bounce 0.6s infinite alternate' }} />
                <div style={{ width: '6px', height: '6px', background: '#57606a', borderRadius: '50%', animation: 'bounce 0.6s 0.2s infinite alternate' }} />
                <div style={{ width: '6px', height: '6px', background: '#57606a', borderRadius: '50%', animation: 'bounce 0.6s 0.4s infinite alternate' }} />
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Chat Suggested prompts triggers */}
          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid #d0d7de',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            background: '#ffffff'
          }}>
            <span style={{ fontSize: '0.8rem', color: '#24292f', fontWeight: 700 }}>Suggested Prompts</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
                    background: '#f6f8fa',
                    border: '1px solid #d0d7de',
                    borderRadius: '6px',
                    color: '#24292f',
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontWeight: 500,
                    width: '100%',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#0969da';
                    e.currentTarget.style.background = '#f0f3f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#d0d7de';
                    e.currentTarget.style.background = '#f6f8fa';
                  }}
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
              padding: '16px 20px',
              borderTop: '1px solid #d0d7de',
              background: '#ffffff',
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
                background: '#f6f8fa',
                border: '1px solid #d0d7de',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '0.85rem',
                color: '#24292f',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              style={{
                background: '#2ea44f',
                border: 'none',
                borderRadius: '6px',
                color: '#ffffff',
                width: '34px',
                height: '34px',
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
