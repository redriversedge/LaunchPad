import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get("better-auth.session_token")?.value;
  const { pathname } = request.nextUrl;

  // Public paths that don't require auth
  const publicPaths = ["/", "/login", "/register", "/api/auth"];
  const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(path));

  if (!sessionToken && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (sessionToken && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
};
