import { AxiosError } from 'axios';
import { logger } from './utils';

interface ToastFunction {
  (props: { title: string; description?: string; variant?: 'default' | 'destructive' }): void;
}

export async function handleApiCall<T>(apiCall: Promise<T>, toast: ToastFunction, successMessage?: string): Promise<{ success: boolean; data?: T }> {
  try {
    const response = await apiCall;
    if (successMessage) {
      toast({
        title: successMessage,
      });
    }
    return { success: true, data: response };
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    logger.error('API call failed:', axiosError.response?.data || axiosError.message || axiosError);
    toast({
      title: 'Error',
      description: (axiosError.response?.data as { message?: string })?.message || axiosError.message || 'An unexpected error occurred.',
      variant: 'destructive',
    });
    return { success: false };
  }
}
