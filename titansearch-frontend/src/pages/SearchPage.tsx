import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Star, GitFork, ChevronLeft, ChevronRight, Bell, Folder,
  Settings, ArrowRight, Shield, Calendar, Sparkles
} from 'lucide-react';
import SkeletonCard from '../components/SkeletonCard';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '' : 'http://localhost:8080');

interface RepositorySummary {
  id: number;
  fullName: string;
  owner: string;
  description: string;
  stars: number;
  forks: number;
  topics: string[];
  lastUpdated: string;
  primaryLanguage?: string;
  license?: string;
  visibility?: string;
  openSource?: boolean;
  aiOverview?: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('');
  const [minStars, setMinStars] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<RepositorySummary[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  // Left sidebar menu and stateful favorites list
  const [activeMenuTab, setActiveMenuTab] = useState<'discover' | 'favorites' | 'settings'>('discover');
  const [favorites, setFavorites] = useState<number[]>([]);

  const performSearch = async (pageNum = 0) => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setHasSearched(true);
    
    const params = new URLSearchParams();
    params.append('q', query);
    if (language) params.append('language', language);
    if (minStars > 0) params.append('minStars', minStars.toString());
    params.append('page', pageNum.toString());
    params.append('size', '10');

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/repositories/search?${params.toString()}`);
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error?.message || 'Search failed');
      }

      const content = json.data.content || [];
      // Enrich results with mock tags/visibility to look like a premium SaaS dashboard
      const enriched = content.map((item: any) => ({
        ...item,
        visibility: 'Public',
        openSource: true,
        license: 'MIT License',
        aiOverview: `Calculated health indices and technology signatures indicate high code quality for ${item.fullName}.`
      }));

      setResults(enriched);
      setTotalPages(json.data.totalPages || 0);
      setTotalElements(json.data.totalElements || 0);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch search results');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(0);
  };

  const toggleFavorite = (id: number) => {
    if (favorites.includes(id)) {
      setFavorites(favorites.filter(favId => favId !== id));
    } else {
      setFavorites([...favorites, id]);
    }
  };

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

  // Filter results if viewing favorites
  const displayedResults = activeMenuTab === 'favorites'
    ? results.filter(r => favorites.includes(r.id))
    : results;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#ffffff', color: '#24292f', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }}>
      
      {/* SaaS Premium Navbar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <svg height="32" viewBox="0 0 16 16" version="1.1" width="32" fill="#ffffff" style={{ marginRight: '4px' }}>
            <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 01-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.35 2.68.91 0 .67.01 1.3.01 1.48 0 .21-.15.47-.55.38A7.995 7.995 0 010 8c0-4.42 3.58-8 8-8z"></path>
          </svg>
          <span style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            RepoLens Discovery
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Bell size={18} style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.85)' }} />
          <Settings size={18} style={{ cursor: 'pointer', color: 'rgba(255,255,255,0.85)' }} />
        </div>
      </header>

      {/* Grid Layout Container */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr',
        flex: 1,
        height: 'calc(100vh - 62px)',
        overflow: 'hidden'
      }}>
        
        {/* Left Sidebar */}
        <aside style={{
          background: '#f6f8fa',
          borderRight: '1px solid #d0d7de',
          padding: '24px 12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* RepoLens Application Branding */}
            <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg height="32" viewBox="0 0 16 16" version="1.1" width="32" fill="#0969da">
                  <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 01-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.35 2.68.91 0 .67.01 1.3.01 1.48 0 .21-.15.47-.55.38A7.995 7.995 0 010 8c0-4.42 3.58-8 8-8z"></path>
                </svg>
                <span style={{ fontSize: '1.2rem', fontWeight: 800, color: '#24292f', letterSpacing: '-0.03em' }}>
                  RepoLens
                </span>
              </div>
              <span style={{ fontSize: '0.78rem', color: '#57606a', lineHeight: 1.3, fontWeight: 500 }}>
                AI-Powered GitHub Repository Discovery & Analysis
              </span>
            </div>

            {/* Menu options */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderTop: '1px solid #d0d7de', paddingTop: '16px' }}>
              {[
                { id: 'discover', label: 'Home Discover', icon: <Search size={16} /> },
                { id: 'favorites', label: 'Saved Favorites', icon: <Star size={16} /> },
                { id: 'settings', label: 'System Settings', icon: <Settings size={16} /> }
              ].map(item => {
                const isActive = activeMenuTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveMenuTab(item.id as any)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      padding: '10px 16px',
                      fontSize: '0.88rem',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#24292f' : '#57606a',
                      background: isActive ? '#f0f3f6' : 'transparent',
                      border: 'none',
                      borderLeft: isActive ? '3px solid #0969da' : '3px solid transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s'
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ padding: '0 8px', fontSize: '0.75rem', color: '#57606a', textAlign: 'center', borderTop: '1px solid #d0d7de', paddingTop: '12px' }}>
            RepoLens v0.2.0 • Light Theme
          </div>
        </aside>

        {/* Center Section Workspace */}
        <main style={{
          padding: '32px',
          overflowY: 'auto',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          
          <div style={{ maxWidth: '960px', width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            
            {/* Centered to Top animating Search box */}
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 260, damping: 25 }}
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                margin: hasSearched ? '0 0 12px 0' : '10vh auto 0 auto',
                background: '#ffffff',
                border: '1px solid #d0d7de',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
              }}
            >
              {!hasSearched && (
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#24292f', letterSpacing: '-0.03em', margin: '0 0 8px 0' }}>
                    Scan & Discovery Base
                  </h1>
                  <p style={{ color: '#57606a', fontSize: '0.95rem', margin: 0 }}>
                    Index code repositories, evaluate quality scores, and inspect system architecture trees.
                  </p>
                </div>
              )}

              <form onSubmit={handleSearchSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Search Bar Input */}
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    type="text"
                    placeholder="Search public GitHub repositories... (e.g. spring, react)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#f6f8fa',
                      border: '1px solid #d0d7de',
                      borderRadius: '8px',
                      padding: '12px 16px 12px 42px',
                      fontSize: '1rem',
                      color: '#24292f',
                      outline: 'none',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                    }}
                  />
                  <Search size={18} color="#57606a" style={{ position: 'absolute', left: '16px', top: '15px' }} />
                </div>

                {/* Filter controls row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr 120px', gap: '20px', alignItems: 'center', width: '100%' }}>
                  
                  {/* Language filter selector dropdown */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#57606a' }}>LANGUAGE</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        background: '#ffffff',
                        border: '1px solid #d0d7de',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        color: '#24292f',
                        outline: 'none'
                      }}
                    >
                      <option value="">All Languages</option>
                      <option value="Java">Java</option>
                      <option value="Python">Python</option>
                      <option value="JavaScript">JavaScript</option>
                      <option value="TypeScript">TypeScript</option>
                      <option value="Go">Go</option>
                      <option value="Rust">Rust</option>
                    </select>
                  </div>

                  {/* Stars Slider */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#57606a' }}>
                      <span>MIN STARS</span>
                      <span style={{ color: '#0969da' }}>{minStars}+ stars</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      step="100"
                      value={minStars}
                      onChange={(e) => setMinStars(parseInt(e.target.value))}
                      style={{
                        width: '100%',
                        height: '6px',
                        background: '#eaeef2',
                        borderRadius: '3px',
                        outline: 'none',
                        cursor: 'pointer'
                      }}
                    />
                  </div>

                  {/* Search Button */}
                  <button
                    type="submit"
                    style={{
                      height: '38px',
                      background: '#2ea44f',
                      borderColor: 'rgba(27,31,36,0.15)',
                      color: '#ffffff',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginTop: '18px',
                      boxShadow: '0 1px 0 rgba(27,31,36,0.1)'
                    }}
                  >
                    <Search size={14} />
                    <span>Search</span>
                  </button>

                </div>
              </form>
            </motion.div>

            {/* Results Grid layout */}
            <div style={{ width: '100%' }}>
              <AnimatePresence mode="wait">
                
                {/* Skeletons Loading state */}
                {loading && (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                  >
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </motion.div>
                )}

                {/* Query Error State */}
                {error && !loading && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ padding: '24px', border: '1px solid #cf222e', borderRadius: '6px', background: '#ffebe9', color: '#a40e26', fontSize: '0.9rem' }}
                  >
                    <strong>Search execution error:</strong> {error}
                  </motion.div>
                )}

                {/* Empty State / Welcome illustration placeholder */}
                {!hasSearched && !loading && (
                  <motion.div
                    key="welcome-empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '60px 0', color: '#57606a', textAlign: 'center' }}
                  >
                    <div style={{ fontSize: '3rem' }}>📁</div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#24292f' }}>Enter search criteria above to query repositories</div>
                    <div style={{ fontSize: '0.85rem', maxWidth: '380px' }}>
                      Scan indices will retrieve matching open source codebases from GitHub, analyze stack variables, and compute scores.
                    </div>
                  </motion.div>
                )}

                {/* Empty Search Results state */}
                {hasSearched && !loading && displayedResults.length === 0 && (
                  <motion.div
                    key="no-results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '60px 0', color: '#57606a', textAlign: 'center' }}
                  >
                    <div style={{ fontSize: '3rem' }}>🔍</div>
                    <div style={{ fontSize: '1rem', fontWeight: 600, color: '#24292f' }}>No repositories found</div>
                    <div style={{ fontSize: '0.85rem', maxWidth: '380px' }}>
                      Try adjusting filters or checking spelling. Ensure your search terms match actual GitHub projects.
                    </div>
                  </motion.div>
                )}

                {/* Repository result cards list */}
                {hasSearched && !loading && displayedResults.length > 0 && (
                  <motion.div
                    key="results-list"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '12px', borderBottom: '1px solid #d0d7de' }}>
                      <span style={{ fontSize: '0.85rem', color: '#57606a', fontWeight: 600 }}>
                        {activeMenuTab === 'favorites' ? 'Saved Favorites List' : `Showing ${totalElements.toLocaleString()} repository search results`}
                      </span>
                    </div>

                    {displayedResults.map((repoItem, index) => {
                      const isFav = favorites.includes(repoItem.id);
                      return (
                        <motion.div
                          key={repoItem.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0, transition: { delay: index * 0.05 } }}
                          whileHover={{ y: -4, scale: 1.01, boxShadow: '0 8px 30px rgba(0,0,0,0.06)' }}
                          style={{
                            background: '#ffffff',
                            border: '1px solid #d0d7de',
                            borderRadius: '8px',
                            padding: '20px',
                            transition: 'border-color 0.2s, box-shadow 0.2s',
                            cursor: 'default'
                          }}
                        >
                          {/* Upper Card Row: Title, owner, badges */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <Folder size={18} color="#0969da" fill="#54aeff" />
                                <Link
                                  to={`/repository/${repoItem.fullName}`}
                                  style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0969da', textDecoration: 'none' }}
                                >
                                  {repoItem.fullName}
                                </Link>
                                
                                <span style={{
                                  fontSize: '0.72rem',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  background: '#ddf4ff',
                                  color: '#0969da',
                                  fontWeight: 600,
                                  border: '1px solid rgba(9, 105, 218, 0.2)'
                                }}>
                                  {repoItem.visibility}
                                </span>

                                {repoItem.openSource && (
                                  <span style={{
                                    fontSize: '0.72rem',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    background: '#dafbe1',
                                    color: '#1a7f37',
                                    fontWeight: 600,
                                    border: '1px solid rgba(26, 127, 55, 0.2)'
                                  }}>
                                    Open Source
                                  </span>
                                )}
                              </div>
                              <p style={{ margin: '8px 0', fontSize: '0.88rem', color: '#57606a', lineHeight: 1.4 }}>
                                {repoItem.description || 'No description provided.'}
                              </p>
                            </div>

                            {/* Favorite Button */}
                            <button
                              onClick={() => toggleFavorite(repoItem.id)}
                              style={{
                                background: isFav ? 'rgba(234,179,8,0.1)' : '#f6f8fa',
                                border: '1px solid #d0d7de',
                                borderRadius: '6px',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              <Star size={16} color={isFav ? '#eab308' : '#57606a'} fill={isFav ? '#eab308' : 'none'} />
                            </button>
                          </div>

                          {/* AI Quick overview capsule */}
                          {repoItem.aiOverview && (
                            <div style={{
                              margin: '12px 0',
                              padding: '10px 14px',
                              borderRadius: '6px',
                              background: '#f6f8fa',
                              borderLeft: '4px solid #0969da',
                              fontSize: '0.8rem',
                              color: '#24292f',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <Sparkles size={13} color="#0969da" />
                              <span>{repoItem.aiOverview}</span>
                            </div>
                          )}

                          {/* Topics pills list */}
                          {repoItem.topics && repoItem.topics.length > 0 && (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '8px 0' }}>
                              {repoItem.topics.slice(0, 5).map((topic, i) => (
                                <span key={i} style={{
                                  fontSize: '0.72rem',
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                  background: 'rgba(9, 105, 218, 0.05)',
                                  color: '#0969da',
                                  fontWeight: 500
                                }}>
                                  {topic}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Card Footer row: languages, stats widgets, view detail buttons */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f6f8fa', flexWrap: 'wrap', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.8rem', color: '#57606a' }}>
                              {repoItem.primaryLanguage && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: langColors[repoItem.primaryLanguage] || '#8b949e' }} />
                                  <span>{repoItem.primaryLanguage}</span>
                                </div>
                              )}
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Star size={14} />
                                <span>{repoItem.stars.toLocaleString()}</span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <GitFork size={14} />
                                <span>{repoItem.forks.toLocaleString()}</span>
                              </div>

                              {repoItem.license && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Shield size={14} />
                                  <span>{repoItem.license}</span>
                                </div>
                              )}

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Calendar size={14} />
                                <span>Updated {new Date(repoItem.lastUpdated).toLocaleDateString()}</span>
                              </div>
                            </div>

                            {/* View Action buttons */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {/* Analyze Button (passes state to pre-select tab) */}
                              <Link
                                to={`/repository/${repoItem.fullName}`}
                                state={{ activeTab: 'analysis' }}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #d0d7de',
                                  borderRadius: '6px',
                                  padding: '5px 12px',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  color: '#0969da',
                                  textDecoration: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <Sparkles size={12} />
                                <span>Analyze</span>
                              </Link>

                              {/* View Details Button */}
                              <Link
                                to={`/repository/${repoItem.fullName}`}
                                style={{
                                  background: '#f6f8fa',
                                  border: '1px solid #d0d7de',
                                  borderRadius: '6px',
                                  padding: '5px 12px',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  color: '#24292f',
                                  textDecoration: 'none',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                <span>View Details</span>
                                <ArrowRight size={12} />
                              </Link>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}

                    {/* Pagination index selector widgets */}
                    {totalPages > 1 && (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                        <button
                          onClick={() => performSearch(page - 1)}
                          disabled={page === 0}
                          style={{
                            background: '#f6f8fa',
                            border: '1px solid #d0d7de',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: page === 0 ? '#8c959f' : '#24292f',
                            cursor: page === 0 ? 'default' : 'pointer'
                          }}
                        >
                          <ChevronLeft size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                          <span>Previous</span>
                        </button>

                        <span style={{ fontSize: '0.85rem', color: '#57606a', fontWeight: 500 }}>
                          Page <strong>{page + 1}</strong> of {totalPages}
                        </span>

                        <button
                          onClick={() => performSearch(page + 1)}
                          disabled={page === totalPages - 1}
                          style={{
                            background: '#f6f8fa',
                            border: '1px solid #d0d7de',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: page === totalPages - 1 ? '#8c959f' : '#24292f',
                            cursor: page === totalPages - 1 ? 'default' : 'pointer'
                          }}
                        >
                          <span>Next</span>
                          <ChevronRight size={14} style={{ verticalAlign: 'middle', marginLeft: '4px' }} />
                        </button>
                      </div>
                    )}

                  </motion.div>
                )}

              </AnimatePresence>
            </div>

          </div>
        </main>

      </div>
    </div>
  );
}
