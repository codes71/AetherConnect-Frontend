'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { User } from '@/lib/types';
import { getProfile } from '@/lib/api';

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

  useEffect(() => {
    const token = Cookies.get('token');
    if (token) {
      getProfile()
        .then(response => {
          setUser(response.data);
        })
        .catch(() => {
          Cookies.remove('token');
          router.push('/login');
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [router]);

  const login = (token: string) => {
    Cookies.set('token', token, { expires: 7, secure: true }); // Expires in 7 days
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    getProfile().then(response => {
      setUser(response.data);
      router.push('/chat');
    });
  };

  const logout = () => {
    Cookies.remove('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    router.push('/login');
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
