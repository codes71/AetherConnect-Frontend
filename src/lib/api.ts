import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
});

api.interceptors.request.use(config => {
  const token = Cookies.get('token');
  console.log('Attaching token to request:', token);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const login = (data: any) => api.post('/auth/login', data);
export const register = (data: any) => api.post('/auth/register', data);
export const getProfile = () => api.get('/auth/profile');

// Conversations
export const getConversations = () => api.get('/conversations');
export const getConversation = (id: string) => api.get(`/conversations/${id}`);

// Messages
export const getMessages = (conversationId: string) => api.get(`/messages/${conversationId}`);
export const sendMessage = (conversationId: string, content: string) => api.post(`/messages/${conversationId}`, { content });

export default api;