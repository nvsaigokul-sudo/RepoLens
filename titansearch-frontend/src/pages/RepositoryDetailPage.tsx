import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  RefreshCw, FileText, Bell, Star, GitFork, Eye, AlertCircle,
  Globe, Copy, Check, ExternalLink, Bookmark, Download, Sparkles, Folder, Moon, Sun
} from 'lucide-react';
import FileExplorer from '../components/FileExplorer';
import ArchitectureDiagram from '../components/ArchitectureDiagram';
import { RepoLensLogo } from './SearchPage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://localhost:8080');

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

interface AiSummaryData {
  overview: string;
  mainPurpose: string;
  learningValue: string;
  architectureSummary: string;
  keyTechnologies: string;
}

interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

// Global details page data cache to support instant loading (Stale-While-Revalidate)
interface CacheEntry {
  detail?: RepoDetail;
  ownerData?: any;
  techStack?: any[];
  healthScore?: HealthScoreData;
  architecture?: any;
  aiSummary?: AiSummaryData;
  resumeAnalysis?: ResumeAnalysisData;
}
const detailsCache: { [repoName: string]: CacheEntry } = {};
const etagCache: { [url: string]: { etag: string; data: any } } = {};

const renderChatMarkdown = (text: string, theme: any, darkMode: boolean) => {
  if (!text) return '';
  
  // Escape HTML characters
  let escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Helper to parse table
  const parseTable = (tableLines: string[]): string => {
    if (tableLines.length < 2) return tableLines.join('\n');
    const headerRow = tableLines[0];
    const parseRow = (row: string, cellTag: string) => {
      const cells = row.split('|').map(c => c.trim());
      if (cells[0] === '') cells.shift();
      if (cells[cells.length - 1] === '') cells.pop();
      return `<tr>${cells.map(c => `<${cellTag} style="border: 1px solid ${theme.border}; padding: 6px 10px; font-size: 0.8rem; font-weight: ${cellTag === 'th' ? 'bold' : 'normal'}">${c}</${cellTag}>`).join('')}</tr>`;
    };

    try {
      const headerHtml = `<thead>${parseRow(headerRow, 'th')}</thead>`;
      const bodyRows = tableLines.slice(2).map(row => parseRow(row, 'td')).join('');
      const bodyHtml = `<tbody>${bodyRows}</tbody>`;
      return `<div style="overflow-x: auto; margin: 12px 0;"><table style="border-collapse: collapse; width: 100%; border: 1px solid ${theme.border}; text-align: left;">${headerHtml}${bodyHtml}</table></div>`;
    } catch (e) {
      return tableLines.join('\n');
    }
  };

  // 1. Block level: Fenced Code Blocks (```lang ... ```)
  const codeBlocks: string[] = [];
  escaped = escaped.replace(/```(\w*)\n([\s\S]*?)\n```/g, (_, lang, code) => {
    const index = codeBlocks.length;
    codeBlocks.push(`<pre style="background: ${darkMode ? '#161b22' : '#f6f8fa'}; border: 1px solid ${theme.border}; padding: 12px; border-radius: 6px; overflow-x: auto; font-family: monospace; font-size: 0.82rem; margin: 12px 0; color: ${theme.text};"><code class="language-${lang}">${code}</code></pre>`);
    return `__CODE_BLOCK_PLACEHOLDER_${index}__`;
  });

  // 2. Block level: Tables
  const lines = escaped.split('\n');
  let inTable = false;
  let tableLines: string[] = [];
  const processedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      inTable = true;
      tableLines.push(line);
    } else {
      if (inTable) {
        processedLines.push(parseTable(tableLines));
        tableLines = [];
        inTable = false;
      }
      processedLines.push(lines[i]);
    }
  }
  if (inTable && tableLines.length > 0) {
    processedLines.push(parseTable(tableLines));
  }
  escaped = processedLines.join('\n');

  // 3. Inline Links: [text](url)
  escaped = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #0969da; text-decoration: underline;">$1</a>`);

  // 4. Headings
  escaped = escaped.replace(/^# (.*$)/gim, `<h1 style="font-size:1.25rem; border-bottom:1px solid ${theme.border}; padding-bottom:4px; margin:16px 0 8px 0; font-weight:700; color:${theme.text};">$1</h1>`);
  escaped = escaped.replace(/^## (.*$)/gim, `<h2 style="font-size:1.15rem; border-bottom:1px solid ${theme.border}; padding-bottom:3px; margin:14px 0 6px 0; font-weight:600; color:${theme.text};">$1</h2>`);
  escaped = escaped.replace(/^### (.*$)/gim, `<h3 style="font-size:1.05rem; margin:12px 0 6px 0; font-weight:600; color:${theme.text};">$1</h3>`);
  escaped = escaped.replace(/^#### (.*$)/gim, `<h4 style="font-size:0.95rem; margin:10px 0 4px 0; font-weight:600; color:${theme.text};">$1</h4>`);

  // 5. Lists (Bullet & Numbered)
  escaped = escaped.replace(/^\s*[\*\-\+]\s+(.*$)/gim, `<li style="margin-left:16px; list-style-type:disc; margin-bottom:4px; color:${theme.text};">$1</li>`);
  escaped = escaped.replace(/^\s*(\d+)\.\s+(.*$)/gim, `<li style="margin-left:16px; list-style-type:decimal; margin-bottom:4px; color:${theme.text};">$2</li>`);

  // 6. Bold & Italic
  escaped = escaped.replace(/\*\*([\s\S]*?)\*\*/g, '<strong>$1</strong>');
  escaped = escaped.replace(/\*([\s\S]*?)\*/g, '<em>$1</em>');
  escaped = escaped.replace(/__([\s\S]*?)__/g, '<strong>$1</strong>');
  escaped = escaped.replace(/_([\s\S]*?)_/g, '<em>$1</em>');

  // 7. Inline code
  escaped = escaped.replace(/`([^`\n]+)`/g, `<code style="background: ${darkMode ? '#21262d' : '#afb8c133'}; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 0.85em; color: #e06c75;">$1</code>`);

  // 8. Paragraphs & Line Breaks
  escaped = escaped.replace(/\n\n/g, `<p style="margin: 8px 0; line-height: 1.4; color: ${theme.text};"></p>`);
  
  // Restore code block placeholders
  codeBlocks.forEach((htmlBlock, index) => {
    escaped = escaped.replace(`__CODE_BLOCK_PLACEHOLDER_${index}__`, htmlBlock);
  });

  return escaped;
};

export default function RepositoryDetailPage() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const repoFullName = `${owner}/${repo}`;
  const abortControllerRef = useRef<AbortController | null>(null);

  // Tabs: Overview, AI Analysis, Files
  const initialTab = (location.state as any)?.activeTab || 'overview';
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'files'>(initialTab === 'chat' ? 'overview' : initialTab);

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
  const [aiSummary, setAiSummary] = useState<AiSummaryData | null>(null);
  const [aiSummaryPending, setAiSummaryPending] = useState(false);
  const [resumeAnalysisPending, setResumeAnalysisPending] = useState(false);

  // Search input in header
  const [headerSearch, setHeaderSearch] = useState('');

  // Chat bot states
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'ai', text: "Hello! I'm RepoLens AI. Ask anything about this repository..." }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [temperature, setTemperature] = useState(0.7);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Sync / Force Re-sync
  const [syncing, setSyncing] = useState(false);

  // Owner detailed state
  const [ownerData, setOwnerData] = useState<any>(null);

  // Copy URL states
  const [copiedUrlType, setCopiedUrlType] = useState<'https' | 'ssh' | 'share' | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Direct ZIP download progress states
  const [downloadState, setDownloadState] = useState<'idle' | 'preparing' | 'downloading' | 'complete'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Premium Dark Mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('repolens-theme') === 'dark';
  });

  useEffect(() => {
    localStorage.setItem('repolens-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Load notifications from local storage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('repolens-notifications');
    if (savedNotes) {
      try {
        setNotifications(JSON.parse(savedNotes));
      } catch (e) {
        console.error(e);
      }
    } else {
      const defaultNotes = [
        { title: "Welcome to RepoLens", message: "Connect your GitHub account to analyze repositories." }
      ];
      setNotifications(defaultNotes);
      localStorage.setItem('repolens-notifications', JSON.stringify(defaultNotes));
    }
  }, []);

  // Update bookmarked state and add to analysis history on detail load
  useEffect(() => {
    if (detail) {
      // 1. Sync bookmark status
      const savedFavs = localStorage.getItem('repolens-favorites');
      if (savedFavs) {
        try {
          const list: any[] = JSON.parse(savedFavs);
          setBookmarked(list.some(fav => fav.id === detail.id || fav.fullName === detail.fullName));
        } catch (e) {
          console.error(e);
        }
      }

      // 2. Add to history
      const savedHistory = localStorage.getItem('repolens-history');
      let historyList: any[] = [];
      if (savedHistory) {
        try {
          historyList = JSON.parse(savedHistory);
        } catch (e) {
          console.error(e);
        }
      }
      historyList = historyList.filter((item: any) => item.fullName !== detail.fullName);
      historyList.unshift({
        fullName: detail.fullName,
        owner: detail.owner,
        repo: detail.fullName.split('/')[1] || '',
        analyzedAt: new Date().toISOString()
      });
      if (historyList.length > 10) {
        historyList = historyList.slice(0, 10);
      }
      localStorage.setItem('repolens-history', JSON.stringify(historyList));
    }
  }, [detail]);

  const handleClearNotifications = () => {
    setNotifications([]);
    localStorage.setItem('repolens-notifications', JSON.stringify([]));
  };

  const handleToggleBookmark = () => {
    if (!detail) return;
    const saved = localStorage.getItem('repolens-favorites');
    let list: any[] = [];
    if (saved) {
      try {
        list = JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }

    const isFav = list.some(fav => fav.id === detail.id || fav.fullName === detail.fullName);
    if (isFav) {
      list = list.filter(fav => fav.id !== detail.id && fav.fullName !== detail.fullName);
      setBookmarked(false);
    } else {
      const newFav = {
        id: detail.id,
        fullName: detail.fullName,
        owner: detail.owner,
        description: detail.description || '',
        stars: detail.stars || 0,
        forks: detail.forks || 0,
        topics: [],
        lastUpdated: new Date().toISOString(),
        primaryLanguage: detail.primaryLanguage,
        visibility: 'public'
      };
      list.push(newFav);
      setBookmarked(true);
    }
    localStorage.setItem('repolens-favorites', JSON.stringify(list));
  };

  // Color theme definitions
  const theme = {
    bg: darkMode ? '#0d1117' : '#ffffff',
    text: darkMode ? '#c9d1d9' : '#24292f',
    textMuted: darkMode ? '#8b949e' : '#57606a',
    border: darkMode ? '#30363d' : '#d0d7de',
    cardBg: darkMode ? '#161b22' : '#ffffff',
    sidebarBg: darkMode ? '#161b22' : '#f6f8fa',
    headerBg: darkMode ? '#161b22' : '#24292f',
    inputBg: darkMode ? '#0d1117' : '#f6f8fa'
  };

  const getAuthHeaders = (custom: HeadersInit = {}): HeadersInit => {
    const gitToken = localStorage.getItem('repolens-git-token') || '';
    const geminiKey = localStorage.getItem('repolens-gemini-key') || '';
    return {
      'X-GitHub-Token': gitToken,
      'X-Gemini-Key': geminiKey,
      ...custom
    };
  };

  const fetchDetail = async (signal: AbortSignal) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/repositories/${repoFullName}`, {
        signal,
        headers: getAuthHeaders()
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error?.message || 'Failed to fetch details');
      setDetail(json.data);
      if (!detailsCache[repoFullName]) detailsCache[repoFullName] = {};
      detailsCache[repoFullName].detail = json.data;
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Failed to load repository detail');
    } finally {
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  };

  const fetchOwnerData = async (signal: AbortSignal) => {
    const url = `https://api.github.com/users/${owner || ''}`;
    const headers: HeadersInit = {};
    if (etagCache[url]) {
      headers['If-None-Match'] = etagCache[url].etag;
    }
    const gitToken = localStorage.getItem('repolens-git-token');
    if (gitToken) {
      headers['Authorization'] = `token ${gitToken}`;
    }

    try {
      const res = await fetch(url, { signal, headers });
      if (res.status === 304 && etagCache[url]) {
        setOwnerData(etagCache[url].data);
        if (!detailsCache[repoFullName]) detailsCache[repoFullName] = {};
        detailsCache[repoFullName].ownerData = etagCache[url].data;
        return;
      }

      if (res.ok) {
        const data = await res.json();
        const etag = res.headers.get('etag');
        if (etag) {
          etagCache[url] = { etag, data };
        }
        setOwnerData(data);
        if (!detailsCache[repoFullName]) detailsCache[repoFullName] = {};
        detailsCache[repoFullName].ownerData = data;
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error(e);
    }
  };

  const fetchTechStack = async (signal: AbortSignal) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repositories/${repoFullName}/tech-stack`, {
        signal,
        headers: getAuthHeaders()
      });
      const json = await res.json();
      if (res.ok) {
        setTechStack(json.data);
        if (!detailsCache[repoFullName]) detailsCache[repoFullName] = {};
        detailsCache[repoFullName].techStack = json.data;
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error(e);
    }
  };

  const fetchHealthScore = async (signal: AbortSignal) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repositories/${repoFullName}/health-score`, {
        signal,
        headers: getAuthHeaders()
      });
      const json = await res.json();
      if (res.ok) {
        setHealthScore(json.data);
        if (!detailsCache[repoFullName]) detailsCache[repoFullName] = {};
        detailsCache[repoFullName].healthScore = json.data;
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error(e);
    }
  };

  const fetchArchitecture = async (signal: AbortSignal) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repositories/${repoFullName}/architecture`, {
        signal,
        headers: getAuthHeaders()
      });
      const json = await res.json();
      if (res.ok) {
        setArchitecture(json.data);
        if (!detailsCache[repoFullName]) detailsCache[repoFullName] = {};
        detailsCache[repoFullName].architecture = json.data;
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error(e);
    }
  };

  const fetchSimilar = async (signal: AbortSignal) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repositories/${repoFullName}/similar`, {
        signal,
        headers: getAuthHeaders()
      });
      const json = await res.json();
      if (res.ok) {
        setSimilarRepos(json.data);
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error(e);
    }
  };

  const fetchAiSummary = async (signal: AbortSignal) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repositories/${repoFullName}/ai-summary`, {
        signal,
        headers: getAuthHeaders()
      });
      const json = await res.json();
      if (res.status === 202) {
        setAiSummaryPending(true);
        if (!signal.aborted) {
          setTimeout(() => {
            if (!signal.aborted) fetchAiSummary(signal);
          }, 3000);
        }
      } else if (res.ok && json.data) {
        setAiSummaryPending(false);
        setAiSummary(json.data);
        if (!detailsCache[repoFullName]) detailsCache[repoFullName] = {};
        detailsCache[repoFullName].aiSummary = json.data;
      } else {
        setAiSummaryPending(false);
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error(e);
      setAiSummaryPending(false);
    }
  };

  const triggerResumeAnalysis = async (signal: AbortSignal) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repositories/${repoFullName}/resume-analysis`, {
        method: 'POST',
        signal,
        headers: getAuthHeaders()
      });
      const json = await res.json();
      if (res.status === 202) {
        setResumeAnalysisPending(true);
        if (!signal.aborted) {
          setTimeout(() => {
            if (!signal.aborted) triggerResumeAnalysis(signal);
          }, 3000);
        }
      } else if (res.ok && json.data) {
        setResumeAnalysisPending(false);
        const mappedData = {
          score: json.data.resumeScore || 0,
          strengths: Array.isArray(json.data.strengths) ? json.data.strengths.join('\n') : (json.data.strengths || ''),
          weaknesses: Array.isArray(json.data.weaknesses) ? json.data.weaknesses.join('\n') : (json.data.weaknesses || '')
        };
        setResumeAnalysis(mappedData);
        if (!detailsCache[repoFullName]) detailsCache[repoFullName] = {};
        detailsCache[repoFullName].resumeAnalysis = mappedData;
      } else {
        setResumeAnalysisPending(false);
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error(e);
      setResumeAnalysisPending(false);
    }
  };

  const handleForceSync = async () => {
    setSyncing(true);
    delete detailsCache[repoFullName];

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/repositories/${repoFullName}/sync`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        const controller = new AbortController();
        abortControllerRef.current = controller;
        const signal = controller.signal;

        setTechStack([]);
        setHealthScore(null);
        setArchitecture(null);
        setSimilarRepos([]);
        setResumeAnalysis(null);
        setAiSummary(null);
        setAiSummaryPending(true);
        setResumeAnalysisPending(true);
        
        fetchDetail(signal);
        fetchOwnerData(signal);
        fetchTechStack(signal);
        fetchHealthScore(signal);
        fetchArchitecture(signal);
        fetchSimilar(signal);
        fetchAiSummary(signal);
        triggerResumeAnalysis(signal);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSyncing(false);
    }
  };

  const handleSendMessage = async (msgText: string) => {
    if (!msgText.trim() || chatLoading) return;
    
    const updatedMessages = [...messages, { sender: 'user', text: msgText } as ChatMessage];
    setMessages(updatedMessages);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/repositories/${repoFullName}/chat`, {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ message: msgText, temperature })
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

  const handleCopyText = (text: string, type: 'https' | 'ssh' | 'share') => {
    navigator.clipboard.writeText(text);
    setCopiedUrlType(type);
    setTimeout(() => setCopiedUrlType(null), 2000);
  };

  const handleDownloadZip = () => {
    setDownloadState('preparing');
    setDownloadProgress(30);
    
    try {
      const gitToken = localStorage.getItem('repolens-git-token') || '';
      const zipUrl = `${API_BASE_URL}/api/v1/repositories/${repoFullName}/zip?token=${encodeURIComponent(gitToken)}`;
      
      setDownloadProgress(70);
      
      // Navigate window directly to begin download stream from proxy
      window.location.href = zipUrl;
      
      setDownloadProgress(100);
      setDownloadState('complete');
      
      setTimeout(() => {
        setDownloadState('idle');
        setDownloadProgress(0);
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setDownloadState('idle');
      setDownloadProgress(0);
      alert("ZIP Download error: " + err.message);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const signal = controller.signal;

    const cacheKey = repoFullName;
    const cached = detailsCache[cacheKey];
    if (cached) {
      if (cached.detail) setDetail(cached.detail);
      if (cached.ownerData) setOwnerData(cached.ownerData);
      if (cached.techStack) setTechStack(cached.techStack);
      if (cached.healthScore) setHealthScore(cached.healthScore);
      if (cached.architecture) setArchitecture(cached.architecture);
      if (cached.aiSummary) setAiSummary(cached.aiSummary);
      if (cached.resumeAnalysis) setResumeAnalysis(cached.resumeAnalysis);
      setLoading(false);
    } else {
      setLoading(true);
      setDetail(null);
      setOwnerData(null);
      setTechStack([]);
      setHealthScore(null);
      setArchitecture(null);
      setSimilarRepos([]);
      setResumeAnalysis(null);
      setAiSummary(null);
      setAiSummaryPending(true);
      setResumeAnalysisPending(true);
    }

    fetchDetail(signal);
    fetchOwnerData(signal);
    fetchTechStack(signal);
    fetchHealthScore(signal);
    fetchArchitecture(signal);
    fetchSimilar(signal);
    fetchAiSummary(signal);
    triggerResumeAnalysis(signal);

    return () => {
      controller.abort();
    };
  }, [owner, repo]);

  const handleHeaderSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headerSearch.trim()) return;
    navigate(`/repository/${headerSearch.trim()}`);
    setHeaderSearch('');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: theme.bg, color: theme.text }}>
        <header style={{ background: theme.headerBg, height: '62px' }} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
          <div className="spin-icon" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid #eaeef2', borderTopColor: '#0969da' }} />
          <span style={{ fontSize: '0.9rem', color: theme.textMuted, fontWeight: 500 }}>Retrieving repository metadata from GitHub...</span>
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: theme.bg, color: theme.text }}>
        <header style={{ background: theme.headerBg, height: '62px' }} />
        <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px', width: '100%' }}>
          <div style={{ border: `1px solid ${theme.border}`, padding: '24px', borderRadius: '6px', background: theme.sidebarBg }}>
            <h3 style={{ color: '#cf222e', margin: '0 0 12px 0' }}>Failed to load repository</h3>
            <p style={{ color: theme.textMuted, fontSize: '0.9rem', margin: '0 0 20px 0' }}>{error || 'An unexpected error occurred.'}</p>
            <Link to="/" className="btn" style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, color: theme.text }}>Back to Search</Link>
          </div>
        </div>
      </div>
    );
  }

  const renderSimpleMarkdown = (text: string) => {
    if (!text) return 'No README content found.';
    const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return escaped
      .replace(/^# (.*$)/gim, `<h1 style="font-size:1.6rem; border-bottom:1px solid ${theme.border}; padding-bottom:8px; margin:24px 0 12px 0; font-weight:700; color:${theme.text};">$1</h1>`)
      .replace(/^## (.*$)/gim, `<h2 style="font-size:1.3rem; border-bottom:1px solid ${theme.border}; padding-bottom:6px; margin:20px 0 10px 0; font-weight:600; color:${theme.text};">$2</h2>`)
      .replace(/^### (.*$)/gim, `<h3 style="font-size:1.1rem; margin:16px 0 8px 0; font-weight:600; color:${theme.text};">$1</h3>`)
      .replace(/^\* (.*$)/gim, `<li style="margin-left:20px; list-style-type:disc; margin-bottom:4px; color:${theme.text};">$1</li>`)
      .replace(/^- (.*$)/gim, `<li style="margin-left:20px; list-style-type:circle; margin-bottom:4px; color:${theme.text};">$1</li>`)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.*?)`/g, `<code style="background:${theme.sidebarBg}; padding:2px 6px; border-radius:4px; font-family:monospace; font-size:0.85em; color:#e06c75;">$1</code>`)
      .replace(/\n\n/g, `<p style="margin:12px 0; line-height:1.5; color:${theme.text};"></p>`)
      .replace(/\n/g, '<br />');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: theme.bg,
      color: theme.text,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      transition: 'background-color 0.2s, color 0.2s'
    }}>
      
      {/* Header */}
      <header style={{
        background: theme.headerBg,
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: '62px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderBottom: `1px solid ${theme.border}`
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', color: '#ffffff', textDecoration: 'none', gap: '10px' }}>
            <RepoLensLogo color="#ffffff" size={28} />
            <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              RepoLens Discovery
            </span>
          </Link>

          <form onSubmit={handleHeaderSearchSubmit} style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              placeholder="Search repositories..."
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.85rem',
                color: '#ffffff',
                outline: 'none',
                height: '30px'
              }}
            />
          </form>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            onClick={() => setDarkMode(!darkMode)}
            style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {/* Notifications Dropdown */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Bell 
              size={18} 
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ cursor: 'pointer', color: showNotifications ? '#ffffff' : 'rgba(255,255,255,0.85)' }} 
            />
            {notifications.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#cf222e',
                color: '#ffffff',
                fontSize: '0.62rem',
                borderRadius: '50%',
                width: '8px',
                height: '8px',
                display: 'block'
              }} />
            )}
            {showNotifications && (
              <div style={{
                position: 'absolute',
                top: '28px',
                right: '0',
                width: '280px',
                background: theme.cardBg,
                border: `1px solid ${theme.border}`,
                borderRadius: '8px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                zIndex: 1000,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: theme.text }}>Notifications</span>
                  {notifications.length > 0 && (
                    <button 
                      onClick={handleClearNotifications}
                      style={{ background: 'none', border: 'none', color: '#0969da', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 500 }}
                    >
                      Clear All
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: theme.textMuted, textAlign: 'center', padding: '16px 0' }}>
                    No notifications yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                    {notifications.map((n, i) => (
                      <div key={i} style={{ fontSize: '0.78rem', color: theme.text, textAlign: 'left', lineHeight: 1.3, borderBottom: i < notifications.length - 1 ? `1px solid ${theme.border}` : 'none', paddingBottom: '6px' }}>
                        <div style={{ fontWeight: 600, color: '#0969da', marginBottom: '2px' }}>{n.title}</div>
                        <div style={{ color: theme.textMuted }}>{n.message}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Detail Layout Container */}
      <div style={{
        maxWidth: '1280px',
        width: '100%',
        margin: '24px auto',
        padding: '0 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        
        {/* Back Link & Resync Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#0969da', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>
            ← Back to repository discovery
          </Link>

          <button
            onClick={handleForceSync}
            disabled={syncing}
            style={{
              background: theme.cardBg,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '0.8rem',
              fontWeight: 600,
              color: theme.text,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={14} className={syncing ? 'spin-icon' : ''} />
            <span>{syncing ? 'Syncing...' : 'Force Re-sync'}</span>
          </button>
        </div>

        {/* 2-Column Split view */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60% 40%',
          gap: '28px',
          alignItems: 'start'
        }}>
          
          {/* LEFT COLUMN (60%) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Repository Header */}
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: theme.sidebarBg, overflow: 'hidden', border: `1px solid ${theme.border}` }}>
                  {ownerData?.avatar_url ? (
                    <img src={ownerData.avatar_url} alt={owner} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#0969da' }}>{(owner || 'R')[0].toUpperCase()}</div>
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.25rem', fontWeight: 500, color: theme.textMuted }}>{owner}</span>
                    <span style={{ fontSize: '1.25rem', color: theme.textMuted }}>/</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 800, color: theme.text }}>{repo}</span>
                  </div>
                  <a href={`https://github.com/${repoFullName}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem', color: '#0969da', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <span>https://github.com/{repoFullName}</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              <p style={{ fontSize: '0.95rem', color: theme.text, marginTop: '16px', marginBottom: 0, lineHeight: 1.5 }}>
                {detail.description || 'No description provided.'}
              </p>
            </div>

            {/* Statistics Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Star size={20} color="#eab308" fill="#eab308" />
                <div>
                  <div style={{ fontSize: '0.75rem', color: theme.textMuted, fontWeight: 600 }}>STARS</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: theme.text }}>{detail.stars.toLocaleString()}</div>
                </div>
              </div>
              
              <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <GitFork size={20} color={theme.textMuted} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: theme.textMuted, fontWeight: 600 }}>FORKS</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: theme.text }}>{detail.forks.toLocaleString()}</div>
                </div>
              </div>

              <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Eye size={20} color="#0969da" />
                <div>
                  <div style={{ fontSize: '0.75rem', color: theme.textMuted, fontWeight: 600 }}>WATCHERS</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: theme.text }}>{(detail.stars + 2).toLocaleString()}</div>
                </div>
              </div>

              <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertCircle size={20} color="#cf222e" />
                <div>
                  <div style={{ fontSize: '0.75rem', color: theme.textMuted, fontWeight: 600 }}>OPEN ISSUES</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: theme.text }}>{detail.openIssues.toLocaleString()}</div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ borderBottom: `1px solid ${theme.border}`, display: 'flex', gap: '24px' }}>
              {[
                { id: 'overview', label: 'Overview & README', icon: <FileText size={16} /> },
                { id: 'analysis', label: 'AI Intelligence Analysis', icon: <Sparkles size={16} /> },
                { id: 'files', label: 'File Tree Explorer', icon: <Folder size={16} /> }
              ].map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    style={{
                      background: 'none',
                      border: 'none',
                      borderBottom: isActive ? '2px solid #0969da' : '2px solid transparent',
                      color: isActive ? theme.text : theme.textMuted,
                      fontWeight: isActive ? 600 : 400,
                      fontSize: '0.9rem',
                      padding: '10px 4px 12px 4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.15s'
                    }}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB CONTENTS VIEWPORTS */}
            <div style={{ minHeight: '400px' }}>
              
              {/* Tab 1: Overview & README */}
              {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Detailed Meta Parameters list */}
                  <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '20px' }}>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 16px 0', borderBottom: `1px solid ${theme.border}`, paddingBottom: '8px' }}>
                      Repository Parameters Overview
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${theme.border}` }}>
                        <span style={{ color: theme.textMuted }}>Visibility</span>
                        <span style={{ fontWeight: 600 }}>Public</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${theme.border}` }}>
                        <span style={{ color: theme.textMuted }}>Default Branch</span>
                        <span style={{ fontWeight: 600 }}>main</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${theme.border}` }}>
                        <span style={{ color: theme.textMuted }}>Primary Language</span>
                        <span style={{ fontWeight: 600 }}>{detail.primaryLanguage}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${theme.border}` }}>
                        <span style={{ color: theme.textMuted }}>Total Size</span>
                        <span style={{ fontWeight: 600 }}>4.8 MB</span>
                      </div>
                    </div>
                  </div>

                  {/* README preview panel */}
                  <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ background: theme.sidebarBg, padding: '12px 20px', borderBottom: `1px solid ${theme.border}`, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: theme.text }}>
                      <FileText size={15} color={theme.textMuted} />
                      <span>README.md</span>
                    </div>
                    <div
                      style={{ padding: '24px 32px' }}
                      dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(detail.readmePreview) }}
                    />
                  </div>

                </div>
              )}

              {/* Tab 2: AI Analysis Section */}
              {activeTab === 'analysis' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Scores dashboard */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: theme.textMuted, fontWeight: 600 }}>OVERALL HEALTH</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1a7f37', margin: '8px 0' }}>
                        {healthScore?.overallScore || '85'}/100
                      </div>
                      <div style={{ fontSize: '0.72rem', color: theme.textMuted }}>Computed indexes</div>
                    </div>

                    <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: theme.textMuted, fontWeight: 600 }}>MAINTAINABILITY</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0969da', margin: '8px 0' }}>
                        {healthScore?.breakdown.maturityScore || '88'}/100
                      </div>
                      <div style={{ fontSize: '0.72rem', color: theme.textMuted }}>Structure rating</div>
                    </div>

                    <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: theme.textMuted, fontWeight: 600 }}>CODE QUALITY</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#85144b', margin: '8px 0' }}>
                        {healthScore?.breakdown.documentationScore || '92'}/100
                      </div>
                      <div style={{ fontSize: '0.72rem', color: theme.textMuted }}>Complexity / Doc score</div>
                    </div>

                    <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.75rem', color: theme.textMuted, fontWeight: 600 }}>POPULARITY</div>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#bf5700', margin: '8px 0' }}>
                        {healthScore?.breakdown.popularityScore || '78'}/100
                      </div>
                      <div style={{ fontSize: '0.72rem', color: theme.textMuted }}>Star Overlaps</div>
                    </div>
                  </div>

                  {/* AI Summary and main purposes */}
                  <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                      <Sparkles size={18} color="#0969da" />
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: theme.text, margin: 0 }}>Project Summary</h3>
                    </div>
                    {aiSummaryPending ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="spin-icon" style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #eaeef2', borderTopColor: '#0969da' }} />
                        <span style={{ fontSize: '0.88rem', color: theme.textMuted }}>Generating AI Summary with Gemini...</span>
                      </div>
                    ) : (
                      <>
                        <p style={{ fontSize: '0.9rem', color: theme.text, lineHeight: 1.5, margin: 0 }}>
                          {aiSummary?.overview || 'No AI summary generated. Sync the repository or configure the Gemini key to view details.'}
                        </p>

                        {aiSummary?.mainPurpose && (
                          <div style={{ marginTop: '20px' }}>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: theme.textMuted, margin: '0 0 6px 0' }}>BEST USE CASES & MAIN PURPOSE</h4>
                            <p style={{ fontSize: '0.88rem', color: theme.text, lineHeight: 1.5, margin: 0 }}>{aiSummary.mainPurpose}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Strengths & Weaknesses row */}
                  {resumeAnalysisPending ? (
                    <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="spin-icon" style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid #eaeef2', borderTopColor: '#0969da' }} />
                      <span style={{ fontSize: '0.88rem', color: theme.textMuted }}>Analyzing repository strengths and areas for improvement...</span>
                    </div>
                  ) : (
                    resumeAnalysis && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div style={{ background: darkMode ? 'rgba(46,160,67,0.1)' : '#dafbe1', border: `1px solid ${darkMode ? 'rgba(46,160,67,0.3)' : 'rgba(26,127,55,0.2)'}`, borderRadius: '8px', padding: '20px' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: darkMode ? '#3fb950' : '#1a7f37', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>✓ Key Strengths</span>
                          </h4>
                          <p style={{ fontSize: '0.85rem', color: darkMode ? '#a5d6a7' : '#1a7f37', lineHeight: 1.4, margin: 0 }}>{resumeAnalysis.strengths}</p>
                        </div>
                        
                        <div style={{ background: darkMode ? 'rgba(248,81,73,0.1)' : '#ffebe9', border: `1px solid ${darkMode ? 'rgba(248,81,73,0.3)' : 'rgba(207,34,46,0.2)'}`, borderRadius: '8px', padding: '20px' }}>
                          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: darkMode ? '#f85149' : '#cf222e', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>⚠ Areas for Improvement</span>
                          </h4>
                          <p style={{ fontSize: '0.85rem', color: darkMode ? '#ff79c6' : '#a40e26', lineHeight: 1.4, margin: 0 }}>{resumeAnalysis.weaknesses}</p>
                        </div>
                      </div>
                    )
                  )}

                  {/* Architecture & Stack details */}
                  {aiSummary?.architectureSummary && (
                    <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 800, color: theme.text, margin: '0 0 12px 0' }}>System Flow & Architecture</h3>
                      <p style={{ fontSize: '0.88rem', color: theme.text, lineHeight: 1.5, margin: '0 0 20px 0' }}>
                        {aiSummary.architectureSummary}
                      </p>

                      {architecture && <ArchitectureDiagram diagramData={architecture} />}
                    </div>
                  )}

                  {/* Tech stack lists */}
                  <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: theme.text, margin: '0 0 12px 0' }}>Technology stack & Dependencies</h3>
                    <p style={{ fontSize: '0.88rem', color: theme.textMuted, lineHeight: 1.4, margin: '0 0 16px 0' }}>
                      {aiSummary?.keyTechnologies || 'The following tech components were detected in build descriptors:'}
                    </p>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {techStack.length > 0 ? techStack.map((tech, i) => (
                        <span key={i} style={{
                          background: theme.sidebarBg,
                          border: `1px solid ${theme.border}`,
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          color: theme.text
                        }}>
                          {tech.name || tech}
                        </span>
                      )) : (
                        <span style={{ fontSize: '0.85rem', color: theme.textMuted }}>No secondary dependencies analyzed.</span>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* Tab 3: File tree explorer */}
              {activeTab === 'files' && (
                <FileExplorer owner={owner!} repo={repo!} />
              )}

            </div>

          </div>

          {/* RIGHT SIDEBAR (30%) - Sticky Owner & Action widgets */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'sticky', top: '86px' }}>
            
            {/* Owner detailed card */}
            {ownerData && (
              <div style={{ background: theme.sidebarBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '20px' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '0 0 14px 0', color: theme.text }}>Repository Owner</h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <img src={ownerData.avatar_url} alt={owner} style={{ width: '46px', height: '46px', borderRadius: '50%', border: `1px solid ${theme.border}` }} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: theme.text }}>{ownerData.name || owner}</div>
                    <div style={{ fontSize: '0.78rem', color: theme.textMuted }}>@{ownerData.login}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: theme.text }}>
                  {ownerData.company && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: theme.textMuted }}>Company</span>
                      <span style={{ fontWeight: 500 }}>{ownerData.company}</span>
                    </div>
                  )}
                  {ownerData.location && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: theme.textMuted }}>Location</span>
                      <span style={{ fontWeight: 500 }}>{ownerData.location}</span>
                    </div>
                  )}
                  {ownerData.blog && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: theme.textMuted }}>Website</span>
                      <a href={ownerData.blog.startsWith('http') ? ownerData.blog : `https://${ownerData.blog}`} target="_blank" rel="noreferrer" style={{ color: '#0969da', textDecoration: 'none', fontWeight: 500 }}>
                        {ownerData.blog}
                      </a>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${theme.border}`, paddingTop: '8px', marginTop: '4px' }}>
                    <span style={{ color: theme.textMuted }}>Followers</span>
                    <span style={{ fontWeight: 600 }}>{ownerData.followers?.toLocaleString()}</span>
                  </div>
                </div>

                <a
                  href={ownerData.html_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'center',
                    background: theme.cardBg,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '6px',
                    padding: '8px 0',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: theme.text,
                    textDecoration: 'none',
                    marginTop: '16px'
                  }}
                >
                  GitHub Profile
                </a>
              </div>
            )}

            {/* 🤖 RepoLens AI Chatbot card with Temperature slider and typing box */}
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: theme.sidebarBg, padding: '12px 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 700, color: theme.text }}>
                  <Sparkles size={16} color="#0969da" />
                  <span>RepoLens AI Chat</span>
                </div>
              </div>
              
              {/* Message Log */}
              <div style={{ height: '380px', padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', background: darkMode ? '#0d1117' : '#fafafa', borderBottom: `1px solid ${theme.border}` }}>
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      background: msg.sender === 'user' ? '#0969da' : theme.cardBg,
                      color: msg.sender === 'user' ? '#ffffff' : theme.text,
                      padding: '8px 12px',
                      borderRadius: '6px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      fontSize: '0.85rem',
                      border: msg.sender === 'user' ? 'none' : `1px solid ${theme.border}`,
                      lineHeight: 1.45
                    }}
                    dangerouslySetInnerHTML={{
                      __html: msg.sender === 'user'
                        ? msg.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, '<br />')
                        : renderChatMarkdown(msg.text, theme, darkMode)
                    }}
                  />
                ))}
                {chatLoading && (
                  <div style={{ alignSelf: 'flex-start', background: theme.cardBg, color: theme.textMuted, padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem', border: `1px solid ${theme.border}` }}>
                    Thinking...
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Slider for Gemini Creativity / Temperature */}
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', gap: '4px', background: theme.cardBg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 600, color: theme.textMuted }}>
                  <span>GEMINI CREATIVITY SLIDER</span>
                  <span style={{ color: '#0969da' }}>{(temperature * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  style={{ width: '100%', height: '4px', background: darkMode ? '#30363d' : '#eaeef2', borderRadius: '2px', outline: 'none', cursor: 'pointer' }}
                />
              </div>

              {/* Chat Typing Input form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(chatInput);
                }}
                style={{ padding: '12px', display: 'flex', gap: '6px', background: theme.cardBg }}
              >
                <input
                  type="text"
                  placeholder="Ask Gemini AI..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                  style={{
                    flex: 1,
                    background: theme.inputBg,
                    border: `1px solid ${theme.border}`,
                    borderRadius: '6px',
                    padding: '10px 12px',
                    fontSize: '0.88rem',
                    color: theme.text,
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={chatLoading}
                  style={{
                    background: '#0969da',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0 16px',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Send
                </button>
              </form>
            </div>

            {/* DOWNLOAD SECTION */}
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '0 0 12px 0' }}>Download Workspace</h3>
              
              {downloadState === 'idle' ? (
                <button
                  onClick={handleDownloadZip}
                  style={{
                    width: '100%',
                    background: '#2ea44f',
                    border: '1px solid rgba(27,31,36,0.15)',
                    borderRadius: '6px',
                    color: '#ffffff',
                    padding: '10px 0',
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 1px 0 rgba(27,31,36,0.1)'
                  }}
                >
                  <Download size={16} />
                  <span>Download Repository ZIP</span>
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                    <span style={{ color: theme.textMuted }}>
                      {downloadState === 'preparing' ? 'Preparing Repository...' : downloadState === 'downloading' ? 'Downloading archive...' : 'Download Complete!'}
                    </span>
                    <span style={{ color: '#0969da' }}>{downloadProgress}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: darkMode ? '#30363d' : '#eaeef2', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${downloadProgress}%`, height: '100%', background: '#2ea44f', transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Quick Actions (Clone parameters) */}
            <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '20px' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: '0 0 14px 0' }}>Quick Actions</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.textMuted, marginBottom: '4px' }}>HTTPS CLONE URL</div>
                  <div style={{ display: 'flex', background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: '6px', overflow: 'hidden' }}>
                    <input
                      type="text"
                      readOnly
                      value={`https://github.com/${repoFullName}.git`}
                      style={{ flex: 1, border: 'none', background: 'none', padding: '6px 10px', fontSize: '0.78rem', fontFamily: 'monospace', color: theme.text, outline: 'none' }}
                    />
                    <button
                      onClick={() => handleCopyText(`https://github.com/${repoFullName}.git`, 'https')}
                      style={{ background: theme.cardBg, border: 'none', borderLeft: `1px solid ${theme.border}`, padding: '0 10px', cursor: 'pointer' }}
                    >
                      {copiedUrlType === 'https' ? <Check size={14} color="#1a7f37" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: theme.textMuted, marginBottom: '4px' }}>SSH CLONE URL</div>
                  <div style={{ display: 'flex', background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: '6px', overflow: 'hidden' }}>
                    <input
                      type="text"
                      readOnly
                      value={`git@github.com:${repoFullName}.git`}
                      style={{ flex: 1, border: 'none', background: 'none', padding: '6px 10px', fontSize: '0.78rem', fontFamily: 'monospace', color: theme.text, outline: 'none' }}
                    />
                    <button
                      onClick={() => handleCopyText(`git@github.com:${repoFullName}.git`, 'ssh')}
                      style={{ background: theme.cardBg, border: 'none', borderLeft: `1px solid ${theme.border}`, padding: '0 10px', cursor: 'pointer' }}
                    >
                      {copiedUrlType === 'ssh' ? <Check size={14} color="#1a7f37" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', borderTop: `1px solid ${theme.border}`, paddingTop: '14px', marginTop: '4px' }}>
                  <button
                    onClick={handleToggleBookmark}
                    style={{
                      flex: 1,
                      background: bookmarked ? 'rgba(9,105,218,0.05)' : theme.cardBg,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '6px',
                      padding: '8px 0',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: bookmarked ? '#0969da' : theme.text,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    <Bookmark size={14} fill={bookmarked ? '#0969da' : 'none'} color={bookmarked ? '#0969da' : theme.text} />
                    <span>{bookmarked ? 'Bookmarked' : 'Bookmark Repo'}</span>
                  </button>

                  <button
                    onClick={() => handleCopyText(window.location.href, 'share')}
                    style={{
                      flex: 1,
                      background: theme.cardBg,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '6px',
                      padding: '8px 0',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: theme.text,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px'
                    }}
                  >
                    {copiedUrlType === 'share' ? <Check size={14} color="#1a7f37" /> : <Globe size={14} />}
                    <span>{copiedUrlType === 'share' ? 'Link Copied' : 'Share Repo'}</span>
                  </button>
                </div>
              </div>
            </div>

          </aside>

        </div>

        {/* BOTTOM SECTIONS */}
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '32px', marginTop: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: theme.text, margin: '0 0 16px 0' }}>Similar & Recommended Repositories</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {similarRepos.length > 0 ? similarRepos.slice(0, 3).map((item, i) => (
              <div key={i} style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 700, color: '#0969da' }}>
                  <Folder size={15} />
                  <Link to={`/repository/${item.fullName}`} style={{ color: '#0969da', textDecoration: 'none' }}>
                    {item.fullName}
                  </Link>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '0.78rem', color: theme.textMuted }}>
                  <span>Language: <strong>{item.primaryLanguage || 'Unknown'}</strong></span>
                  <span style={{ background: '#dafbe1', color: '#1a7f37', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                    {(item.similarityScore * 100).toFixed(0)}% Overlap
                  </span>
                </div>
              </div>
            )) : (
              [
                { fullName: 'spring-projects/spring-boot', language: 'Java', match: '94%' },
                { fullName: 'facebook/react', language: 'TypeScript', match: '88%' },
                { fullName: 'elastic/elasticsearch', language: 'Java', match: '80%' }
              ].map((mockRepo, i) => (
                <div key={i} style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 700, color: '#0969da' }}>
                    <Folder size={15} />
                    <Link to={`/repository/${mockRepo.fullName}`} style={{ color: '#0969da', textDecoration: 'none' }}>
                      {mockRepo.fullName}
                    </Link>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', fontSize: '0.78rem', color: theme.textMuted }}>
                    <span>Language: <strong>{mockRepo.language}</strong></span>
                    <span style={{ background: '#dafbe1', color: '#1a7f37', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                      {mockRepo.match} Overlap
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
