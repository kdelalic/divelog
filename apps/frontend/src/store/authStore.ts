import { create } from 'zustand';
import { authApi, setAccessToken, setRefreshHandler } from '../lib/api';
import type { User } from '../lib/api';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: User | null;
  status: AuthStatus;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  status: 'loading',
  error: null,

  // Attempt to restore the session from the refresh token cookie on app load
  initialize: async () => {
    const result = await authApi.refresh();
    if (result.data) {
      setAccessToken(result.data.access_token);
      set({ user: result.data.user, status: 'authenticated', error: null });
    } else {
      setAccessToken(null);
      set({ user: null, status: 'unauthenticated' });
    }
  },

  login: async (email, password) => {
    set({ error: null });
    const result = await authApi.login(email, password);
    if (result.data) {
      setAccessToken(result.data.access_token);
      set({ user: result.data.user, status: 'authenticated' });
      return true;
    }
    set({ error: result.error || 'Failed to sign in' });
    return false;
  },

  register: async (email, username, password) => {
    set({ error: null });
    const result = await authApi.register(email, username, password);
    if (result.data) {
      setAccessToken(result.data.access_token);
      set({ user: result.data.user, status: 'authenticated' });
      return true;
    }
    set({ error: result.error || 'Failed to create account' });
    return false;
  },

  logout: async () => {
    await authApi.logout();
    setAccessToken(null);
    set({ user: null, status: 'unauthenticated', error: null });
  },

  clearError: () => set({ error: null }),
}));

// Let apiFetch transparently renew expired access tokens. If the refresh
// fails the user is signed out so the route guard redirects to /login.
setRefreshHandler(async () => {
  const result = await authApi.refresh();
  if (result.data) {
    setAccessToken(result.data.access_token);
    useAuthStore.setState({ user: result.data.user, status: 'authenticated' });
    return result.data.access_token;
  }
  setAccessToken(null);
  useAuthStore.setState({ user: null, status: 'unauthenticated' });
  return null;
});

export default useAuthStore;
