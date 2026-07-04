import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Search, Star, GitFork, AlertCircle, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { DebugErrorDetails } from '../components/shared/DebugErrorDetails';

interface RepositorySummary {
  id: number;
  fullName: string;
  description: string;
  stars: number;
  forks: number;
  primaryLanguage: string;
}

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [repos, setRepos] = useState<RepositorySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any | null>(null);

  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    // If query is in owner/repo format, navigate directly to index/view it
    if (trimmedQuery.includes('/') && !trimmedQuery.includes(' ')) {
      navigate(`/repository/${trimmedQuery}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Endpoint matches Phase 2 Search API: GET /api/v1/repositories/search?q=query
      const token = localStorage.getItem('repolens_token');
      const response = await axios.get(`/api/v1/repositories/search?q=${encodeURIComponent(query)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (response.data?.success) {
        setRepos(response.data.data.content || []);
      } else {
        setError('Failed to fetch search results.');
      }
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header Profile Section */}
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-emerald-400">
            RepoLens
          </h1>
          <p className="text-xs text-repolens-muted mt-1">AI-Powered Repository Intelligence Platform</p>
        </div>
        
        {user ? (
          <div className="flex items-center space-x-4 bg-repolens-card border border-repolens-border px-4 py-2 rounded-lg">
            <div className="text-right">
              <p className="text-xs font-semibold text-repolens-text">{user.email}</p>
              <p className="text-[10px] text-repolens-muted uppercase font-bold tracking-wider">{user.role}</p>
            </div>
            <button 
              onClick={() => { logout(); navigate('/login'); }} 
              className="p-1.5 hover:text-red-400 text-repolens-muted transition-colors"
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button 
            onClick={() => navigate('/login')} 
            className="text-xs font-bold text-repolens-primary bg-repolens-card hover:bg-repolens-border border border-repolens-border px-4 py-2 rounded-lg transition-colors"
          >
            Login / Register
          </button>
        )}
      </div>

      {/* Hero Title */}
      <div className="text-center mb-12">
        <h2 className="text-4xl font-extrabold tracking-tight text-repolens-text mb-4">
          Discover. Analyze. Evaluate.
        </h2>
        <p className="text-sm text-repolens-muted max-w-lg mx-auto">
          RepoLens goes beyond traditional search by deep-crawling file trees to scan signatures, compute health scores, map architectures, and write Gemini summaries.
        </p>
      </div>

      {/* Search Input Form */}
      <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-12">
        <div className="relative">
          <input
            type="text"
            placeholder="Search GitHub repositories (e.g. spring-projects/spring-boot)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-repolens-card border border-repolens-border focus:border-repolens-primary rounded-xl py-4 pl-12 pr-4 text-sm text-repolens-text placeholder-[#475569] outline-none shadow-xl transition-all"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-repolens-muted" size={20} />
          <button
            type="submit"
            disabled={loading}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-repolens-primary hover:bg-blue-600 text-repolens-text px-4 py-1.5 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Explore'}
          </button>
        </div>
      </form>

      {/* Error Feedback */}
      {error && (
        <div className="max-w-xl mx-auto mb-8 flex items-start space-x-3">
          <AlertCircle className="text-red-400 shrink-0 mt-1" size={18} />
          <DebugErrorDetails error={error} />
        </div>
      )}

      {/* Results List */}
      <div className="grid gap-4 max-w-3xl mx-auto">
        {repos.map((repo) => (
          <div
            key={repo.id}
            onClick={() => navigate(`/repository/${repo.fullName}`)}
            className="bg-repolens-card border border-repolens-border hover:border-repolens-primary/50 p-6 rounded-xl cursor-pointer transition-all shadow-md group"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold text-repolens-text group-hover:text-repolens-primary transition-colors">
                {repo.fullName}
              </h3>
              {repo.primaryLanguage && (
                <span className="text-[10px] bg-repolens-border text-repolens-muted px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  {repo.primaryLanguage}
                </span>
              )}
            </div>
            <p className="text-xs text-repolens-muted mb-4 line-clamp-2">
              {repo.description || 'No description provided by the repository.'}
            </p>
            <div className="flex items-center space-x-6 text-xs text-repolens-muted font-medium">
              <div className="flex items-center space-x-1">
                <Star size={14} className="text-amber-500" />
                <span>{repo.stars} stars</span>
              </div>
              <div className="flex items-center space-x-1">
                <GitFork size={14} className="text-repolens-primary" />
                <span>{repo.forks} forks</span>
              </div>
            </div>
          </div>
        ))}

        {!loading && repos.length === 0 && query && (
          <div className="text-center py-12 text-repolens-muted text-sm font-medium">
            No matching repositories synced. Press Explore to trigger database indexing.
          </div>
        )}
      </div>
    </div>
  );
};
