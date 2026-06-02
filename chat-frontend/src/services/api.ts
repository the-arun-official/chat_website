import axios from 'axios';
import { store } from '../store/store';
import { updateToken } from '../features/auth/authSlice';

export const API_URL = 'http://localhost:3000/api';
export const BASE_URL = API_URL.replace('/api', '');

export const getMediaUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  // If it's already an absolute URL but points to localhost, rewrite it to use the current BASE_URL (useful for LAN/Ngrok testing)
  if (url.startsWith('http://localhost:3000')) {
    return url.replace('http://localhost:3000', BASE_URL);
  }
  // If it's a relative URL, prepend BASE_URL
  if (url.startsWith('/')) {
    return `${BASE_URL}${url}`;
  }
  return url;
};
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Access Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle JWT Refresh Token Rotation
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite loops if the refresh token itself is invalid
    if (originalRequest.url?.includes('/auth/refresh-token')) {
      localStorage.clear();
      window.location.href = '/onboarding?mode=login';
      return Promise.reject(error);
    }

    // Do not attempt to refresh token if we are trying to login or register
    if (originalRequest.url?.includes('/auth/login') || originalRequest.url?.includes('/auth/register')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const { data } = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken,
        });

        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        store.dispatch(updateToken(data.accessToken));

        // Update the original request's auth header and retry
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        console.error('Refresh token failed, logging out...');
        localStorage.clear();
        window.location.href = '/onboarding?mode=login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
