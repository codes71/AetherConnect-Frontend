"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { loginUser, registerUser, logoutUser, getUserProfile, clearAuthCookies, forceLogout } from '@/lib/api'; // Assuming these functions will be created

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

  const checkAuthStatus = async () => {
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
        } else {
          // If backend verification fails, clear local storage and user state
          console.warn("Local storage user data is stale or invalid, clearing.");
          removeUserFromLocalStorage();
          setUser(null);
          clearAuthCookies(); // Also clear any lingering cookies
        }
      } else {
        // If no user in local storage, try to get profile (which uses cookies if present)
        const profileResponse = await getUserProfile();
        if (profileResponse.success && profileResponse.user && profileResponse.user.id) {
          setUser(profileResponse.user);
          saveUserToLocalStorage(profileResponse.user);
          clearAuthCookies(); // Clear cookies after successful profile fetch and local storage save
        } else {
          setUser(null);
          clearAuthCookies(); // Ensure cookies are cleared if no valid session
        }
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      removeUserFromLocalStorage();
      setUser(null);
      clearAuthCookies(); // Clear user and cookies on any error
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const result = await loginUser(credentials);
    if (result.success) {
      // After successful login, fetch the user profile
      const profileResponse = await getUserProfile();
      if (profileResponse.success && profileResponse.user && profileResponse.user.id) {
        setUser(profileResponse.user);
        saveUserToLocalStorage(profileResponse.user);
        // Removed clearAuthCookies() here. Middleware and AuthProvider's checkAuthStatus
        // will rely on HTTP-only cookies for session validation.
        // Client-side cookies are not explicitly stored, and HTTP-only cookies
        // are managed by the backend.
        return { success: true, message: "Login successful", user: profileResponse.user };
      } else {
        // If login was successful but profile fetch failed
        console.error("Login successful, but failed to fetch user profile.");
        removeUserFromLocalStorage();
        setUser(null);
        clearAuthCookies(); // Clear client-side cookies if profile fetch fails
        return { success: false, message: "Login successful, but failed to retrieve user profile." };
      }
    }
    return result; // Return original login result if not successful
  };

  const register = async (userData: RegisterData) => {
    const result = await registerUser(userData);
    return result;
  };

  const logout = async (options?: LogoutOptions) => {
    const result = await logoutUser(); // This also calls clearAuthCookies internally
    if (result.success) {
      setUser(null);
      removeUserFromLocalStorage(); // Clear user from local storage on logout
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

  // Removed the refreshAuth function as per user feedback.
  // const refreshAuth = async () => {
  //   const result = await refreshAccessToken();
  //   if (result.success) {
  //     // After successful refresh, fetch the latest user profile
  //     const profileResponse = await getUserProfile();
  //     // Ensure updated profile also has a valid user object with an ID
  //     if (profileResponse.success && profileResponse.user && profileResponse.user.id) {
  //       setUser(profileResponse.user);
  //       return true; // Indicate successful refresh and user update
  //     }
  //   }
  //   setUser(null); // Clear user if refresh fails or profile fetch fails/user missing
  //   return false; // Indicate failed refresh
  // };

  const isAuthenticated = !!user;

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
