import { AxiosResponse } from "axios";
import { ApiErrorHandler } from "./error-handler";
import { ErrorStrategies, ErrorHandlingStrategy, AppError } from "../lib/error/types";

interface ToastFunction {
  (props: {
    title: string;
    description?: string;
    variant?: "default" | "destructive";
  }): void;
}

interface EnhancedApiCallOptions<T> {
  apiCall: Promise<AxiosResponse<T>>;
  toast?: ToastFunction;
  successMessage?: string;
  errorContext: string;
  strategy?: ErrorHandlingStrategy;
  suppressErrorToast?: boolean;
}

export async function enhancedApiCall<T>({
  apiCall,
  toast,
  successMessage,
  errorContext,
  strategy = ErrorStrategies.DEFAULT,
  suppressErrorToast = false,
}: EnhancedApiCallOptions<T>): Promise<{
  success: boolean;
  data?: T;
  error?: AppError;
}> {
  const result = await ApiErrorHandler.executeWithRetry(
    async () => {
      const response = await apiCall;
      return response.data;
    },
    strategy,
    errorContext
  );

  if (result.success && result.data) {
    if (successMessage && toast) {
      toast({
        title: successMessage,
        variant: "default",
      });
    }
    return { success: true, data: result.data };
  }

  if (result.error && toast && !suppressErrorToast) {
    const error = result.error;
    let title = "Error";
    let description = error.message;

    // Context-specific error messages
    if (errorContext.includes("login")) {
      title = "Login Failed";
      description = "Invalid email or password";
    } else if (errorContext.includes("register")) {
      title = "Registration Failed";
    } else if (errorContext.includes("profile")) {
      title = "Failed to Load Profile";
    }

    toast({
      title,
      description,
      variant: "destructive",
    });
  }

  return result;
}

// Helper for common API patterns
export const ApiHelpers = {
  auth: {
    login: (apiCall: Promise<AxiosResponse>, toast?: ToastFunction) =>
      enhancedApiCall({
        apiCall,
        toast,
        errorContext: "auth-login",
        strategy: ErrorStrategies.AUTH,
      }),

    register: (apiCall: Promise<AxiosResponse>, toast?: ToastFunction) =>
      enhancedApiCall({
        apiCall,
        toast,
        errorContext: "auth-register",
        strategy: ErrorStrategies.AUTH,
      }),

    profile: (apiCall: Promise<AxiosResponse>, toast?: ToastFunction) =>
      enhancedApiCall({
        apiCall,
        toast,
        errorContext: "auth-profile",
        strategy: ErrorStrategies.NETWORK,
      }),
  },

  message: {
    list: (apiCall: Promise<AxiosResponse>, toast?: ToastFunction) =>
      enhancedApiCall({
        apiCall,
        toast,
        errorContext: "message-list",
        strategy: ErrorStrategies.NETWORK,
      }),
  },
};
