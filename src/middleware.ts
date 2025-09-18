import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// This middleware is now simplified to remove authentication checks.
// The client-side AuthProvider is responsible for handling routing based on auth state.
export function middleware(req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  // We no longer need to match all these routes for auth checks.
  // This can be adjusted if other middleware logic is added later.
  matcher: [],
};