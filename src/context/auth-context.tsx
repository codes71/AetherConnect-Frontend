'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/types';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/utils';
import { AxiosError } from 'axios';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, firstName: string, lastName: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const loadUser = useCallback(async () => {
    logger.log('Attempting to load user session...');
    logger.log('Current user state before loading:', !!userRef.current);
    try {
      // The Axios interceptor will handle token refreshes automatically.
      // We just need to wait for the final result.
      const response = await api.auth.getProfile();
      if (response.data.success) {
        setUser(response.data.user);
        logger.log('User session loaded successfully.');
      } else {
        // This case might occur if the API call succeeds but business logic fails.
        setUser(null);
      }
    } catch (error: unknown) {
      // This block will only be reached if the getProfile call fails *after*
      // the interceptor has already tried and failed to refresh the token.
      // In this case, the user is truly unauthenticated.
      const axiosError = error as AxiosError;
      logger.info('Failed to load user session:', axiosError.response?.data || axiosError.message || axiosError);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (options?: { suppressToast?: boolean }) => {
    try {
      await api.auth.logout();
      if (!options?.suppressToast) {
        toast({
          title: 'Logged out',
          description: 'You have been logged out successfully.',
        });
      }
    } catch (error: AxiosError) {
      logger.error('Logout API call failed:', error);
      // Even if the API fails, we must clear the client state.
    } finally {
      // The server is responsible for clearing HttpOnly cookies.
      // We just clear the user state and redirect.
      setUser(null);
      router.push('/login');
    }
  }, [router, toast]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    // This effect handles global auth events dispatched from the API client
    // when a token refresh fails permanently.
    const handleAuthError = (title: string, description: string) => {
      // We call a version of logout that doesn't show a toast,
      // because we're about to show our own specific one.
      logout({ suppressToast: true });
      toast({
        title,
        description,
        variant: 'destructive',
      });
    };

    const handleSessionExpired = () => {
      handleAuthError('Session Expired', 'Please log in again.');
    };

    const handleTokenReplay = (event: CustomEvent) => {
      handleAuthError('Security Alert', event.detail?.message || 'A security violation was detected. Please log in again.');
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    window.addEventListener('auth:token-replay-detected', handleTokenReplay as EventListener);
    
    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired);
      window.removeEventListener('auth:token-replay-detected', handleTokenReplay as EventListener);
    };
  }, [toast, logout]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    logger.log('Login function called with email:', email);
    setIsLoading(true);
    try {
      const response = await api.auth.login({ email, password });
      if (response.data.success) {
        setUser(response.data.user);
        logger.log('Login successful, user set:', response.data.user);
        toast({
          title: 'Login successful',
          description: 'Welcome back!',
        });
        return true;
      } else {
        toast({
          title: 'Login failed',
          description: response.data.message || 'Invalid credentials',
          variant: 'destructive', 
        });
        return false;
      }
    } catch (error: AxiosError) {
      logger.error('Login error:', error.response?.data || error.message || error);
      toast({
        title: 'Login failed',
        description: error.response?.data?.message || 'A network error occurred.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const register = useCallback(async (username: string, firstName: string, lastName: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await api.auth.register({ username, firstName, lastName, email, password });
      if (response.data.success) {
        setUser(response.data.user);
        toast({
          title: 'Registration successful',
          description: 'Welcome!',
        });
        return true;
      } else {
        toast({
          title: 'Registration failed',
          description: response.data.message || 'Please check your details.',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error: AxiosError) {
      logger.error('Registration error:', error.response?.data || error.message || error);
      toast({
        title: 'Registration failed',
        description: error.response?.data?.message || 'A network error occurred.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // The `refreshAuth` function is an internal concern of the api client,
  // so it's removed from the context's public value.
  const value = {
    user,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}