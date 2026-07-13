import { useState, useEffect } from 'react';
import { History, Search, Calendar, Database } from 'lucide-react';
import Header from '../components/Header';

interface HistoryItem {
  id: number;
  query: string;
  filters: string;
  resultCount: number;
  createdAt: string;
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = localStorage.getItem('accessToken');

  const fetchHistory = async () => {
    try {
      const res = await fetch(`http://localhost:8080/api/v1/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Failed to load history');
      setHistory(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch search history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchHistory();
    } else {
      setLoading(false);
      setError('You must be signed in to view history');
    }
  }, []);

  const parseFilters = (filtersJson: string) => {
    try {
      const filters = JSON.parse(filtersJson);
      const parts = [];
      if (filters.language) parts.push(`Language: ${filters.language}`);
      if (filters.minStars) parts.push(`Min Stars: ${filters.minStars}`);
      return parts.join(' | ') || 'No active filters';
    } catch (e) {
      return 'No active filters';
    }
  };

  return (
    <div>
      <Header />
      <div className="glow-spot-1" />
      <div className="glow-spot-2" />

      <main style={{ maxWidth: '800px', margin: '40px auto', padding: '0 24px' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <History size={24} color="var(--accent-teal)" />
          Your Search History
        </h2>

        {loading ? (
          <div className="flex-center" style={{ minHeight: '200px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid var(--border-glass)',
              borderTopColor: 'var(--accent-teal)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        ) : error ? (
          <div className="glass-panel" style={{ color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <span>{error}</span>
          </div>
        ) : history.length === 0 ? (
          <div className="glass-panel flex-center" style={{ minHeight: '200px', flexDirection: 'column', color: 'var(--text-muted)' }}>
            <Search size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <span>No search history found. Try performing some queries on the search page!</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {history.map((item) => (
              <div
                key={item.id}
                className="glass-panel"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(15, 23, 42, 0.3)'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Search size={16} color="var(--accent-teal)" />
                    <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                      "{item.query || 'Blank Search'}"
                    </span>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {parseFilters(item.filters)}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Database size={12} />
                    <span>{item.resultCount} matches found</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={12} />
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
