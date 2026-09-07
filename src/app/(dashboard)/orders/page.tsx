"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import Switch from "react-switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import orderManagementApi, {
  useDeleteOrderMutation,
  useGetOrdersQuery,
  useUpdateOrderMutation,
} from "@/redux/api/orders";
import {
  useDeleteB2COrderMutation,
  useGetb2cOrdersQuery,
} from "@/redux/api/b2cOrders";
import { FilterFormValues } from "@/types";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ImFilePdf } from "react-icons/im";
import Loading from "@/redux/Shared/Loading";
import { ArrowUpDown, Search, Trash2, X } from "lucide-react";
import { FaFileExcel } from "react-icons/fa6";
import { toast } from "react-toastify";
import { CloudCog, Edit, Eye, PlusCircle } from "lucide-react";
import AccessGate from "@/components/shared/AccessDenied";
import AddOrderModal from "@/components/orders/AddOrderModal";
import UpdateOrderPage from "@/components/shared/UpdateOrderPage";
import { OrderFilterForm } from "@/components/shared/OrderFilterForm";
import { ReusableModal } from "@/components/shared/ReusableModal";
import Cookies from "js-cookie";
import { apiFetch, triggerDownload } from "@/lib/apiFetch";
import OrderDeleteConfirmationModal from "@/components/orders/DeleteConfirmModal";
import UpdateB2COrderModal from "@/components/orders/UpdateB2COrderModal";

// Order status priority for sorting
const orderStatusPriority: Record<string, number> = {
  pending: 1,
  verified: 2,
  completed: 3,
  cancelled: 4,
};

// Payment status priority for sorting. Lower priority value = "owes
// money", so unpaid and partially-paid bubble to the top of "asc" sorts
// (matching the existing semantic used by the order-status priority map).
const paymentStatusPriority: Record<string, number> = {
  notPaid: 1,
  partiallyPaid: 2,
  processing: 3,
  overPaid: 4,
  paid: 5,
};

export interface IOrder {
  _id: string;
  date: string;
  invoiceNumber: string;
  PONumber: string;
  storeId: {
    _id: string;
    storeName: string;
    storePhone: string;
    storePersonEmail: string;
    salesTaxId: string;
    acceptedDeliveryDays: string[];
    bankACHAccountInfo: string;
    storePersonName: string;
    storePersonPhone: string;
    billingAddress: string;
    billingState: string;
    billingZipcode: string;
    billingCity: string;
    shippingAddress: string;
    shippingState: string;
    shippingZipcode: string;
    shippingCity: string;
    creditApplication: string;
    ownerLegalFrontImage: string;
    ownerLegalBackImage: string;
    voidedCheckImage: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
    __v: number;
  };
  shippingCharge?: string;
  paymentDueDate: string;
  totalPayable: number;
  orderAmount: number;
  orderStatus: string;
  paymentAmountReceived: number;
  discountGiven: number;
  openBalance: number;
  profitAmount: number;
  profitPercentage: number;
  paymentStatus: string;
  reminderNumber?: number;
  isReminderPaused?: boolean;
  products: Array<{
    productId: {
      _id: string;
      name: string;
      salesPrice: number;
      itemNumber: string;
      categoryId: {
        _id: string;
        name: string;
      };
      quantity: number;
      weightUnit: string;
    };
    quantity: number;
    discount: number;
    _id: string;
  }>;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
  addedBy?: string;
}

export interface IB2COrder {
  _id: string;
  date: string;
  invoiceNumber: string;
  PONumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderAmount: number;
  shippingCharge: number;
  discountGiven: number;
  totalPayable: number;
  profitAmount: number;
  profitPercentage: number;
  orderStatus: string;
  paymentStatus: string;
  addedBy?: string;
}

