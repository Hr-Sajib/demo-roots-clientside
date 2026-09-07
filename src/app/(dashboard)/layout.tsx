import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
// The sidebar lives in its own component file so it can be mounted by
// this layout without conflicting with `page.tsx`. Previously the
// sidebar lived inside `app/(dashboardLayout)/page.tsx`'s default
// export, which Next.js then ALSO renders as the route's UI for `/` —
// causing two sidebars to mount. Now the route's `page.tsx` redirects
// to `/dashboard`, and this layout owns the single sidebar mount.
import AppSidebar from "@/components/layout/AppSidebar";
import PrivateRoute from "@/components/layout/PrivateRoute";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PrivateRoute>
      <SidebarProvider>
        <AppSidebar />
        <main className="flex-1 w-full min-h-screen bg-[#F7F7F7] p-2 overflow-x-hidden">
          <SidebarTrigger />
          {children}
        </main>
      </SidebarProvider>
    </PrivateRoute>
  );
}