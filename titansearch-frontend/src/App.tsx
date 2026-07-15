import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SearchPage from './pages/SearchPage';
import RepositoryDetailPage from './pages/RepositoryDetailPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/repository/:owner/:repo" element={<RepositoryDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
