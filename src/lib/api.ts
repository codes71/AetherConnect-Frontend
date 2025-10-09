import axios from 'axios';

// Define the base URL for the API Gateway
const API_BASE_URL = 'http://localhost:3000/api/auth'; // As per backend.txt, API Gateway is on port 3000
const API_ROOMS_BASE_URL = 'http://localhost:3000/api'; // Rooms endpoint is not under /auth

// Axios instance to handle cookies automatically
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // This is crucial for sending cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Axios instance for rooms endpoints (different base URL)
const roomsApiClient = axios.create({
  baseURL: API_ROOMS_BASE_URL,
  withCredentials: true, // This is crucial for sending cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

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
interface RegisterResponse {
  success: boolean;
  message: string;
  user?: User; // User might be undefined on failure
}

interface LoginResponse {
  success: boolean;
  message: string;
  user?: User; // User might be undefined on failure
  accessToken?: string; // Might be undefined on failure
  refreshToken?: string; // Might be undefined on failure
}

interface RefreshResponse {
  success: boolean;
  message: string;
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
  messages?: any[]; // Messages might be undefined on failure
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// --- API Functions ---

export const registerUser = async (userData: RegisterData): Promise<RegisterResponse> => {
  try {
    const response = await apiClient.post<RegisterResponse>('/register', userData);
    return response.data;
  } catch (error: unknown) {
    console.error('Registration API error:', error);
    // Log more detailed error information from the response
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    const errorMessage = axiosError.response?.data?.message || axiosError.message || 'An unexpected error occurred during registration.';
    console.error('Detailed error response:', axiosError.response?.data);
    // Return a structure that matches RegisterResponse but indicates failure
    return { success: false, message: errorMessage };
  }
};

export const loginUser = async (credentials: LoginCredentials): Promise<LoginResponse> => {
  try {
    const response = await apiClient.post<LoginResponse>('/login', credentials);
    return response.data;
  } catch (error: unknown) {
    console.error('Login API error:', error);
    // Log more detailed error information from the response
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    const errorMessage = axiosError.response?.data?.message || axiosError.message || 'An unexpected error occurred during login.';
    console.error('Detailed error response:', axiosError.response?.data);
    // Return a structure that matches LoginResponse but indicates failure
    return { success: false, message: errorMessage };
  }
};

export const refreshAccessToken = async (): Promise<RefreshResponse> => {
  try {
    const response = await apiClient.post<RefreshResponse>('/refresh');
    return response.data;
  } catch (error: unknown) {
    console.error('Refresh token API error:', error);
    // Log more detailed error information from the response
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    const errorMessage = axiosError.response?.data?.message || axiosError.message || 'An unexpected error occurred during token refresh.';
    console.error('Detailed error response:', axiosError.response?.data);
    return { success: false, message: errorMessage };
  }
};

export const logoutUser = async (): Promise<LogoutResponse> => {
  try {
    const response = await apiClient.post<LogoutResponse>('/logout');
    // Clear cookies manually as a fallback (in case backend doesn't clear them)
    clearAuthCookies();
    return response.data;
  } catch (error: unknown) {
    console.error('Logout API error:', error);
    // Log more detailed error information from the response
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    const errorMessage = axiosError.response?.data?.message || axiosError.message || 'An unexpected error occurred during logout.';
    console.error('Detailed error response:', axiosError.response?.data);
    // Clear cookies manually as a fallback when backend is unavailable
    clearAuthCookies();
    return { success: false, message: errorMessage };
  }
};

export const clearAuthCookies = () => {
  // Clear cookies manually by setting them to expire immediately
  document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';

  // Also clear any other potential auth-related cookies
  document.cookie = 'accessToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname + ';';
  document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + window.location.hostname + ';';

  console.log('🔒 Auth cookies cleared manually');
};

export const forceLogout = () => {
  // Force logout by clearing all auth state and cookies
  clearAuthCookies();

  // Clear local storage if used for any auth data
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_state');
    sessionStorage.clear();
  }

  console.log('🚪 Force logout completed - all auth data cleared');
};

export const getUserProfile = async (): Promise<UserProfileResponse> => {
  try {
    const response = await apiClient.get<UserProfileResponse>('/profile');
    return response.data;
  } catch (error: unknown) {
    console.error('Get user profile API error:', error);
    // Log more detailed error information from the response
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    const errorMessage = axiosError.response?.data?.message || axiosError.message || 'An unexpected error occurred while fetching user profile.';
    console.error('Detailed error response:', axiosError.response?.data);
    // Return a structure that matches UserProfileResponse but indicates failure
    return { success: false, message: errorMessage };
  }
};

export const getWsToken = async (): Promise<WsTokenResponse> => {
  try {
    const response = await apiClient.get<WsTokenResponse>('/ws-token');
    return response.data;
  } catch (error: unknown) {
    console.error('Get WebSocket token API error:', error);
    // Log more detailed error information from the response
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    const errorMessage = axiosError.response?.data?.message || axiosError.message || 'An unexpected error occurred while fetching WebSocket token.';
    console.error('Detailed error response:', axiosError.response?.data);
    return { success: false, message: errorMessage };
  }
};

export const getRooms = async (): Promise<RoomsResponse> => {
  try {
    const response = await roomsApiClient.get<RoomsResponse>('/rooms');
    return response.data;
  } catch (error: unknown) {
    console.error('Get rooms API error:', error);
    // Log more detailed error information from the response
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    const errorMessage = axiosError.response?.data?.message || axiosError.message || 'An unexpected error occurred while fetching rooms.';
    console.error('Detailed error response:', axiosError.response?.data);
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
    // Log more detailed error information from the response
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    const errorMessage = axiosError.response?.data?.message || axiosError.message || 'An unexpected error occurred while fetching message history.';
    console.error('Detailed error response:', axiosError.response?.data);
    return { success: false, message: errorMessage };
  }
};
