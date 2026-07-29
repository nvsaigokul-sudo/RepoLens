import React, { useState, useEffect, useRef, Component } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  RefreshCw, FileText, Bell, Star, GitFork, Eye, AlertCircle,
  Globe, Copy, Check, ExternalLink, Bookmark, Download, Sparkles, Folder, Moon, Sun,
  GitBranch, TrendingUp, CheckSquare, Layers, GitCommit, Award, Sliders
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
  industryRelevance?: string;
  suggestedImprovements?: string[];

  portfolioScore?: number;
  portfolioReasoning?: string;
  portfolioContributors?: string[];

  maintainabilityScore?: number;
  maintainabilityReasoning?: string;
  maintainabilityContributors?: string[];

  codeQualityScore?: number;
  codeQualityReasoning?: string;
  codeQualityContributors?: string[];

  overallHealthScore?: number;
  overallHealthReasoning?: string;
  overallHealthContributors?: string[];

  confidenceScore?: number;

  architectureGrade?: string;
  architectureTooltip?: string;
  maintainabilityGrade?: string;
  maintainabilityTooltip?: string;
  documentationGrade?: string;
  documentationTooltip?: string;
  testingGrade?: string;
  testingTooltip?: string;
  securityGrade?: string;
  securityTooltip?: string;
  scalabilityGrade?: string;
  scalabilityTooltip?: string;
  codeOrganizationGrade?: string;
  codeOrganizationTooltip?: string;
  dependencyHealthGrade?: string;
  dependencyHealthTooltip?: string;
  overallGrade?: string;

  healthTimeline?: Array<{ label: string; score: number }>;
  healthTrend?: string;

  dnaArchitecture?: number;
  dnaDocumentation?: number;
  dnaTesting?: number;
  dnaSecurity?: number;
  dnaBackend?: number;
  dnaFrontend?: number;
  dnaInfrastructure?: number;
  dnaDevops?: number;
  dnaDatabase?: number;
  dnaPerformance?: number;
  dnaAi?: number;

  personalityTitle?: string;
  personalityTraits?: string[];
  personalityExplanation?: string;

  riskDocumentation?: string;
  riskDocumentationRec?: string;
  riskSecurity?: string;
  riskSecurityRec?: string;
  riskTesting?: string;
  riskTestingRec?: string;
  riskDependencyUpdates?: string;
  riskDependencyUpdatesRec?: string;
  riskTechnicalDebt?: string;
  riskTechnicalDebtRec?: string;
  riskPerformance?: string;
  riskPerformanceRec?: string;
  riskScalability?: string;
  riskScalabilityRec?: string;
  riskApiStability?: string;
  riskApiStabilityRec?: string;

  codeReviewFeed?: Array<{ status: string; message: string; path: string }>;

  journey?: Array<{ year: string; title: string; description: string }>;

  recruiterBackend?: number;
  recruiterArchitecture?: number;
  recruiterTesting?: number;
  recruiterProduction?: number;
  recruiterDocumentation?: number;
  recruiterReadiness?: number;
  recruiterRecommend?: boolean;
  recruiterReason?: string;

  achievementBadges?: string[];

  roadmapHigh?: string[];
  roadmapMedium?: string[];
  roadmapLow?: string[];
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
  isError?: boolean;
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

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error inside AI Analysis Boundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

