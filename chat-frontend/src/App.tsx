import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from './store/store';
import OnboardingFlow from './features/auth/OnboardingFlow';
import { HomePage } from './pages/HomePage';
import LandingPage from './pages/LandingPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import api from './services/api';
import { setUser, logout, setLoading } from './features/auth/authSlice';

function App() {
  const dispatch = useAppDispatch();
  const { isAuthenticated, loading } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Check if we have a valid session on mount
    const verifySession = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) throw new Error('No token');

        // Fetch the user's profile to verify token and hydrate Redux
        const { data } = await api.get('/users/me');

        dispatch(setUser({
          ...data,
          token: token,
        }));
      } catch (err) {
        dispatch(logout());
      } finally {
        dispatch(setLoading(false));
      }
    };

    verifySession();
  }, [dispatch]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-color)' }}>
        <div className="spinner" style={{ width: '40px', height: '40px', borderColor: 'var(--primary-color)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/onboarding"
        element={!isAuthenticated ? <OnboardingFlow /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/dashboard"
        element={isAuthenticated ? <HomePage /> : <Navigate to="/onboarding?mode=login" replace />}
      />
      <Route
        path="/"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LandingPage />}
      />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
