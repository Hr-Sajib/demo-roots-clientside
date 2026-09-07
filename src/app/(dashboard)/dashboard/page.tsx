"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { io } from "socket.io-client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Cookies from "js-cookie";

// Chart.js + react-chartjs-2 is ~200 KB gzipped. Loading it eagerly
// blocks first paint of the dashboard. The three chart panels are
// below-the-fold for most users, so we code-split them. ssr:false
// because Chart.js touches `window` and `document` on render.
const BestSellingProducts = dynamic(
  () => import("@/Features/dashboard/BestSellingProducts"),
  { loading: () => <div className="h-48 animate-pulse bg-gray-100 rounded" />, ssr: false }
);
const SalesOverview = dynamic(
  () => import("@/Features/dashboard/SalesOverview"),
  { loading: () => <div className="h-48 animate-pulse bg-gray-100 rounded" />, ssr: false }
);
const MonthlyReport = dynamic(
  () => import("@/Features/dashboard/MonthlyReport"),
  { loading: () => <div className="h-72 animate-pulse bg-gray-100 rounded" />, ssr: false }
);
import ExpiringBusinessCustomers from "@/components/shared/ExpiringCustomers";

import { useGetInventoryQuery } from "@/redux/api/inventory";
import { useGetOrdersQuery } from "@/redux/api/orders";
import { useGetb2cOrdersQuery } from "@/redux/api/b2cOrders";
import { useGetAllPendingCustomersQuery } from "@/redux/api/customers";
import {
  useGetProspectsQuery,
  useUpdateProspectMutation,
} from "@/redux/api/prospects";
import { useGetSalesPersonPerformanceReportQuery } from "@/redux/api/salesReports";
import Loading from "@/redux/Shared/Loading";
import AccessGate from "@/components/shared/AccessDenied";

import {
  ArrowRight,
  Users,
  ShoppingBag,
  AlertTriangle,
  Calendar,
  CheckCircle,
  PackageCheck,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  User,
} from "lucide-react";

/* ------------------------------------------------------------------
   TYPES
   ------------------------------------------------------------------ */
interface FollowUpActivity {
  activity: string;
  activityDate: string;
  activityMedium: string;
  isDone: boolean;
}

export interface DashboardProspect {
  _id: string;
  storeName?: string;
  storePersonName?: string;
  followUpActivities?: FollowUpActivity[];
}

/* ------------------------------------------------------------------
   MAIN DASHBOARD COMPONENT
   ------------------------------------------------------------------ */