export default function OrderManagement(): React.ReactElement {
  const {
    data: { data: b2bOrders = [] } = {},
    isLoading: isB2BLoading,
    isFetching: isB2BFetching,
    isError: isB2BError,
    refetch: refetchB2B,
  } = useGetOrdersQuery(undefined);

  const {
    data: { data: b2cOrders = [] } = {},
    isLoading: isB2CLoading,
    isFetching: isB2CFetching,
    isError: isB2CError,
    refetch: refetchB2C,
  } = useGetb2cOrdersQuery(undefined);

  const [deleteB2BOrder, { isLoading: isDeletingB2B }] =
    useDeleteOrderMutation();
  const [deleteB2COrder, { isLoading: isDeletingB2C }] =
    useDeleteB2COrderMutation();
  const [updateOrder, { isLoading: isUpdatingOrder }] =
    useUpdateOrderMutation();

  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const action = searchParams.get("action");

  // Permissions read from redux-persist, identical shape to the legacy
  // localStorage payload so the rest of the file is untouched.
  const userData = useCurrentUser();

  const isAdminOrManager = ["admin", "manager"].includes(
    userData?.role?.toLowerCase() || "",
  );
  const isAdmin = userData?.role?.toLowerCase() == "admin" ? true : false;

  const userEmail = userData?.email ?? "";

  const showAddOrder = isAdminOrManager || userData?.allowances?.orderAdd;
  const showUpdateOrder = isAdminOrManager || userData?.allowances?.orderUpdate;
  const showDeleteOrder = isAdmin;

  const [isBestLoading, setIsBestLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showPdfConfirm, setShowPdfConfirm] = useState(false);
  const [showExcelConfirm, setShowExcelConfirm] = useState(false);
  const [togglingReminderId, setTogglingReminderId] = useState<string | null>(
    null,
  );

  // ─── Delete states (separate for B2B & B2C) ───
  const [orderToDeleteB2B, setOrderToDeleteB2B] = useState<IOrder | null>(null);
  const [orderToDeleteB2C, setOrderToDeleteB2C] = useState<IB2COrder | null>(
    null,
  );

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedOrderType, setSelectedOrderType] = useState<"B2B" | "B2C">(
    "B2B",
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<FilterFormValues | null>(
    null,
  );
  const [showActiveFilters, setShowActiveFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: "desc" | "asc" | null;
  }>({ key: null, direction: null });

  const [pendingFilterActive, setPendingFilterActive] = useState(false);
  const [viewMode, setViewMode] = useState<"B2B" | "B2C">("B2B");

  const [filterOpen, setFilterOpen] = useState(false);
  const [addOrderOpen, setAddOrderOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const date = new Date().toString().slice(0, 15);

  // ─── Combined stats ───
  const allOrders = useMemo(
    () => [...b2bOrders, ...b2cOrders],
    [b2bOrders, b2cOrders],
  );

  console.log("all orders ", allOrders);

  const combinedStats = useMemo(
    () => ({
      totalOrderAmount: allOrders.reduce((s, o) => s + o.orderAmount, 0),
      totalOpenAmount: allOrders.reduce(
        (s, o) => s + Math.max(0, o.openBalance || 0),
        0,
      ),
      totalOrders: allOrders.length,
      pendingOrders: allOrders.filter((o) => o.orderStatus === "pending")
        .length,
    }),
    [allOrders],
  );

  useEffect(() => {
    const orders = viewMode === "B2B" ? b2bOrders : b2cOrders;
    if (orders.length > 0 && !sortConfig.key) {
      setSortConfig({ key: "Order Date", direction: "desc" });
    }
  }, [b2bOrders.length, b2cOrders.length, sortConfig.key, viewMode]);

  const currentOrders = viewMode === "B2B" ? b2bOrders : b2cOrders;
  const isLoadingOrders = viewMode === "B2B" ? isB2BLoading : isB2CLoading;
  const isFetchingOrders = viewMode === "B2B" ? isB2BFetching : isB2CFetching;
  const isError = viewMode === "B2B" ? isB2BError : isB2CError;

  const filteredOrders = useMemo(() => {
    let result = currentOrders;

    if (pendingFilterActive) {
      result = result.filter((o: IOrder) => o.orderStatus === "pending");
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter((o: IOrder) =>
        [
          o.invoiceNumber,
          o.PONumber,
          viewMode === "B2B" ? o.storeId?.storeName : o.customerName,
          viewMode === "B2B" ? o.storeId?.storePersonName : o.customerEmail,
          viewMode === "B2B" ? o.storeId?.storePhone : o.customerPhone,
          o.orderStatus,
          o.paymentStatus,
        ].some((f: unknown) =>
          typeof f === "string" && f.toLowerCase().includes(lower),
        ),
      );
    }

    if (activeFilters && !pendingFilterActive) {
      result = result.filter((o: IOrder) => {
        if (
          activeFilters.startDate &&
          new Date(o.date) < new Date(activeFilters.startDate)
        )
          return false;
        if (
          activeFilters.endDate &&
          new Date(o.date) > new Date(activeFilters.endDate)
        )
          return false;
        if (
          activeFilters.paymentDueStartDate &&
          o.paymentDueDate &&
          new Date(o.paymentDueDate) <
            new Date(activeFilters.paymentDueStartDate)
        )
          return false;
        if (
          activeFilters.paymentDueEndDate &&
          o.paymentDueDate &&
          new Date(o.paymentDueDate) > new Date(activeFilters.paymentDueEndDate)
        )
          return false;
        if (
          activeFilters.orderStatus?.length &&
          !activeFilters.orderStatus.includes(o.orderStatus)
        )
          return false;
        if (
          activeFilters.paymentStatus?.length &&
          !activeFilters.paymentStatus.includes(o.paymentStatus)
        )
          return false;
        if (
          viewMode === "B2B" &&
          activeFilters.storeIds?.length &&
          !activeFilters.storeIds.includes(o.storeId?._id)
        )
          return false;
        if (
          activeFilters.minOrderAmount !== undefined &&
          o.orderAmount < activeFilters.minOrderAmount
        )
          return false;
        if (
          activeFilters.maxOrderAmount !== undefined &&
          o.orderAmount > activeFilters.maxOrderAmount
        )
          return false;
        if (
          activeFilters.hasOpenBalance !== undefined &&
          (activeFilters.hasOpenBalance
            ? (o.openBalance || 0) <= 0
            : (o.openBalance || 0) > 0)
        )
          return false;
        return true;
      });
    }

    return [...result].sort((a, b) => {
      if (!sortConfig.key) return 0;
      let av: any, bv: any;
      switch (sortConfig.key) {
        case "Order Date":
          av = new Date(a.date);
          bv = new Date(b.date);
          break;
        case "Payment Due":
          av = new Date(a.paymentDueDate);
          bv = new Date(b.paymentDueDate);
          break;
        case "Order Amount":
          av = a.orderAmount;
          bv = b.orderAmount;
          break;
        case "Shipping Charge":
          av = parseFloat(a.shippingCharge || "0");
          bv = parseFloat(b.shippingCharge || "0");
          break;
        case "Discount":
          av = a.discountGiven;
          bv = b.discountGiven;
          break;
        case "Profit":
          av = a.profitAmount;
          bv = b.profitAmount;
          break;
        case "Profit %":
          av = a.profitPercentage;
          bv = b.profitPercentage;
          break;
        case "Payment Status":
          av = paymentStatusPriority[a.paymentStatus] || 999;
          bv = paymentStatusPriority[b.paymentStatus] || 999;
          break;
        case "Order Status":
          av = orderStatusPriority[a.orderStatus] || 999;
          bv = orderStatusPriority[b.orderStatus] || 999;
          break;
        default:
          return 0;
      }
      return sortConfig.direction === "asc"
        ? av < bv
          ? -1
          : 1
        : bv < av
          ? -1
          : 1;
    });
  }, [
    currentOrders,
    searchTerm,
    activeFilters,
    sortConfig,
    pendingFilterActive,
    viewMode,
  ]);

  useEffect(() => {
    if (action === "update" && orderId && currentOrders.length) {
      const ord = currentOrders.find((o: IOrder) => o._id === orderId);
      if (ord) {
        setSelectedOrder(ord);
        setSelectedOrderType(viewMode);
        setIsUpdateModalOpen(true);
      }
    }
  }, [action, orderId, currentOrders, viewMode]);

  // Centralized Success Handler
  const handleOperationSuccess = (
    message = "Operation completed successfully!",
  ) => {
    toast.success(message);
    refetchB2B();
    refetchB2C();
  };

  // ─── Reminder Toggle Handler using updateOrder API ───
  const handleToggleReminder = async (
    orderId: string,
    remindersActive: boolean,
  ) => {
    // If currently active → user turning OFF → pause = true
    // If currently inactive → user turning ON → pause = false
    const isReminderPaused = remindersActive;

    setTogglingReminderId(orderId);

    try {
      await updateOrder({
        id: orderId,
        isReminderPaused,
      }).unwrap();

      toast.success(
        `Reminders ${isReminderPaused ? "paused" : "resumed"} successfully`,
      );

      refetchB2B();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to toggle reminder status");
      console.error(err);
    } finally {
      setTogglingReminderId(null);
    }
  };

  // ─── Download Handlers with confirmation ───
  const handleDownloadPDF = async () => {
    setIsBestLoading(true);
    setShowPdfConfirm(false);
    try {
      const blob = await apiFetch("/order/allOrdersPdf");
      window.open(URL.createObjectURL(blob), "_blank");
      toast.success("PDF download started");
    } catch {
      toast.error("PDF download failed");
    } finally {
      setIsBestLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    setIsDownloading(true);
    setShowExcelConfirm(false);
    try {
      const blob = await apiFetch("/order/all-orders-excel?download=true");
      triggerDownload(blob, "orders.xlsx");
      toast.success("Excel downloaded successfully");
    } catch {
      toast.error("Excel download failed");
    } finally {
      setIsDownloading(false);
    }
  };

  // ─── B2B Delete Handlers ───
  const handleDeleteB2BClick = (order: IOrder) => setOrderToDeleteB2B(order);
  const handleDeleteB2BConfirm = async () => {
    if (!orderToDeleteB2B) return;
    try {
      await deleteB2BOrder(orderToDeleteB2B._id).unwrap();
      handleOperationSuccess("B2B Order deleted successfully");
      setOrderToDeleteB2B(null);
    } catch (err) {
      toast.error("Failed to delete B2B order");
      console.error(err);
    }
  };
  const handleDeleteB2BCancel = () => setOrderToDeleteB2B(null);

  // ─── B2C Delete Handlers ───
  const handleDeleteB2CClick = (order: IB2COrder) => setOrderToDeleteB2C(order);
  const handleDeleteB2CConfirm = async () => {
    if (!orderToDeleteB2C) return;
    try {
      await deleteB2COrder(orderToDeleteB2C._id).unwrap();
      handleOperationSuccess("B2C Order deleted successfully");
      setOrderToDeleteB2C(null);
    } catch (err) {
      toast.error("Failed to delete B2C order");
      console.error(err);
    }
  };
  const handleDeleteB2CCancel = () => setOrderToDeleteB2C(null);

  // ─── Filter Handlers ───
  const handleFilterSubmit = (values: FilterFormValues) => {
    setActiveFilters(values);
    setPendingFilterActive(false);
    setFilterOpen(false);
    setShowActiveFilters(true);
  };

  const handleFilterClear = () => {
    setActiveFilters(null);
    setShowActiveFilters(false);
    setSearchTerm("");
    setPendingFilterActive(false);
  };

  const togglePendingFilter = () => {
    setPendingFilterActive((prev) => !prev);
    if (!pendingFilterActive) {
      setSearchTerm("");
      setActiveFilters(null);
      setShowActiveFilters(false);
    }
  };

  const handleUpdateSuccess = () => {
    // ✅ 1. Close modal FIRST
    setIsUpdateModalOpen(false);
    setSelectedOrder(null);

    // ✅ 2. Refetch data
    refetchB2B();
    refetchB2C();

    // ✅ 3. Show ONE toast
    toast.success("Order updated successfully!");
  };

  const cardData = [
    {
      title: "Total Open Order Amount",
      value: combinedStats.totalOpenAmount,
      currency: "USD",
      bg: "#114F5E",
    },
    {
      title: "Total Order Amount",
      value: combinedStats.totalOrderAmount,
      currency: "USD",
      bg: "#219EBC",
    },
    {
      title: "Orders",
      value: combinedStats.totalOrders,
      bg: "#1F6F97",
    },
    {
      title: "Pending Orders",
      value: combinedStats.pendingOrders,
      bg: "#114F5E",
      onClick: togglePendingFilter,
      active: pendingFilterActive,
    },
  ];

  if (isLoadingOrders || isFetchingOrders)
    return (
      <Loading
        title="Loading Orders"
        message="Fetching your latest orders"
      />
    );
  if (isError)
    return <div className="p-4 text-red-500">Error loading orders</div>;

  return (
    <AccessGate allowance="orderSee" label="orders">
      <div className="p-5">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">
          Orders
        </h2>

      {/* Active Filters */}
      {showActiveFilters && activeFilters && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-blue-800">Active Filters:</span>
            {activeFilters.startDate && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                From: {new Date(activeFilters.startDate).toLocaleDateString()}
              </span>
            )}
            {activeFilters.endDate && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                To: {new Date(activeFilters.endDate).toLocaleDateString()}
              </span>
            )}
            {activeFilters.orderStatus?.length && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                Status: {activeFilters.orderStatus.join(", ")}
              </span>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleFilterClear}>
            Clear
          </Button>
        </div>
      )}

      {/* Controls */}
      <div className="flex justify-between mt-6 mb-5 flex-wrap gap-4">
        <div className="relative w-full max-w-md">
          <Input
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="
              w-full pl-4 pr-10 py-2.5
              border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
              shadow-sm hover:shadow-md
              transition-all duration-200
              text-gray-900 placeholder:text-gray-400
            "
          />

          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="
                absolute inset-y-0 right-0 pr-3 flex items-center
                text-gray-400 hover:text-gray-600
                transition-colors duration-150
              "
              aria-label="Clear search"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <div className="inline-flex items-center rounded-full bg-gray-200 p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setViewMode("B2B")}
              className={`
                px-6 py-2 text-sm font-medium rounded-full transition-all duration-300
                ${viewMode === "B2B" ? "bg-white shadow text-blue-900" : "text-gray-600 hover:text-gray-900"}
              `}
            >
              B2B Orders
            </button>

            <button
              type="button"
              onClick={() => setViewMode("B2C")}
              className={`
                px-6 py-2 text-sm font-medium rounded-full transition-all duration-300
                ${viewMode === "B2C" ? "bg-white shadow text-purple-900" : "text-gray-600 hover:text-gray-900"}
              `}
            >
              B2C Orders
            </button>
          </div>

          <ReusableModal
            open={filterOpen}
            onOpenChange={setFilterOpen}
            trigger={
              <Button className="bg-gray-800 hover:bg-gray-700">Filter</Button>
            }
            title="Order Filters"
          >
            <OrderFilterForm
              onSubmit={handleFilterSubmit}
              onClear={handleFilterClear}
              initialValues={activeFilters}
            />
          </ReusableModal>

          {showAddOrder && (
            <Button
              className="bg-red-700 hover:bg-red-600 gap-2"
              onClick={() => setAddOrderOpen(true)}
            >
              <PlusCircle className="h-4 w-4" /> Add Order
            </Button>
          )}
          <AddOrderModal
            open={addOrderOpen}
            onOpenChange={setAddOrderOpen}
            onAddSuccess={() =>
              handleOperationSuccess("New order added successfully!")
            }
          />

          {isAdminOrManager && (
            <>
              <Button
                className="bg-[#D9D9D9] hover:bg-gray-200 text-red-700"
                size="icon"
                onClick={() => setShowExcelConfirm(true)}
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <CloudCog className="w-5 h-5 animate-spin" />
                ) : (
                  <FaFileExcel className="w-5 h-5" />
                )}
              </Button>
              <Button
                className="bg-[#D9D9D9] hover:bg-gray-200 text-black"
                size="icon"
                onClick={() => setShowPdfConfirm(true)}
                disabled={isBestLoading}
              >
                {isBestLoading ? (
                  <CloudCog className="w-5 h-5 animate-spin" />
                ) : (
                  <ImFilePdf className="w-5 h-5" />
                )}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* PDF Download Confirmation Modal */}
      {showPdfConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <ImFilePdf className="w-6 h-6 text-black" />
              <h3 className="text-lg font-semibold">Download Orders PDF</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to download the complete orders report as a
              PDF file?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPdfConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-black hover:bg-gray-700 flex items-center gap-2"
                onClick={handleDownloadPDF}
              >
                <ImFilePdf className="w-4 h-4" />
                Download PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Download Confirmation Modal */}
      {showExcelConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <FaFileExcel className="w-6 h-6 text-red-700" />
              <h3 className="text-lg font-semibold">Download Orders Excel</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to download the complete orders list as an
              Excel file?
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowExcelConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                className="bg-red-700 hover:bg-red-600 flex items-center gap-2"
                onClick={handleDownloadExcel}
              >
                <FaFileExcel className="w-4 h-4" />
                Download Excel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {(searchTerm || activeFilters || pendingFilterActive) && (
        <div className="mb-4 p-2 bg-gray-50 rounded text-sm">
          Showing {filteredOrders.length} of {currentOrders.length} orders
          {pendingFilterActive && " (Pending only)"}
        </div>
      )}

      {/* ─── B2B Table ─── */}
      {viewMode === "B2B" ? (
        <div className="overflow-x-auto border border-red-700/40 rounded-lg">
          <Table className="w-full min-w-max">
            <TableHeader className="bg-gray-200">
              <TableRow>
                {[
                  { label: "Order Date", sortable: true },
                  { label: "Invoice", sortable: false },
                  { label: "PO No.", sortable: false },
                  { label: "Store Name", sortable: false },
                  { label: "Payment Due", sortable: true },
                  { label: "Order Amount", sortable: true },
                  { label: "Shipping Charge", sortable: true },
                  { label: "Total Payable", sortable: false },
                  { label: "Order Status", sortable: true },
                  { label: "Payment Received", sortable: false },
                  { label: "Discount", sortable: true },
                  { label: "Open Balance", sortable: true },
                  ...(isAdminOrManager
                    ? [
                        { label: "Profit", sortable: true },
                        { label: "Profit %", sortable: true },
                      ]
                    : []),
                  { label: "Payment Status", sortable: true },
                  { label: "Reminder", sortable: false },
                  { label: "Reminder Number", sortable: false },
                  { label: "Action", sortable: false },
                ].map((h, i) => (
                  <TableHead key={i} className="min-w-[90px] text-red-800">
                    <div className="flex items-center gap-1">
                      {h.label}
                      {h.sortable && (
                        <ArrowUpDown
                          className="w-3 h-3 cursor-pointer text-red-800"
                          onClick={() => {
                            setSortConfig((prev) => ({
                              key: h.label,
                              direction:
                                prev.key === h.label
                                  ? prev.direction === "desc"
                                    ? "asc"
                                    : prev.direction === "asc"
                                      ? null
                                      : "desc"
                                  : "desc",
                            }));
                          }}
                        />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdminOrManager ? 18 : 16}
                    className="text-center py-8 text-gray-500"
                  >
                    {searchTerm || activeFilters || pendingFilterActive
                      ? "No matching orders"
                      : "No orders"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order: IOrder) => {
                  const isDue =
                    order.paymentDueDate &&
                    new Date(order.paymentDueDate) < new Date();
                  const reminder = order.reminderNumber ?? 0;
                  const remindersActive = !(order.isReminderPaused) && order.paymentStatus !== "paid" && order.paymentStatus !== "overPaid";

                  return (
                    <TableRow key={order._id} className="hover:bg-gray-50">
                      <TableCell>
                        {new Date(order.date).toLocaleDateString("en-US", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="font-bold hover:underline">
                        <Link href={`/orders/${order._id}`}>
                          {order.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="font-bold hover:underline">
                        <Link href={`/orders/${order._id}`}>
                          {order.PONumber}
                        </Link>
                      </TableCell>
                      <TableCell>{order.storeId?.storeName}</TableCell>
                      <TableCell
                        className={
                          isDue &&
                          order.paymentStatus !== "paid" &&
                          order.paymentStatus !== "overPaid"
                            ? "text-red-700 font-bold"
                            : ""
                        }
                      >
                        {order.paymentDueDate
                          ? new Date(order.paymentDueDate).toLocaleDateString(
                              "en-US",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              },
                            )
                          : "N/A"}
                      </TableCell>
                      <TableCell>${order.orderAmount.toFixed(2)}</TableCell>
                      <TableCell>${order.shippingCharge || "0.00"}</TableCell>
                      <TableCell>
                        $
                        {(Math.ceil(order.totalPayable * 100) / 100).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`
                            px-2 py-1 rounded-full text-xs uppercase font-medium
                            ${
                              order.orderStatus === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : order.orderStatus === "verified"
                                  ? "bg-blue-100 text-blue-800"
                                  : order.orderStatus === "completed"
                                    ? "bg-green-100 text-green-800"
                                    : order.orderStatus === "cancelled"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                            }
                          `}
                        >
                          {order.orderStatus}
                        </span>
                      </TableCell>
                      <TableCell>
                        ${order.paymentAmountReceived.toFixed(2)}
                      </TableCell>
                      <TableCell>${order.discountGiven.toFixed(2)}</TableCell>
                      <TableCell
                        className={
                          order.openBalance > 0
                            ? "text-red-700"
                            : "text-green-600"
                        }
                      >
                        ${order.openBalance.toFixed(2)}
                      </TableCell>
                      {isAdminOrManager && (
                        <>
                          <TableCell className="text-green-700">
                            ${order.profitAmount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {order.profitPercentage.toFixed(2)}%
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            order.paymentStatus === "paid"
                              ? "bg-green-100 text-green-800"
                              : order.paymentStatus === "partiallyPaid"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {order.paymentStatus}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={remindersActive}
                          onChange={() =>
                            handleToggleReminder(order._id, remindersActive)
                          }
                          disabled={
                            isUpdatingOrder && togglingReminderId === order._id
                          }
                          onColor="#86d3a2"
                          offColor="#d3d3d3"
                          height={24}
                          width={48}
                        />
                      </TableCell>
                      <TableCell
                        className={
                          reminder > 0
                            ? "text-red-700 font-bold text-center"
                            : "text-center"
                        }
                      >
                        {reminder}
                      </TableCell>
                      <TableCell className="sticky right-0 bg-gray-50">
                        <div className="flex gap-5">
                          {showUpdateOrder && (
                            <Edit
                              className="w-4 h-4 mt-2 cursor-pointer hover:text-gray-700"
                              onClick={() => {
                                setSelectedOrder(order);
                                setSelectedOrderType("B2B");
                                setIsUpdateModalOpen(true);
                              }}
                            />
                          )}
                          {showDeleteOrder && (
                            <button
                              onClick={() => handleDeleteB2BClick(order)}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Delete B2B order"
                              disabled={isDeletingB2B}
                            >
                              <Trash2 className="w-4 h-4 relative top-0.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        // ─── B2C Table ───
        <div className="overflow-x-auto border border-red-700/40 rounded-lg">
          <Table className="w-full min-w-max">
            <TableHeader className="bg-gray-200">
              <TableRow>
                {[
                  { label: "Order Date", sortable: true },
                  { label: "Invoice", sortable: false },
                  { label: "PO No.", sortable: false },
                  { label: "Customer Name", sortable: false },
                  { label: "Customer Email", sortable: false },
                  { label: "Customer Phone", sortable: false },
                  { label: "Order Amount", sortable: true },
                  { label: "Shipping Charge", sortable: true },
                  { label: "Discount", sortable: true },
                  { label: "Total Payable", sortable: false },
                  { label: "Order Status", sortable: true },
                  { label: "Payment Status", sortable: true },
                  ...(isAdminOrManager
                    ? [
                        { label: "Profit", sortable: true },
                        { label: "Profit %", sortable: true },
                      ]
                    : []),
                  { label: "Actions", sortable: false },
                ].map((h, i) => (
                  <TableHead key={i} className="min-w-[90px] text-red-800">
                    <div className="flex items-center gap-1">
                      {h.label}
                      {h.sortable && (
                        <ArrowUpDown
                          className="w-3 h-3 cursor-pointer text-red-800"
                          onClick={() => {
                            setSortConfig((prev) => ({
                              key: h.label,
                              direction:
                                prev.key === h.label
                                  ? prev.direction === "desc"
                                    ? "asc"
                                    : prev.direction === "asc"
                                      ? null
                                      : "desc"
                                  : "desc",
                            }));
                          }}
                        />
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdminOrManager ? 15 : 13}
                    className="text-center py-8 text-gray-500"
                  >
                    No B2C orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order: IB2COrder) => (
                  <TableRow key={order._id} className="hover:bg-gray-50">
                    <TableCell>
                      {new Date(order.date).toLocaleDateString("en-US", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="font-bold hover:underline">
                      <Link href={`/orders/b2c/${order._id}`}>
                        {order.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="font-bold hover:underline">
                      <Link href={`/orders/b2c/${order._id}`}>
                        {order.PONumber}
                      </Link>
                    </TableCell>
                    <TableCell>{order.customerName}</TableCell>
                    <TableCell>{order.customerEmail}</TableCell>
                    <TableCell>{order.customerPhone}</TableCell>
                    <TableCell>${order.orderAmount.toFixed(2)}</TableCell>
                    <TableCell>
                      ${order.shippingCharge?.toFixed(2) || "0.00"}
                    </TableCell>
                    <TableCell>${order.discountGiven.toFixed(2)}</TableCell>
                    <TableCell>${order.totalPayable.toFixed(2)}</TableCell>
                    <TableCell>
                      <span
                        className={`
                          px-2 py-1 rounded-full text-xs uppercase font-medium
                          ${
                            order.orderStatus === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : order.orderStatus === "verified"
                                ? "bg-blue-100 text-blue-800"
                                : order.orderStatus === "completed"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                          }
                        `}
                      >
                        {order.orderStatus}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          order.paymentStatus === "paid"
                            ? "bg-green-100 text-green-800"
                            : order.paymentStatus === "partiallyPaid"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </TableCell>
                    {isAdminOrManager && (
                      <>
                        <TableCell className="text-green-700">
                          ${order.profitAmount.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {order.profitPercentage.toFixed(2)}%
                        </TableCell>
                      </>
                    )}
                    <TableCell className="sticky right-0 bg-gray-50">
                      <div className="flex gap-5">
                        {showUpdateOrder && (
                          <Edit
                            className="w-4 h-4 mt-2 cursor-pointer hover:text-gray-700"
                            onClick={() => {
                              setSelectedOrder(order);
                              setSelectedOrderType("B2C");
                              setIsUpdateModalOpen(true);
                            }}
                          />
                        )}
                        {showDeleteOrder && (
                          <button
                            onClick={() => handleDeleteB2CClick(order)}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete B2C order"
                            disabled={isDeletingB2C}
                          >
                            <Trash2 className="w-4 h-4 relative top-0.5" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ─── Custom Delete Confirmation Modal (used for BOTH B2B & B2C) ─── */}
      <OrderDeleteConfirmationModal
        orderToDeleteB2B={orderToDeleteB2B}
        orderToDeleteB2C={orderToDeleteB2C}
        isDeletingB2B={isDeletingB2B}
        isDeletingB2C={isDeletingB2C}
        onCancel={() => {
          setOrderToDeleteB2B(null);
          setOrderToDeleteB2C(null);
        }}
        onConfirmB2B={handleDeleteB2BConfirm}
        onConfirmB2C={handleDeleteB2CConfirm}
      />

      {/* Update Modal for both B2B and B2C */}
      {selectedOrder && isUpdateModalOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 backdrop-blur-md"
            onClick={() => {
              setIsUpdateModalOpen(false);
              setSelectedOrder(null);
            }}
          />
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b bg-gray-50">
              <h2 className="text-xl font-bold">
                Update Order #{selectedOrder.invoiceNumber}
              </h2>
              <button
                onClick={() => {
                  setIsUpdateModalOpen(false);
                  setSelectedOrder(null);
                }}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {selectedOrderType === "B2B" ? (
                <UpdateOrderPage
                  key={selectedOrder?._id} // 🔥 FORCE RESET
                  order={selectedOrder}
                  isModal={true}
                  onUpdateSuccess={handleUpdateSuccess}
                  onCancel={() => {
                    setIsUpdateModalOpen(false);
                    setSelectedOrder(null);
                  }}
                />
              ) : (
                <UpdateB2COrderModal
                  key={selectedOrder?._id}
                  order={selectedOrder}
                  isModal={true}
                  onUpdateSuccess={handleUpdateSuccess}
                  onCancel={() => {
                    setIsUpdateModalOpen(false);
                    setSelectedOrder(null);
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </AccessGate>
  );
}