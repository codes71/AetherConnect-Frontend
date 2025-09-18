import axios, { AxiosInstance } from "axios";
import { logger } from "@/lib/utils";

// Define interfaces for API methods
interface AuthApi {
  login: (data: any) => Promise<any>;
  register: (data: any) => Promise<any>;
  getProfile: () => Promise<any>;
  logout: () => Promise<any>;
  refreshToken: () => Promise<any>;
  getWsToken: () => Promise<any>;
}

interface MessageApi {  
  getRooms: () => Promise<any>;
  getMessages: (roomId: string, page: number, limit: number) => Promise<any>;
}

class ApiClient {
  private axiosInstance: AxiosInstance;
  public auth!: AuthApi;
  public message!: MessageApi;

  private isRefreshing = false;
  private failedQueue: Array<{ resolve: (value: unknown) => void; reject: (reason?: any) => void; request: () => Promise<any> }> = [];

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

  private processQueue(error: any | null) {
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
      async (error) => {
        const originalRequest = error.config;

        // If unauthorized and not a refresh request itself
        if (error.response?.status === 401 && originalRequest.url !== '/auth/refresh' && originalRequest.url !== '/auth/logout') {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({
                resolve,
                reject,
                request: () => this.axiosInstance(originalRequest),
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
              return this.axiosInstance(originalRequest); // Retry original request
            }
            // This path may not be hit if server always returns error status for failure
            throw new Error('Token refresh failed');
          } catch (refreshError: any) {
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
      login: (data: any) => this.axiosInstance.post("/auth/login", data),
      register: (data: any) => this.axiosInstance.post("/auth/register", data),
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