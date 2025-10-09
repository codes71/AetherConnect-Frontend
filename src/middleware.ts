import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { logger } from "./lib/utils";

export function middleware(request: NextRequest) {
  // Check for the isLoggedIn cookie
  const isLoggedIn = request.cookies.get("isLoggedIn")?.value === 'true';

  logger.log("Middleware: Checking for isLoggedIn cookie. Found:", isLoggedIn);

  const { pathname } = request.nextUrl;

  // Protected routes that require authentication
  const protectedPaths = ["/chat", "/profile"];
  const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));

  // If trying to access a protected path without being authenticated, redirect to login
  if (isProtectedPath && !isLoggedIn) {
    logger.log(`Middleware: Unauthenticated access to protected route "${pathname}". Redirecting to /login.`);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Allow the request to proceed. Client-side AuthContext will handle redirection for authenticated users on auth pages.
  return NextResponse.next();
}

export const config = {
  matcher: ["/chat/:path*", "/profile/:path*", "/login", "/signup"],
};
