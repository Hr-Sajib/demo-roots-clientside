"use client";

// Visiting `/` inside the dashboard group should land on the actual
// dashboard content rather than re-render the sidebar. The sidebar is
// owned by the layout (see `layout.tsx` → `AppSidebar`); this page is
// just a thin client-side redirect that runs after redux has
// rehydrated the persisted user so we can route to the first allowed
// menu item if the user isn't permitted on `/dashboard`.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Loading from "@/redux/Shared/Loading";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export default function DashboardIndex() {
  const router = useRouter();
  const user = useCurrentUser();

  useEffect(() => {
    // Wait one tick for PersistGate rehydration to settle before
    // deciding where to send the user.
    const role = user?.role?.toLowerCase();

    // Sales users (and any role without dashboard access) land on
    // `/prospect`, which is their only permitted landing page.
    if (role && role !== "admin" && role !== "manager") {
      router.replace("/prospects");
      return;
    }

    // Admins and managers go to the dashboard proper.
    router.replace("/dashboard");
  }, [router, user?.role]);

  return <Loading title="Loading dashboard…" />;
}