const Skeleton = ({ width, height, borderRadius = '4px', darkMode, style = {} }: { width: string; height: string; borderRadius?: string; darkMode: boolean; style?: React.CSSProperties }) => {
  const start = darkMode ? '#21262d' : '#eaeef2';
  const middle = darkMode ? '#30363d' : '#f6f8fa';
  return (
    <div
      className="skeleton-shimmer"
      style={{
        width,
        height,
        borderRadius,
        background: `linear-gradient(90deg, ${start} 25%, ${middle} 37%, ${start} 63%)`,
        backgroundSize: '400% 100%',
        animation: 'shimmer 1.4s ease infinite',
        ...style
      }}
    />
  );
};

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
    if (lang === 'mermaid') {
      const rawCode = code
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
      codeBlocks.push(`<div class="mermaid" style="background: ${darkMode ? '#161b22' : '#f6f8fa'}; border: 1px solid ${theme.border}; padding: 16px; border-radius: 8px; margin: 12px 0; overflow-x: auto; display: block; text-align: center; color: ${theme.text};">${rawCode}</div>`);
    } else {
      codeBlocks.push(`<pre style="background: ${darkMode ? '#161b22' : '#f6f8fa'}; border: 1px solid ${theme.border}; padding: 12px; border-radius: 6px; overflow-x: auto; font-family: monospace; font-size: 0.82rem; margin: 12px 0; color: ${theme.text};"><code class="language-${lang}">${code}</code></pre>`);
    }
    return `:::CODE_BLOCK_PLACEHOLDER_${index}:::`;
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
    escaped = escaped.replace(`:::CODE_BLOCK_PLACEHOLDER_${index}:::`, htmlBlock);
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
  const [aiSummaryError, setAiSummaryError] = useState<string | null>(null);
  const [resumeAnalysisError, setResumeAnalysisError] = useState<string | null>(null);

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // v2 states & comparison handler
  const [selectedMapSection, setSelectedMapSection] = useState<string | null>(null);
  const [compRepoName, setCompRepoName] = useState('');
  const [compHealth, setCompHealth] = useState<any>(null);
  const [compResume, setCompResume] = useState<any>(null);
  const [compLoading, setCompLoading] = useState(false);
  const [compError, setCompError] = useState<string | null>(null);

  const handleCompare = async () => {
    if (!compRepoName.includes('/')) {
      setCompError("Please enter in format: owner/repo");
      return;
    }
    setCompLoading(true);
    setCompError(null);
    try {
      const resHealth = await fetch(`${API_BASE_URL}/api/v1/repositories/${compRepoName}/health-score`, {
        headers: getAuthHeaders()
      });
      const healthJson = await resHealth.json();
      
      const resResume = await fetch(`${API_BASE_URL}/api/v1/repositories/${compRepoName}/resume-analysis`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      const resumeJson = await resResume.json();
      
      if (resHealth.ok && resResume.ok) {
        setCompHealth(healthJson.data);
        setCompResume(resumeJson.data);
      } else {
        setCompError("Failed to fetch comparison repository details. Make sure it exists and is public.");
      }
    } catch (e: any) {
      setCompError("An error occurred during comparison: " + e.message);
    } finally {
      setCompLoading(false);
    }
  };

  // Premium Dark Mode state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('repolens-theme') === 'dark';
  });

  useEffect(() => {
    localStorage.setItem('repolens-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Load and run mermaid library
  useEffect(() => {
    const runMermaid = () => {
      const mermaidObj = (window as any).mermaid;
      if (mermaidObj) {
        try {
          mermaidObj.initialize({
            startOnLoad: false,
            theme: darkMode ? 'dark' : 'default',
            securityLevel: 'loose'
          });
          const newNodes = document.querySelectorAll('.mermaid:not([data-processed="true"])');
          if (newNodes.length > 0) {
            mermaidObj.run({
              nodes: Array.from(newNodes)
            });
          }
        } catch (e) {
          console.error("Mermaid run failed:", e);
        }
      }
    };

    if (!(window as any).mermaid) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10.9.0/dist/mermaid.min.js';
      script.async = true;
      script.onload = () => {
        runMermaid();
      };
      document.body.appendChild(script);
    } else {
      setTimeout(runMermaid, 150);
    }
  }, [darkMode, messages]);

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

  const fetchAiSummary = async (signal: AbortSignal, pollCount = 0) => {
    if (pollCount > 15) {
      setAiSummaryPending(false);
      setAiSummaryError("AI summary request timed out. Please retry.");
      return;
    }
    try {
      setAiSummaryError(null);
      const res = await fetch(`${API_BASE_URL}/api/v1/repositories/${repoFullName}/ai-summary`, {
        signal,
        headers: getAuthHeaders()
      });
      const json = await res.json();
      if (res.status === 202) {
        setAiSummaryPending(true);
        if (!signal.aborted) {
          setTimeout(() => {
            if (!signal.aborted) fetchAiSummary(signal, pollCount + 1);
          }, 3000);
        }
      } else if (res.ok && json.data) {
        setAiSummaryPending(false);
        setAiSummary(json.data);
        if (!detailsCache[repoFullName]) detailsCache[repoFullName] = {};
        detailsCache[repoFullName].aiSummary = json.data;
      } else {
        setAiSummaryPending(false);
        setAiSummaryError(json.error?.message || "Failed to generate AI summary.");
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error(e);
      setAiSummaryPending(false);
      setAiSummaryError("Unable to contact the AI service. Please check your internet connection.");
    }
  };

  const triggerResumeAnalysis = async (signal: AbortSignal, pollCount = 0) => {
    if (pollCount > 15) {
      setResumeAnalysisPending(false);
      setResumeAnalysisError("AI portfolio evaluation timed out. Please retry.");
      return;
    }
    try {
      setResumeAnalysisError(null);
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
            if (!signal.aborted) triggerResumeAnalysis(signal, pollCount + 1);
          }, 3000);
        }
      } else if (res.ok && json.data) {
        setResumeAnalysisPending(false);
        const mappedData = {
          score: json.data.resumeScore || 0,
          strengths: Array.isArray(json.data.strengths) ? json.data.strengths.join('\n') : (json.data.strengths || ''),
          weaknesses: Array.isArray(json.data.weaknesses) ? json.data.weaknesses.join('\n') : (json.data.weaknesses || ''),
          industryRelevance: json.data.industryRelevance || '',
          suggestedImprovements: Array.isArray(json.data.suggestedImprovements) ? json.data.suggestedImprovements : [],
          portfolioScore: json.data.portfolioScore || 0,
          portfolioReasoning: json.data.portfolioReasoning || '',
          portfolioContributors: Array.isArray(json.data.portfolioContributors) ? json.data.portfolioContributors : [],
          maintainabilityScore: json.data.maintainabilityScore || 0,
          maintainabilityReasoning: json.data.maintainabilityReasoning || '',
          maintainabilityContributors: Array.isArray(json.data.maintainabilityContributors) ? json.data.maintainabilityContributors : [],
          codeQualityScore: json.data.codeQualityScore || 0,
          codeQualityReasoning: json.data.codeQualityReasoning || '',
          codeQualityContributors: Array.isArray(json.data.codeQualityContributors) ? json.data.codeQualityContributors : [],
          overallHealthScore: json.data.overallHealthScore || 0,
          overallHealthReasoning: json.data.overallHealthReasoning || '',
          overallHealthContributors: Array.isArray(json.data.overallHealthContributors) ? json.data.overallHealthContributors : [],
          confidenceScore: json.data.confidenceScore || 0,
          architectureGrade: json.data.architectureGrade || 'B',
          architectureTooltip: json.data.architectureTooltip || '',
          maintainabilityGrade: json.data.maintainabilityGrade || 'B',
          maintainabilityTooltip: json.data.maintainabilityTooltip || '',
          documentationGrade: json.data.documentationGrade || 'B',
          documentationTooltip: json.data.documentationTooltip || '',
          testingGrade: json.data.testingGrade || 'B',
          testingTooltip: json.data.testingTooltip || '',
          securityGrade: json.data.securityGrade || 'B',
          securityTooltip: json.data.securityTooltip || '',
          scalabilityGrade: json.data.scalabilityGrade || 'B',
          scalabilityTooltip: json.data.scalabilityTooltip || '',
          codeOrganizationGrade: json.data.codeOrganizationGrade || 'B',
          codeOrganizationTooltip: json.data.codeOrganizationTooltip || '',
          dependencyHealthGrade: json.data.dependencyHealthGrade || 'B',
          dependencyHealthTooltip: json.data.dependencyHealthTooltip || '',
          overallGrade: json.data.overallGrade || 'B',
          healthTimeline: Array.isArray(json.data.healthTimeline) ? json.data.healthTimeline : [],
          healthTrend: json.data.healthTrend || 'Stable',
          dnaArchitecture: json.data.dnaArchitecture || 50,
          dnaDocumentation: json.data.dnaDocumentation || 50,
          dnaTesting: json.data.dnaTesting || 50,
          dnaSecurity: json.data.dnaSecurity || 50,
          dnaBackend: json.data.dnaBackend || 50,
          dnaFrontend: json.data.dnaFrontend || 50,
          dnaInfrastructure: json.data.dnaInfrastructure || 50,
          dnaDevops: json.data.dnaDevops || 50,
          dnaDatabase: json.data.dnaDatabase || 50,
          dnaPerformance: json.data.dnaPerformance || 50,
          dnaAi: json.data.dnaAi || 50,
          personalityTitle: json.data.personalityTitle || 'The Builder',
          personalityTraits: Array.isArray(json.data.personalityTraits) ? json.data.personalityTraits : [],
          personalityExplanation: json.data.personalityExplanation || '',
          riskDocumentation: json.data.riskDocumentation || 'Green',
          riskDocumentationRec: json.data.riskDocumentationRec || '',
          riskSecurity: json.data.riskSecurity || 'Green',
          riskSecurityRec: json.data.riskSecurityRec || '',
          riskTesting: json.data.riskTesting || 'Green',
          riskTestingRec: json.data.riskTestingRec || '',
          riskDependencyUpdates: json.data.riskDependencyUpdates || 'Green',
          riskDependencyUpdatesRec: json.data.riskDependencyUpdatesRec || '',
          riskTechnicalDebt: json.data.riskTechnicalDebt || 'Green',
          riskTechnicalDebtRec: json.data.riskTechnicalDebtRec || '',
          riskPerformance: json.data.riskPerformance || 'Green',
          riskPerformanceRec: json.data.riskPerformanceRec || '',
          riskScalability: json.data.riskScalability || 'Green',
          riskScalabilityRec: json.data.riskScalabilityRec || '',
          riskApiStability: json.data.riskApiStability || 'Green',
          riskApiStabilityRec: json.data.riskApiStabilityRec || '',
          codeReviewFeed: Array.isArray(json.data.codeReviewFeed) ? json.data.codeReviewFeed : [],
          journey: Array.isArray(json.data.journey) ? json.data.journey : [],
          recruiterBackend: json.data.recruiterBackend || 3,
          recruiterArchitecture: json.data.recruiterArchitecture || 3,
          recruiterTesting: json.data.recruiterTesting || 3,
          recruiterProduction: json.data.recruiterProduction || 3,
          recruiterDocumentation: json.data.recruiterDocumentation || 3,
          recruiterReadiness: json.data.recruiterReadiness || 70,
          recruiterRecommend: json.data.recruiterRecommend !== undefined ? json.data.recruiterRecommend : true,
          recruiterReason: json.data.recruiterReason || '',
          achievementBadges: Array.isArray(json.data.achievementBadges) ? json.data.achievementBadges : [],
          roadmapHigh: Array.isArray(json.data.roadmapHigh) ? json.data.roadmapHigh : [],
          roadmapMedium: Array.isArray(json.data.roadmapMedium) ? json.data.roadmapMedium : [],
          roadmapLow: Array.isArray(json.data.roadmapLow) ? json.data.roadmapLow : []
        };
        setResumeAnalysis(mappedData);
        if (!detailsCache[repoFullName]) detailsCache[repoFullName] = {};
        detailsCache[repoFullName].resumeAnalysis = mappedData;
      } else {
        setResumeAnalysisPending(false);
        setResumeAnalysisError(json.error?.message || "Failed to evaluate repository portfolio value.");
      }
    } catch (e: any) {
      if (e.name === 'AbortError') return;
      console.error(e);
      setResumeAnalysisPending(false);
      setResumeAnalysisError("Unable to contact the AI service. Please check your internet connection.");
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
        const errorMsg = json.error?.message || "An unexpected error occurred.";
        setMessages([...updatedMessages, { sender: 'ai', text: errorMsg, isError: true }]);
      }
    } catch (e: any) {
      setMessages([...updatedMessages, { sender: 'ai', text: "Unable to contact the AI service. Please check your internet connection.", isError: true }]);
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
    return renderChatMarkdown(text, theme, darkMode);
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
        maxWidth: '1440px',
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
          gridTemplateColumns: windowWidth >= 1024 ? '62% 38%' : '1fr',
          gap: '24px',
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
                      style={{
                        padding: '24px 32px',
                        lineHeight: 1.6,
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
                        color: theme.text,
                        fontSize: '0.92rem',
                        overflowX: 'auto'
                      }}
                      dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(detail.readmePreview) }}
                    />
                  </div>

                </div>
              )}

              {/* Tab 2: AI Analysis Section */}
              {activeTab === 'analysis' && (
                <ErrorBoundary
                  fallback={
                    <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '32px', textAlign: 'center' }}>
                      <AlertCircle size={40} color="#cf222e" style={{ marginBottom: '16px', display: 'inline-block' }} />
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: theme.text, margin: '0 0 8px 0' }}>
                        Something went wrong while loading the AI Intelligence Analysis
                      </h3>
                      <p style={{ fontSize: '0.88rem', color: theme.textMuted, margin: '0 0 24px 0', lineHeight: 1.4 }}>
                        A rendering error occurred while building the dashboard. You can try refreshing the page or going back.
                      </p>
                      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button
                          onClick={() => window.location.reload()}
                          style={{
                            background: '#0969da',
                            color: '#ffffff',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Reload Page
                        </button>
                        <Link
                          to="/"
                          style={{
                            background: theme.cardBg,
                            border: `1px solid ${theme.border}`,
                            color: theme.text,
                            padding: '8px 16px',
                            fontSize: '0.85rem',
                            textDecoration: 'none',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                        >
                          Back to Discovery
                        </Link>
                      </div>
                    </div>
                  }
                >                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                   {/* AI Executive Summary & Badges banner */}
                   {!resumeAnalysisPending && (
                     <div style={{
                       background: `linear-gradient(135deg, ${darkMode ? 'rgba(9, 105, 218, 0.15)' : 'rgba(9, 105, 218, 0.05)'} 0%, ${theme.cardBg} 100%)`,
                       border: `1px solid ${theme.border}`,
                       borderRadius: '8px',
                       padding: '20px',
                       display: 'flex',
                       flexDirection: 'column',
                       gap: '12px'
                     }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                         <span style={{ fontSize: '0.78rem', color: theme.textMuted, fontWeight: 700, letterSpacing: '0.05em' }}>AI EXECUTIVE REPOSITORY SUMMARY</span>
                         {resumeAnalysis?.achievementBadges && resumeAnalysis.achievementBadges.length > 0 && (
                           <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                             {resumeAnalysis.achievementBadges.map((badge, idx) => (
                               <span key={idx} style={{
                                 fontSize: '0.72rem',
                                 fontWeight: 700,
                                 color: '#2ea043',
                                 background: 'rgba(46,160,67,0.15)',
                                 padding: '2px 8px',
                                 borderRadius: '12px',
                                 border: '1px solid rgba(46,160,67,0.2)'
                               }}>
                                 ★ {badge}
                               </span>
                             ))}
                           </div>
                         )}
                       </div>
                       <p style={{ fontSize: '0.88rem', color: theme.text, lineHeight: 1.55, margin: 0, fontStyle: 'italic' }}>
                         {aiSummary?.overview || 'Analyzing codebase details...'}
                       </p>
                     </div>
                   )}
                  
                   {/* Scores dashboard header */}
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
                     <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: theme.text, margin: 0 }}>AI Intelligence Scoring Dashboard</h3>
                     {resumeAnalysis?.confidenceScore !== undefined && (
                       <span style={{
                         fontSize: '0.75rem',
                         fontWeight: 600,
                         color: '#0969da',
                         background: darkMode ? 'rgba(9, 105, 218, 0.08)' : 'rgba(9, 105, 218, 0.05)',
                         border: `1px solid ${darkMode ? 'rgba(9, 105, 218, 0.2)' : 'rgba(9, 105, 218, 0.15)'}`,
                         padding: '4px 10px',
                         borderRadius: '12px',
                         display: 'flex',
                         alignItems: 'center',
                         gap: '6px'
                       }}>
                         <span>AI Assessment Confidence:</span>
                         <strong>{resumeAnalysis.confidenceScore}%</strong>
                       </span>
                     )}
                   </div>

                   {/* Scores dashboard */}
                   <div style={{ display: 'grid', gridTemplateColumns: windowWidth >= 1024 ? 'repeat(4, 1fr)' : windowWidth >= 768 ? 'repeat(2, 1fr)' : '1fr', gap: '16px' }}>
                     
                     {/* Card 1: OVERALL HEALTH */}
                     <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.2s ease' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <span style={{ fontSize: '0.75rem', color: theme.textMuted, fontWeight: 700, letterSpacing: '0.05em' }}>OVERALL HEALTH</span>
                         <span style={{ fontSize: '0.72rem', color: theme.textMuted, fontWeight: 500 }}>AI Rating</span>
                       </div>
                       <div style={{ fontSize: '2rem', fontWeight: 800, color: '#1a7f37', margin: '4px 0 0 0' }}>
                         {resumeAnalysisPending ? (
                           <Skeleton width="60px" height="32px" darkMode={darkMode} />
                         ) : (
                           `${resumeAnalysis?.overallHealthScore !== undefined ? resumeAnalysis.overallHealthScore : (healthScore?.overallScore || '85')}/100`
                         )}
                       </div>
                       {!resumeAnalysisPending && resumeAnalysis?.overallHealthReasoning && (
                         <p style={{ fontSize: '0.78rem', color: theme.textMuted, lineHeight: 1.45, margin: 0 }}>
                           {resumeAnalysis.overallHealthReasoning}
                         </p>
                       )}
                       {!resumeAnalysisPending && resumeAnalysis?.overallHealthContributors && resumeAnalysis.overallHealthContributors.length > 0 && (
                         <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: 'auto', paddingTop: '8px', borderTop: `1px solid ${theme.border}` }}>
                           {resumeAnalysis.overallHealthContributors.map((c, idx) => {
                             const isPositive = c.trim().startsWith('+');
                             return (
                               <span key={idx} style={{
                                 fontSize: '0.7rem',
                                 fontWeight: 600,
                                 padding: '2px 8px',
                                 borderRadius: '10px',
                                 background: darkMode ? (isPositive ? 'rgba(46,160,67,0.1)' : 'rgba(248,81,73,0.1)') : (isPositive ? '#dafbe1' : '#ffebe9'),
                                 color: darkMode ? (isPositive ? '#3fb950' : '#f85149') : (isPositive ? '#1a7f37' : '#cf222e'),
                                 border: `1px solid ${darkMode ? (isPositive ? 'rgba(46,160,67,0.2)' : 'rgba(248,81,73,0.2)') : (isPositive ? 'rgba(26,127,55,0.15)' : 'rgba(207,34,46,0.15)')}`,
                                 display: 'inline-block'
                               }}>
                                 {c}
                               </span>
                             );
                           })}
                         </div>
                       )}
                     </div>

                     {/* Card 2: MAINTAINABILITY */}
                     <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.2s ease' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <span style={{ fontSize: '0.75rem', color: theme.textMuted, fontWeight: 700, letterSpacing: '0.05em' }}>MAINTAINABILITY</span>
                         <span style={{ fontSize: '0.72rem', color: theme.textMuted, fontWeight: 500 }}>AI Rating</span>
                       </div>
                       <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0969da', margin: '4px 0 0 0' }}>
                         {resumeAnalysisPending ? (
                           <Skeleton width="60px" height="32px" darkMode={darkMode} />
                         ) : (
                           `${resumeAnalysis?.maintainabilityScore !== undefined ? resumeAnalysis.maintainabilityScore : (healthScore?.breakdown?.maturityScore || '88')}/100`
                         )}
                       </div>
                       {!resumeAnalysisPending && resumeAnalysis?.maintainabilityReasoning && (
                         <p style={{ fontSize: '0.78rem', color: theme.textMuted, lineHeight: 1.45, margin: 0 }}>
                           {resumeAnalysis.maintainabilityReasoning}
                         </p>
                       )}
                       {!resumeAnalysisPending && resumeAnalysis?.maintainabilityContributors && resumeAnalysis.maintainabilityContributors.length > 0 && (
                         <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: 'auto', paddingTop: '8px', borderTop: `1px solid ${theme.border}` }}>
                           {resumeAnalysis.maintainabilityContributors.map((c, idx) => {
                             const isPositive = c.trim().startsWith('+');
                             return (
                               <span key={idx} style={{
                                 fontSize: '0.7rem',
                                 fontWeight: 600,
                                 padding: '2px 8px',
                                 borderRadius: '10px',
                                 background: darkMode ? (isPositive ? 'rgba(46,160,67,0.1)' : 'rgba(248,81,73,0.1)') : (isPositive ? '#dafbe1' : '#ffebe9'),
                                 color: darkMode ? (isPositive ? '#3fb950' : '#f85149') : (isPositive ? '#1a7f37' : '#cf222e'),
                                 border: `1px solid ${darkMode ? (isPositive ? 'rgba(46,160,67,0.2)' : 'rgba(248,81,73,0.2)') : (isPositive ? 'rgba(26,127,55,0.15)' : 'rgba(207,34,46,0.15)')}`,
                                 display: 'inline-block'
                               }}>
                                 {c}
                               </span>
                             );
                           })}
                         </div>
                       )}
                     </div>

                     {/* Card 3: CODE QUALITY */}
                     <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.2s ease' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <span style={{ fontSize: '0.75rem', color: theme.textMuted, fontWeight: 700, letterSpacing: '0.05em' }}>CODE QUALITY</span>
                         <span style={{ fontSize: '0.72rem', color: theme.textMuted, fontWeight: 500 }}>AI Rating</span>
                       </div>
                       <div style={{ fontSize: '2rem', fontWeight: 800, color: '#85144b', margin: '4px 0 0 0' }}>
                         {resumeAnalysisPending ? (
                           <Skeleton width="60px" height="32px" darkMode={darkMode} />
                         ) : (
                           `${resumeAnalysis?.codeQualityScore !== undefined ? resumeAnalysis.codeQualityScore : (healthScore?.breakdown?.documentationScore || '92')}/100`
                         )}
                       </div>
                       {!resumeAnalysisPending && resumeAnalysis?.codeQualityReasoning && (
                         <p style={{ fontSize: '0.78rem', color: theme.textMuted, lineHeight: 1.45, margin: 0 }}>
                           {resumeAnalysis.codeQualityReasoning}
                         </p>
                       )}
                       {!resumeAnalysisPending && resumeAnalysis?.codeQualityContributors && resumeAnalysis.codeQualityContributors.length > 0 && (
                         <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: 'auto', paddingTop: '8px', borderTop: `1px solid ${theme.border}` }}>
                           {resumeAnalysis.codeQualityContributors.map((c, idx) => {
                             const isPositive = c.trim().startsWith('+');
                             return (
                               <span key={idx} style={{
                                 fontSize: '0.7rem',
                                 fontWeight: 600,
                                 padding: '2px 8px',
                                 borderRadius: '10px',
                                 background: darkMode ? (isPositive ? 'rgba(46,160,67,0.1)' : 'rgba(248,81,73,0.1)') : (isPositive ? '#dafbe1' : '#ffebe9'),
                                 color: darkMode ? (isPositive ? '#3fb950' : '#f85149') : (isPositive ? '#1a7f37' : '#cf222e'),
                                 border: `1px solid ${darkMode ? (isPositive ? 'rgba(46,160,67,0.2)' : 'rgba(248,81,73,0.2)') : (isPositive ? 'rgba(26,127,55,0.15)' : 'rgba(207,34,46,0.15)')}`,
                                 display: 'inline-block'
                               }}>
                                 {c}
                               </span>
                             );
                           })}
                         </div>
                       )}
                     </div>

                     {/* Card 4: PORTFOLIO SCORE */}
                     <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'all 0.2s ease' }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                         <span style={{ fontSize: '0.75rem', color: theme.textMuted, fontWeight: 700, letterSpacing: '0.05em' }}>PORTFOLIO SCORE</span>
                         <span style={{ fontSize: '0.72rem', color: theme.textMuted, fontWeight: 500 }}>AI Recruiter Rating</span>
                       </div>
                       <div style={{ fontSize: '2rem', fontWeight: 800, color: '#bc8cff', margin: '4px 0 0 0' }}>
                         {resumeAnalysisPending ? (
                           <Skeleton width="60px" height="32px" darkMode={darkMode} />
                         ) : (
                           `${resumeAnalysis?.portfolioScore !== undefined ? Number(resumeAnalysis.portfolioScore).toFixed(1) : (resumeAnalysis?.score !== undefined ? Number(resumeAnalysis.score).toFixed(1) : '8.0')}/10.0`
                         )}
                       </div>
                       {!resumeAnalysisPending && resumeAnalysis?.portfolioReasoning && (
                         <p style={{ fontSize: '0.78rem', color: theme.textMuted, lineHeight: 1.45, margin: 0 }}>
                           {resumeAnalysis.portfolioReasoning}
                         </p>
                       )}
                       {!resumeAnalysisPending && resumeAnalysis?.portfolioContributors && resumeAnalysis.portfolioContributors.length > 0 && (
                         <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: 'auto', paddingTop: '8px', borderTop: `1px solid ${theme.border}` }}>
                           {resumeAnalysis.portfolioContributors.map((c, idx) => {
                             const isPositive = c.trim().startsWith('+');
                             return (
                               <span key={idx} style={{
                                 fontSize: '0.7rem',
                                 fontWeight: 600,
                                 padding: '2px 8px',
                                 borderRadius: '10px',
                                 background: darkMode ? (isPositive ? 'rgba(46,160,67,0.1)' : 'rgba(248,81,73,0.1)') : (isPositive ? '#dafbe1' : '#ffebe9'),
                                 color: darkMode ? (isPositive ? '#3fb950' : '#f85149') : (isPositive ? '#1a7f37' : '#cf222e'),
                                 border: `1px solid ${darkMode ? (isPositive ? 'rgba(46,160,67,0.2)' : 'rgba(248,81,73,0.2)') : (isPositive ? 'rgba(26,127,55,0.15)' : 'rgba(207,34,46,0.15)')}`,
                                 display: 'inline-block'
                               }}>
                                 {c}
                               </span>
                             );
                           })}
                         </div>
                       )}
                     </div>
                   </div>

                   {/* v2: AI Repository Report Card */}
                   {!resumeAnalysisPending && resumeAnalysis?.architectureGrade && (
                     <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '20px' }}>
                       <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: theme.textMuted, margin: '0 0 16px 0', letterSpacing: '0.05em' }}>AI REPOSITORY REPORT CARD</h4>
                       <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px' }}>
                         {[
                           { name: 'Architecture', grade: resumeAnalysis?.architectureGrade || 'B', desc: resumeAnalysis?.architectureTooltip || '' },
                           { name: 'Maintainability', grade: resumeAnalysis?.maintainabilityGrade || 'B', desc: resumeAnalysis?.maintainabilityTooltip || '' },
                           { name: 'Documentation', grade: resumeAnalysis?.documentationGrade || 'B', desc: resumeAnalysis?.documentationTooltip || '' },
                           { name: 'Testing', grade: resumeAnalysis?.testingGrade || 'B', desc: resumeAnalysis?.testingTooltip || '' },
                           { name: 'Security', grade: resumeAnalysis?.securityGrade || 'B', desc: resumeAnalysis?.securityTooltip || '' },
                           { name: 'Scalability', grade: resumeAnalysis?.scalabilityGrade || 'B', desc: resumeAnalysis?.scalabilityTooltip || '' },
                           { name: 'Code Org', grade: resumeAnalysis?.codeOrganizationGrade || 'B', desc: resumeAnalysis?.codeOrganizationTooltip || '' },
                           { name: 'Dependencies', grade: resumeAnalysis?.dependencyHealthGrade || 'B', desc: resumeAnalysis?.dependencyHealthTooltip || '' }
                         ].map((item, idx) => (
                           <div key={idx} title={item.desc} style={{ background: theme.sidebarBg, border: `1px solid ${theme.border}`, borderRadius: '6px', padding: '12px', textAlign: 'center', position: 'relative', cursor: 'help' }}>
                             <div style={{ fontSize: '0.68rem', color: theme.textMuted, fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>{item.name}</div>
                             <div style={{ fontSize: '1.65rem', fontWeight: 800, color: (item.grade || 'B').startsWith('A') ? '#2ea043' : (item.grade || 'B').startsWith('B') ? '#0969da' : '#d29922' }}>
                               {item.grade || 'B'}
                             </div>
                           </div>
                         ))}
                         
                         {/* Overall Grade Card */}
                         <div style={{ background: darkMode ? 'rgba(9, 105, 218, 0.15)' : 'rgba(9, 105, 218, 0.05)', border: '2px solid #0969da', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
                           <div style={{ fontSize: '0.68rem', color: '#0969da', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>OVERALL GRADE</div>
                           <div style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0969da' }}>
                             {resumeAnalysis?.overallGrade || 'B'}
                           </div>
                         </div>
                       </div>
                     </div>
                   )}

                   {/* v2: Health Timeline & DNA Fingerprint */}
                   {!resumeAnalysisPending && resumeAnalysis && (
                     <div style={{ display: 'grid', gridTemplateColumns: windowWidth >= 768 ? '1fr 1fr' : '1fr', gap: '20px' }}>
                       
                       {/* Health Timeline Card */}
                       <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '20px' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                           <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: theme.textMuted, margin: 0, letterSpacing: '0.05em' }}>REPOSITORY HEALTH TIMELINE</h4>
                           <span style={{
                             fontSize: '0.72rem',
                             fontWeight: 700,
                             color: resumeAnalysis?.healthTrend === 'Improving' ? '#2ea043' : '#cf222e',
                             background: resumeAnalysis?.healthTrend === 'Improving' ? 'rgba(46,160,67,0.15)' : 'rgba(248,81,73,0.15)',
                             padding: '2px 8px',
                             borderRadius: '10px'
                           }}>
                             Trend: {resumeAnalysis?.healthTrend || 'Stable'}
                           </span>
                         </div>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                           {resumeAnalysis?.healthTimeline?.map((t, idx) => (
                             <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                               <span style={{ width: '40px', fontSize: '0.78rem', color: theme.textMuted, fontWeight: 600 }}>{String(t.label)}</span>
                               <div style={{ flex: 1, height: '14px', background: theme.sidebarBg, borderRadius: '4px', overflow: 'hidden' }}>
                                 <div style={{ height: '100%', width: `${t.score}%`, background: '#2ea043', transition: 'width 1s ease' }} />
                               </div>
                               <span style={{ width: '30px', fontSize: '0.78rem', color: theme.text, fontWeight: 700, textAlign: 'right' }}>{String(t.score)}</span>
                             </div>
                           ))}
                         </div>
                       </div>

                       {/* DNA Fingerprint Card */}
                       <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '20px' }}>
                         <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: theme.textMuted, margin: '0 0 16px 0', letterSpacing: '0.05em' }}>REPOSITORY DNA VISUALIZATION</h4>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                           {[
                             { name: 'Architecture', val: resumeAnalysis?.dnaArchitecture },
                             { name: 'Documentation', val: resumeAnalysis?.dnaDocumentation },
                             { name: 'Testing', val: resumeAnalysis?.dnaTesting },
                             { name: 'Security', val: resumeAnalysis?.dnaSecurity },
                             { name: 'Backend', val: resumeAnalysis?.dnaBackend },
                             { name: 'Frontend', val: resumeAnalysis?.dnaFrontend },
                             { name: 'Infrastructure', val: resumeAnalysis?.dnaInfrastructure },
                             { name: 'DevOps', val: resumeAnalysis?.dnaDevops },
                             { name: 'Database', val: resumeAnalysis?.dnaDatabase },
                             { name: 'Performance', val: resumeAnalysis?.dnaPerformance },
                             { name: 'AI Capabilities', val: resumeAnalysis?.dnaAi }
                           ].map((dna, idx) => (
                             <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.75rem' }}>
                               <span style={{ width: '95px', color: theme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{dna.name}</span>
                               <div style={{ flex: 1, height: '6px', background: theme.sidebarBg, borderRadius: '3px', overflow: 'hidden' }}>
                                 <div style={{ height: '100%', width: `${dna.val || 0}%`, background: '#0969da' }} />
                               </div>
                               <span style={{ width: '28px', fontWeight: 600, color: theme.text, textAlign: 'right' }}>{dna.val || 0}%</span>
                             </div>
                           ))}
                         </div>
                       </div>

                     </div>
                   )}

                   {/* v2: Repository Personality Card */}
                   {!resumeAnalysisPending && resumeAnalysis?.personalityTitle && (
                     <div style={{
                       background: theme.cardBg,
                       border: `1px solid ${theme.border}`,
                       borderRadius: '8px',
                       padding: '20px',
                       display: 'flex',
                       alignItems: 'center',
                       gap: '20px',
                       flexWrap: 'wrap'
                     }}>
                       <div style={{ fontSize: '2.5rem', flexShrink: 0 }}>
                         {resumeAnalysis.personalityTitle.toLowerCase().includes('architect') ? '🏛️' : '🚀'}
                       </div>
                       <div style={{ flex: 1, minWidth: '220px' }}>
                         <div style={{ fontSize: '0.72rem', color: theme.textMuted, fontWeight: 700, letterSpacing: '0.05em' }}>REPOSITORY PERSONALITY archetype</div>
                         <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: theme.text, margin: '4px 0 8px 0' }}>"{resumeAnalysis.personalityTitle}"</h4>
                         <p style={{ fontSize: '0.85rem', color: theme.text, lineHeight: 1.45, margin: '0 0 10px 0' }}>
                           {resumeAnalysis.personalityExplanation}
                         </p>
                         <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                           {resumeAnalysis.personalityTraits?.map((trait, idx) => (
                             <span key={idx} style={{
                               fontSize: '0.7rem',
                               fontWeight: 600,
                               background: theme.sidebarBg,
                               border: `1px solid ${theme.border}`,
                               padding: '2px 8px',
                               borderRadius: '10px',
                               color: theme.textMuted
                             }}>
                               • {trait}
                             </span>
                           ))}
                         </div>
                       </div>
                     </div>
                   )}

                   {/* Content columns */}
                   <div style={{ display: 'grid', gridTemplateColumns: windowWidth >= 1024 ? '60% 40%' : '1fr', gap: '24px', alignItems: 'start' }}>
                     
                     {/* LEFT COLUMN: Summary & Architecture & Tech Stack */}
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                       
                       {/* Project Summary and main purposes */}
                       <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                           <Sparkles size={18} color="#0969da" />
                           <h3 style={{ fontSize: '1rem', fontWeight: 800, color: theme.text, margin: 0 }}>Project Summary & Main Purpose</h3>
                         </div>
                         {aiSummaryPending ? (
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                             <Skeleton width="100%" height="16px" darkMode={darkMode} />
                             <Skeleton width="90%" height="16px" darkMode={darkMode} />
                             <Skeleton width="95%" height="16px" darkMode={darkMode} />
                             <div style={{ height: '16px' }} />
                             <Skeleton width="180px" height="14px" darkMode={darkMode} style={{ marginBottom: '8px' }} />
                             <Skeleton width="80%" height="16px" darkMode={darkMode} />
                           </div>
                         ) : aiSummaryError ? (
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                             <div style={{ fontSize: '0.88rem', color: darkMode ? '#ff7b72' : '#cf222e' }}>{aiSummaryError}</div>
                             <button
                               onClick={() => {
                                 const controller = new AbortController();
                                 setAiSummaryPending(true);
                                 setAiSummaryError(null);
                                 fetchAiSummary(controller.signal);
                               }}
                               style={{
                                 alignSelf: 'flex-start',
                                 background: '#0969da',
                                 color: '#ffffff',
                                 border: 'none',
                                 padding: '6px 12px',
                                 borderRadius: '6px',
                                 fontSize: '0.8rem',
                                 fontWeight: 600,
                                 cursor: 'pointer'
                               }}
                             >
                               Retry Summary
                             </button>
                           </div>
                         ) : (
                           <>
                             <p style={{ fontSize: '0.9rem', color: theme.text, lineHeight: 1.6, margin: 0 }}>
                               {aiSummary?.overview || 'No AI summary generated. Sync the repository or configure the Gemini key to view details.'}
                             </p>

                             {aiSummary?.mainPurpose && (
                               <div style={{ marginTop: '20px' }}>
                                 <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: theme.textMuted, margin: '0 0 8px 0', letterSpacing: '0.05em' }}>BEST USE CASES & MAIN PURPOSE</h4>
                                 <p style={{ fontSize: '0.88rem', color: theme.text, lineHeight: 1.5, margin: 0 }}>{aiSummary.mainPurpose}</p>
                               </div>
                             )}

                             {aiSummary?.learningValue && (
                               <div style={{ marginTop: '20px' }}>
                                 <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: theme.textMuted, margin: '0 0 8px 0', letterSpacing: '0.05em' }}>LEARNING VALUE & EXPERIENCE</h4>
                                 <p style={{ fontSize: '0.88rem', color: theme.text, lineHeight: 1.5, margin: 0 }}>{aiSummary.learningValue}</p>
                               </div>
                             )}
                           </>
                         )}
                       </div>

                       {/* v2: Interactive Repository Map & Code Review Feed */}
                       {!resumeAnalysisPending && (
                         <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                               <Layers size={18} color="#0969da" />
                               <h3 style={{ fontSize: '1rem', fontWeight: 800, color: theme.text, margin: 0 }}>Interactive Architecture Map</h3>
                             </div>
                             {selectedMapSection && (
                               <button onClick={() => setSelectedMapSection(null)} style={{ background: 'none', border: 'none', color: '#0969da', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                                 Clear Filters
                               </button>
                             )}
                           </div>
                           
                           {/* Architecture flowchart blocks */}
                           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                             {[
                               { key: 'backend', label: 'Backend Layer', subs: ['Controllers', 'Services', 'Repositories'] },
                               { key: 'frontend', label: 'Frontend Layer', subs: ['Components', 'Pages', 'Hooks'] },
                               { key: 'database', label: 'Database Layer', subs: ['Migrations', 'Entities'] },
                               { key: 'tests', label: 'Testing Layer', subs: ['Unit', 'Integration'] }
                             ].map((sec) => (
                               <div key={sec.key} style={{
                                 border: `1px solid ${selectedMapSection === sec.key ? '#0969da' : theme.border}`,
                                 borderRadius: '6px',
                                 background: selectedMapSection === sec.key ? (darkMode ? 'rgba(9,105,218,0.1)' : 'rgba(9,105,218,0.04)') : theme.sidebarBg,
                                 padding: '12px',
                                 textAlign: 'center',
                                 transition: 'all 0.15s ease'
                               }}>
                                 <button onClick={() => setSelectedMapSection(sec.key)} style={{ width: '100%', background: 'none', border: 'none', fontWeight: 700, color: selectedMapSection === sec.key ? '#0969da' : theme.text, fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}>
                                   {sec.label}
                                 </button>
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                                   {sec.subs.map((sub) => (
                                     <button key={sub} onClick={() => setSelectedMapSection(sub.toLowerCase())} style={{
                                       background: selectedMapSection === sub.toLowerCase() ? '#0969da' : theme.cardBg,
                                       border: selectedMapSection === sub.toLowerCase() ? 'none' : `1px solid ${theme.border}`,
                                       borderRadius: '4px',
                                       fontSize: '0.7rem',
                                       color: selectedMapSection === sub.toLowerCase() ? '#ffffff' : theme.textMuted,
                                       padding: '3px 6px',
                                       cursor: 'pointer',
                                       transition: 'all 0.15s'
                                     }}>
                                       {sub}
                                     </button>
                                   ))}
                                 </div>
                               </div>
                             ))}
                           </div>

                           {/* Code Review Feed */}
                           <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: '16px' }}>
                             <div style={{ fontSize: '0.78rem', color: theme.textMuted, fontWeight: 700, marginBottom: '12px', letterSpacing: '0.05em' }}>
                               AI CODE REVIEW FEED {selectedMapSection ? `(FILTERED: ${selectedMapSection.toUpperCase()})` : ''}
                             </div>
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                               {resumeAnalysis?.codeReviewFeed
                                 ?.filter(item => {
                                   if (!selectedMapSection) return true;
                                   const msg = String(item.message).toLowerCase();
                                   const path = String(item.path).toLowerCase();
                                   return msg.includes(selectedMapSection) || path.includes(selectedMapSection) || selectedMapSection.includes(path) || path.includes(selectedMapSection);
                                 })
                                 .map((item, idx) => {
                                   const isCheck = item.status === 'Check';
                                   const isError = item.status === 'Error';
                                   const color = isCheck ? '#2ea043' : isError ? '#cf222e' : '#d29922';
                                   const bg = isCheck ? (darkMode ? 'rgba(46,160,67,0.1)' : '#dafbe1') : isError ? (darkMode ? 'rgba(248,81,73,0.1)' : '#ffebe9') : (darkMode ? 'rgba(187,128,9,0.1)' : '#fff8c5');
                                   return (
                                     <div key={idx} style={{
                                       display: 'flex',
                                       justifyContent: 'space-between',
                                       alignItems: 'center',
                                       padding: '10px 12px',
                                       background: bg,
                                       borderLeft: `4px solid ${color}`,
                                       borderRadius: '0 6px 6px 0',
                                       fontSize: '0.8rem',
                                       flexWrap: 'wrap',
                                       gap: '8px'
                                     }}>
                                       <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                         <span style={{ color, fontWeight: 'bold' }}>{isCheck ? '✓' : '⚠'}</span>
                                         <span style={{ color: theme.text }}>{String(item.message)}</span>
                                       </div>
                                       {item.path && (
                                         <span style={{ fontSize: '0.72rem', color: '#0969da', fontFamily: 'monospace' }}>
                                           {String(item.path)}
                                         </span>
                                       )}
                                     </div>
                                   );
                                 })}
                               {(!resumeAnalysis?.codeReviewFeed || resumeAnalysis.codeReviewFeed.length === 0) && (
                                 <div style={{ padding: '16px', textAlign: 'center', color: theme.textMuted, fontSize: '0.82rem' }}>
                                   No code reviews matching selection.
                                 </div>
                               )}
                             </div>
                           </div>
                         </div>
                       )}

                       {/* v2: Repository Evolution Journey Timeline */}
                       {!resumeAnalysisPending && resumeAnalysis?.journey && resumeAnalysis.journey.length > 0 && (
                         <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                             <GitCommit size={18} color="#0969da" />
                             <h3 style={{ fontSize: '1rem', fontWeight: 800, color: theme.text, margin: 0 }}>Repository Evolution Journey</h3>
                           </div>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative', paddingLeft: '20px', borderLeft: `2px solid ${theme.border}`, marginLeft: '8px' }}>
                             {resumeAnalysis.journey.map((item, idx) => (
                               <div key={idx} style={{ position: 'relative' }}>
                                 <div style={{
                                   position: 'absolute',
                                   left: '-27px',
                                   top: '3px',
                                   width: '12px',
                                   height: '12px',
                                   borderRadius: '50%',
                                   background: '#0969da',
                                   border: `3px solid ${theme.cardBg}`
                                 }} />
                                 <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0969da' }}>{String(item.year)}</span>
                                 <h5 style={{ fontSize: '0.85rem', fontWeight: 700, color: theme.text, margin: '2px 0 4px 0' }}>{String(item.title)}</h5>
                                 <p style={{ fontSize: '0.8rem', color: theme.textMuted, margin: 0, lineHeight: 1.45 }}>{String(item.description)}</p>
                               </div>
                             ))}
                           </div>
                         </div>
                       )}

                       {/* Architecture & Diagram card */}
                       <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                           <GitBranch size={18} color="#0969da" />
                           <h3 style={{ fontSize: '1rem', fontWeight: 800, color: theme.text, margin: 0 }}>System Flow & Architecture</h3>
                         </div>
                         {aiSummaryPending ? (
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                             <Skeleton width="100%" height="16px" darkMode={darkMode} />
                             <Skeleton width="100%" height="220px" borderRadius="6px" darkMode={darkMode} />
                           </div>
                         ) : (
                           <>
                             {aiSummary?.architectureSummary && (
                               <p style={{ fontSize: '0.88rem', color: theme.text, lineHeight: 1.5, margin: '0 0 20px 0' }}>
                                 {aiSummary.architectureSummary}
                               </p>
                             )}

                             {architecture && <ArchitectureDiagram diagramData={architecture} />}
                           </>
                         )}
                       </div>

                       {/* Tech stack card */}
                       <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px' }}>
                         <h3 style={{ fontSize: '1rem', fontWeight: 800, color: theme.text, margin: '0 0 12px 0' }}>Technology stack & Dependencies</h3>
                         <p style={{ fontSize: '0.88rem', color: theme.textMuted, lineHeight: 1.4, margin: '0 0 16px 0' }}>
                           {aiSummary?.keyTechnologies || 'The following tech components were detected in build descriptors:'}
                         </p>

                         <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                           {Array.isArray(techStack) && techStack.length > 0 ? techStack.map((tech, i) => (
                             <span key={i} style={{
                               background: theme.sidebarBg,
                               border: `1px solid ${theme.border}`,
                               borderRadius: '6px',
                               padding: '6px 12px',
                               fontSize: '0.8rem',
                               fontWeight: 600,
                               color: theme.text
                             }}>
                               {typeof tech === 'string' ? tech : (tech?.technology || tech?.name || '')}
                             </span>
                           )) : (
                             <span style={{ fontSize: '0.85rem', color: theme.textMuted }}>No secondary dependencies analyzed.</span>
                           )}
                         </div>
                       </div>

                       {/* v2: Side-by-Side Comparison Mode Card */}
                       <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                           <Sliders size={18} color="#0969da" />
                           <h3 style={{ fontSize: '1rem', fontWeight: 800, color: theme.text, margin: 0 }}>Side-by-Side Repository Comparison</h3>
                         </div>
                         <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                           <input
                             type="text"
                             placeholder="Compare with owner/repo (e.g. mybatis/spring)..."
                             value={compRepoName}
                             onChange={(e) => setCompRepoName(e.target.value)}
                             style={{ flex: 1, padding: '8px 12px', border: `1px solid ${theme.border}`, borderRadius: '6px', background: theme.sidebarBg, color: theme.text, fontSize: '0.82rem', outline: 'none' }}
                           />
                           <button onClick={handleCompare} disabled={compLoading} style={{ background: '#0969da', color: '#ffffff', border: 'none', padding: '8px 16px', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                             {compLoading ? 'Comparing...' : 'Compare'}
                           </button>
                         </div>
                         
                         {compError && <div style={{ fontSize: '0.8rem', color: '#cf222e', marginBottom: '12px' }}>{compError}</div>}
                         
                         {compHealth && compResume && (
                           <div style={{ overflowX: 'auto' }}>
                             <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left', minWidth: '400px' }}>
                               <thead>
                                 <tr style={{ borderBottom: `2px solid ${theme.border}`, color: theme.textMuted }}>
                                   <th style={{ padding: '8px' }}>Metric</th>
                                   <th style={{ padding: '8px' }}>{repoFullName} (Current)</th>
                                   <th style={{ padding: '8px' }}>{compRepoName}</th>
                                 </tr>
                               </thead>
                               <tbody>
                                 <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                                   <td style={{ padding: '8px', fontWeight: 600 }}>Overall Health</td>
                                   <td style={{ padding: '8px', color: '#1a7f37', fontWeight: 700 }}>
                                     {resumeAnalysis?.overallHealthScore !== undefined ? resumeAnalysis.overallHealthScore : (healthScore?.overallScore || '—')}/100
                                   </td>
                                   <td style={{ padding: '8px', color: '#1a7f37', fontWeight: 700 }}>
                                     {compResume.overallHealthScore !== undefined ? compResume.overallHealthScore : (compHealth.overallScore || '—')}/100
                                   </td>
                                 </tr>
                                 <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                                   <td style={{ padding: '8px', fontWeight: 600 }}>Maintainability</td>
                                   <td style={{ padding: '8px', color: '#0969da', fontWeight: 700 }}>
                                     {resumeAnalysis?.maintainabilityScore !== undefined ? resumeAnalysis.maintainabilityScore : (healthScore?.breakdown?.maturityScore || '—')}/100
                                   </td>
                                   <td style={{ padding: '8px', color: '#0969da', fontWeight: 700 }}>
                                     {compResume.maintainabilityScore !== undefined ? compResume.maintainabilityScore : (compHealth.breakdown?.maturityScore || '—')}/100
                                   </td>
                                 </tr>
                                 <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                                   <td style={{ padding: '8px', fontWeight: 600 }}>Code Quality</td>
                                   <td style={{ padding: '8px', color: '#85144b', fontWeight: 700 }}>
                                     {resumeAnalysis?.codeQualityScore !== undefined ? resumeAnalysis.codeQualityScore : (healthScore?.breakdown?.documentationScore || '—')}/100
                                   </td>
                                   <td style={{ padding: '8px', color: '#85144b', fontWeight: 700 }}>
                                     {compResume.codeQualityScore !== undefined ? compResume.codeQualityScore : (compHealth.breakdown?.documentationScore || '—')}/100
                                   </td>
                                 </tr>
                                 <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                                   <td style={{ padding: '8px', fontWeight: 600 }}>Portfolio Score</td>
                                   <td style={{ padding: '8px', color: '#bc8cff', fontWeight: 700 }}>
                                     {resumeAnalysis?.portfolioScore !== undefined ? Number(resumeAnalysis.portfolioScore).toFixed(1) : (resumeAnalysis?.score !== undefined ? Number(resumeAnalysis.score).toFixed(1) : '—')}/10.0
                                   </td>
                                   <td style={{ padding: '8px', color: '#bc8cff', fontWeight: 700 }}>
                                     {compResume.portfolioScore !== undefined ? Number(compResume.portfolioScore).toFixed(1) : (compResume.resumeScore !== undefined ? Number(compResume.resumeScore).toFixed(1) : '—')}/10.0
                                   </td>
                                 </tr>
                                 <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                                   <td style={{ padding: '8px', fontWeight: 600 }}>Personality</td>
                                   <td style={{ padding: '8px' }}>"{resumeAnalysis?.personalityTitle || '—'}"</td>
                                   <td style={{ padding: '8px' }}>"{compResume.personalityTitle || '—'}"</td>
                                 </tr>
                                 <tr>
                                   <td style={{ padding: '8px', fontWeight: 600 }}>Hiring Recommendation</td>
                                   <td style={{ padding: '8px', color: resumeAnalysis?.recruiterRecommend ? '#2ea043' : '#cf222e', fontWeight: 700 }}>
                                     {resumeAnalysis?.recruiterRecommend ? 'YES' : 'NO'}
                                   </td>
                                   <td style={{ padding: '8px', color: compResume.recruiterRecommend ? '#2ea043' : '#cf222e', fontWeight: 700 }}>
                                     {compResume.recruiterRecommend ? 'YES' : 'NO'}
                                   </td>
                                 </tr>
                               </tbody>
                             </table>
                           </div>
                         )}
                       </div>

                     </div>

                     {/* RIGHT COLUMN: Portfolio & Resume Value */}
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                       
                       {/* v2: Recruiter / Hiring Perspective Card */}
                       {!resumeAnalysisPending && resumeAnalysis && resumeAnalysis.recruiterBackend !== undefined && (
                         <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <Award size={18} color="#bc8cff" />
                             <h3 style={{ fontSize: '1.02rem', fontWeight: 800, color: theme.text, margin: 0 }}>Recruiter perspective</h3>
                           </div>
                           
                           {/* Stars ratings */}
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                             {[
                               { label: 'Backend Skill', score: resumeAnalysis.recruiterBackend },
                               { label: 'Architecture', score: resumeAnalysis.recruiterArchitecture },
                               { label: 'Testing', score: resumeAnalysis.recruiterTesting },
                               { label: 'Production Readiness', score: resumeAnalysis.recruiterProduction },
                               { label: 'Documentation', score: resumeAnalysis.recruiterDocumentation }
                             ].map((skill, idx) => (
                               <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                                 <span style={{ color: theme.textMuted }}>{skill.label}</span>
                                 <span style={{ color: '#d29922', letterSpacing: '2px', fontWeight: 'bold' }}>
                                   {'★'.repeat(skill.score || 0)}{'☆'.repeat(5 - (skill.score || 0))}
                                 </span>
                               </div>
                             ))}
                           </div>
                           
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${theme.border}`, paddingTop: '12px' }}>
                             <span style={{ fontSize: '0.82rem', color: theme.textMuted }}>Interview Readiness:</span>
                             <strong style={{ fontSize: '0.98rem', color: '#0969da' }}>{resumeAnalysis.recruiterReadiness}%</strong>
                           </div>
                           
                           <div style={{
                             background: resumeAnalysis.recruiterRecommend ? (darkMode ? 'rgba(46,160,67,0.1)' : '#dafbe1') : (darkMode ? 'rgba(248,81,73,0.1)' : '#ffebe9'),
                             border: `1px solid ${resumeAnalysis.recruiterRecommend ? '#2ea043' : '#cf222e'}40`,
                             borderRadius: '6px',
                             padding: '12px'
                           }}>
                             <div style={{ fontSize: '0.8rem', fontWeight: 700, color: theme.text }}>
                               Recommend on Resume? <strong style={{ color: resumeAnalysis.recruiterRecommend ? '#2ea043' : '#cf222e' }}>{resumeAnalysis.recruiterRecommend ? 'YES' : 'NO'}</strong>
                             </div>
                             <p style={{ fontSize: '0.78rem', color: theme.textMuted, margin: '6px 0 0 0', lineHeight: 1.45 }}>
                               {resumeAnalysis.recruiterReason}
                             </p>
                           </div>
                         </div>
                       )}

                       {/* v2: AI Risk Radar Panel */}
                       {!resumeAnalysisPending && resumeAnalysis && (
                         <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px' }}>
                           <h3 style={{ fontSize: '1rem', fontWeight: 800, color: theme.text, margin: '0 0 16px 0' }}>AI Risk Radar</h3>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                             {[
                               { name: 'Documentation', status: resumeAnalysis.riskDocumentation, rec: resumeAnalysis.riskDocumentationRec },
                               { name: 'Security', status: resumeAnalysis.riskSecurity, rec: resumeAnalysis.riskSecurityRec },
                               { name: 'Testing', status: resumeAnalysis.riskTesting, rec: resumeAnalysis.riskTestingRec },
                               { name: 'Dependency Updates', status: resumeAnalysis.riskDependencyUpdates, rec: resumeAnalysis.riskDependencyUpdatesRec },
                               { name: 'Technical Debt', status: resumeAnalysis.riskTechnicalDebt, rec: resumeAnalysis.riskTechnicalDebtRec },
                               { name: 'Performance', status: resumeAnalysis.riskPerformance, rec: resumeAnalysis.riskPerformanceRec },
                               { name: 'Scalability', status: resumeAnalysis.riskScalability, rec: resumeAnalysis.riskScalabilityRec },
                               { name: 'API Stability', status: resumeAnalysis.riskApiStability, rec: resumeAnalysis.riskApiStabilityRec }
                             ].map((risk, idx) => {
                               const color = risk.status === 'Red' ? '#cf222e' : risk.status === 'Yellow' ? '#d29922' : '#2ea043';
                               const bg = risk.status === 'Red' ? (darkMode ? 'rgba(248,81,73,0.1)' : '#ffebe9') : risk.status === 'Yellow' ? (darkMode ? 'rgba(187,128,9,0.1)' : '#fff8c5') : (darkMode ? 'rgba(46,160,67,0.1)' : '#dafbe1');
                               return (
                                 <div key={idx} style={{ display: 'flex', gap: '8px', background: bg, border: `1px solid ${color}30`, borderRadius: '6px', padding: '10px', alignItems: 'flex-start' }}>
                                   <span style={{ fontSize: '0.9rem', color, lineHeight: 1 }}>●</span>
                                   <div style={{ flex: 1 }}>
                                     <div style={{ fontSize: '0.78rem', fontWeight: 700, color: theme.text }}>{risk.name}</div>
                                     <div style={{ fontSize: '0.72rem', color: theme.textMuted, marginTop: '2px', lineHeight: 1.35 }}>
                                       {risk.rec || 'No risk issues detected.'}
                                     </div>
                                   </div>
                                 </div>
                               );
                             })}
                           </div>
                         </div>
                       )}

                       {/* Industry relevance */}
                       <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                           <TrendingUp size={18} color="#bf5700" />
                           <h3 style={{ fontSize: '1rem', fontWeight: 800, color: theme.text, margin: 0 }}>Industry & Job Relevance</h3>
                         </div>
                         {resumeAnalysisPending ? (
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                             <Skeleton width="100%" height="16px" darkMode={darkMode} />
                             <Skeleton width="92%" height="16px" darkMode={darkMode} />
                             <Skeleton width="40%" height="16px" darkMode={darkMode} />
                           </div>
                         ) : resumeAnalysisError ? (
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                             <div style={{ fontSize: '0.88rem', color: darkMode ? '#ff7b72' : '#cf222e' }}>{resumeAnalysisError}</div>
                             <button
                               onClick={() => {
                                 const controller = new AbortController();
                                 setResumeAnalysisPending(true);
                                 setResumeAnalysisError(null);
                                 triggerResumeAnalysis(controller.signal);
                               }}
                               style={{
                                 alignSelf: 'flex-start',
                                 background: '#0969da',
                                 color: '#ffffff',
                                 border: 'none',
                                 padding: '6px 12px',
                                 borderRadius: '6px',
                                 fontSize: '0.8rem',
                                 fontWeight: 600,
                                 cursor: 'pointer'
                               }}
                             >
                               Retry Evaluation
                             </button>
                           </div>
                         ) : (
                           <p style={{ fontSize: '0.88rem', color: theme.text, lineHeight: 1.5, margin: 0 }}>
                             {resumeAnalysis?.industryRelevance || 'No industry relevance analysis available yet. Force a re-sync or check the Gemini API configuration.'}
                           </p>
                         )}
                       </div>

                       {/* Strengths & Weaknesses row */}
                       {resumeAnalysisPending ? (
                         <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                             <Skeleton width="140px" height="14px" darkMode={darkMode} />
                             <Skeleton width="100%" height="16px" darkMode={darkMode} />
                             <Skeleton width="90%" height="16px" darkMode={darkMode} />
                           </div>
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                             <Skeleton width="140px" height="14px" darkMode={darkMode} />
                             <Skeleton width="100%" height="16px" darkMode={darkMode} />
                             <Skeleton width="90%" height="16px" darkMode={darkMode} />
                           </div>
                         </div>
                       ) : resumeAnalysisError ? (
                         null
                       ) : (
                         resumeAnalysis && (
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                             <div style={{ background: darkMode ? 'rgba(46,160,67,0.1)' : '#dafbe1', border: `1px solid ${darkMode ? 'rgba(46,160,67,0.3)' : 'rgba(26,127,55,0.2)'}`, borderRadius: '8px', padding: '20px' }}>
                               <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: darkMode ? '#3fb950' : '#1a7f37', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                 <span>✓ Key Strengths</span>
                               </h4>
                               <p style={{ fontSize: '0.85rem', color: darkMode ? '#a5d6a7' : '#1a7f37', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-line' }}>{resumeAnalysis.strengths}</p>
                             </div>
                             
                             <div style={{ background: darkMode ? 'rgba(248,81,73,0.1)' : '#ffebe9', border: `1px solid ${darkMode ? 'rgba(248,81,73,0.3)' : 'rgba(207,34,46,0.2)'}`, borderRadius: '8px', padding: '20px' }}>
                               <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: darkMode ? '#f85149' : '#cf222e', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                 <span>⚠ Areas for Improvement</span>
                               </h4>
                               <p style={{ fontSize: '0.85rem', color: darkMode ? '#ff9b9b' : '#a40e26', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-line' }}>{resumeAnalysis.weaknesses}</p>
                             </div>
                           </div>
                         )
                       )}

                       {/* Suggested Improvements Priority Roadmap */}
                       <div style={{ background: theme.cardBg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '24px' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                           <CheckSquare size={18} color="#bc8cff" />
                           <h3 style={{ fontSize: '1rem', fontWeight: 800, color: theme.text, margin: 0 }}>AI Improvement Roadmap</h3>
                         </div>
                         {resumeAnalysisPending ? (
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                             <Skeleton width="100%" height="16px" darkMode={darkMode} style={{ marginBottom: '4px' }} />
                             <Skeleton width="95%" height="16px" darkMode={darkMode} />
                           </div>
                         ) : (
                           <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                             
                             {/* High */}
                             {resumeAnalysis?.roadmapHigh && resumeAnalysis.roadmapHigh.length > 0 ? (
                               <div>
                                 <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#cf222e', marginBottom: '6px' }}>▲ HIGH PRIORITY</div>
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                   {resumeAnalysis.roadmapHigh.map((r, i) => (
                                     <div key={i} style={{ fontSize: '0.82rem', color: theme.text, display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                       <span>•</span> <span>{r}</span>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             ) : null}

                             {/* Medium */}
                             {resumeAnalysis?.roadmapMedium && resumeAnalysis.roadmapMedium.length > 0 ? (
                               <div>
                                 <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#d29922', marginBottom: '6px' }}>■ MEDIUM PRIORITY</div>
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                   {resumeAnalysis.roadmapMedium.map((r, i) => (
                                     <div key={i} style={{ fontSize: '0.82rem', color: theme.text, display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                       <span>•</span> <span>{r}</span>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             ) : null}

                             {/* Low */}
                             {resumeAnalysis?.roadmapLow && resumeAnalysis.roadmapLow.length > 0 ? (
                               <div>
                                 <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2ea043', marginBottom: '6px' }}>▼ LOW PRIORITY</div>
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                   {resumeAnalysis.roadmapLow.map((r, i) => (
                                     <div key={i} style={{ fontSize: '0.82rem', color: theme.text, display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                       <span>•</span> <span>{r}</span>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             ) : null}

                             {(!resumeAnalysis?.roadmapHigh && !resumeAnalysis?.roadmapMedium && !resumeAnalysis?.roadmapLow) && (
                               <div style={{ fontSize: '0.88rem', color: theme.textMuted }}>No roadmap actions detected.</div>
                             )}

                           </div>
                         )}
                       </div>

                     </div>

                   </div>

                  </div>
                </ErrorBoundary>
              )}

              {/* Tab 3: File tree explorer */}
              {activeTab === 'files' && (
                <FileExplorer owner={owner!} repo={repo!} />
              )}

            </div>

          </div>

          {/* RIGHT SIDEBAR (30%) - Sticky Owner & Action widgets */}
          <aside style={{ display: 'flex', flexDirection: 'column', gap: '20px', position: windowWidth >= 1024 ? 'sticky' : 'static', top: '86px', width: '100%' }}>
            
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
              <div style={{ height: 'min(500px, 55vh)', padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', background: darkMode ? '#0d1117' : '#fafafa', borderBottom: `1px solid ${theme.border}` }}>
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      background: msg.isError 
                        ? (darkMode ? 'rgba(248, 81, 73, 0.1)' : '#ffebe9') 
                        : (msg.sender === 'user' ? '#0969da' : theme.cardBg),
                      color: msg.isError 
                        ? (darkMode ? '#ff7b72' : '#cf222e') 
                        : (msg.sender === 'user' ? '#ffffff' : theme.text),
                      padding: '10px 14px',
                      borderRadius: '6px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                      fontSize: '0.85rem',
                      border: msg.isError 
                        ? `1px solid ${darkMode ? 'rgba(248, 81, 73, 0.4)' : '#ff8585'}` 
                        : (msg.sender === 'user' ? 'none' : `1px solid ${theme.border}`),
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
              <div style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', gap: '6px', background: theme.cardBg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 600, color: theme.textMuted }}>
                  <span>EXPLANATION DEPTH & CREATIVITY</span>
                  <span style={{ color: '#0969da', fontWeight: 700 }}>
                    {(temperature * 100).toFixed(0)}% (
                    {temperature <= 0.25 ? 'L1: Non-Technical' :
                     temperature <= 0.50 ? 'L2: Student/Beginner' :
                     temperature <= 0.75 ? 'L3: Developer' :
                     'L4: Senior Architect'}
                    )
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  style={{ width: '100%', height: '4px', background: darkMode ? '#30363d' : '#eaeef2', borderRadius: '2px', outline: 'none', cursor: 'pointer' }}
                />
              </div>

              {/* Chat suggestions pills */}
              <div style={{ padding: '10px 14px 4px 14px', display: 'flex', flexWrap: 'wrap', gap: '6px', background: theme.cardBg }}>
                {[
                  "Explain architecture",
                  "Explain auth flow",
                  "Suggest improvements",
                  "Find security risks",
                  "How to run tests"
                ].map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setChatInput(sug);
                      handleSendMessage(sug);
                    }}
                    disabled={chatLoading}
                    style={{
                      background: darkMode ? 'rgba(9, 105, 218, 0.1)' : 'rgba(9, 105, 218, 0.05)',
                      border: `1px solid ${darkMode ? 'rgba(9, 105, 218, 0.2)' : 'rgba(9, 105, 218, 0.15)'}`,
                      borderRadius: '12px',
                      padding: '3px 10px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      color: '#0969da',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    {sug}
                  </button>
                ))}
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
            {Array.isArray(similarRepos) && similarRepos.length > 0 ? similarRepos.slice(0, 3).map((item, i) => (
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