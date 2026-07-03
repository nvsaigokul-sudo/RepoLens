import { create } from 'zustand';

interface UserInfo {
  id: number;
  email: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: UserInfo | null;
  isAuthenticated: boolean;
  login: (token: string, user: UserInfo) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Check local storage on initialization
  const savedToken = localStorage.getItem('repolens_token');
  const savedUserJson = localStorage.getItem('repolens_user');
  let savedUser: UserInfo | null = null;
  if (savedUserJson) {
    try {
      savedUser = JSON.parse(savedUserJson);
    } catch {
      // Ignored
    }
  }

  return {
    token: savedToken,
    user: savedUser,
    isAuthenticated: !!savedToken,
    login: (token, user) => {
      localStorage.setItem('repolens_token', token);
      localStorage.setItem('repolens_user', JSON.stringify(user));
      set({ token, user, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('repolens_token');
      localStorage.removeItem('repolens_user');
      set({ token: null, user: null, isAuthenticated: false });
    }
  };
});
