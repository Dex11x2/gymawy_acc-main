import axios from 'axios';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000/api';

console.log('🌐 API Configuration:');
console.log('  VITE_API_URL from env:', (import.meta as any).env?.VITE_API_URL);
console.log('  Final API_URL:', API_URL);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  timeout: 10000
});

api.interceptors.request.use(
  (config) => {
    console.log('📡 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`
    });

    const auth = localStorage.getItem('gemawi-auth');
    if (auth) {
      try {
        const { token } = JSON.parse(auth);
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('🔐 Token added to request (first 50 chars):', token.substring(0, 50) + '...');
        } else {
          console.warn('⚠️ No token found in auth object');
        }
      } catch (error) {
        console.error('❌ Error parsing auth token:', error);
      }
    } else {
      console.warn('⚠️ No auth found in localStorage');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only logout and redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('gemawi-auth');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
