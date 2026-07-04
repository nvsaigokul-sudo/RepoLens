import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Lock, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/v1/auth/login', { email, password });
      
      if (response.data?.success) {
        const data = response.data.data;
        login(data.token, {
          id: data.userId || 1,
          email: data.email || email,
          role: data.role || 'USER'
        });
        navigate('/');
      } else {
        setError('Login failed. Please verify credentials.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || err.response?.data?.message || 'Login request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-24 px-4">
      <div className="bg-repolens-card border border-repolens-border p-8 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-repolens-text">Welcome Back</h2>
          <p className="text-xs text-repolens-muted mt-1">Access advanced AI features & career evaluation</p>
        </div>

        {error && (
          <div className="bg-red-950/30 border border-red-900/50 p-4 rounded-xl flex items-center space-x-3 mb-6">
            <AlertCircle className="text-red-400 shrink-0" size={18} />
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-repolens-muted uppercase tracking-wider mb-1.5">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="developer@repolens.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-repolens-dark border border-repolens-border focus:border-repolens-primary rounded-xl py-3 pl-10 pr-4 text-xs text-repolens-text placeholder-[#475569] outline-none"
              />
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-repolens-muted" size={16} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-repolens-muted uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-repolens-dark border border-repolens-border focus:border-repolens-primary rounded-xl py-3 pl-10 pr-4 text-xs text-repolens-text placeholder-[#475569] outline-none"
              />
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-repolens-muted" size={16} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-repolens-primary hover:bg-blue-600 text-repolens-text py-3 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center justify-center space-x-2 mt-6"
          >
            {loading && <RefreshCw size={14} className="animate-spin" />}
            <span>{loading ? 'Logging in...' : 'Sign In'}</span>
          </button>
        </form>

        <p className="text-center text-xs text-repolens-muted mt-6">
          Don't have an account?{' '}
          <button onClick={() => navigate('/register')} className="text-repolens-primary hover:underline font-bold">
            Sign Up
          </button>
        </p>
      </div>
    </div>
  );
};
