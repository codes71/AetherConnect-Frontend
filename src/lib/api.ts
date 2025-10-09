import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'; // Import AxiosError for better typing
import { logger } from './utils';

const API_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL; // Added default for dev  

logger.info('Using API_GATEWAY_URL:', API_GATEWAY_URL);

const API_AUTH_BASE_URL = `${API_GATEWAY_URL}/auth`;
const API_ROOMS_BASE_URL = `${API_GATEWAY_URL}/`;

// Helper functions for JWT token management
const getAccessToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
};

const setAccessToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', token);
  }
};

const clearAccessToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
  }
};

// Axios instance for authentication endpoints
const apiClient = axios.create({
  baseURL: API_AUTH_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Axios instance for rooms endpoints
const roomsApiClient = axios.create({
  baseURL: API_ROOMS_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token to headers
const authInterceptor = (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
};

apiClient.interceptors.request.use(authInterceptor);
roomsApiClient.interceptors.request.use(authInterceptor);

// --- Interfaces ---

// User interface to match the backend response
interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

// Define login credentials interface
interface LoginCredentials {
  email: string;
  password: string;
}

// Define registration data interface
interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
}

// Specific response interfaces based on backend.txt
// Specific response interfaces based on backend.txt
interface RegisterResponse {
  success: boolean;
  message: string;
  user?: User;
  accessToken?: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  user?: User;
  accessToken?: string;
}



interface LogoutResponse {
  success: boolean;
  message: string;
}

interface UserProfileResponse {
  success: boolean;
  message: string;
  user?: User; // User might be undefined on failure
}

interface WsTokenResponse {
  success: boolean;
  message: string;
  token?: string; // WebSocket token might be undefined on failure
}

interface Room {
  id: string;
  name: string;
  description: string;
  roomType: 'public' | 'private' | 'direct';
  createdBy: string;
  members: string[];
  createdAt: string;
  updatedAt: string;
}

interface RoomsResponse {
  success: boolean;
  message: string;
  rooms?: Room[]; // Rooms might be undefined on failure
}

interface MessageHistoryResponse {
  success: boolean;
  message: string;
  messages?: unknown[]; // Use unknown[] instead of any[]
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Helper function to extract error message from AxiosError
const getAxiosErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message;
  }
  return (error instanceof Error) ? error.message : 'An unexpected error occurred.';
};

// --- API Functions ---

export const registerUser = async (userData: RegisterData): Promise<RegisterResponse> => {
  try {
    const response = await apiClient.post<RegisterResponse>('/register', userData);
    if (response.data.success && response.data.accessToken) {
      setAccessToken(response.data.accessToken);
    }
    return response.data;
  } catch (error: unknown) {
    console.error('Registration API error:', error);
    const errorMessage = getAxiosErrorMessage(error);
    console.error('Detailed error response:', (error as AxiosError).response?.data);
    return { success: false, message: errorMessage };
  }
};

export const loginUser = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  try {
    const response = await apiClient.post<LoginResponse>('/login', credentials);
    if (response.data.success && response.data.accessToken) {
      setAccessToken(response.data.accessToken);
    }
    return response.data;
  } catch (error: unknown) {
    console.error('Login API error:', error);
    const errorMessage = getAxiosErrorMessage(error);
    console.error('Detailed error response:', (error as AxiosError).response?.data);
    return { success: false, message: errorMessage };
  }
};

export const logoutUser = async (): Promise<LogoutResponse> => {
  try {
    // Logout requires authentication, the interceptor will add the token.
    const response = await apiClient.post<LogoutResponse>('/logout');
    clearAccessToken(); // Clear JWT token from local storage
    return response.data;
  } catch (error: unknown) {
    console.error('Logout API error:', error);
    const errorMessage = getAxiosErrorMessage(error);
    console.error('Detailed error response:', (error as AxiosError).response?.data);
    clearAccessToken(); // Even on error, attempt to clear client-side token
    return { success: false, message: errorMessage };
  }
};

export const getUserProfile = async (): Promise<UserProfileResponse> => {
  try {
    const response = await apiClient.get<UserProfileResponse>('/profile');
    return response.data;
  } catch (error: unknown) {
    console.error('Get user profile API error:', error);
    const errorMessage = getAxiosErrorMessage(error);
    console.error('Detailed error response:', (error as AxiosError).response?.data);
    return { success: false, message: errorMessage };
  }
};

export const getWsToken = async (): Promise<WsTokenResponse> => {
  try {
    const response = await apiClient.get<WsTokenResponse>('/ws-token');
    return response.data;
  } catch (error: unknown) {
    console.error('Get WebSocket token API error:', error);
    const errorMessage = getAxiosErrorMessage(error);
    console.error('Detailed error response:', (error as AxiosError).response?.data);
    return { success: false, message: errorMessage };
  }
};

export const getRooms = async (): Promise<RoomsResponse> => {
  try {
    const response = await roomsApiClient.get<RoomsResponse>('/rooms');
    return response.data;
  } catch (error: unknown) {
    console.error('Get rooms API error:', error);
    const errorMessage = getAxiosErrorMessage(error);
    console.error('Detailed error response:', (error as AxiosError).response?.data);
    return { success: false, message: errorMessage };
  }
};

export const getMessageHistory = async (roomId: string, page: number = 1, limit: number = 50): Promise<MessageHistoryResponse> => {
  try {
    const response = await roomsApiClient.get<MessageHistoryResponse>(`/rooms/${roomId}/messages`, {
      params: { page, limit }
    });
    return response.data;
  } catch (error: unknown) {
    console.error('Get message history API error:', error);
    const errorMessage = getAxiosErrorMessage(error);
    console.error('Detailed error response:', (error as AxiosError).response?.data);
    return { success: false, message: errorMessage };
  }
};
