import axios, { AxiosInstance, AxiosResponse, AxiosError } from "axios";
import { logger } from "@/lib/utils";
import { User, Message, Room } from "@/lib/types";
import { AppError, createAppError, ErrorCategory } from "@/lib/error/types";

interface AuthApi {
  login: (
    data: Record<string, unknown>
  ) => Promise<AxiosResponse<{ success: boolean; user: User }>>;
  register: (
    data: Record<string, unknown>
  ) => Promise<AxiosResponse<{ success: boolean; user: User }>>;
  getProfile: () => Promise<AxiosResponse<{ success: boolean; user: User }>>;
  logout: () => Promise<AxiosResponse<{ message: string }>>;
  refreshToken: () => Promise<AxiosResponse<{ success: boolean }>>;
  getWsToken: () => Promise<AxiosResponse<{ token: string }>>;
}

interface MessageApi {
  getRooms: () => Promise<AxiosResponse<{ rooms: Room[] }>>;
  getMessages: (
    roomId: string,
    page: number,
    limit: number
  ) => Promise<AxiosResponse<{ messages: Message[] }>>;
}

interface AxiosErrorResponseData {
  message?: string;
  [key: string]: unknown;
}

class ApiClient {
  private axiosInstance: AxiosInstance;
  public auth!: AuthApi;
  public message!: MessageApi;

  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason?: AppError) => void;
    request: () => Promise<AxiosResponse<unknown>>;
  }> = [];
  private maxQueueSize = 20;

  constructor() {
    const baseURL = process.env.NEXT_PUBLIC_API_URL
    logger.log(`API Base URL: ${baseURL}`);

    this.axiosInstance = axios.create({
      baseURL,
      withCredentials: true,
      timeout: 15000,
    });

    this.initializeApiMethods();
    this.setupInterceptors();
  }

  private processQueue(error: AppError | null) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(prom.request());
      }
    });
    this.failedQueue = [];
  }

  private setupInterceptors() {
    // Request interceptor for logging
    this.axiosInstance.interceptors.request.use(
      (config) => {
        logger.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error("Request error:", error);
        return Promise.reject(error);
      }
    );

    // Response interceptor with enhanced error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.log(
          `✅ Response ${response.status} from ${response.config.url}:`,
          response.data
        );
        return response;
      },
      async (error: AxiosError) => {
        logger.error(
          `❌ Error response ${error.response?.status} from ${error.config?.url}:`,
          error.response?.data || error.message
        );
        const originalRequest = error.config;

        if (!originalRequest) {
          return Promise.reject(
            this.normalizeError(error, "request-config-missing")
          );
        }

        // If unauthorized and not a refresh request itself
        if (
          error.response?.status === 401 &&
          originalRequest.url !== "/auth/refresh" &&
          originalRequest.url !== "/auth/logout"
        ) {
          if (this.isRefreshing) {
            if (this.failedQueue.length >= this.maxQueueSize) {
              return Promise.reject(
                createAppError(
                  "NETWORK",
                  "QUEUE_FULL",
                  "Too many requests waiting for token refresh",
                  error
                )
              );
            }

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
            logger.log("🔄 Refreshing tokens...");
            const response = await this.auth.refreshToken();

            if (response.data.success) {
              logger.log("✅ Token refresh successful");
              this.processQueue(null);
              return this.axiosInstance(originalRequest);
            }

            throw new Error("Token refresh failed without error status");
          } catch (refreshError: unknown) {
            const appError = this.normalizeError(refreshError, "token-refresh");
            this.processQueue(appError);

            this.dispatchAuthError(appError);
            return Promise.reject(appError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(this.normalizeError(error, "api-response"));
      }
    );
  }

  private normalizeError(error: unknown, context: string): AppError {
    if (this.isAxiosError(error)) {
      const status = error.response?.status;
      const responseData = error.response?.data as AxiosErrorResponseData;
      const message = responseData?.message || error.message;

      let category: ErrorCategory = "UNKNOWN";
      let code = "UNKNOWN_ERROR";
      let retryable = false;

      if (!error.response) {
        category = "NETWORK";
        code = "NETWORK_ERROR";
        retryable = true;
      } else if (status === 401) {
        category = "AUTH";
        code = "UNAUTHORIZED";
      } else if (status === 403) {
        category = "AUTH";
        code = "FORBIDDEN";
      } else if (status === 429) {
        category = "NETWORK";
        code = "RATE_LIMITED";
        retryable = true;
      } else if (status && status >= 500) {
        category = "SERVER";
        code = "SERVER_ERROR";
        retryable = true;
      } else if (status && status >= 400) {
        category = "CLIENT";
        code = "CLIENT_ERROR";
      }

      return createAppError(category, code, message, error, retryable, {
        context,
        status,
        url: error.config?.url,
      });
    }

    return createAppError(
      "UNKNOWN",
      "UNKNOWN_ERROR",
      "An unknown error occurred",
      error,
      false,
      { context }
    );
  }

  private isAxiosError(error: unknown): error is AxiosError {
    return (error as AxiosError).isAxiosError === true;
  }

  private dispatchAuthError(error: AppError) {
    if (typeof window !== "undefined") {
      let eventType = "auth:session-expired";
      let eventDetail = {
        message: "Session expired. Please log in again.",
        error,
      };

      if (
        error.message?.includes("already used") ||
        error.message?.includes("invalid")
      ) {
        eventType = "auth:token-replay-detected";
        eventDetail = {
          message: "Security violation detected. Please log in again.",
          error,
        };
      }

      const event = new CustomEvent(eventType, { detail: eventDetail });
      window.dispatchEvent(event);
    }
  }

  private initializeApiMethods() {
    this.auth = {
      login: (data: Record<string, unknown>) =>
        this.axiosInstance.post("/auth/login", data),
      register: (data: Record<string, unknown>) =>
        this.axiosInstance.post("/auth/register", data),
      getProfile: () => this.axiosInstance.get("/auth/profile"),
      logout: () => this.axiosInstance.post("/auth/logout"),
      getWsToken: () => this.axiosInstance.get("/auth/ws-token"),
      refreshToken: () =>
        this.axiosInstance.post("/auth/refresh", {}, { withCredentials: true }),
    };

    this.message = {
      getRooms: () => this.axiosInstance.get<{ rooms: Room[] }>("/rooms"),
      getMessages: (roomId: string, page: number = 1, limit: number = 50) =>
        this.axiosInstance.get<{ messages: Message[] }>(
          `/rooms/${roomId}/messages`,
          { params: { page, limit } }
        ),
    };
  }
}

const api = new ApiClient();
export default api;
