'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { User } from '@/lib/types';
import api, { getProfile } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  login: (token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const logout = useCallback(() => {
    Cookies.remove('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    router.push('/login');
  }, [router]);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = Cookies.get('token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          const response = await getProfile();
          setUser(response.data);
        } catch (error) {
          console.error('Session expired or invalid, logging out.');
          logout();
        }
      }
      setIsLoading(false);
    };

    initializeAuth();
  }, [logout]);

  const login = (token: string) => {
    Cookies.set('token', token, { expires: 7, secure: true }); // Expires in 7 days
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    getProfile().then(response => {
      setUser(response.data);
      router.push('/chat');
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading }}>
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