export default function Dashboard() {
  const router = useRouter();

  const [updateProspect] = useUpdateProspectMutation();
  const [stockViewMode, setStockViewMode] = useState<"lowStock" | "expiring">(
    "lowStock",
  );

  const role = Cookies.get("role");
  const userEmail = Cookies.get("userEmail") || "";

  // Queries — declared before the socket effect so its callbacks close
  // over the same refetch refs and don't need a re-mount to see them.
  const { data: pendingCustomersResponse, refetch: refetchPendingCustomers } =
    useGetAllPendingCustomersQuery();

  // These hooks require an argument by their TypeScript signature even
  // though the underlying endpoint takes no params. Passing `undefined`
  // is the explicit "no args" signal that satisfies the type.
  const { data: b2bOrdersResponse, refetch: refetchPendingOrders } =
    useGetOrdersQuery(undefined);
  const { data: b2cOrdersResponse, refetch: refetchB2COrders } =
    useGetb2cOrdersQuery(undefined);
  const { data: prospectsResponse, refetch: refetchProspects } =
    useGetProspectsQuery(undefined);

  // Socket Connection — RTK Query returns stable refetch refs, so the
  // effect only runs once at mount. socket.disconnect() must be wrapped
  // in a `void` block so React's Destructor type accepts it.
  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_URL?.replace(/\/api\/v1\/?$/, "");
    const socket = io(backendUrl);

    socket.on("connect", () => console.log("[Dashboard Socket] Connected"));

    socket.on("new-customer-registered", () => refetchPendingCustomers());
    socket.on("new-order-placed", () => refetchPendingOrders());
    socket.on("new-b2c-order-placed", () => refetchB2COrders());

    return () => {
      // socket.disconnect() returns the socket, but React's Destructor
      // type requires a void return. The `void` cast suppresses the
      // expression-value-only check without changing runtime behavior.
      void socket.disconnect();
    };
  }, [refetchPendingCustomers, refetchPendingOrders, refetchB2COrders]);

  // Sales Person Performance Query (only for sales users)
  const { data: salesPersonPerformanceData, isLoading: isSalesPersonLoading } =
    useGetSalesPersonPerformanceReportQuery(
      {
        timeline: "monthly",
        topCustomers: 3,
      },
      {
        skip: role !== "salesuser",
      },
    );

  console.log(salesPersonPerformanceData);

  const pendingCustomers = pendingCustomersResponse?.data || [];
  const pendingB2BOrders = (b2bOrdersResponse?.data || []).filter(
    (o: any) => o.orderStatus?.toLowerCase() === "pending",
  );
  const pendingB2COrders = (b2cOrdersResponse?.data || []).filter(
    (o: any) => o.orderStatus?.toLowerCase() === "pending",
  );

  const totalPendingOrders = pendingB2BOrders.length + pendingB2COrders.length;

  const [pendingViewMode, setPendingViewMode] = useState<"B2B" | "B2C">("B2B");
  const pendingOrdersToShow =
    pendingViewMode === "B2B" ? pendingB2BOrders : pendingB2COrders;

  // All Pending Follow-ups (isDone = false) - Irrespective of Date
  const [pendingFollowUps, setPendingFollowUps] = useState<DashboardProspect[]>(
    [],
  );

  useEffect(() => {
    if (!prospectsResponse?.data) return;

    const filtered = (prospectsResponse.data as any[]).filter((p) =>
      p.followUpActivities?.some((a: any) => !a.isDone),
    );

    setPendingFollowUps(filtered);
  }, [prospectsResponse]);

  // Handle marking follow-up as Done
  const handleMarkFollowUpDone = async (
    prospectId: string,
    activityIndex: number,
  ) => {
    try {
      const prospect = pendingFollowUps.find((p) => p._id === prospectId);
      if (!prospect?.followUpActivities) return;

      const updatedActivities = [...prospect.followUpActivities];
      updatedActivities[activityIndex] = {
        ...updatedActivities[activityIndex],
        isDone: true,
      };

      await updateProspect({
        _id: prospectId,
        followUpActivities: updatedActivities,
      }).unwrap();

      toast.success("Follow-up marked as completed!");
      refetchProspects();
    } catch (err) {
      toast.error("Failed to update follow-up");
      console.error(err);
    }
  };

  // Low Stock Products
  const { data: inventoryData } = useGetInventoryQuery();
  const lowStockProducts = (inventoryData?.data || []).filter(
    (p: any) => p.quantity < p.reorderPointOfQuantity,
  );

  // Expiring Products (expiry date within next 120 days only)
  const expiringProducts = (inventoryData?.data || [])
    .filter((p: any) => {
      if (!p.expiryDate) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiryDate = new Date(p.expiryDate);
      expiryDate.setHours(0, 0, 0, 0);
      const daysUntilExpiry = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24),
      );
      // Only show products expiring within the next 120 days (including today)
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 120;
    })
    .sort((a: any, b: any) => {
      const dateA = new Date(a.expiryDate);
      const dateB = new Date(b.expiryDate);
      return dateA.getTime() - dateB.getTime();
    });

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Calculate days until expiry
  const getDaysUntilExpiry = (dateString: string) => {
    if (!dateString) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(dateString);
    expiryDate.setHours(0, 0, 0, 0);
    const days = Math.ceil(
      (expiryDate.getTime() - today.getTime()) / (1000 * 3600 * 24),
    );
    return days;
  };

  // Get status color based on days until expiry
  const getExpiryStatusColor = (days: number | null) => {
    if (days === null) return "text-gray-600";
    if (days <= 3) return "text-red-600 font-bold";
    if (days <= 7) return "text-orange-600";
    if (days <= 10) return "text-yellow-600";
    return "text-green-600";
  };

  // Get the sales person data (first item in array)
  const salesPerson = salesPersonPerformanceData?.data?.[0];

  return (
    <AccessGate allowance="mainDashBorad" label="the dashboard">
      <div className="p-4 md:p-2 space-y-4">
        <SalesOverview />

      {/* Sales Person Performance Section - Only for Sales Users
          (Sits directly below SalesOverview for salesuser role.) */}
      {role === "salesuser" && (
        <div className="bg-white rounded-lg border border-red-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-red-200 bg-gradient-to-r from-red-50 to-white">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-800">
                My Performance
              </h2>
            </div>
          </div>

          {isSalesPersonLoading ? (
            <div className="p-8 text-center text-gray-500">
              <Loading
                title="Loading Performance"
                message=""
                spinnerSize="sm"
                showProgressDots={false}
              />
            </div>
          ) : salesPerson ? (
            <div className="p-4 space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                  <p className="text-xs text-gray-500">Total Sales</p>
                  <p className="text-lg font-bold text-red-700">
                    ${(salesPerson.summary?.totalSales || 0).toFixed(2)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                  <p className="text-xs text-gray-500">Total Orders</p>
                  <p className="text-lg font-bold text-slate-800">
                    {salesPerson.summary?.totalOrders || 0}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                  <p className="text-xs text-gray-500">Collection Rate</p>
                  <p className="text-lg font-bold text-green-600">
                    {salesPerson.summary?.paidPercentage || "0"}%
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                  <p className="text-xs text-gray-500">Commission Earned</p>
                  <p className="text-lg font-bold text-purple-700">
                    {salesPerson.summary?.totalCommissionEarned !== null &&
                    salesPerson.summary?.totalCommissionEarned !== undefined
                      ? `$${salesPerson.summary.totalCommissionEarned.toFixed(2)}`
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* Performance Over Time Table */}
              {salesPerson.timeData && salesPerson.timeData.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-700 text-sm mb-2">
                    Performance Over Time
                  </h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                            Period
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                            Orders
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                            Sales
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                            Paid Amount
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                            Avg Order
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                            Collection Rate
                          </th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                            Commission
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {salesPerson.timeData.map((period, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-sm font-medium text-slate-700">
                              {period.label}
                            </td>
                            <td className="px-3 py-2 text-right text-sm">
                              {period.totalOrders}
                            </td>
                            <td className="px-3 py-2 text-right text-sm font-semibold text-red-600">
                              ${(period.totalSales || 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right text-sm text-green-600">
                              $
                              {(period.totalPaidOrderAmount || 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right text-sm">
                              ${(period.averageOrderValue || 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right text-sm">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  parseFloat(period.paidPercentage || "0") >= 80
                                    ? "bg-green-100 text-green-700"
                                    : "bg-yellow-100 text-yellow-700"
                                }`}
                              >
                                {period.paidPercentage || "0"}%
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right text-sm font-medium text-purple-700">
                              {period.totalCommissionEarned !== null &&
                              period.totalCommissionEarned !== undefined
                                ? `$${period.totalCommissionEarned.toFixed(2)}`
                                : "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Core Customers Table */}
              {salesPerson.coreCustomers &&
                salesPerson.coreCustomers.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-700 text-sm mb-2">
                      Core Customers
                    </h4>
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                              #
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                              Customer Name
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                              Total Sales
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                              Sales %
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                              Commission Rate
                            </th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600">
                              Commission Earned
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {salesPerson.coreCustomers.map((customer, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-3 py-2 text-center text-sm">
                                {idx + 1}
                              </td>
                              <td className="px-3 py-2 text-sm font-medium text-slate-800">
                                {customer.customerStoreName}
                              </td>
                              <td className="px-3 py-2 text-right text-sm font-semibold text-red-700">
                                ${(customer.totalSales || 0).toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-right text-sm font-semibold">
                                {customer.salesPercentage || "0%"}
                              </td>
                              <td className="px-3 py-2 text-right text-sm text-blue-600">
                                {customer.commissionRate !== null &&
                                customer.commissionRate !== undefined
                                  ? `${customer.commissionRate}%`
                                  : "N/A"}
                              </td>
                              <td className="px-3 py-2 text-right text-sm font-medium text-purple-700">
                                {customer.totalCommissionEarned !== null &&
                                customer.totalCommissionEarned !== undefined
                                  ? `$${customer.totalCommissionEarned.toFixed(2)}`
                                  : "N/A"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              <p>No performance data available</p>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          {/* Pending Orders */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-semibold text-gray-800">
                  Pending Orders
                </h2>
                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {totalPendingOrders}
                </span>
              </div>

              <div className="inline-flex items-center rounded-full bg-gray-100 p-0.5">
                <button
                  onClick={() => setPendingViewMode("B2B")}
                  className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                    pendingViewMode === "B2B"
                      ? "bg-white shadow-sm text-red-700"
                      : "text-gray-600"
                  }`}
                >
                  B2B
                </button>
                {role !== "salesuser" && (
                  <button
                    onClick={() => setPendingViewMode("B2C")}
                    className={`px-4 py-1.5 text-sm font-medium rounded-full transition-all ${
                      pendingViewMode === "B2C"
                        ? "bg-white shadow-sm text-red-700"
                        : "text-gray-600"
                    }`}
                  >
                    B2C
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {pendingViewMode === "B2B" ? (
                      <>
                        <th className="py-3 px-4 text-left">Store</th>
                        <th className="py-3 px-4 text-left">Invoice #</th>
                        <th className="py-3 px-4 text-right">Amount</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </>
                    ) : (
                      <>
                        <th className="py-3 px-4 text-left">Customer</th>
                        <th className="py-3 px-4 text-left">Phone</th>
                        <th className="py-3 px-4 text-right">Order Value</th>
                        <th className="py-3 px-4 text-center">Action</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {pendingOrdersToShow.length > 0 ? (
                    pendingOrdersToShow.map((order: any) => (
                      <tr key={order._id} className="border-b hover:bg-gray-50">
                        {pendingViewMode === "B2B" ? (
                          <>
                            <td className="py-3 px-4 font-medium">
                              {order.storeId?.storeName || "—"}
                            </td>
                            <td className="py-3 px-4">
                              {order.invoiceNumber || "—"}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold">
                              ${order.orderAmount?.toFixed(2) || "0.00"}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() =>
                                  router.push(`/orders/${order._id}`)
                                }
                                className="text-red-600 hover:text-red-700"
                              >
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-3 px-4 font-medium">
                              {order.customerName || "—"}
                            </td>
                            <td className="py-3 px-4">
                              {order.customerPhone || "—"}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold">
                              ${order.totalPayable?.toFixed(2) || "0.00"}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() =>
                                  router.push(`/orders/b2c/${order._id}`)
                                }
                                className="text-red-600 hover:text-red-700"
                              >
                                <ArrowRight className="w-4 h-4" />
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-8 text-center text-gray-500"
                      >
                        No pending {pendingViewMode} orders
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending Customers */}
          {role !== "salesuser" && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-red-600" />
                  <h2 className="text-lg font-semibold text-gray-800">
                    Pending Customers
                  </h2>
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                    {pendingCustomers.length}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="py-3 px-4 text-left">Store Name</th>
                      <th className="py-3 px-4 text-left">Contact Person</th>
                      <th className="py-3 px-4 text-left">Address</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingCustomers.length > 0 ? (
                      pendingCustomers.map((customer: any) => (
                        <tr
                          key={customer._id}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="py-3 px-4 font-medium">
                            {customer.storeName || "—"}
                          </td>
                          <td className="py-3 px-4">
                            {customer.storePersonName || "—"}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {customer.shippingAddress || "—"}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() =>
                                router.push(`/customers/${customer._id}`)
                              }
                              className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-8 text-center text-gray-500"
                        >
                          No pending customers
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {role !== "salesuser" && <BestSellingProducts />}

          <ExpiringBusinessCustomers />
        </div>

        {/* RIGHT COLUMN - Hidden for salesuser (they get Performance above instead) */}
        {role !== "salesuser" && (
        <div className="space-y-6">
          <MonthlyReport />

          {/* Low Stock & Expiring Products with Tabs — admin/manager only */}
          {(role === "admin" || role === "manager") && (
          <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
            {/* Tab Headers */}
            <div className="flex border-b border-red-200 bg-gradient-to-r from-red-50 to-white">
              <button
                onClick={() => setStockViewMode("lowStock")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  stockViewMode === "lowStock"
                    ? "text-red-700 border-b-2 border-red-600 bg-white/50"
                    : "text-gray-600 hover:text-red-600 hover:bg-red-50/30"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Low Stock Products
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold ml-1">
                    {lowStockProducts.length}
                  </span>
                </div>
              </button>
              <button
                onClick={() => setStockViewMode("expiring")}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  stockViewMode === "expiring"
                    ? "text-red-700 border-b-2 border-red-600 bg-white/50"
                    : "text-gray-600 hover:text-red-600 hover:bg-red-50/30"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Expiring Products (Next 120 Days)
                  <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-semibold ml-1">
                    {expiringProducts.length}
                  </span>
                </div>
              </button>
            </div>

            {/* Tab Content - Low Stock Products */}
            {stockViewMode === "lowStock" && (
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr className="border-b border-red-200">
                      <th className="py-3 px-4 text-left text-red-800 font-semibold">
                        Category
                      </th>
                      <th className="py-3 px-4 text-left text-red-800 font-semibold">
                        Product Name
                      </th>
                      <th className="py-3 px-4 text-right text-red-800 font-semibold">
                        Quantity
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockProducts.length > 0 ? (
                      lowStockProducts.map((p: any, index: number) => (
                        <tr
                          key={p._id}
                          className={`border-b hover:bg-red-50 transition-colors ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <td className="py-3 px-4 text-gray-700">
                            {p.categoryId?.name || "N/A"}
                          </td>
                          <td className="py-3 px-4 font-semibold text-red-700">
                            {p.name}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="inline-flex items-center gap-1 font-bold text-red-600">
                              <AlertTriangle className="w-3 h-3" />
                              {p.quantity}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-12 text-center text-gray-500"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <PackageCheck className="w-12 h-12 text-green-500" />
                            <p className="font-medium">
                              All products are well stocked!
                            </p>
                            <p className="text-xs">
                              No low stock items to display
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab Content - Expiring Products */}
            {stockViewMode === "expiring" && (
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0 z-10">
                    <tr className="border-b border-orange-200">
                      <th className="py-3 px-4 text-left text-orange-800 font-semibold">
                        Barcode
                      </th>
                      <th className="py-3 px-4 text-left text-orange-800 font-semibold">
                        Product Name
                      </th>
                      <th className="py-3 px-4 text-center text-orange-800 font-semibold">
                        Expiry Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiringProducts.length > 0 ? (
                      expiringProducts.map((p: any, index: number) => {
                        const daysUntilExpiry = getDaysUntilExpiry(
                          p.expiryDate,
                        );
                        const statusColor =
                          getExpiryStatusColor(daysUntilExpiry);
                        return (
                          <tr
                            key={p._id}
                            className={`border-b hover:bg-orange-50 transition-colors ${
                              index % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }`}
                          >
                            <td className="py-3 px-4 font-mono text-xs text-gray-600">
                              {p.barcodeString || "—"}
                            </td>
                            <td className="py-3 px-4 font-semibold text-orange-700">
                              {p.name}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className={`text-sm ${statusColor}`}>
                                  {formatDate(p.expiryDate)}
                                </span>
                                {daysUntilExpiry !== null && (
                                  <span
                                    className={`text-xs mt-0.5 ${statusColor}`}
                                  >
                                    {daysUntilExpiry <= 0
                                      ? "Expired"
                                      : `${daysUntilExpiry} day${daysUntilExpiry !== 1 ? "s" : ""} remaining`}
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-12 text-center text-gray-500"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <Calendar className="w-12 h-12 text-green-500" />
                            <p className="font-medium">
                              No expiring products in the next 10 days
                            </p>
                            <p className="text-xs">
                              All products have valid expiry dates or no expiry
                              date set
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          )}

          {/* Prospect Follow-ups - All Pending (isDone = false) */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-semibold text-gray-800">
                  Pending Prospect Follow-ups
                </h2>
                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                  {pendingFollowUps.length}
                </span>
              </div>
            </div>

            {/* Scrollable Table Container */}
            <div className="overflow-auto max-h-[460px]">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4 text-left font-medium text-gray-700">
                      Store Name
                    </th>
                    <th className="py-3 px-4 text-left font-medium text-gray-700">
                      Contact Person
                    </th>
                    <th className="py-3 px-4 text-left font-medium text-gray-700">
                      Activity
                    </th>
                    <th className="py-3 px-4 text-left font-medium text-gray-700">
                      Date
                    </th>
                    <th className="py-3 px-4 text-left font-medium text-gray-700">
                      Medium
                    </th>
                    <th className="py-3 px-4 text-center font-medium text-gray-700">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pendingFollowUps.length > 0 ? (
                    pendingFollowUps.flatMap((prospect) =>
                      (prospect.followUpActivities ?? [])
                        .filter((a: any) => !a.isDone)
                        .map((activity: any, filteredIndex: number) => {
                          const originalIndex =
                            (prospect.followUpActivities ?? []).findIndex(
                              (a: any) => a === activity,
                            );

                          return (
                            <tr
                              key={`${prospect._id}-${filteredIndex}`}
                              className="hover:bg-gray-50 transition-colors"
                            >
                              <td className="py-3 px-4 font-medium text-gray-800">
                                {prospect.storeName || "N/A"}
                              </td>
                              <td className="py-3 px-4 text-gray-600">
                                {prospect.storePersonName || "N/A"}
                              </td>
                              <td className="py-3 px-4 text-gray-700">
                                {activity.activity || "Follow-up Activity"}
                              </td>
                              <td className="py-3 px-4 text-gray-600">
                                {activity.activityDate}
                              </td>
                              <td className="py-3 px-4 text-gray-600 capitalize">
                                {activity.activityMedium}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <button
                                  onClick={() =>
                                    handleMarkFollowUpDone(
                                      prospect._id,
                                      originalIndex,
                                    )
                                  }
                                  disabled={activity.isDone}
                                  className={`px-4 py-1 text-xs font-medium rounded-md flex items-center gap-1 transition-all ${
                                    activity.isDone
                                      ? "bg-green-100 text-green-700 cursor-not-allowed"
                                      : "bg-red-800 hover:bg-red-700 text-white"
                                  }`}
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  {activity.isDone ? "Done" : "Mark Done"}
                                </button>
                              </td>
                            </tr>
                          );
                        }),
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 text-center text-gray-500"
                      >
                        No pending follow-up activities
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        )}
      </div>
      </div>
    </AccessGate>
  );
}
