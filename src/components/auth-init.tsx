"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import useAuthStore from "@/store/authStore";

export function AuthInit() {
  const loadUser = useAuthStore((state) => state.loadUser);
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const publicPaths = ["/login", "/signup"];
    if (publicPaths.includes(pathname)) {
      useAuthStore.setState({ isLoading: false });
    } else {
      loadUser(toast); // Pass the toast function
    }
  }, [pathname, loadUser, toast]);

  useEffect(() => {
    const handleAuthError = (title: string, description: string) => {
      const { logout } = useAuthStore.getState();
      logout({ suppressToast: true, redirect: false, toastFn: toast, routerPush: (path) => window.location.href = path });
      toast({
        title,
        description,
        variant: "destructive",
      });
    };

    const handleSessionExpired = (event: CustomEvent) => {
      const user = useAuthStore.getState().user;
      if (user) {
        handleAuthError(
          "Session Expired",
          event.detail?.message || "Please log in again."
        );
      }
    };

    const handleTokenReplay = (event: CustomEvent) => {
      handleAuthError(
        "Security Alert",
        event.detail?.message || "A security violation was detected. Please log in again."
      );
    };

    window.addEventListener("auth:session-expired", handleSessionExpired as EventListener);
    window.addEventListener("auth:token-replay-detected", handleTokenReplay as EventListener);

    return () => {
      window.removeEventListener("auth:session-expired", handleSessionExpired as EventListener);
      window.removeEventListener("auth:token-replay-detected", handleTokenReplay as EventListener);
    };
  }, [toast]);

  return null;
}
