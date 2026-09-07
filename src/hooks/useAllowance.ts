"use client";

/**
 * Allowance-based access helpers.
 *
 * The server defines 21 boolean `allowances.*` flags on every user
 * (see `serverside/src/app/modules/user/user.interface.ts`). Each
 * protected route under the (dashboard) layout is gated by exactly one
 * `*See` allowance, and in-page write actions (Add / Update / Delete)
 * are gated by their matching `*Add` / `*Update` / `*Delete` allowance.
 *
 * Policy:
 *   - Admin and manager roles bypass every check (full access).
 *   - Every other role is gated strictly by their `allowances` flags.
 *   - `useAllowance(key)` returns `undefined` while the user is
 *     hydrating, `true` if allowed, `false` if not. Treat `undefined`
 *     as "loading" and render a skeleton; treat `false` as "denied".
 *   - `usePathnameAllowance()` resolves the current pathname to its
 *     required `*See` key (or `null` for non-gated paths).
 */

import { useSelector } from "react-redux";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import type { RootState } from "@/redux/store";
import { type CurrentUser } from "@/redux/slices/userSlice";

/** Allowance flags present on the `CurrentUser.allowances` shape.
 *  Note `mainDashBorad` typo matches the server schema exactly.
 *  The server-side schema also exposes `canSeePurchasePrices` /
 *  `canSeeProfits` but those aren't yet surfaced on the persisted
 *  user slice, so we omit them here until they are.
 */
export type AllowanceKey =
  // dashboard
  | "mainDashBorad"
  // prospects
  | "prospectSee"
  | "prospectAdd"
  | "prospectUpdate"
  | "prospectDelete"
  // customers
  | "customerSee"
  | "customerAdd"
  | "customerUpdate"
  | "customerDelete"
  // orders
  | "orderSee"
  | "orderAdd"
  | "orderUpdate"
  | "orderDelete"
  // inventory
  | "inventorySee"
  | "inventoryAdd"
  | "inventoryUpdate"
  | "inventoryDelete"
  // containers (covers Containers + Categories)
  | "containerSee"
  | "containerAdd"
  | "containerUpdate"
  | "containerDelete";

/**
 * Pathname → required `*See` allowance.
 *
 * Order matters: longest prefixes first so `/containers/...` resolves
 * to `containerSee` and not `inventorySee`.
 *
 * Routes not in this map are non-gated (e.g. `/user-management`,
 * `/reports`). PrivateRoute only denies access if the map returns a
 * key and the user lacks it.
 */
const PATHNAME_ALLOWANCE: ReadonlyArray<readonly [prefix: string, key: AllowanceKey]> = [
  ["/dashboard", "mainDashBorad"],
  ["/prospects", "prospectSee"],
  ["/customers", "customerSee"],
  ["/orders", "orderSee"],
  ["/inventory", "inventorySee"],
  // Container PO and Supplier Credit Memo live under /containers/... as
  // nested routes (third-tab siblings of the Containers page itself),
  // so the single "/containers" prefix below already covers them —
  // no separate entries needed.
  ["/containers", "containerSee"],
  ["/categories", "containerSee"],
];

export function pathnameToAllowance(pathname: string | null): AllowanceKey | null {
  if (!pathname) return null;
  for (const [prefix, key] of PATHNAME_ALLOWANCE) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return key;
    }
  }
  return null;
}

/** True for the two roles that bypass all allowance checks. */
export function isAdminOrManager(user: CurrentUser | null | undefined): boolean {
  const role = user?.role?.toLowerCase();
  return role === "admin" || role === "manager";
}

/**
 * Read a single allowance flag from the persisted user.
 *
 * Returns:
 *   - `true`  → user explicitly has the flag (or role is admin/manager)
 *   - `false` → user is loaded and lacks the flag
 *   - `undefined` → user is not loaded yet (treat as loading)
 */
export function useAllowance(key: AllowanceKey): boolean | undefined {
  const user = useSelector((state: RootState) => state.user?.data ?? null);
  if (isAdminOrManager(user)) return true;
  // While the persisted user hasn't rehydrated yet, return undefined
  // so callers can render a skeleton rather than flashing a 403.
  if (!user) return undefined;
  return user.allowances?.[key] === true;
}

/**
 * Resolve the current pathname to its required `*See` allowance.
 *
 * Returns `null` for non-gated paths (so `PrivateRoute` can pass them
 * through), or the matching `AllowanceKey` for gated paths.
 */
export function usePathnameAllowance(): { key: AllowanceKey | null; allowed: boolean | undefined } {
  const pathname = usePathname();
  const key = useMemo(() => pathnameToAllowance(pathname), [pathname]);
  const allowed = useAllowance(key ?? "mainDashBorad");
  return useMemo(
    () => ({ key, allowed: key === null ? true : allowed }),
    [key, allowed],
  );
}