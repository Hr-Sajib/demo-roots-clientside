import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Server-side auth gate.
 *
 * The whole point of this file is to keep unauthenticated visitors out
 * of the dashboard tree (anything under (dashboard)/* plus the bare
 * "/") without ever rendering PrivateRoute. Doing the check here means:
 *
 *   - No flash of the Loading skeleton while the client-side gate boots.
 *   - No chance of leaking the sidebar/AppShell if a client bug ever
 *     forgets to gate.
 *   - The redirect to /login happens at the network layer, so the user
 *     never sees a half-rendered dashboard.
 *
 * Public paths: /login and /signup. Anywhere else requires a `token`
 * cookie (the same cookie set by LoginPage on successful sign-in).
 *
 * If an authenticated user navigates to /login or /signup we bounce
 * them straight to /dashboard so they don't see a form they can't use.
 *
 * The `?next=` query param lets the user land back where they were
 * headed after they sign in. PrivateRoute and LoginPage both honor it.
 */
const PUBLIC_PATHS = new Set(["/login", "/signup"]);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("token")?.value;

  // Public route — let it through, but redirect already-authenticated
  // visitors away from the form.
  if (PUBLIC_PATHS.has(pathname)) {
    if (token) {
      const dash = new URL("/dashboard", req.url);
      return NextResponse.redirect(dash);
    }
    return NextResponse.next();
  }

  // Everything else (the (dashboard) group, the bare "/", any future
  // private section) requires a token.
  if (!token) {
    const login = new URL("/login", req.url);
    // Preserve the originally requested path so the login flow can
    // resume it after a successful sign-in.
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

/**
 * Matcher excludes Next.js internals, static assets, and any path that
 * has a `.` in it (covers files like .png, .jpg, .css, .js). Keeping
 * the matcher tight means middleware runs only on navigable pages.
 */
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
