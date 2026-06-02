import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  isVerified?: boolean;
  status?: 'ONLINE' | 'OFFLINE' | 'AWAY';
  preferredLanguage?: string;
  knownLanguages?: string[];
  autoTranslate?: boolean;
  token: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: true, // Start true so we show a spinner while verifySession runs
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setUser(state, action: PayloadAction<User & { refreshToken?: string }>) {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      localStorage.setItem('accessToken', action.payload.token);
      if (action.payload.refreshToken) {
        localStorage.setItem('refreshToken', action.payload.refreshToken);
      }
    },
    updateToken(state, action: PayloadAction<string>) {
      if (state.user) {
        state.user.token = action.payload;
      }
    },
    setError(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.loading = false;
    },
    clearError(state) {
      state.error = null;
    },
    logout(state) {
      state.user = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
  },
});

export const logoutUser = () => async (dispatch: any) => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      // We don't import api here to avoid circular dependency if api depends on store, 
      // but since it's just a thunk we can dynamically import or just use fetch/axios
      // Let's use the global fetch or assume `api` from '../../services/api' is fine here
      const api = (await import('../../services/api')).default;
      await api.post('/auth/logout', { refreshToken });
    }
  } catch (error) {
    console.error('Logout API failed', error);
  } finally {
    dispatch(authSlice.actions.logout());
  }
};

export const { setLoading, setUser, updateToken, setError, clearError, logout } = authSlice.actions;
export default authSlice.reducer;
