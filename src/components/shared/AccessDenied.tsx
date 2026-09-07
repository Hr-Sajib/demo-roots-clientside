"use client";

import Loading from "@/redux/Shared/Loading";
import { useAllowance } from "@/hooks/useAllowance";
import type { AllowanceKey } from "@/hooks/useAllowance";

/**
 * Shared "page access denied" panel — used by every dashboard page
 * to render an `*See`-allowance failure consistently.
 *
 * Mirrors the pattern originally added to /containers/page.tsx: if
 * the persisted user hasn't rehydrated yet, render a Loading
 * skeleton; otherwise, if they lack the required allowance, render
 * a friendly Access Denied panel; otherwise render children.
 */
export interface AccessGateProps {
  /** The `*See` allowance required to view this page, e.g. `customerSee`. */
  allowance: AllowanceKey;
  /** Human-readable feature name shown in the "Access Denied" message. */
  label: string;
  children: React.ReactNode;
}

export default function AccessGate({
  allowance,
  label,
  children,
}: AccessGateProps): React.ReactElement {
  const allowed = useAllowance(allowance);

  // Persisted user is still hydrating → keep showing the loading shell.
  if (allowed === undefined) {
    return <Loading title="Loading permissions..." message="Restoring your session" />;
  }

  if (!allowed) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <span className="text-3xl">🔒</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 max-w-md mx-auto">
            You don&apos;t have permission to view {label}. Please contact
            your administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}