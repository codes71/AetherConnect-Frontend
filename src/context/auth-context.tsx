'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User } from '@/lib/types';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/utils';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (username: string, firstName: string, lastName: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const loadUser = useCallback(async () => {
    logger.log('Attempting to load user...');
    try {
      setIsLoading(true);
      const response = await api.auth.getProfile();
      if (response.data.success) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (error: any) {
      logger.error('Failed to load user:', error.response?.data || error.message || error);
      setUser(null);
      
      if (error.response?.status === 401) {
        return;
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully.',
      });
    } catch (error: any) {
      logger.error('Logout error:', error);
      // Even if logout API fails, proceed with client-side cleanup
    }
    
    // The server is responsible for clearing HttpOnly cookies.
    // We just clear the user state and redirect.
    setUser(null);
    router.push('/login');
  }, [router, toast]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    const handleAuthError = (title: string, description: string) => {
      // Ensure we call the logout endpoint to have the server clear HttpOnly cookies
      api.auth.logout().catch(err => logger.error("Logout call during auth error failed:", err));
      
      setUser(null);
      toast({
        title,
        description,
        variant: 'destructive',
      });
      router.push('/login');
    };

    const handleSessionExpired = () => {
      handleAuthError('Session expired', 'Please log in again.');
    };

    const handleTokenReplay = (event: CustomEvent) => {
      handleAuthError('Security Alert', event.detail?.message || 'Security violation detected. Please log in again.');
    };

    window.addEventListener('auth:session-expired', handleSessionExpired);
    window.addEventListener('auth:token-replay-detected', handleTokenReplay as EventListener);
    
    return () => {
      window.removeEventListener('auth:session-expired', handleSessionExpired);
      window.removeEventListener('auth:token-replay-detected', handleTokenReplay as EventListener);
    };
  }, [toast, router]);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    logger.log('Login function called with email:', email);
    setIsLoading(true);
    try {
      const response = await api.auth.login({ email, password });
      if (response.data.success) {
        setUser(response.data.user);
        logger.log('Login successful, user set from response:', response.data.user);
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
    } catch (error: any) {
      logger.error('Login error:', error.response?.data || error.message || error);
      toast({
        title: 'Login failed',
        description: error.response?.data?.message || 'Network error occurred',
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
          description: response.data.message || 'Please check your details',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error: any) {
      logger.error('Registration error:', error.response?.data || error.message || error);
      toast({
        title: 'Registration failed',
        description: error.response?.data?.message || 'A network error occurred',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const refreshAuth = useCallback(async () => {
    logger.log('--- Refreshing tokens ---');  
    try {
      const response = await api.auth.refreshToken();
      
      if (response.data.success) {
        logger.log('--- Token Refresh (Rotation) Successful ---');
        logger.log('Auth refreshed successfully');
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error: any) {
      logger.error('Failed to refresh auth:', error);
      
      const errorMessage = error.response?.data?.message || error.message;
      
      if (errorMessage?.includes('already used') || errorMessage?.includes('invalid')) {
        toast({
          title: 'Security Alert',
          description: 'Token reuse detected. Please log in again for security.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Session expired',
          description: 'Please log in again.',
          variant: 'destructive',
        });
      }
      
      setUser(null);
      router.push('/login');
    }
  }, [router, toast]);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user, isLoading, refreshAuth }}>
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