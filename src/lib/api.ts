import axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios";
import { logger } from "@/lib/utils";
import { User, Message, Room } from "@/lib/types";

// Define interfaces for API methods
interface AuthApi {
  login: (data: Record<string, unknown>) => Promise<AxiosResponse<User>>;
  register: (data: Record<string, unknown>) => Promise<AxiosResponse<User>>;
  getProfile: () => Promise<AxiosResponse<User>>;
  logout: () => Promise<AxiosResponse<{ message: string }>>;
  refreshToken: () => Promise<AxiosResponse<{ success: boolean }>>;
  getWsToken: () => Promise<AxiosResponse<{ token: string }>>;
}

interface MessageApi {  
  getRooms: () => Promise<AxiosResponse<Room[]>>;
  getMessages: (roomId: string, page: number, limit: number) => Promise<AxiosResponse<Message[]>>;
}

class ApiClient {
  private axiosInstance: AxiosInstance;
  public auth!: AuthApi;
  public message!: MessageApi;

  private isRefreshing = false;
  private failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason?: AxiosError) => void; request: () => Promise<AxiosResponse<unknown>> }> = [];

  constructor() {
    const baseURL = process.env.NODE_ENV === 'production'
      ? process.env.NEXT_PUBLIC_API_URL
      : '/api';

    this.axiosInstance = axios.create({
      baseURL,
      withCredentials: true, // ensures cookies (HttpOnly) are sent
    });

    this.initializeApiMethods();
    this.setupInterceptors();
  }

  private processQueue(error: AxiosError | null) {
    this.failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        // Retry the original request
        prom.resolve(prom.request());
      }
    });
    this.failedQueue = [];
  }

  private setupInterceptors() {
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config;

        // If unauthorized and not a refresh request itself
        if (error.response?.status === 401 && originalRequest?.url !== '/auth/refresh' && originalRequest?.url !== '/auth/logout') {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({
                resolve,
                reject,
                request: () => this.axiosInstance(originalRequest!),
              });
            });
          }

          this.isRefreshing = true;

          try {
            logger.log('--- Refreshing tokens ---');
            const response = await this.auth.refreshToken();
            if (response.data.success) {
              logger.log('--- Token Refresh (Rotation) Successful ---');
              this.processQueue(null);
              return this.axiosInstance(originalRequest!); // Retry original request
            }
            // This path may not be hit if server always returns error status for failure
            throw new Error('Token refresh failed');
          } catch (refreshError: AxiosError) {
            this.processQueue(refreshError);
            
            const errorMessage = refreshError.response?.data?.message || refreshError.message;
            if (typeof window !== "undefined") {
              let eventType = 'auth:session-expired';
              let eventDetail = { message: 'Session expired. Please log in again.' };
              
              if (errorMessage?.includes('already used') || errorMessage?.includes('invalid')) {
                eventType = 'auth:token-replay-detected';
                eventDetail = { message: 'Security violation detected. Please log in again.' };
              }
              
              const event = new CustomEvent(eventType, { detail: eventDetail });
              window.dispatchEvent(event);
            }
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private initializeApiMethods() {
    this.auth = {
      login: (data: Record<string, unknown>) => this.axiosInstance.post("/auth/login", data),
      register: (data: Record<string, unknown>) => this.axiosInstance.post("/auth/register", data),
      getProfile: () => this.axiosInstance.get("/auth/profile"),
      logout: () => this.axiosInstance.post("/auth/logout"),
      getWsToken: () => this.axiosInstance.get("/auth/ws-token"),
      refreshToken: () => this.axiosInstance.post("/auth/refresh", {}, { withCredentials: true }),
    };

    this.message = {
      getRooms: () => this.axiosInstance.get('/rooms'),
      getMessages: (roomId: string, page: number = 1, limit: number = 50) => this.axiosInstance.get(`/rooms/${roomId}/messages`, { params: { page, limit } }),
    };
  }
}

const api = new ApiClient();
export default api;