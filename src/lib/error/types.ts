export type ErrorCategory = 
  | 'NETWORK' 
  | 'AUTH' 
  | 'VALIDATION' 
  | 'SERVER' 
  | 'CLIENT' 
  | 'UNKNOWN';

export interface AppError {
  category: ErrorCategory;
  code: string;
  message: string;
  originalError?: unknown;
  retryable: boolean;
  context?: Record<string, unknown>;
  timestamp: Date;
}

export interface ErrorHandlingStrategy {
  shouldRetry: (error: AppError) => boolean;
  maxRetries: number;
  retryDelay: number;
  fallback?: () => void;
}

export const ErrorStrategies = {
  NETWORK: {
    shouldRetry: (error: AppError) => error.retryable,
    maxRetries: 3,
    retryDelay: 1000,
  } as ErrorHandlingStrategy,
  
  AUTH: {
    shouldRetry: (error: AppError) => error.code !== 'TOKEN_REPLAY',
    maxRetries: 1,
    retryDelay: 0,
  } as ErrorHandlingStrategy,
  
  DEFAULT: {
    shouldRetry: () => false,
    maxRetries: 0,
    retryDelay: 0,
  } as ErrorHandlingStrategy,
};

export function createAppError(
  category: ErrorCategory,
  code: string,
  message: string,
  originalError?: unknown,
  retryable: boolean = false,
  context?: Record<string, unknown>
): AppError {
  return {
    category,
    code,
    message,
    originalError,
    retryable,
    context,
    timestamp: new Date(),
  };
}