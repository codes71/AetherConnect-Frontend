'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User } from '@/lib/types';
import api from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname(); // Get current pathname
  const { toast } = useToast();

  const loadUser = useCallback(async () => {
    console.log('Attempting to load user...');
    try {
      setIsLoading(true);
      const response = await api.auth.getProfile();
      if (response.data.success) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch (error: any) {
      console.error('Failed to load user:', error.response?.data || error.message || error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Do not attempt to load user on login or signup pages
    if (pathname === '/login' || pathname === '/signup') {
      setIsLoading(false); // Ensure loading state is false
      return;
    }
    loadUser();
  }, [loadUser, pathname]); // Add pathname to dependency array

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    console.log('Login function called with email:', email);
    setIsLoading(true);
    try {
      const response = await api.auth.login({ email, password });
      if (response.data.success) {
        await loadUser();
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
      console.error('Login error:', error.response?.data || error.message || error);
      toast({
        title: 'Login failed',
        description: error.response?.data?.message || 'Network error occurred',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadUser, toast]);

  const register = useCallback(async (name: string, email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await api.auth.register({ name, email, password });
      if (response.data.success) {
        await loadUser();
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
      console.error('Registration error:', error.response?.data || error.message || error);
      toast({
        title: 'Registration failed',
        description: error.response?.data?.message || 'A network error occurred',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadUser, toast]);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
      setUser(null);
      router.push('/login');
      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully.',
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Logout failed',
        description: 'Failed to log out. Please try again.',
        variant: 'destructive',
      });
    }
  }, [router, toast]);

const refreshAuth = useCallback(async () => {
    console.log('Refreshing auth...');  
    try {
      await api.auth.refreshToken();
      await loadUser();
      console.log('Auth refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh auth:', error);
      setUser(null);
      router.push('/login');
      toast({
        title: 'Session expired',
        description: 'Please log in again.',
        variant: 'destructive',
      });
    }
  }, [loadUser, router, toast]);

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
