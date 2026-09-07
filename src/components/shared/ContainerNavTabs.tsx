"use client";

import { useRouter, usePathname } from "next/navigation";

const TABS: { label: string; href: string }[] = [
  { label: "Containers", href: "/containers" },
  { label: "Container PO", href: "/containers/container-po" },
  { label: "Supplier Credit Memo", href: "/containers/supplier-credit-memo" },
];

// Flush top-right tab bar shared by the Containers / Container PO /
// Supplier Credit Memo pages. Rendered once from containers/layout.tsx
// so it persists (never remounts) across navigation between the three
// sibling routes — active state comes from the live pathname rather
// than a per-page prop, so the highlight updates the instant the URL
// changes, well before the destination page's own data has loaded.
export default function ContainerNavTabs() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="inline-flex rounded-bl-lg border border-gray-300 overflow-hidden">
      {TABS.map((tab, idx) => {
        const isActive = pathname === tab.href;
        return (
          <button
            key={tab.href}
            type="button"
            onClick={() => router.push(tab.href)}
            className={`px-5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
              isActive ? "bg-gray-900 text-white" : "bg-white text-gray-600 hover:bg-gray-100"
            } ${idx !== 0 ? "border-l border-gray-300" : ""}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
