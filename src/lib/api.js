import axios from 'axios';
import { io } from 'socket.io-client';
export const demo = import.meta.env.VITE_DEMO_MODE !== 'false';
export const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:4000/api'),
  timeout: 15000,
  withCredentials: true,
});
let getToken = () => null,
  onExpired = () => {};
export function configureAuth(tokenGetter, expired) {
  getToken = tokenGetter;
  onExpired = expired;
}
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) onExpired();
    return Promise.reject(
      new Error(error.response?.data?.error || 'Connection failed. Please try again.'),
    );
  },
);
export const connectSocket = (token) =>
  io(
    import.meta.env.VITE_SOCKET_URL ||
      (import.meta.env.PROD ? window.location.origin : 'http://localhost:4000'),
    {
      auth: { token },
      autoConnect: true,
    },
  );
