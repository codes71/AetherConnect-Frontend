import { AppError, ErrorHandlingStrategy, createAppError, ErrorStrategies,ErrorCategory } from '@/lib/error/types';
import { AxiosError } from 'axios';
import { logger } from '@/lib/utils';

interface AxiosErrorResponseData {
  message?: string;
  [key: string]: unknown;
}

export class ApiErrorHandler {
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    strategy: ErrorHandlingStrategy = ErrorStrategies.DEFAULT,
    context: string = 'unknown'
  ): Promise<{ success: boolean; data?: T; error?: AppError }> {
    let attempts = 0;
    
    while (attempts <= strategy.maxRetries) {
      try {
        const result = await operation();
        return { success: true, data: result };
      } catch (error) {
        attempts++;
        const appError = this.normalizeError(error, context);
        
        logger.warn(`API attempt ${attempts}/${strategy.maxRetries + 1} failed:`, appError);
        
        if (!strategy.shouldRetry(appError) || attempts > strategy.maxRetries) {
          return { success: false, error: appError };
        }
        
        const delayMs = strategy.retryDelay * Math.pow(2, attempts - 1);
        await this.delay(delayMs);
      }
    }
    
    return { success: false, error: this.createTimeoutError(context) };
  }

  static normalizeError(error: unknown, context: string): AppError {
    if (this.isAxiosError(error)) {
      return this.normalizeAxiosError(error, context);
    }
    
    if (error instanceof Error) {
      return createAppError(
        'UNKNOWN',
        'UNKNOWN_ERROR',
        error.message,
        error,
        false,
        { context }
      );
    }
    
    return createAppError(
      'UNKNOWN',
      'UNKNOWN_ERROR',
      'An unknown error occurred',
      error,
      false,
      { context }
    );
  }

  private static isAxiosError(error: unknown): error is AxiosError {
    return (error as AxiosError).isAxiosError === true;
  }

  private static normalizeAxiosError(error: AxiosError, context: string): AppError {
    const status = error.response?.status;
    const responseData = error.response?.data as AxiosErrorResponseData;
    const message = responseData?.message || error.message;
    
    let category: ErrorCategory = 'UNKNOWN';
    let code = 'UNKNOWN_ERROR';
    let retryable = false;

    if (!error.response) {
      category = 'NETWORK';
      code = 'NETWORK_ERROR';
      retryable = true;
    } else if (status === 401) {
      category = 'AUTH';
      code = 'UNAUTHORIZED';
    } else if (status === 403) {
      category = 'AUTH';
      code = 'FORBIDDEN';
    } else if (status === 429) {
      category = 'NETWORK';
      code = 'RATE_LIMITED';
      retryable = true;
    } else if (status && status >= 500) {
      category = 'SERVER';
      code = 'SERVER_ERROR';
      retryable = true;
    } else if (status && status >= 400) {
      category = 'CLIENT';
      code = 'CLIENT_ERROR';
    }

    return createAppError(
      category,
      code,
      message,
      error,
      retryable,
      { 
        context, 
        status, 
        url: error.config?.url,
        method: error.config?.method
      }
    );
  }

  private static createTimeoutError(context: string): AppError {
    return createAppError(
      'NETWORK',
      'TIMEOUT',
      'Request timed out after maximum retries',
      undefined,
      false,
      { context }
    );
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}