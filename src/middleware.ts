import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value;
  const { pathname } = req.nextUrl;

  // If the user is authenticated
  if (token) {
    // Redirect from login or signup to chat
    if (pathname.startsWith('/login') || pathname.startsWith('/signup')) {
      return NextResponse.redirect(new URL('/chat', req.url));
    }
  }
  // If the user is not authenticated
  else {
    // Protect chat routes
    if (pathname.startsWith('/chat')) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/chat/:path*', '/login', '/signup'],
};
