"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
} from "@/components/ui/sidebar";
import Image from "next/image";
import {
  FaChartLine,
  FaUserTie,
  FaUsers,
  FaShoppingCart,
  FaBoxes,
  FaLayerGroup,
  FaWarehouse,
  FaUsersCog,
  FaEnvelope,
  FaFileAlt,
  FaClipboardList,
  FaCheckCircle,
  FaAt,
} from "react-icons/fa";
import { FaArrowRightFromBracket } from "react-icons/fa6";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Cookies from "js-cookie";
import { jwtDecode } from "jwt-decode";
import { ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { useDispatch } from "react-redux";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { clearUser } from "@/redux/slices/userSlice";
import { isAdminOrManager, type AllowanceKey } from "@/hooks/useAllowance";
import { useLogoutMutation } from "@/redux/api/admin";

interface DecodedToken {
  email: string;
  role: string;
  userId: string;
  iat?: number;
  exp?: number;
}

/**
 * AppSidebar
 *
 * The dashboard sidebar that lives next to every `(dashboardLayout)`
 * route. Originally this component lived inside
 * `app/(dashboardLayout)/page.tsx` — but that made `page.tsx` *both*
 * a Next.js route AND a component, which caused the sidebar to mount
 * twice (once via the layout's import, once because Next renders
 * `page.tsx` as the route's UI). It has been moved here so the layout
 * can import it as a component and `page.tsx` can stay declarative
 * (a redirect).
 *
 * Visuals & behaviour match what shipped in commit 9eff01e:
 *   - dark wine background (#2e0603)
 *   - main menu (Dashboard, Prospects, Customers, Orders, Inventory,
 *     Categories, Containers) filtered by user allowances
 *   - admin/manager tools submenu (Users, Approvals, Messages,
 *     Reports, Logs) shown only for those roles
 *   - user profile card and red Logout button anchored at the bottom
 *   - active item highlighted, hover chevron slides in
 */
export default function AppSidebar() {
  const pathname = usePathname();
  const token = Cookies.get("token");
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  let email = "";
  let username = "";
  if (token) {
    try {
      const decodedToken = jwtDecode<DecodedToken>(token);
      email = decodedToken.email;
      username = email.split("@")[0] || "User";
    } catch (error) {
      console.error("Failed to decode token:", error);
    }
  }

  // All components read the current user from redux (persisted). No
  // more ad-hoc localStorage.getItem("userData") scattered across files.
  const userData = useCurrentUser();
  const dispatch = useDispatch();
  const [logout] = useLogoutMutation();

  const handleLogout = async () => {
    // Revoke the refresh token server-side (Redis) before clearing local
    // state — best-effort: a network hiccup here shouldn't trap the user
    // unable to log out, so client-side cleanup always proceeds either way.
    try {
      await logout().unwrap();
    } catch (error) {
      console.error("Logout revoke failed:", error);
    }
    Cookies.remove("token");
    Cookies.remove("role");
    dispatch(clearUser());
    // Send the user straight to /login rather than bouncing through "/".
    // The middleware would also redirect / → /login once the token cookie
    // is gone, but going directly to /login skips a wasted round-trip
    // and avoids any chance of a one-frame flash of the dashboard layout
    // while the network request to "/" is still in flight.
    window.location.href = "/login";
  };

  const isAdminOrManagerFlag = isAdminOrManager(userData);
  const isAdmin = userData?.role?.toLowerCase() === "admin";
  const isManager = userData?.role?.toLowerCase() === "manager";

  const menuItemsConfig = [
    {
      href: "/dashboard",
      icon: FaChartLine,
      label: "Dashboard",
      allowanceKey: "mainDashBorad" as const,
    },
    {
      href: "/prospects",
      icon: FaUserTie,
      label: "Prospects",
      allowanceKey: "prospectSee" as const,
    },
    {
      href: "/customers",
      icon: FaUsers,
      label: "Customers",
      allowanceKey: "customerSee" as const,
    },
    {
      href: "/orders",
      icon: FaShoppingCart,
      label: "Orders",
      allowanceKey: "orderSee" as const,
    },
    {
      href: "/inventory",
      icon: FaBoxes,
      label: "Inventory",
      allowanceKey: "inventorySee" as const,
    },
    {
      href: "/categories",
      icon: FaLayerGroup,
      label: "Categories",
      allowanceKey: "containerSee" as const,
    },
    {
      href: "/containers",
      icon: FaWarehouse,
      label: "Containers",
      allowanceKey: "containerSee" as const,
    },
  ];

  // Filter menu items based on allowances
  const menuItems = useMemo(() => {
    if (isAdminOrManagerFlag) return menuItemsConfig;
    return menuItemsConfig.filter((item) => {
      return userData?.allowances?.[item.allowanceKey] === true;
    });
  }, [isAdminOrManagerFlag, userData?.allowances]);

  // Get the first allowed route for logo click
  const firstAllowedRoute = useMemo(() => {
    if (menuItems.length > 0) {
      return menuItems[0].href;
    }
    // If no menu items allowed, check admin tools for admin users
    if (isAdmin) {
      return "/user-management";
    }
    // Check reports for manager users
    if (isManager) {
      return "/reports";
    }
    // Fallback to home page
    return "/";
  }, [menuItems, isAdmin, isManager]);

  // Admin/Manager menu items (Reports for both admin and manager)
  const adminMenuItems = [
    {
      show: isAdmin,
      href: "/user-management",
      icon: FaUsersCog,
      label: "Users",
    },
    {
      show: isAdmin,
      href: "/approvals",
      icon: FaCheckCircle,
      label: "Approvals",
    },
    {
      show: isAdmin,
      href: "/emails",
      icon: FaAt,
      label: "Emails",
    },
    {
      show: isAdmin,
      href: "/messages",
      icon: FaEnvelope,
      label: "Messages",
    },
    {
      show: isAdmin || isManager, // Allow reports for both admin and manager
      href: "/reports",
      icon: FaFileAlt,
      label: "Reports",
    },
    {
      show: isAdmin,
      href: "/logs",
      icon: FaClipboardList,
      label: "Logs",
    },
  ];

  // Consistent color scheme - using red for all routes
  const getColorClasses = (isActive: boolean) => {
    if (isActive) {
      return "bg-red-800 text-white border border-gray-200";
    }
    return "text-slate-800 hover:bg-gray-100 bg-gray-300 border border-slate-200";
  };

  return (
    <Sidebar>
      <SidebarContent className="bg-[#2e0603] flex flex-col justify-between p-5 max-w-[300px] h-screen border-r border-slate-200">
        {/* Top Section */}
        <div className="space-y-6">
          {/* Logo - Links to first allowed route */}
          <Link href={firstAllowedRoute} className="flex items-center gap-2">
            <div className="flex justify-center pt-3 pb-2 w-full h-30">
              <div className="relative w-full h-full">
                <Image
                  src="/dashboardIcons/logo.png"
                  width={100}
                  height={40}
                  alt="Logo"
                  className="w-auto h-auto mx-auto my-auto"
                />
              </div>
            </div>
          </Link>

          {/* Main Navigation */}
          <SidebarGroup className="p-0 mt-8">
            <SidebarGroupContent>
              <SidebarMenu>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-white uppercase tracking-wider px-2 mb-3">
                    Main Menu
                  </p>
                  {menuItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onMouseEnter={() => setHoveredItem(item.href)}
                      onMouseLeave={() => setHoveredItem(null)}
                      className={`flex items-center justify-between gap-3 rounded-md px-4 py-3 transition-all duration-200 group ${
                        pathname === item.href || pathname.startsWith(item.href + "/")
                          ? getColorClasses(true)
                          : getColorClasses(false)
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon
                          className={`w-5 h-5 ${pathname === item.href || pathname.startsWith(item.href + "/") ? "" : "opacity-60"}`}
                        />
                        <span
                          className={`text-sm font-semibold ${pathname === item.href || pathname.startsWith(item.href + "/") ? "" : "font-medium"}`}
                        >
                          {item.label}
                        </span>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 transition-all duration-200 ${
                          hoveredItem === item.href
                            ? "translate-x-0 opacity-100"
                            : "-translate-x-2 opacity-0"
                        }`}
                      />
                    </Link>
                  ))}
                </div>

                {/* Admin/Manager Section */}
                {(isAdmin || isManager) && adminMenuItems.some((item) => item.show) && (
                  <div className="space-y-2 mt-6">
                    <p className="text-xs font-semibold text-white uppercase tracking-wider px-2 mb-3">
                      {isAdmin ? "ADMIN TOOLS" : "MANAGER TOOLS"}
                    </p>
                    {adminMenuItems.map((item) =>
                      item.show ? (
                        <Link
                          key={item.href}
                          href={item.href}
                          onMouseEnter={() => setHoveredItem(item.href)}
                          onMouseLeave={() => setHoveredItem(null)}
                          className={`flex items-center justify-between gap-3 rounded-md px-4 py-3 transition-all duration-200 group ${
                            pathname === item.href
                              ? getColorClasses(true)
                              : getColorClasses(false)
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon
                              className={`w-5 h-5 ${pathname === item.href ? "" : "opacity-60"}`}
                            />
                            <span
                              className={`text-sm font-semibold ${pathname === item.href ? "" : "font-medium"}`}
                            >
                              {item.label}
                            </span>
                          </div>
                          <ChevronRight
                            className={`w-4 h-4 transition-all duration-200 ${
                              hoveredItem === item.href
                                ? "translate-x-0 opacity-100"
                                : "-translate-x-2 opacity-0"
                            }`}
                          />
                        </Link>
                      ) : null,
                    )}
                  </div>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        {/* Bottom Section - Logout */}
        <div className="space-y-3 pb-2 mt-10">
          {/* User Profile Card */}
          <div className="bg-black rounded-md p-4 border border-gray-400">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Image
                  src={
                    userData?.image && userData.image.trim() !== ""
                      ? userData.image
                      : "https://arbora-bucket.s3.us-east-2.amazonaws.com/system+assets/gray-male-head-placeholder-vector-23804676.jpg"
                  }
                  width={48}
                  height={48}
                  alt="Profile"
                  className="rounded-full ring-2 ring-gray-200 shadow-md object-cover"
                />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-200 truncate">
                  {userData?.firstName && userData?.lastName
                    ? `${userData.firstName} ${userData.lastName}`
                    : username}
                </h3>
                <p className="text-xs text-gray-100 font-semibold mt-0.5">
                  {userData?.role || "User"}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            onMouseEnter={() => setHoveredItem("logout")}
            onMouseLeave={() => setHoveredItem(null)}
            className="w-full flex items-center bg-white justify-between gap-3 px-4 py-3 border-2 border-red-900 rounded-md transition-all duration-200 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-red-600 rounded-lg flex items-center justify-center">
                <FaArrowRightFromBracket className="text-white w-3 h-3" />
              </div>
              <span className="text-sm font-semibold text-red-900">Logout</span>
            </div>
            <ChevronRight
              className={`w-4 h-4 text-red-700 transition-all duration-200 ${
                hoveredItem === "logout"
                  ? "translate-x-0 opacity-100"
                  : "-translate-x-2 opacity-0"
              }`}
            />
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
