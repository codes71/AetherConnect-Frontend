import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger } from './lib/utils';
export function middleware(request: NextRequest) {
  // Check for authentication token in cookies
  const accessToken = request.cookies.get('accessToken')?.value;
  const refreshToken = request.cookies.get('refreshToken')?.value;
  const isAuthenticated = !!(accessToken || refreshToken);

  const protectedPaths = ['/chat', '/profile'];
  const isProtectedPath = protectedPaths.some(path => request.nextUrl.pathname.startsWith(path));

  if (isProtectedPath && !isAuthenticated) {
    logger.log("Middleware: Unauthenticated access to protected route, redirecting to /login");
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Redirect authenticated users away from auth pages
  const authPaths = ['/login', '/signup'];
  const isAuthPath = authPaths.some(path => request.nextUrl.pathname === path);

  if (isAuthPath && isAuthenticated) {
    logger.log("Middleware: Authenticated user accessing auth page, redirecting to /chat");
    return NextResponse.redirect(new URL('/chat', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/chat/:path*', '/profile/:path*', '/login', '/signup'],
};
