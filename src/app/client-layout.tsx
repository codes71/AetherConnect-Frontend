"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/context/auth-context"; // Import useAuth hook
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const { logout, isLoading } = useAuth();

  // Effect to handle session expiration and token replay security alerts
  useEffect(() => {
    if (isLoading) return; // Don't set up event listeners while loading

    const handleAuthError = (title: string, description: string) => {
      logout({
        suppressToast: true,
        redirect: false,
        toastFn: toast,
        routerPush: (path: string) => {
          router.push(path);
        },
      });
      toast({
        title,
        description,
        variant: "destructive",
      });
    };

    const handleSessionExpired = (event: CustomEvent) => {
      // The middleware and AuthProvider's checkAuthStatus should handle redirects.
      // This client-side event listener is for displaying a toast on session expiration.
      handleAuthError(
        "Session Expired",
        event.detail?.message || "Please log in again."
      );
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
  }, [toast, router, logout, isLoading]); // Removed isAuthenticated from dependencies

  // No explicit loading state return here, as middleware handles initial route protection.
  // The AuthProvider's isLoading state will manage rendering within components that use useAuth.

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
      <Toaster />
    </ThemeProvider>
  );
}
