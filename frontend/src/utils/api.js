import axios from 'axios';
import toast from 'react-hot-toast';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
});

// Attach access token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
API.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/refresh-token`, { refreshToken });
          localStorage.setItem('accessToken', data.data.accessToken);
          original.headers.Authorization = `Bearer ${data.data.accessToken}`;
          return API(original);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    const msg = error.response?.data?.message || 'Something went wrong';
    if (error.response?.status !== 401) toast.error(msg);
    return Promise.reject(error);
  }
);

export default API;
