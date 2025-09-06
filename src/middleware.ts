import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const accessToken = req.cookies.get("accessToken");
  const refreshToken = req.cookies.get("refreshToken");
  const { pathname } = req.nextUrl;

  const isAuthenticated = !!accessToken || !!refreshToken;

  // ✅ Authenticated user
  if (isAuthenticated) {
    console.log("Authenticated user accessing:", pathname);

    // Redirect root → chat
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/chat", req.url));
    }

    // Redirect login/signup → chat
    if (pathname.startsWith("/login") || pathname.startsWith("/signup")) {
      return NextResponse.redirect(new URL("/chat", req.url));
    }
  } else {
    // ❌ Unauthenticated user
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Protect chat routes
    if (pathname.startsWith("/chat")) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/chat/:path*", "/login", "/signup"],
};
