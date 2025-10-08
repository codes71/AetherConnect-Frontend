"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import useAuthStore from "@/store/authStore";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const loadUser = useAuthStore((state) => state.loadUser);
  const pathname = usePathname();
  const router = useRouter();
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
    const { isAuthenticated } = useAuthStore.getState();
    const publicPaths = ["/login", "/signup"];
    if (isAuthenticated && publicPaths.includes(pathname)) {
      router.push("/chat");
    }
  }, [pathname, router]); // isAuthenticated is accessed via getState, so it's not a direct dependency

  useEffect(() => {
    const handleAuthError = (title: string, description: string) => {
      const { logout } = useAuthStore.getState();
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
  }, [toast, router]);

  return (
    <html lang="en">
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
