"use client";

import { useSelector } from "react-redux";
import {
  selectCurrentUser,
  selectUserRole,
  selectUserId,
  type CurrentUser,
} from "@/redux/slices/userSlice";
import type { RootState } from "@/redux/store";

/**
 * Read the currently logged-in user from Redux (persisted).
 *
 * The redux store hydrates from localStorage via redux-persist before
 * the React tree mounts, but the first paint can still arrive with the
 * default empty state. Calling components should treat `data === null`
 * as "not loaded yet" — for gating logic, prefer the role check from
 * PrivateRoute. For display use, `data?.image ?? "/fallback.png"`
 * works fine because the value will populate on the next render.
 *
 * Migration note: previously this read from `localStorage.getItem("userData")`
 * in 5 places (page.tsx, container, order-management, CustomerTable,
 * ContainerTable). Those sites now consume this hook so that login/
 * logout, profile edits, and rehydration are centralized.
 */
export function useCurrentUser(): CurrentUser | null {
  return useSelector((state: RootState) => selectCurrentUser(state));
}

export function useUserRole(): string | null {
  return useSelector((state: RootState) => selectUserRole(state));
}

export function useUserId(): string | null {
  return useSelector((state: RootState) => selectUserId(state));
}