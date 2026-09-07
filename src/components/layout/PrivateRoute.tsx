"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Loading from "@/redux/Shared/Loading";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { isAdminOrManager, pathnameToAllowance } from "@/hooks/useAllowance";
import type { CurrentUser } from "@/redux/slices/userSlice";

/**
 * Authenticated + allowance-gated route gate.
 *
 * Runs under src/app/(dashboard)/layout.tsx and protects every page
 * nested inside the (dashboard) route group.
 *
 * Two-stage gating (mirroring the original intent):
 *   1. Token gate (defensive fallback — middleware.ts already handles
 *      this at the network layer).
 *   2. Allowance gate: if the current pathname maps to a `*See`
 *      allowance and the user (a) is not an admin/manager and
 *      (b) lacks that allowance → redirect.
 *
 * The redirect target for a denied user is the first sidebar item
 * they ARE allowed to see — falls back to /login if there are none.
 * The previous version hardcoded /prospects as the only landing for
 * salesuser, which is wrong for users whose allowances include
 * dashboard / customer / order / inventory.
 *
 * The `?next=` query is preserved on the no-token redirect so the
 * login form can bounce the user back to where they were headed.
 */
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const token = Cookies.get("token");
  const role = Cookies.get("role")?.toLowerCase();
  const userData = useCurrentUser();

  // While the persisted user hasn't rehydrated, hold the screen on a
  // loading skeleton — flashing a 403 here causes an ugly "Access
  // Denied → reload → page" cycle for sales users on hard refresh.
  const userReady = Boolean(token) && (isAdminOrManager(userData) || userData !== null);

  const [state, setState] = useState<
    "checking" | "allowed" | "redirecting"
  >("checking");

  useEffect(() => {
    // 1) No token → bounce to /login with `?next=` preserved.
    if (!token) {
      setState("redirecting");
      const login = new URL("/login", window.location.origin);
      if (pathname) login.searchParams.set("next", pathname);
      router.replace(login.pathname + login.search);
      return;
    }

    // 2) Wait for persisted user to hydrate before deciding.
    if (!userReady) return;

    // 3) Resolve the pathname's required allowance (or null for
    //    non-gated paths like /user-management).
    const requiredKey = pathnameToAllowance(pathname ?? "");
    const allowed = isAdminOrManager(userData) || requiredKey === null
      ? true
      : userData?.allowances?.[requiredKey] === true;

    if (!allowed) {
      setState("redirecting");
      // Pick the first allowed sidebar entry. The (dashboard) layout
      // renders the same sidebar, so the redirect lands on a page the
      // user can actually see.
      const firstAllowed =
        userData && !isAdminOrManager(userData)
          ? findFirstAllowedRoute(userData.allowances)
          : "/dashboard";
      router.replace(firstAllowed ?? "/login");
      return;
    }

    setState("allowed");
  }, [token, role, userReady, userData, pathname, searchParams, router]);

  if (state !== "allowed") {
    return <Loading title="Checking access…" />;
  }

  return <>{children}</>;
};

/**
 * Pick the first sidebar route the user has the matching `*See`
 * allowance for. Mirrors the order in AppSidebar.tsx so the redirect
 * lands on the same item the sidebar would have rendered first.
 */
function findFirstAllowedRoute(
  allowances: CurrentUserAllowances | undefined,
): string | null {
  if (!allowances) return "/login";
  if (allowances.mainDashBorad) return "/dashboard";
  if (allowances.prospectSee) return "/prospects";
  if (allowances.customerSee) return "/customers";
  if (allowances.orderSee) return "/orders";
  if (allowances.inventorySee) return "/inventory";
  if (allowances.containerSee) return "/containers";
  return "/login";
}

/** Local mirror of CurrentUser.allowances — see userSlice.ts. */
type CurrentUserAllowances = NonNullable<CurrentUser["allowances"]>;

export default PrivateRoute;