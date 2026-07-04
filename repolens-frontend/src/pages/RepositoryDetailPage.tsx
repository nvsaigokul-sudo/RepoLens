import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, Star, GitFork, AlertCircle, RefreshCw 
} from 'lucide-react';
import { DiagramCanvas } from '../components/architecture/DiagramCanvas';
import { HealthScoreGauge } from '../components/shared/HealthScoreGauge';
import { usePolling } from '../hooks/usePolling';
import { DebugErrorDetails } from '../components/shared/DebugErrorDetails';

interface RepositoryDetail {
  id: number;
  fullName: string;
  description: string;
  stars: number;
  forks: number;
  openIssues: number;
  primaryLanguage: string;
  readmePreview: string;
}

export const RepositoryDetailPage: React.FC = () => {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const navigate = useNavigate();

  const [repository, setRepository] = useState<RepositoryDetail | null>(null);
  const [loadingRepo, setLoadingRepo] = useState(true);
  const [errorRepo, setErrorRepo] = useState<any | null>(null);

  const [activeTab, setActiveTab] = useState<'overview' | 'tech' | 'health' | 'architecture' | 'ai' | 'resume'>('overview');

  // Fetch basic Repository details
  useEffect(() => {
    const fetchRepo = async () => {
      setLoadingRepo(true);
      setErrorRepo(null);
      try {
        const token = localStorage.getItem('repolens_token');
        const res = await axios.get(`/api/v1/repositories/${owner}/${repo}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.data?.success) {
          setRepository(res.data.data);
        } else {
          setErrorRepo('Repository not found.');
        }
      } catch (err: any) {
        setErrorRepo(err);
      } finally {
        setLoadingRepo(false);
      }
    };
    fetchRepo();
  }, [owner, repo]);

  // Tab 1: Tech Stack state
  const [techStack, setTechStack] = useState<any[]>([]);
  const [loadingTech, setLoadingTech] = useState(false);
  useEffect(() => {
    if (activeTab === 'tech' && repository) {
      const fetchTech = async () => {
        setLoadingTech(true);
        try {
          const res = await axios.get(`/api/v1/repositories/${owner}/${repo}/tech-stack`);
          if (res.data?.success) setTechStack(res.data.data);
        } catch (err) {}
        setLoadingTech(false);
      };
      fetchTech();
    }
  }, [activeTab, repository]);

  // Tab 2: Health Score state
  const [healthData, setHealthData] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  useEffect(() => {
    if (activeTab === 'health' && repository) {
      const fetchHealth = async () => {
        setLoadingHealth(true);
        try {
          const res = await axios.get(`/api/v1/repositories/${owner}/${repo}/health-score`);
          if (res.data?.success) setHealthData(res.data.data);
        } catch (err) {}
        setLoadingHealth(false);
      };
      fetchHealth();
    }
  }, [activeTab, repository]);

  // Tab 3: Architecture diagram state
  const [architecture, setArchitecture] = useState<any>(null);
  const [loadingArch, setLoadingArch] = useState(false);
  useEffect(() => {
    if (activeTab === 'architecture' && repository) {
      const fetchArch = async () => {
        setLoadingArch(true);
        try {
          const res = await axios.get(`/api/v1/repositories/${owner}/${repo}/architecture`);
          if (res.data?.success) setArchitecture(res.data.data);
        } catch (err) {}
        setLoadingArch(false);
      };
      fetchArch();
    }
  }, [activeTab, repository]);

  // Tab 4: Async AI Summary status polling
  const fetchSummaryFn = async () => {
    const token = localStorage.getItem('titan_token');
    const res = await axios.get(`/api/v1/repositories/${owner}/${repo}/ai-summary`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return res.data?.data;
  };

  const aiSummaryPoll = usePolling<any>({
    fetchFn: fetchSummaryFn,
    stopCondition: (data) => data.status === 'SUCCESS' || data.status === 'FAILED',
    maxTimeoutMs: 40000
  });

  useEffect(() => {
    if (activeTab === 'ai' && repository) {
      aiSummaryPoll.startPolling();
    }
  }, [activeTab, repository]);

  // Force AI Summary Regeneration
  const handleRegenerateSummary = async () => {
    try {
      const token = localStorage.getItem('titan_token');
      await axios.post(`/api/v1/repositories/${owner}/${repo}/ai-summary/regenerate`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      aiSummaryPoll.startPolling();
    } catch (err) {}
  };

  // Tab 5: Async Resume Analysis status polling
  const fetchResumeFn = async () => {
    const token = localStorage.getItem('titan_token');
    const res = await axios.post(`/api/v1/repositories/${owner}/${repo}/resume-analysis`, {}, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return res.data?.data;
  };

  const resumePoll = usePolling<any>({
    fetchFn: fetchResumeFn,
    stopCondition: (data) => data.status === 'SUCCESS' || data.status === 'FAILED',
    maxTimeoutMs: 40000
  });

  useEffect(() => {
    if (activeTab === 'resume' && repository) {
      resumePoll.startPolling();
    }
  }, [activeTab, repository]);

  // Tab 6: Similar repositories recommendations
  const [similarRepos, setSimilarRepos] = useState<any[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  useEffect(() => {
    if (activeTab === 'overview' && repository) {
      const fetchSimilar = async () => {
        setLoadingSimilar(true);
        try {
          const res = await axios.get(`/api/v1/repositories/${owner}/${repo}/similar`);
          if (res.data?.success) setSimilarRepos(res.data.data);
        } catch (err) {}
        setLoadingSimilar(false);
      };
      fetchSimilar();
    }
  }, [activeTab, repository]);

  if (loadingRepo) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center text-repolens-muted text-sm font-semibold">
        <RefreshCw size={24} className="animate-spin mx-auto mb-4 text-repolens-primary" />
        Analyzing codebase tree structure...
      </div>
    );
  }

  if (errorRepo || !repository) {
    return (
      <div className="max-w-2xl mx-auto mt-24 bg-repolens-card border border-repolens-border p-8 rounded-2xl text-center space-y-6 shadow-xl">
        <div className="flex flex-col items-center">
          <AlertCircle size={40} className="text-red-400 mb-2" />
          <h3 className="text-lg font-bold text-repolens-text">Sync Action Failed</h3>
        </div>
        <DebugErrorDetails error={errorRepo || 'The requested repository could not be reached.'} />
        <div>
          <button onClick={() => navigate('/')} className="text-xs font-bold text-repolens-text bg-repolens-border hover:bg-repolens-card px-6 py-2.5 rounded-xl border border-repolens-border transition-all">
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back button */}
      <button 
        onClick={() => navigate('/')} 
        className="flex items-center space-x-2 text-xs font-semibold text-repolens-muted hover:text-repolens-text transition-colors mb-6"
      >
        <ArrowLeft size={14} />
        <span>Back to Search</span>
      </button>

      {/* Hero Header */}
      <div className="bg-repolens-card border border-repolens-border p-6 rounded-xl mb-8">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-extrabold text-repolens-text">{repository.fullName}</h2>
            <p className="text-xs text-repolens-muted mt-1">{repository.description}</p>
          </div>
          <span className="text-[10px] bg-repolens-primary/10 text-repolens-primary border border-repolens-primary/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
            {repository.primaryLanguage || 'UNKNOWN'}
          </span>
        </div>

        <div className="flex items-center space-x-6 text-xs text-repolens-muted font-medium border-t border-repolens-border pt-4">
          <div className="flex items-center space-x-1">
            <Star size={14} className="text-amber-500" />
            <span>{repository.stars} stars</span>
          </div>
          <div className="flex items-center space-x-1">
            <GitFork size={14} className="text-repolens-primary" />
            <span>{repository.forks} forks</span>
          </div>
          <div className="flex items-center space-x-1">
            <AlertCircle size={14} className="text-red-500" />
            <span>{repository.openIssues} open issues</span>
          </div>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-repolens-border mb-8 overflow-x-auto space-x-6 text-xs font-bold uppercase tracking-wider text-repolens-muted">
        {(['overview', 'tech', 'health', 'architecture', 'ai', 'resume'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 border-b-2 transition-all ${
              activeTab === tab 
                ? 'border-repolens-primary text-repolens-primary' 
                : 'border-transparent hover:text-repolens-text'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab contents */}
      <div className="space-y-6">
        {/* Tab: Overview */}
        {activeTab === 'overview' && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <div className="bg-repolens-card border border-repolens-border p-6 rounded-xl">
                <h3 className="font-bold text-sm text-repolens-text mb-3">README Preview</h3>
                <pre className="text-xs text-repolens-muted bg-repolens-dark p-4 rounded-lg overflow-x-auto max-h-96 whitespace-pre-wrap font-sans">
                  {repository.readmePreview || 'No README file detected at root.'}
                </pre>
              </div>
            </div>

            {/* Side column: Recommendations */}
            <div className="space-y-6">
              <div className="bg-repolens-card border border-repolens-border p-6 rounded-xl">
                <h3 className="font-bold text-sm text-repolens-text mb-4">Similar Repositories</h3>
                {loadingSimilar ? (
                  <p className="text-xs text-repolens-muted animate-pulse">Calculating Jaccard features...</p>
                ) : similarRepos.length > 0 ? (
                  <div className="space-y-4">
                    {similarRepos.map((item, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => navigate(`/repository/${item.fullName}`)}
                        className="bg-repolens-dark border border-repolens-border hover:border-repolens-primary/50 p-4 rounded-lg cursor-pointer transition-colors"
                      >
                        <h4 className="font-bold text-xs text-repolens-text">{item.fullName}</h4>
                        <p className="text-[10px] text-repolens-muted mt-1 truncate">{item.description}</p>
                        <p className="text-[9px] text-repolens-primary font-semibold mt-2">{item.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-repolens-muted">No similar repositories found.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab: Tech Stack */}
        {activeTab === 'tech' && (
          <div className="bg-repolens-card border border-repolens-border p-6 rounded-xl">
            <h3 className="font-bold text-sm text-repolens-text mb-4">Detected Tech Stack</h3>
            {loadingTech ? (
              <p className="text-xs text-repolens-muted">Scanning signatures...</p>
            ) : techStack.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {techStack.map((tech, idx) => (
                  <div key={idx} className="bg-repolens-dark border border-repolens-border p-4 rounded-lg flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-xs text-repolens-text">{tech.technology}</h4>
                      <p className="text-[9px] text-repolens-muted uppercase font-bold tracking-wider mt-0.5">{tech.category}</p>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold">
                      {(tech.confidence * 100).toFixed(0)}% Conf
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-repolens-muted">No technology stack files detected.</p>
            )}
          </div>
        )}

        {/* Tab: Health Score */}
        {activeTab === 'health' && (
          <div>
            {loadingHealth ? (
              <p className="text-xs text-repolens-muted">Calculating metrics...</p>
            ) : healthData ? (
              <HealthScoreGauge overallScore={healthData.overallScore} breakdown={healthData.breakdown} />
            ) : (
              <p className="text-xs text-repolens-muted">Failed to resolve health metrics.</p>
            )}
          </div>
        )}

        {/* Tab: Architecture */}
        {activeTab === 'architecture' && (
          <div>
            {loadingArch ? (
              <p className="text-xs text-repolens-muted">Parsing components...</p>
            ) : architecture ? (
              <DiagramCanvas nodes={architecture.nodes || []} edges={architecture.edges || []} />
            ) : (
              <p className="text-xs text-repolens-muted">Failed to build diagram schema.</p>
            )}
          </div>
        )}

        {/* Tab: AI Summary */}
        {activeTab === 'ai' && (
          <div className="bg-repolens-card border border-repolens-border p-6 rounded-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-sm text-repolens-text">AI Architecture & Purpose Summary</h3>
              {aiSummaryPoll.data?.status === 'SUCCESS' && (
                <button 
                  onClick={handleRegenerateSummary} 
                  className="flex items-center space-x-1.5 text-[10px] bg-repolens-border hover:bg-repolens-primary/10 text-repolens-muted hover:text-repolens-primary px-3 py-1.5 rounded-lg border border-repolens-border transition-colors font-bold uppercase"
                >
                  <RefreshCw size={10} />
                  <span>Regenerate</span>
                </button>
              )}
            </div>

            {aiSummaryPoll.loading && (
              <div className="py-8 text-center text-xs text-repolens-muted font-medium">
                <RefreshCw size={20} className="animate-spin mx-auto mb-3 text-repolens-primary" />
                Gemini is summarizing codebase architecture...
              </div>
            )}

            {aiSummaryPoll.data?.status === 'SUCCESS' && (
              <div className="space-y-6 text-xs text-repolens-muted">
                <div>
                  <h4 className="font-bold text-repolens-text text-xs mb-1">Project Overview</h4>
                  <p className="bg-repolens-dark p-4 rounded-lg leading-relaxed">{aiSummaryPoll.data.overview}</p>
                </div>
                <div>
                  <h4 className="font-bold text-repolens-text text-xs mb-1">Core Purpose</h4>
                  <p className="bg-repolens-dark p-4 rounded-lg leading-relaxed">{aiSummaryPoll.data.mainPurpose}</p>
                </div>
                <div>
                  <h4 className="font-bold text-repolens-text text-xs mb-1">Architecture Overview</h4>
                  <p className="bg-repolens-dark p-4 rounded-lg leading-relaxed">{aiSummaryPoll.data.architectureSummary}</p>
                </div>
                <div>
                  <h4 className="font-bold text-repolens-text text-xs mb-1">Key Technologies Application</h4>
                  <p className="bg-repolens-dark p-4 rounded-lg leading-relaxed">{aiSummaryPoll.data.keyTechnologies}</p>
                </div>
                <div>
                  <h4 className="font-bold text-repolens-text text-xs mb-1">Educational takeaways</h4>
                  <p className="bg-repolens-dark p-4 rounded-lg leading-relaxed">{aiSummaryPoll.data.learningValue}</p>
                </div>
              </div>
            )}

            {aiSummaryPoll.data?.status === 'FAILED' && (
              <p className="text-xs text-red-400">Gemini model call failed. Please check your API key or click Regenerate to try again.</p>
            )}
          </div>
        )}

        {/* Tab: Resume Analysis */}
        {activeTab === 'resume' && (
          <div className="bg-repolens-card border border-repolens-border p-6 rounded-xl">
            <h3 className="font-bold text-sm text-repolens-text mb-6">Resume Value Review</h3>

            {resumePoll.loading && (
              <div className="py-8 text-center text-xs text-repolens-muted font-medium">
                <RefreshCw size={20} className="animate-spin mx-auto mb-3 text-[#10B981]" />
                Technical recruiter evaluates codebase impact...
              </div>
            )}

            {resumePoll.data?.status === 'SUCCESS' && (
              <div className="space-y-6 text-xs text-repolens-muted">
                {/* Score */}
                <div className="flex items-center space-x-3 bg-repolens-dark p-4 rounded-lg max-w-xs border border-repolens-border">
                  <span className="text-3xl font-extrabold text-emerald-400">{resumePoll.data.resumeScore}</span>
                  <div>
                    <h4 className="font-bold text-repolens-text">Career Value Rating</h4>
                    <p className="text-[9px] text-[#94A3B8] uppercase font-bold tracking-wider">Out of 10.0</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-repolens-text text-xs mb-1">Strengths (Resume Highlights)</h4>
                  <pre className="bg-repolens-dark p-4 rounded-lg leading-relaxed font-sans whitespace-pre-wrap">{resumePoll.data.strengths}</pre>
                </div>
                <div>
                  <h4 className="font-bold text-repolens-text text-xs mb-1">Weaknesses</h4>
                  <pre className="bg-repolens-dark p-4 rounded-lg leading-relaxed font-sans whitespace-pre-wrap">{resumePoll.data.weaknesses}</pre>
                </div>
                <div>
                  <h4 className="font-bold text-repolens-text text-xs mb-1">Market Industry Relevance</h4>
                  <p className="bg-repolens-dark p-4 rounded-lg leading-relaxed">{resumePoll.data.industryRelevance}</p>
                </div>
                <div>
                  <h4 className="font-bold text-repolens-text text-xs mb-1">Suggested Improvements</h4>
                  <pre className="bg-repolens-dark p-4 rounded-lg leading-relaxed font-sans whitespace-pre-wrap">{resumePoll.data.suggestedImprovements}</pre>
                </div>
              </div>
            )}

            {resumePoll.data?.status === 'FAILED' && (
              <p className="text-xs text-red-400">Career evaluation failed. Click this tab again to request a recalculation.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
