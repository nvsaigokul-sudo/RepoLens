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
  const savedToken = localStorage.getItem('titan_token');
  const savedUserJson = localStorage.getItem('titan_user');
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
      localStorage.setItem('titan_token', token);
      localStorage.setItem('titan_user', JSON.stringify(user));
      set({ token, user, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('titan_token');
      localStorage.removeItem('titan_user');
      set({ token: null, user: null, isAuthenticated: false });
    }
  };
});
