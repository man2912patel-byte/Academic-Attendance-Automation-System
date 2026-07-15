import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject active user context into request headers
apiClient.interceptors.request.use(
  (config) => {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      config.headers['X-User-Username'] = currentUser;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
