"use client";

import { usePathname } from "next/navigation";
import ContainerNavTabs from "@/components/shared/ContainerNavTabs";

// Shown only on the 3 list pages (not their /new, /[id]/edit, /[id]/view
// sub-routes). Because a shared layout persists across navigation between
// sibling routes in the same segment (Next.js App Router never remounts
// a layout just because the nested page changes), the tab bar itself
// never unmounts when switching tabs — only `children` swaps underneath
// it, so the active highlight updates instantly and each destination
// page's own loading state (RTK Query `isLoading`) is what's visible
// while data fetches, not a frozen/blank tab bar.
const LIST_PAGE_PATHS = new Set([
  "/containers",
  "/containers/container-po",
  "/containers/supplier-credit-memo",
]);

export default function ContainersLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showTabs = pathname !== null && LIST_PAGE_PATHS.has(pathname);

  return (
    <div>
      {showTabs && (
        <div className="p-5 pb-0 flex justify-end">
          <ContainerNavTabs />
        </div>
      )}
      {children}
    </div>
  );
}
