"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { User } from "@/lib/types";
import api from "@/api/api";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/utils";
import { enhancedApiCall, ApiHelpers } from "@/api/api-helpers";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (
    username: string,
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const loadUser = useCallback(async () => {
    logger.log("🔍 Loading user session...");
    setIsLoading(true);

    const { success, data } = await enhancedApiCall({
      apiCall: api.auth.getProfile(),
      errorContext: "auth-profile-initial",
      suppressErrorToast: true, // Silently fail on initial load
    });

    if (success && data?.success) {
      setUser(data.user);
      logger.log("✅ User session loaded successfully");
    } else {
      setUser(null);
    }
    setIsLoading(false);
  }, []);

  const logout = useCallback(
    async (options?: { suppressToast?: boolean; redirect?: boolean }) => {
      const { suppressToast = false, redirect = true } = options || {};

      try {
        const { success } = await enhancedApiCall({
          apiCall: api.auth.logout(),
          errorContext: "auth-logout",
          suppressErrorToast: true,
        });

        if (success && !suppressToast) {
          toast({
            title: "Logged out",
            description: "You have been logged out successfully.",
          });
        }
      } catch (error) {
        // Silently fail logout API call - we still want to clear local state
        logger.warn(
          "Logout API call failed, but proceeding with local cleanup",
          error
        );
      } finally {
        setUser(null);
        if (redirect) {
          router.push("/login");
        }
      }
    },
    [router, toast]
  );

  const refreshUser = useCallback(async () => {
    logger.log("🔄 Refreshing user data...");
    const { success, data } = await enhancedApiCall({
      apiCall: api.auth.getProfile(),
      errorContext: "auth-refresh-profile",
      suppressErrorToast: true,
    });

    if (success && data?.success) {
      setUser(data.user);
    }
  }, []);

  useEffect(() => {
    const publicPaths = ['/login', '/signup'];
    if (publicPaths.includes(pathname)) {
      // On login/signup, we know there's no user yet. Don't bother loading.
      setIsLoading(false);
      setUser(null);
    } else {
      // For all other paths (including '/'), check for a session.
      loadUser();
    }
  }, [pathname, loadUser]);

  useEffect(() => {
    const handleAuthError = (title: string, description: string) => {
      logout({ suppressToast: true, redirect: false });
      toast({
        title,
        description,
        variant: "destructive",
      });
    };

    const handleSessionExpired = (event: CustomEvent) => {
      // Only show session expired error if a user was actually logged in.
      if (userRef.current) {
        handleAuthError(
          "Session Expired",
          event.detail?.message || "Please log in again."
        );
      }
    };

    const handleTokenReplay = (event: CustomEvent) => {
      handleAuthError(
        "Security Alert",
        event.detail?.message ||
          "A security violation was detected. Please log in again."
      );
    };

    window.addEventListener(
      "auth:session-expired",
      handleSessionExpired as EventListener
    );
    window.addEventListener(
      "auth:token-replay-detected",
      handleTokenReplay as EventListener
    );

    return () => {
      window.removeEventListener(
        "auth:session-expired",
        handleSessionExpired as EventListener
      );
      window.removeEventListener(
        "auth:token-replay-detected",
        handleTokenReplay as EventListener
      );
    };
  }, [toast, logout]);

  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      setIsLoading(true);
      try {
        const { success, data } = await ApiHelpers.auth.login(
          api.auth.login({ email, password }),
          toast
        );

        if (success && data?.success) {
          setUser(data.user);
          logger.log("✅ Login successful");
          return true;
        }
        return false;
      } catch (error) {
        logger.error("Login failed:", error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  const register = useCallback(
    async (
      username: string,
      firstName: string,
      lastName: string,
      email: string,
      password: string
    ): Promise<boolean> => {
      setIsLoading(true);
      try {
        const { success, data } = await ApiHelpers.auth.register(
          api.auth.register({ username, firstName, lastName, email, password }),
          toast
        );

        if (success && data?.success) {
          setUser(data.user);
          return true;
        }
        return false;
      } catch (error) {
        logger.error("Registration failed:", error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [toast]
  );

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    refreshUser,
    isAuthenticated: !!user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
