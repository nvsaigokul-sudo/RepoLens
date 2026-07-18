import { useState, useEffect } from 'react';
import { Folder, FileCode, ChevronRight, Search, FileText, X, Copy, Check } from 'lucide-react';

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size: number;
  download_url: string | null;
}

interface FileExplorerProps {
  owner: string;
  repo: string;
}

// Global module-level cache to persist data across FileExplorer unmounts (e.g. switching tabs)
const folderCache: { [key: string]: FileItem[] } = {};
const fileContentCache: { [key: string]: string } = {};

export default function FileExplorer({ owner, repo }: FileExplorerProps) {
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // File preview states
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const pathString = currentPath.join('/');

  // Dark theme detection
  const darkMode = localStorage.getItem('repolens-theme') === 'dark';
  const theme = {
    bg: darkMode ? '#0d1117' : '#ffffff',
    text: darkMode ? '#c9d1d9' : '#24292f',
    textMuted: darkMode ? '#8b949e' : '#57606a',
    border: darkMode ? '#30363d' : '#d0d7de',
    cardBg: darkMode ? '#161b22' : '#ffffff',
    sidebarBg: darkMode ? '#161b22' : '#f6f8fa',
    codeBg: darkMode ? '#0d1117' : '#fafafa'
  };

  const fetchContents = async (path: string) => {
    const cacheKey = `${owner}/${repo}/${path}`;
    
    // Stale-While-Revalidate Caching
    if (folderCache[cacheKey]) {
      setItems(folderCache[cacheKey]);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);
      if (res.ok) {
        const data = await res.json();
        const contentItems = Array.isArray(data) ? data : [];
        // Save to cache
        folderCache[cacheKey] = contentItems;
        setItems(contentItems);
      } else {
        console.error("Failed to fetch folder contents");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContents(pathString);
    setSelectedFile(null);
    setPreviewContent('');
  }, [owner, repo, pathString]);

  const handleFolderClick = (folderName: string) => {
    setCurrentPath([...currentPath, folderName]);
    setSearchQuery('');
  };

  const handleBreadcrumbClick = (idx: number) => {
    if (idx === -1) {
      setCurrentPath([]);
    } else {
      setCurrentPath(currentPath.slice(0, idx + 1));
    }
    setSearchQuery('');
  };

  const handleFileClick = async (file: FileItem) => {
    if (!file.download_url) return;
    setSelectedFile(file);

    // Stale-While-Revalidate for files
    if (fileContentCache[file.download_url]) {
      setPreviewContent(fileContentCache[file.download_url]);
      setPreviewLoading(false);
    } else {
      setPreviewLoading(true);
      setPreviewContent('');
    }

    try {
      const res = await fetch(file.download_url);
      if (res.ok) {
        const text = await res.text();
        // Save to cache
        fileContentCache[file.download_url] = text;
        setPreviewContent(text);
      } else {
        setPreviewContent("Failed to load file content.");
      }
    } catch (e: any) {
      setPreviewContent("Failed to fetch file: " + e.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(previewContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter items based on query
  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const folderCount = items.filter(item => item.type === 'dir').length;
  const fileCount = items.filter(item => item.type === 'file').length;

  // Simple mock commit messages and times
  const getMockCommit = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const messages = [
      "Configure project structures",
      "Update component implementations",
      "Fix styling and theme variables",
      "Clean up unused resources",
      "Refactor state handlers",
      "Initial repository synchronization commit"
    ];
    const times = ["2 hours ago", "5 hours ago", "1 day ago", "3 days ago", "1 week ago"];
    return {
      message: messages[Math.abs(hash) % messages.length],
      time: times[Math.abs(hash >> 2) % times.length]
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Search and Metadata header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        {/* Breadcrumbs Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: theme.textMuted, fontWeight: 500 }}>
          <button 
            onClick={() => handleBreadcrumbClick(-1)}
            style={{ background: 'none', border: 'none', color: '#0969da', cursor: 'pointer', fontWeight: 600, padding: 0 }}
          >
            {repo}
          </button>
          {currentPath.map((folder, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ChevronRight size={14} color={theme.textMuted} />
              <button 
                onClick={() => handleBreadcrumbClick(idx)}
                style={{ background: 'none', border: 'none', color: idx === currentPath.length - 1 ? theme.text : '#0969da', cursor: idx === currentPath.length - 1 ? 'default' : 'pointer', fontWeight: idx === currentPath.length - 1 ? 600 : 500, padding: 0 }}
                disabled={idx === currentPath.length - 1}
              >
                {folder}
              </button>
            </div>
          ))}
        </div>

        {/* Search input field */}
        <div style={{ position: 'relative', width: '220px' }}>
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: theme.sidebarBg,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              padding: '6px 10px 6px 28px',
              fontSize: '0.8rem',
              color: theme.text,
              outline: 'none'
            }}
          />
          <Search size={13} color={theme.textMuted} style={{ position: 'absolute', left: '8px', top: '8px' }} />
        </div>
      </div>

      {/* Main Files Table Card */}
      <div style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', overflow: 'hidden', background: theme.cardBg }}>
        
        {/* Directories and File Counts Header */}
        <div style={{ background: theme.sidebarBg, padding: '10px 16px', borderBottom: `1px solid ${theme.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: theme.textMuted, fontWeight: 600 }}>
          <span>CURRENT PATH: /{pathString}</span>
          <span>{folderCount} Folders • {fileCount} Files</span>
        </div>

        {/* Loading Spinner */}
        {loading && items.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: theme.textMuted, fontSize: '0.85rem' }}>
            <div className="spin-icon" style={{ display: 'inline-block', width: '24px', height: '24px', borderRadius: '50%', border: '2.5px solid #eaeef2', borderTopColor: '#0969da', marginBottom: '8px' }} />
            <div>Reading file contents...</div>
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: theme.textMuted, fontSize: '0.85rem' }}>
            No matches found in this directory.
          </div>
        ) : (
          <div>
            {/* Sort folders first, then files */}
            {[...filteredItems]
              .sort((a, b) => (a.type === 'dir' ? -1 : 1) - (b.type === 'dir' ? -1 : 1))
              .map((item, idx) => {
                const commit = getMockCommit(item.name);
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '220px 1fr 100px 110px',
                      alignItems: 'center',
                      padding: '10px 16px',
                      borderBottom: idx < filteredItems.length - 1 ? `1px solid ${theme.border}` : 'none',
                      fontSize: '0.85rem',
                      background: theme.cardBg
                    }}
                  >
                    {/* Item Name & Icon */}
                    {item.type === 'dir' ? (
                      <button
                        onClick={() => handleFolderClick(item.name)}
                        style={{
                          background: 'none',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: '#0969da',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                          padding: 0,
                          textAlign: 'left'
                        }}
                      >
                        <Folder size={15} color="#54aeff" fill="#b4dbff" />
                        <span>{item.name}/</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleFileClick(item)}
                        style={{
                          background: 'none',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          color: theme.text,
                          fontWeight: 500,
                          cursor: 'pointer',
                          fontFamily: 'monospace',
                          padding: 0,
                          textAlign: 'left'
                        }}
                      >
                        <FileCode size={15} color={theme.textMuted} />
                        <span>{item.name}</span>
                      </button>
                    )}

                    {/* Commit Message */}
                    <span style={{ color: theme.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: '12px' }}>
                      {commit.message}
                    </span>

                    {/* File Size */}
                    <span style={{ fontSize: '0.78rem', color: theme.textMuted, fontFamily: 'monospace' }}>
                      {item.type === 'file' ? (item.size / 1024).toFixed(1) + ' KB' : '—'}
                    </span>

                    {/* Last Modified */}
                    <span style={{ fontSize: '0.78rem', color: theme.textMuted, textAlign: 'right' }}>
                      {commit.time}
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* File Contents Preview Drawer */}
      {selectedFile && (
        <div style={{ border: `1px solid ${theme.border}`, borderRadius: '6px', overflow: 'hidden', background: theme.cardBg, marginTop: '8px' }}>
          {/* Preview Header */}
          <div style={{ background: theme.sidebarBg, borderBottom: `1px solid ${theme.border}`, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 600, color: theme.text }}>
              <FileText size={15} color={theme.textMuted} />
              <span>Previewing: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* Copy Code button */}
              <button 
                onClick={handleCopyCode}
                disabled={previewLoading}
                style={{
                  background: theme.sidebarBg,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: theme.text,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {copied ? <Check size={12} color="#1a7f37" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {/* Close button */}
              <button 
                onClick={() => setSelectedFile(null)}
                style={{ background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Preview Viewport */}
          <div style={{ padding: '20px', maxHeight: '500px', overflowY: 'auto', background: theme.bg }}>
            {previewLoading ? (
              <div style={{ padding: '24px', textAlign: 'center', color: theme.textMuted, fontSize: '0.85rem' }}>
                <div className="spin-icon" style={{ display: 'inline-block', width: '20px', height: '20px', borderRadius: '50%', border: '2px solid #eaeef2', borderTopColor: '#0969da', marginBottom: '6px' }} />
                <div>Retrieving file content...</div>
              </div>
            ) : (
              <pre style={{
                margin: 0,
                fontSize: '0.82rem',
                color: theme.text,
                fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                background: theme.codeBg,
                padding: '16px',
                borderRadius: '6px',
                border: `1px solid ${theme.border}`
              }}>
                <code>{previewContent}</code>
              </pre>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
