import axios, { AxiosInstance } from "axios";
import type { User } from "./types"; // Assuming User type is still needed

// Define interfaces for API methods
interface AuthApi {
  login: (data: any) => Promise<any>;
  register: (data: any) => Promise<any>;
  getProfile: () => Promise<any>;
  logout: () => Promise<any>;
  refreshToken: () => Promise<any>;
  getWsToken: () => Promise<any>; // Added
}

class ApiClient {
  private axiosInstance: AxiosInstance;
  public auth!: AuthApi;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api",
      withCredentials: true, // ensures cookies (HttpOnly) are sent
    });

    this.setupInterceptors();
    this.initializeApiMethods();
  }

  private setupInterceptors() {
    let isRefreshing = false;
    let failedQueue: Array<{ resolve: (value?: any) => void; reject: (reason?: any) => void; }> = [];

    const processQueue = (error: any | null) => {
      failedQueue.forEach(prom => {
        if (error) {
          prom.reject(error);
        } else {
          prom.resolve();
        }
      });
      failedQueue = [];
    };


    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If unauthorized and not a refresh request itself
        if (error.response?.status === 401 && originalRequest.url !== '/auth/refresh') {
          if (isRefreshing) {
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            }).then(() => this.axiosInstance(originalRequest)).catch(err => Promise.reject(err));
          }

          isRefreshing = true;

          try {
            const refreshResponse = await this.axiosInstance.post(
              "/auth/refresh",
              {},
              { withCredentials: true }
            );

            if (refreshResponse.data.success) {
              isRefreshing = false;
              processQueue(null);
              return this.axiosInstance(originalRequest);
            } else {
              // Refresh failed, clear queue and redirect
              isRefreshing = false;
              processQueue(new Error('Refresh token failed'));
              if (typeof window !== "undefined") {
                window.location.href = "/login";
              }
              return Promise.reject(error); // Reject the original request
            }
          } catch (refreshError) {
            console.error("Token refresh failed:", refreshError);
            isRefreshing = false;
            processQueue(refreshError); // Reject all queued requests
            if (typeof window !== "undefined") {
              window.location.href = "/login";
            }
            return Promise.reject(refreshError); // Reject the original request
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
      refreshToken: () => this.axiosInstance.post("/auth/refresh"),
      getWsToken: () => this.axiosInstance.get("/auth/ws-token"), // Added
    };
  }
}

const api = new ApiClient();
export default api;
