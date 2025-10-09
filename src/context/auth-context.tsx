"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { loginUser, registerUser, logoutUser, getUserProfile } from '@/lib/api';

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

// Define login credentials interface
interface LoginCredentials {
  email: string;
  password: string;
}

// Define registration data interface
interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
}

// Define toast function type
interface ToastFunction {
  (props: { title: string; description: string; variant?: "default" | "destructive" }): void;
}

// Define options for logout
interface LogoutOptions {
  suppressToast?: boolean;
  redirect?: boolean;
  toastFn?: ToastFunction;
  routerPush?: (path: string) => void;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; message: string; user?: User }>;
  register: (userData: RegisterData) => Promise<{ success: boolean; message: string; user?: User }>;
  logout: (options?: LogoutOptions) => Promise<{ success: boolean; message: string }>; // Accept optional logout options
  // refreshAuth: () => Promise<boolean>; // Removed as per user feedback
}

// Create context with a default value that indicates it's not yet provided
const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAuthenticated = !!user; // Declare isAuthenticated here

  // Function to load user from localStorage
  const loadUserFromLocalStorage = () => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const parsedUser: User = JSON.parse(storedUser);
          setUser(parsedUser);
          return parsedUser;
        } catch (error) {
          console.error("Error parsing user from localStorage:", error);
          localStorage.removeItem('user'); // Clear invalid data
        }
      }
    }
    return null;
  };

  // Function to save user to localStorage
  const saveUserToLocalStorage = (userData: User) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(userData));
    }
  };

  // Function to remove user from localStorage
  const removeUserFromLocalStorage = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
    }
  };

  // Helper to set a cookie
  const setCookie = (name: string, value: string, days: number) => {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
  };

  // Helper to erase a cookie
  const eraseCookie = (name: string) => {
    document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  };

  const checkAuthStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedUser = loadUserFromLocalStorage();

      if (storedUser) {
        setUser(storedUser); // Set user from localStorage immediately for faster UI
        // Then, verify the session with the backend to ensure validity
        const profileResponse = await getUserProfile();
        if (profileResponse.success && profileResponse.user && profileResponse.user.id) {
          // If backend confirms, update with fresh profile data (if any changes)
          setUser(profileResponse.user);
          saveUserToLocalStorage(profileResponse.user); // Update localStorage with fresh data
          setCookie('isLoggedIn', 'true', 30); // Ensure isLoggedIn cookie is set if user is valid
        } else {
          // If backend verification fails, clear local storage and user state
          console.warn("Local storage user data is stale or invalid, clearing.");
          removeUserFromLocalStorage();
          setUser(null);
          eraseCookie('isLoggedIn'); // Clear isLoggedIn cookie
        }
      } else {
        // If no user in local storage, no need to make API call
        setUser(null);
        eraseCookie('isLoggedIn'); // Ensure isLoggedIn cookie is cleared
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      removeUserFromLocalStorage();
      setUser(null);
      eraseCookie('isLoggedIn'); // Clear isLoggedIn cookie on any error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (credentials: LoginCredentials) => {
    const result = await loginUser(credentials);
    if (result.success && result.user) { // accessToken is handled by api.ts in localStorage
      setUser(result.user);
      saveUserToLocalStorage(result.user);
      setCookie('isLoggedIn', 'true', 30); // Set isLoggedIn cookie for middleware
      return { success: true, message: "Login successful", user: result.user };
    }
    // Handle cases where login is successful but user is missing
    if (result.success) {
      console.error("Login successful, but user data is missing from the response.");
      return { success: false, message: "Login successful, but failed to retrieve user profile." };
    }
    return result;
  };

  const register = async (userData: RegisterData) => {
    const result = await registerUser(userData);
    if (result.success && result.user) { // accessToken is handled by api.ts in localStorage
      // After successful registration, the user is also logged in.
      setUser(result.user);
      saveUserToLocalStorage(result.user);
      setCookie('isLoggedIn', 'true', 30); // Set isLoggedIn cookie for middleware
    }
    return result;
  };

  const logout = async (options?: LogoutOptions) => {
    const result = await logoutUser(); // This now calls clearAccessToken internally
    setUser(null);
    removeUserFromLocalStorage(); // Clear user from local storage on logout
    eraseCookie('isLoggedIn'); // Clear isLoggedIn cookie for middleware
    if (result.success) {
      if (!options?.suppressToast && options?.toastFn) {
        options.toastFn({
          title: "Logged Out",
          description: "You have been logged out successfully.",
        });
      }
      if (options?.redirect && options?.routerPush) {
        options.routerPush("/login");
      }
    }
    return result;
  };


  // Provide the context value. Ensure all necessary values are included.
  const contextValue = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    // refreshAuth, // Removed from context value
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // This error indicates that useAuth was called outside of AuthProvider
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
