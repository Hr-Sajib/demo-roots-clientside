"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronDown, CloudCog, Filter, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import Cookies from "js-cookie";
import {
  useGetTopSellingProductsReportQuery,
  useGetOverallSalesReportQuery,
  useGetSalesByCustomerReportQuery,
  useGetSalesPersonPerformanceReportQuery,
  useGetPaymentsReportQuery,
} from "@/redux/api/salesReports";
import { Button } from "@/components/ui/button";
import { ImFilePdf } from "react-icons/im";
import { FaFileExcel } from "react-icons/fa6";
import toast from "react-hot-toast";
import {
  apiFetch,
  apiFetchWithHeaders,
  triggerDownload,
} from "@/lib/apiFetch";
import Loading from "@/redux/Shared/Loading";

type ReportType =
  | "topProducts"
  | "overallSales"
  | "customerSales"
  | "salesPersonPerformance"
  | "payments";

interface Tab {
  id: ReportType;
  label: string;
  color: string;
  count?: number;
}

const SalesReportsPage = () => {
  // Defense-in-depth: hide purchase price from non-admin/manager even
  // though /reports is admin/manager-only at the route level. PrivateRoute
  // checks role in useEffect, leaving a one-tick render window where the
  // table could flash sensitive cost data.
  const role = Cookies.get("role");
  const isAdminOrManager = role === "admin" || role === "manager";

  const [activeReport, setActiveReport] = useState<ReportType>("topProducts");
  const [timeline, setTimeline] = useState<string>("monthly");
  const [startDate, setStartDate] = useState<string>("2026-01-01");
  const [endDate, setEndDate] = useState<string>("2026-06-14");
  const [topCustomers, setTopCustomers] = useState<number>(3);
  const [shouldFetch, setShouldFetch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isPdfDownloading, setIsPdfDownloading] = useState(false);
  const [isExcelDownloading, setIsExcelDownloading] = useState(false);
  const [paymentSearchQuery, setPaymentSearchQuery] = useState("");
  const [showDownloadAgingConfirm, setShowDownloadAgingConfirm] = useState(false);
  const [isDownloadingAging, setIsDownloadingAging] = useState(false);

  // Payments report: Date range filter
  const [paymentDateFrom, setPaymentDateFrom] = useState<string>("");
  const [paymentDateTo, setPaymentDateTo] = useState<string>("");
  const [appliedPaymentDateFrom, setAppliedPaymentDateFrom] = useState<string>("");
  const [appliedPaymentDateTo, setAppliedPaymentDateTo] = useState<string>("");
  const [showDateFilterPopover, setShowDateFilterPopover] = useState(false);

  // Payments report: Method multi-select filter
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [appliedMethods, setAppliedMethods] = useState<string[]>([]);
  const [showMethodFilterPopover, setShowMethodFilterPopover] = useState(false);

  const dateFilterRef = useRef<HTMLDivElement | null>(null);
  const methodFilterRef = useRef<HTMLDivElement | null>(null);

  // Popover position state (for portal-based positioning)
  const [datePopoverPos, setDatePopoverPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [methodPopoverPos, setMethodPopoverPos] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dateFilterRef.current &&
        !dateFilterRef.current.contains(target) &&
        !(target as HTMLElement).closest('[data-popover="date-filter"]')
      ) {
        setShowDateFilterPopover(false);
      }
      if (
        methodFilterRef.current &&
        !methodFilterRef.current.contains(target) &&
        !(target as HTMLElement).closest('[data-popover="method-filter"]')
      ) {
        setShowMethodFilterPopover(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Update popover positions when opened / on scroll / resize
  useEffect(() => {
    if (!showDateFilterPopover && !showMethodFilterPopover) return;

    const updatePositions = () => {
      if (showDateFilterPopover && dateFilterRef.current) {
        const rect = dateFilterRef.current.getBoundingClientRect();
        setDatePopoverPos({
          top: rect.bottom + window.scrollY + 8,
          left: rect.left + window.scrollX,
        });
      }
      if (showMethodFilterPopover && methodFilterRef.current) {
        const rect = methodFilterRef.current.getBoundingClientRect();
        setMethodPopoverPos({
          top: rect.bottom + window.scrollY + 8,
          right: window.innerWidth - rect.right - window.scrollX,
        });
      }
    };

    updatePositions();

    window.addEventListener("scroll", updatePositions, true);
    window.addEventListener("resize", updatePositions);

    return () => {
      window.removeEventListener("scroll", updatePositions, true);
      window.removeEventListener("resize", updatePositions);
    };
  }, [showDateFilterPopover, showMethodFilterPopover]);

  // State for modals
  const [selectedCustomerData, setSelectedCustomerData] = useState<any>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [selectedPeriodData, setSelectedPeriodData] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductData, setSelectedProductData] = useState<any>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedSalesPersonPeriod, setSelectedSalesPersonPeriod] =
    useState<any>(null);
  const [isSalesPersonModalOpen, setIsSalesPersonModalOpen] = useState(false);

  // Build query params based on active report
  const getTopProductsParams = () => {
    if (timeline === "custom") {
      return { startDate, endDate };
    }
    const now = new Date();
    let start = new Date();
    let end = new Date();

    switch (timeline) {
      case "monthly":
        start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "yearly":
        start = new Date(now.getFullYear() - 4, 0, 1);
        end = new Date(now.getFullYear(), 11, 31);
        break;
      case "weekly":
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay() - 84);
        end = new Date(now);
        end.setDate(now.getDate() + (6 - now.getDay()));
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    return {
      startDate: start.toISOString().split("T")[0],
      endDate: end.toISOString().split("T")[0],
    };
  };

  const getSalesParams = () => {
    if (timeline === "custom") {
      return { startDate, endDate };
    }
    return { timeline: timeline as "monthly" | "yearly" | "weekly" };
  };

  // Queries - only fetch when shouldFetch is true
  const topProductsQuery = useGetTopSellingProductsReportQuery(
    getTopProductsParams(),
    {
      skip: !shouldFetch || activeReport !== "topProducts",
    },
  );

  const overallSalesQuery = useGetOverallSalesReportQuery(getSalesParams(), {
    skip: !shouldFetch || activeReport !== "overallSales",
  });

  const customerSalesQuery = useGetSalesByCustomerReportQuery(
    getSalesParams(),
    {
      skip: !shouldFetch || activeReport !== "customerSales",
    },
  );

  const salesPersonQuery = useGetSalesPersonPerformanceReportQuery(
    {
      ...getSalesParams(),
      topCustomers,
    },
    {
      skip: !shouldFetch || activeReport !== "salesPersonPerformance",
    },
  );

  // Payments query - auto-fetches when tab is selected
  const paymentsQuery = useGetPaymentsReportQuery(undefined, {
    skip: activeReport !== "payments",
  });

  // Filtered data based on search
  const getFilteredTopProducts = () => {
    if (!topProductsQuery.data?.data) return [];
    if (!searchQuery) return topProductsQuery.data.data;

    return topProductsQuery.data.data.filter(
      (product) =>
        product.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.productId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.rank.toString().includes(searchQuery) ||
        product.barcodeString
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()),
    );
  };

  const getFilteredOverallSales = () => {
    if (!overallSalesQuery.data?.data) return [];
    if (!searchQuery) return overallSalesQuery.data.data;

    return overallSalesQuery.data.data.filter(
      (item) =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.totalOrders.toString().includes(searchQuery) ||
        item.totalRevenue.toString().includes(searchQuery) ||
        item.totalCustomersCovered.toString().includes(searchQuery),
    );
  };

  const getFilteredCustomerSales = () => {
    if (!customerSalesQuery.data?.data) return [];
    if (!searchQuery) return customerSalesQuery.data.data;

    return customerSalesQuery.data.data.filter(
      (customer) =>
        customer.customerStoreName
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        customer.customerStoreId
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        customer.salesPerson?.name
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        customer.salesPerson?.email
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()),
    );
  };

  const getFilteredSalesPerson = () => {
    if (!salesPersonQuery.data?.data) return [];
    if (!searchQuery) return salesPersonQuery.data.data;

    return salesPersonQuery.data.data.filter(
      (person) =>
        person.salesPersonName
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        person.salesPersonEmail
          .toLowerCase()
          .includes(searchQuery.toLowerCase()),
    );
  };

  const getFilteredPayments = () => {
    let payments = paymentsQuery.data?.payments || [];

    // Filter by applied date range
    if (appliedPaymentDateFrom || appliedPaymentDateTo) {
      payments = payments.filter((payment: any) => {
        if (!payment.date) return false;
        const paymentDate = new Date(payment.date);
        if (Number.isNaN(paymentDate.getTime())) return false;

        if (appliedPaymentDateFrom) {
          const from = new Date(appliedPaymentDateFrom);
          from.setHours(0, 0, 0, 0);
          if (paymentDate < from) return false;
        }
        if (appliedPaymentDateTo) {
          const to = new Date(appliedPaymentDateTo);
          to.setHours(23, 59, 59, 999);
          if (paymentDate > to) return false;
        }
        return true;
      });
    }

    // Filter by applied methods
    if (appliedMethods.length > 0) {
      payments = payments.filter((payment: any) =>
        appliedMethods.includes(payment.method),
      );
    }

    if (!paymentSearchQuery) return payments;

    const searchLower = paymentSearchQuery.toLowerCase();
    return payments.filter(
      (payment) =>
        payment.storeName.toLowerCase().includes(searchLower) ||
        payment.paymentId.toLowerCase().includes(searchLower) ||
        payment.forOrders.some(order => order.toLowerCase().includes(searchLower)) ||
        payment.method.toLowerCase().includes(searchLower) ||
        (payment.checkNumber?.toLowerCase().includes(searchLower)) ||
        (payment.transactionId?.toLowerCase().includes(searchLower))
    );
  };

  const toggleMethodSelection = (method: string) => {
    setSelectedMethods((prev) =>
      prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method],
    );
  };

  const applyDateFilter = () => {
    if (paymentDateFrom && paymentDateTo && paymentDateFrom > paymentDateTo) {
      toast.error("Start date cannot be after end date");
      return;
    }
    setAppliedPaymentDateFrom(paymentDateFrom);
    setAppliedPaymentDateTo(paymentDateTo);
    setShowDateFilterPopover(false);
  };

  const clearDateFilter = () => {
    setPaymentDateFrom("");
    setPaymentDateTo("");
    setAppliedPaymentDateFrom("");
    setAppliedPaymentDateTo("");
    setShowDateFilterPopover(false);
  };

  const applyMethodFilter = () => {
    setAppliedMethods(selectedMethods);
    setShowMethodFilterPopover(false);
  };

  const clearMethodFilter = () => {
    setSelectedMethods([]);
    setAppliedMethods([]);
    setShowMethodFilterPopover(false);
  };

  // Reset payments filters when switching tabs away
  useEffect(() => {
    if (activeReport !== "payments") {
      setShowDateFilterPopover(false);
      setShowMethodFilterPopover(false);
    }
  }, [activeReport]);

  const isDateFilterActive =
    !!appliedPaymentDateFrom || !!appliedPaymentDateTo;
  const isMethodFilterActive = appliedMethods.length > 0;

  const handleGetReport = () => {
    setShouldFetch(true);
  };

  // Helper function to format date for filename
  const formatDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  // Handle Aging Report Download
  const handleDownloadAgingReport = async () => {
    setIsDownloadingAging(true);
    try {
      const blob = await apiFetch("/customer/agingReport?download=true");
      triggerDownload(blob, `AgingReport-${formatDate()}.xlsx`);
      toast.success("Aging Report downloaded successfully!");
    } catch (error: any) {
      toast.error(error?.message || "Failed to download Aging Report");
    } finally {
      setIsDownloadingAging(false);
      setShowDownloadAgingConfirm(false);
    }
  };

  const isDataLoaded = () => {
    // Payments report auto-loads when tab is selected, so it doesn't depend on shouldFetch
    if (activeReport === "payments") {
      return !!paymentsQuery.data?.payments?.length;
    }

    if (!shouldFetch) return false;

    switch (activeReport) {
      case "topProducts":
        return !!topProductsQuery.data?.data?.length;
      case "overallSales":
        return !!overallSalesQuery.data?.data?.length;
      case "customerSales":
        return !!customerSalesQuery.data?.data?.length;
      case "salesPersonPerformance":
        return !!salesPersonQuery.data?.data?.length;
      default:
        return false;
    }
  };

  // Get filtered data based on current report and search
  const getFilteredReportData = () => {
    switch (activeReport) {
      case "topProducts":
        return getFilteredTopProducts();
      case "overallSales":
        return getFilteredOverallSales();
      case "customerSales":
        return getFilteredCustomerSales();
      case "salesPersonPerformance":
        return getFilteredSalesPerson();
      case "payments":
        return getFilteredPayments();
      default:
        return [];
    }
  };

  const getPdfEndpoint = () => {
    switch (activeReport) {
      case "topProducts":
        return "/salesReport/generate-top-selling-products-pdf";
      case "overallSales":
        return "/salesReport/generate-overall-sales-pdf";
      case "customerSales":
        return "/salesReport/generate-customer-sales-pdf";
      case "salesPersonPerformance":
        return "/salesReport/generate-sales-person-performance-pdf";
      case "payments":
        return "/salesReport/generate-payments-report-pdf";
      default:
        return "";
    }
  };

  const getExcelEndpoint = () => {
    switch (activeReport) {
      case "topProducts":
        return "/salesReport/generate-top-selling-products-excel";
      case "overallSales":
        return "/salesReport/generate-overall-sales-excel";
      case "customerSales":
        return "/salesReport/generate-customer-sales-excel";
      case "salesPersonPerformance":
        return "/salesReport/generate-sales-person-performance-excel";
      case "payments":
        return "/salesReport/generate-payments-report-excel";
      default:
        return "";
    }
  };

  const getExcelFileName = () => {
    switch (activeReport) {
      case "topProducts":
        return `top-selling-products-${new Date().toISOString().split('T')[0]}.xlsx`;
      case "overallSales":
        return `overall-sales-${new Date().toISOString().split('T')[0]}.xlsx`;
      case "customerSales":
        return `customer-sales-${new Date().toISOString().split('T')[0]}.xlsx`;
      case "salesPersonPerformance":
        return `sales-person-performance-${new Date().toISOString().split('T')[0]}.xlsx`;
      case "payments":
        return `payments-report-${new Date().toISOString().split('T')[0]}.xlsx`;
      default:
        return `sales-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    }
  };

  const getReportTitle = () => {
    switch (activeReport) {
      case "topProducts":
        return `Top Selling Products Report (${timeline})`;
      case "overallSales":
        return `Overall Sales Report (${timeline})`;
      case "customerSales":
        return `Sales by Customer Report (${timeline})`;
      case "salesPersonPerformance":
        return `Sales Person Performance Report (${timeline})`;
      case "payments":
        return `Payments Report (${timeline})`;
      default:
        return "Sales Report";
    }
  };

  const handleDownloadPDF = async () => {
    if (!shouldFetch && activeReport !== "payments") {
      toast.error("Load report first before downloading!");
      return;
    }

    const reportData = getFilteredReportData();
    if (!reportData || reportData.length === 0) {
      toast.error("No data available to download");
      return;
    }

    const endpoint = getPdfEndpoint();
    if (!endpoint) {
      toast.error("PDF download not available for this report");
      return;
    }

    setIsPdfDownloading(true);

    try {
      // Payments report's PDF endpoint accepts only the data array.
      // Other endpoints accept { data, title, dateRange }.
      const requestBody =
        activeReport === "payments"
          ? { data: reportData }
          : {
              data: reportData,
              title: getReportTitle(),
              dateRange: {
                startDate: startDate,
                endDate: endDate,
              },
            };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      let blob: Blob;
      let contentType: string | null;
      try {
        const result = await apiFetchWithHeaders(endpoint, {
          method: "POST",
          json: requestBody,
          signal: controller.signal,
        });
        blob = result.blob;
        contentType = result.headers.get("content-type");
      } finally {
        clearTimeout(timeoutId);
      }

      if (!contentType || !contentType.includes("application/pdf")) {
        const text = await blob.text();
        try {
          const errorData = JSON.parse(text);
          toast.error(errorData.message || "Failed to generate PDF");
        } catch {
          toast.error("Unexpected response format");
        }
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const newWindow = window.open(url, "_blank");

      if (!newWindow) {
        toast.error("Please allow popups for this site");
      }

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);

      toast.success("PDF generated successfully!");
    } catch (error: any) {
      if (error?.name === "AbortError" || error?.code === "ECONNABORTED") {
        toast.error("Request timed out. Please try again.");
      } else if (error?.status === 401) {
        toast.error("Session expired. Please login again.");
      } else if (error?.status === 403) {
        toast.error("You don't have permission to download this report.");
      } else {
        toast.error(
          error?.message || "Failed to generate PDF. Please try again.",
        );
      }
    } finally {
      setIsPdfDownloading(false);
    }
  };

  const handleDownloadExcel = async () => {
    // Payments report auto-loads, so it doesn't require shouldFetch
    if (activeReport !== "payments" && !shouldFetch) {
      toast.error("Load report first before downloading!");
      return;
    }

    const endpoint = getExcelEndpoint();
    if (!endpoint) {
      toast.error("Excel download not available for this report yet");
      return;
    }

    const reportData = getFilteredReportData();
    if (!reportData || reportData.length === 0) {
      toast.error("No data available to download");
      return;
    }

    setIsExcelDownloading(true);

    try {
      // Payments report's Excel endpoint accepts only the data array.
      // Other endpoints accept { data, includeOrderDetails, title, dateRange }.
      const requestBody =
        activeReport === "payments"
          ? { data: reportData }
          : {
              data: reportData,
              includeOrderDetails: true,
              title: getReportTitle(),
              dateRange: {
                startDate: startDate,
                endDate: endDate,
              },
            };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      let blob: Blob;
      let contentType: string | null;
      try {
        const result = await apiFetchWithHeaders(endpoint, {
          method: "POST",
          json: requestBody,
          signal: controller.signal,
        });
        blob = result.blob;
        contentType = result.headers.get("content-type");
      } finally {
        clearTimeout(timeoutId);
      }

      if (!contentType || !contentType.includes("spreadsheetml")) {
        const text = await blob.text();
        try {
          const errorData = JSON.parse(text);
          toast.error(errorData.message || "Failed to generate Excel");
        } catch {
          toast.error("Unexpected response format");
        }
        return;
      }

      triggerDownload(blob, getExcelFileName());

      toast.success("Excel report downloaded successfully!");
    } catch (error: any) {
      if (error?.name === "AbortError" || error?.code === "ECONNABORTED") {
        toast.error("Request timed out. Please try again.");
      } else if (error?.status === 401) {
        toast.error("Session expired. Please login again.");
      } else if (error?.status === 403) {
        toast.error("You don't have permission to download this report.");
      } else {
        let errorMessage = "Failed to generate Excel. Please try again.";
        try {
          const text = await error?.body;
          if (text) {
            const parsed = JSON.parse(text);
            errorMessage = parsed.message || errorMessage;
          }
        } catch {
          // ignore parse failure; default message is fine
        }
        toast.error(errorMessage);
      }
    } finally {
      setIsExcelDownloading(false);
    }
  };

  const getTabColorClasses = (color: string, isActive: boolean) => {
    if (isActive) {
      return "bg-red-700 text-white shadow-md";
    }
    return "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200";
  };

  const tabs: Tab[] = [
    { id: "topProducts", label: "Top Selling Products", color: "red" },
    { id: "overallSales", label: "Overall Sales", color: "red" },
    { id: "customerSales", label: "Sales by Customer", color: "red" },
    {
      id: "salesPersonPerformance",
      label: "Sales Performance",
      color: "red",
    },
    { id: "payments", label: "Payments Report", color: "red" },
  ];

  const handleTotalOrdersClick = (item: any) => {
    setSelectedPeriodData(item);
    setIsModalOpen(true);
  };

  const handleProductOrdersClick = (product: any) => {
    setSelectedProductData(product);
    setIsProductModalOpen(true);
  };

  const handleCustomerOrdersClick = (customer: any, period: any) => {
    setSelectedCustomerData({ customer, period });
    setIsCustomerModalOpen(true);
  };

  const handleSalesPersonPeriodClick = (salesPerson: any, period: any) => {
    setSelectedSalesPersonPeriod({ salesPerson, period });
    setIsSalesPersonModalOpen(true);
  };

  const handleInvoiceClick = (orderId: string) => {
    window.location.href = `/orders/${orderId}`;
  };

  const UnifiedOrderDetailsModal = ({
    isOpen,
    onClose,
    title,
    subtitle,
    orderDetails,
    totalRevenue,
    totalPaidAmount,
    showCommission = false,
  }: {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle: string;
    orderDetails: any[];
    totalRevenue: number;
    totalPaidAmount?: number;
    showCommission?: boolean;
  }) => {
    if (!isOpen) return null;

    const hasCommission =
      orderDetails?.some(
        (order) =>
          order.commissionEarned !== undefined &&
          order.commissionEarned !== null,
      ) || false;

    const calculatePaymentStatusBadge = (order: any) => {
      if (order.paymentStatus) {
        switch (order.paymentStatus) {
          case "paid":
            return { text: "Paid", className: "bg-green-100 text-green-700" };
          case "partiallyPaid":
            return {
              text: "Partially Paid",
              className: "bg-yellow-100 text-yellow-700",
            };
          case "processing":
            return {
              text: "Processing",
              className: "bg-blue-100 text-blue-700",
            };
          default:
            return { text: "Unpaid", className: "bg-red-100 text-red-700" };
        }
      }

      const paidAmount = order.paidAmount || order.paymentAmountReceived || 0;
      const orderAmount = order.orderAmount || 0;

      if (paidAmount >= orderAmount) {
        return { text: "Paid", className: "bg-green-100 text-green-700" };
      } else if (paidAmount > 0) {
        return {
          text: "Partially Paid",
          className: "bg-yellow-100 text-yellow-700",
        };
      } else {
        return { text: "Unpaid", className: "bg-red-100 text-red-700" };
      }
    };

    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[80vh] flex flex-col">
          <div className="flex justify-between items-center p-6 border-b border-slate-200">
            <div>
              <h2 className="text-xl font-semibold text-slate-800">{title}</h2>
              <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-auto p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white rounded-lg border border-slate-200">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Invoice #
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                      Customer Name
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                      Order Amount
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                      Shipping
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                      Paid Amount
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">
                      Payment Status
                    </th>
                    {hasCommission && (
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                        Commission
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {orderDetails?.map((order: any, idx: number) => {
                    const paidAmount =
                      order.paidAmount || order.paymentAmountReceived || 0;
                    const statusBadge = calculatePaymentStatusBadge(order);

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleInvoiceClick(order.orderId)}
                            className="text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer"
                          >
                            {order.invoiceNumber}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {order.customerName}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-red-700">
                          ${(order.orderAmount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          ${(order.shipping || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">
                          ${paidAmount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge.className}`}
                          >
                            {statusBadge.text}
                          </span>
                        </td>
                        {hasCommission && (
                          <td className="px-4 py-3 text-right font-medium text-purple-700">
                            {order.commissionEarned !== null &&
                            order.commissionEarned !== undefined
                              ? `$${order.commissionEarned.toFixed(2)}`
                              : "N/A"}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                {orderDetails && orderDetails.length > 0 && (
                  <tfoot className="bg-slate-50 border-t border-slate-200">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        Total
                      </td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right font-bold text-red-700">
                        ${totalRevenue?.toFixed(2) || "0.00"}
                      </td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-right font-bold text-green-600">
                        ${totalPaidAmount?.toFixed(2) || "0.00"}
                      </td>
                      <td className="px-4 py-3"></td>
                      {hasCommission && (
                        <td className="px-4 py-3 text-right font-bold text-purple-700">
                          $
                          {orderDetails
                            .reduce((sum: number, order: any) => {
                              const commission = order.commissionEarned || 0;
                              return sum + commission;
                            }, 0)
                            .toFixed(2)}
                        </td>
                      )}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          <div className="flex justify-end p-6 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 text-slate-700 rounded-md hover:bg-slate-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderParameterControls = () => {
    // Don't show parameter controls for payments report
    if (activeReport === "payments") {
      return null;
    }

    return (
      <div className="bg-white rounded-lg shadow p-4 mb-6 border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Time Period
            </label>
            <select
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
            >
              <option value="monthly">Last 12 Months</option>
              <option value="yearly">Last 5 Years</option>
              <option value="weekly">Last 12 Weeks</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {timeline === "custom" && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </>
          )}

          {activeReport === "salesPersonPerformance" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Top Customers
              </label>
              <select
                value={topCustomers}
                onChange={(e) => setTopCustomers(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-red-500 focus:border-red-500"
              >
                <option value={3}>Top 3</option>
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
              </select>
            </div>
          )}

          <div className="flex items-end">
            <button
              onClick={handleGetReport}
              className="w-full bg-gradient-to-r from-black to-red-700 text-white px-4 py-2 rounded-md hover:bg-red-800 transition-colors"
            >
              Get Report
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderTopProductsReport = () => {
    const { isLoading, error } = topProductsQuery;
    const filteredData = getFilteredTopProducts();

    if (isLoading)
      return (
        <Loading
          title="Loading Top Products"
          message="Fetching top selling products report"
        />
      );
    if (error)
      return (
        <div className="text-red-700 text-center py-8">
          Error loading report
        </div>
      );
    if (!filteredData.length)
      return (
        <div className="text-slate-500 text-center py-8">No data found</div>
      );

    return (
      <>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden border border-slate-200">
            <thead className="bg-black text-white text-sm">
              <tr>
                <th className="px-6 py-3 text-left">Rank</th>
                <th className="px-6 py-3 text-left">Barcode</th>
                <th className="px-6 py-3 text-left">Product Name</th>
                {isAdminOrManager && (
                  <th className="px-6 py-3 text-left">Purchase Price</th>
                )}
                {isAdminOrManager && (
                  <th className="px-6 py-3 text-left">Sales Price</th>
                )}
                <th className="px-6 py-3 text-right">Quantity Sold</th>
                <th className="px-6 py-3 text-right">Total Orders</th>
                <th className="px-6 py-3 text-right">Total Revenue</th>
                <th className="px-6 py-3 text-right">Discount</th>
                <th className="px-6 py-3 text-right">Contribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredData.map((product) => (
                <tr key={product.productId} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium">#{product.rank}</td>
                  <td className="px-6 py-4">{product.barcodeString}</td>
                  <td className="px-6 py-4">{product.productName}</td>
                  {isAdminOrManager && (
                    <td className="px-6 py-4 text-right">
                      ${product.purchasePrice.toFixed(2)}
                    </td>
                  )}
                  {isAdminOrManager && (
                    <td className="px-6 py-4 text-right">
                      ${product.salesPrice.toFixed(2)}
                    </td>
                  )}
                  <td className="px-6 py-4 text-right">
                    {product.totalSoldQuantity}
                  </td>
                  <td
                    className="px-6 py-4 text-right cursor-pointer hover:underline text-blue-600 hover:text-blue-800 transition-colors"
                    onClick={() => handleProductOrdersClick(product)}
                  >
                    {product.totalOrders}
                  </td>
                  <td className="px-6 py-4 text-right">
                    ${product.totalRevenue.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    ${product.totalDiscountGiven.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-red-700">
                    {product.revenueContributionPercentage}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <UnifiedOrderDetailsModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          title="Order Details"
          subtitle={`Product: ${selectedProductData?.productName || ""}`}
          orderDetails={selectedProductData?.orderDetails || []}
          totalRevenue={selectedProductData?.totalRevenue || 0}
          totalPaidAmount={selectedProductData?.orderDetails?.reduce(
            (sum: number, order: any) =>
              sum + (order.paidAmount || order.paymentAmountReceived || 0),
            0,
          )}
        />
      </>
    );
  };

  const renderOverallSalesReport = () => {
    const { isLoading, error } = overallSalesQuery;
    const filteredData = getFilteredOverallSales();

    if (isLoading)
      return (
        <Loading
          title="Loading Overall Sales"
          message="Fetching overall sales report"
        />
      );
    if (error)
      return (
        <div className="text-red-700 text-center py-8">
          Error loading report
        </div>
      );
    if (!filteredData.length)
      return (
        <div className="text-slate-500 text-center py-8">No data found</div>
      );

    return (
      <>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden border border-slate-200">
            <thead className="bg-black text-white text-sm">
              <tr>
                <th className="px-6 py-3 text-left">Period</th>
                <th className="px-6 py-3 text-right">Total Orders</th>
                <th className="px-6 py-3 text-right">Total Revenue</th>
                <th className="px-6 py-3 text-right">Customers Covered</th>
                <th className="px-6 py-3 text-right">Avg Order Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredData.map((item, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium">{item.label}</td>
                  <td
                    className="px-6 py-4 text-right cursor-pointer hover:underline text-blue-600 hover:text-blue-800 transition-colors"
                    onClick={() => handleTotalOrdersClick(item)}
                  >
                    {item.totalOrders}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-red-700">
                    ${item.totalRevenue.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {item.totalCustomersCovered}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {item.averageOrderValue
                      ? `$${item.averageOrderValue.toFixed(2)}`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <UnifiedOrderDetailsModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Order Details"
          subtitle={`Period: ${selectedPeriodData?.label || ""}`}
          orderDetails={selectedPeriodData?.orderDetails || []}
          totalRevenue={selectedPeriodData?.totalRevenue || 0}
          totalPaidAmount={selectedPeriodData?.orderDetails?.reduce(
            (sum: number, order: any) =>
              sum + (order.paidAmount || order.paymentAmountReceived || 0),
            0,
          )}
        />
      </>
    );
  };

  const renderCustomerSalesReport = () => {
    const { isLoading, error } = customerSalesQuery;
    const filteredData = getFilteredCustomerSales();

    if (isLoading)
      return (
        <Loading
          title="Loading Customer Sales"
          message="Fetching sales grouped by customer"
        />
      );
    if (error)
      return (
        <div className="text-red-700 text-center py-8">
          Error loading report
        </div>
      );
    if (!filteredData.length)
      return (
        <div className="text-slate-500 text-center py-8">No data found</div>
      );

    return (
      <>
        <div className="space-y-6">
          {filteredData.map((customer) => (
            <div
              key={customer.customerStoreId}
              className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200"
            >
              <div className="bg-black px-6 py-4 border-b border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-100">
                      {customer.customerStoreName}
                    </h3>
                    {customer.salesPerson && (
                      <p className="text-sm text-slate-200 mt-1">
                        Sales Person: {customer.salesPerson.name} (
                        {customer.salesPerson.email})
                      </p>
                    )}
                  </div>
                  {customer.summary && (
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-200">
                        ${customer.summary.totalRevenue.toFixed(2)}
                      </p>
                      <p className="text-sm text-slate-200">
                        {customer.summary.totalOrders} total orders
                      </p>
                      <p className="text-sm text-slate-200">
                        Paid: ${customer.summary.totalPaidAmount.toFixed(2)}
                      </p>
                      <p className="text-sm text-slate-200">
                        Collection Rate: {customer.summary.collectionRate}
                      </p>
                      <p className="text-sm text-slate-200">
                        Profit: {customer.summary.profitPercentage}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-6 py-3 text-left">Period</th>
                      <th className="px-6 py-3 text-right">Orders</th>
                      <th className="px-6 py-3 text-right">Revenue</th>
                      <th className="px-6 py-3 text-right">Paid Amount</th>
                      <th className="px-6 py-3 text-right">Avg Order Value</th>
                      <th className="px-6 py-3 text-right">Collection Rate</th>
                      <th className="px-6 py-3 text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {customer.ordersData.map((period, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-6 py-4">{period.label}</td>
                        <td
                          className="px-6 py-4 text-right cursor-pointer hover:underline text-blue-600 hover:text-blue-800 transition-colors"
                          onClick={() =>
                            handleCustomerOrdersClick(customer, period)
                          }
                        >
                          {period.totalOrders}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-red-700">
                          ${period.totalRevenue.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-green-600 font-semibold">
                          ${period.totalPaidAmount.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          ${period.averageOrderValue.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              period.totalRevenue > 0 &&
                              period.totalPaidAmount / period.totalRevenue >=
                                0.8
                                ? "bg-green-100 text-green-700"
                                : period.totalRevenue > 0 &&
                                    period.totalPaidAmount /
                                      period.totalRevenue >=
                                      0.5
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {period.totalRevenue > 0
                              ? (
                                  (period.totalPaidAmount /
                                    period.totalRevenue) *
                                    100
                                ).toFixed(2) + "%"
                              : "0%"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              parseFloat(period.profitPercentage) >= 20
                                ? "bg-green-100 text-green-700"
                                : parseFloat(period.profitPercentage) >= 0
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {period.profitPercentage}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <UnifiedOrderDetailsModal
          isOpen={isCustomerModalOpen}
          onClose={() => setIsCustomerModalOpen(false)}
          title="Order Details"
          subtitle={`Customer: ${selectedCustomerData?.customer?.customerStoreName || ""} - Period: ${selectedCustomerData?.period?.label || ""}`}
          orderDetails={selectedCustomerData?.period?.orderDetails || []}
          totalRevenue={selectedCustomerData?.period?.totalRevenue || 0}
          totalPaidAmount={selectedCustomerData?.period?.totalPaidAmount || 0}
        />
      </>
    );
  };

  const renderSalesPersonPerformanceReport = () => {
    const { isLoading, error } = salesPersonQuery;
    const filteredData = getFilteredSalesPerson();

    if (isLoading)
      return (
        <Loading
          title="Loading Sales Person Performance"
          message="Fetching performance metrics"
        />
      );
    if (error)
      return (
        <div className="text-red-700 text-center py-8">
          Error loading report
        </div>
      );
    if (!filteredData || filteredData.length === 0)
      return (
        <div className="text-slate-500 text-center py-8">No data found</div>
      );

    return (
      <>
        <div className="space-y-8">
          {filteredData.map((salesPerson, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200"
            >
              {/* Header */}
              <div className="bg-black px-6 py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-semibold text-white">
                      {salesPerson.salesPersonName}
                    </h3>
                    <p className="text-red-100 text-sm">
                      {salesPerson.salesPersonEmail}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-red-200">
                      ${(salesPerson.summary?.totalSales || 0).toFixed(2)}
                    </p>
                    <p className="text-red-100 text-sm">
                      {salesPerson.summary?.totalOrders || 0} total orders
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* Summary Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-50 rounded p-3 text-center">
                    <p className="text-sm text-slate-600">Total Sales</p>
                    <p className="text-xl font-bold text-red-700">
                      ${(salesPerson.summary?.totalSales || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded p-3 text-center">
                    <p className="text-sm text-slate-600">Total Orders</p>
                    <p className="text-xl font-bold text-slate-800">
                      {salesPerson.summary?.totalOrders || 0}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded p-3 text-center">
                    <p className="text-sm text-slate-600">Collection Rate</p>
                    <p className="text-xl font-bold text-green-600">
                      {salesPerson.summary?.paidPercentage || "0"}%
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded p-3 text-center col-span-2 md:col-span-1">
                    <p className="text-sm text-slate-600">
                      Total Commission Earned
                    </p>
                    <p className="text-xl font-bold text-purple-700">
                      {salesPerson.summary?.totalCommissionEarned !== null
                        ? `$${salesPerson.summary.totalCommissionEarned.toFixed(2)}`
                        : "N/A"}
                    </p>
                  </div>
                </div>

                {/* Timeline Performance Table */}
                {salesPerson.timeData && salesPerson.timeData.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-slate-800 mb-3">
                      Performance Over Time
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full border border-slate-200 rounded-lg">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="px-4 py-2 text-left">Period</th>
                            <th className="px-4 py-2 text-right">Orders</th>
                            <th className="px-4 py-2 text-right">Sales</th>
                            <th className="px-4 py-2 text-right">
                              Paid Amount
                            </th>
                            <th className="px-4 py-2 text-right">
                              Avg Order Value
                            </th>
                            <th className="px-4 py-2 text-right">
                              Collection Rate
                            </th>
                            <th className="px-4 py-2 text-right">
                              Commission Earned
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {salesPerson.timeData.map((period, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="px-4 py-2 font-medium">
                                {period.label}
                              </td>
                              <td
                                className="px-4 py-2 text-right cursor-pointer hover:underline text-blue-600 hover:text-blue-800 transition-colors"
                                onClick={() =>
                                  handleSalesPersonPeriodClick(
                                    salesPerson,
                                    period,
                                  )
                                }
                              >
                                {period.totalOrders}
                              </td>
                              <td className="px-4 py-2 text-right text-red-700 font-semibold">
                                ${period.totalSales.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-right">
                                ${period.totalPaidOrderAmount.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-right">
                                ${period.averageOrderValue.toFixed(2)}
                              </td>
                              <td className="px-4 py-2 text-right">
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                    parseFloat(period.paidPercentage) >= 80
                                      ? "bg-green-100 text-green-700"
                                      : "bg-yellow-100 text-yellow-700"
                                  }`}
                                >
                                  {period.paidPercentage}%
                                </span>
                              </td>
                              <td className="px-4 py-2 text-right font-medium text-purple-700">
                                {period.totalCommissionEarned !== null
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
                    <div className="mb-6">
                      <h4 className="font-semibold text-slate-800 mb-3">
                        Core Customers
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full border border-slate-200 rounded-lg">
                          <thead className="bg-slate-100">
                            <tr>
                              <th className="px-4 py-2 text-left">#</th>
                              <th className="px-4 py-2 text-left">
                                Customer Name
                              </th>
                              <th className="px-4 py-2 text-right">
                                Total Sales
                              </th>
                              <th className="px-4 py-2 text-right">Sales %</th>
                              <th className="px-4 py-2 text-right">
                                Commission Rate
                              </th>
                              <th className="px-4 py-2 text-right">
                                Commission Earned
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {salesPerson.coreCustomers.map((customer, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-4 py-2 text-center">
                                  {idx + 1}
                                </td>
                                <td className="px-4 py-2 font-medium text-slate-800">
                                  {customer.customerStoreName}
                                </td>
                                <td className="px-4 py-2 text-right font-semibold text-red-700">
                                  ${customer.totalSales.toFixed(2)}
                                </td>
                                <td className="px-4 py-2 text-right font-semibold">
                                  {customer.salesPercentage}
                                </td>
                                <td className="px-4 py-2 text-right text-blue-600">
                                  {customer.commissionRate !== null
                                    ? `${customer.commissionRate}%`
                                    : "N/A"}
                                </td>
                                <td className="px-4 py-2 text-right font-medium text-purple-700">
                                  {customer.totalCommissionEarned !== null
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
            </div>
          ))}
        </div>

        {/* Sales Person Period Orders Modal with Commission */}
        <UnifiedOrderDetailsModal
          isOpen={isSalesPersonModalOpen}
          onClose={() => setIsSalesPersonModalOpen(false)}
          title="Order Details"
          subtitle={`Sales Person: ${selectedSalesPersonPeriod?.salesPerson?.salesPersonName || ""} - Period: ${selectedSalesPersonPeriod?.period?.label || ""}`}
          orderDetails={selectedSalesPersonPeriod?.period?.orderDetails || []}
          totalRevenue={selectedSalesPersonPeriod?.period?.totalSales || 0}
          totalPaidAmount={
            selectedSalesPersonPeriod?.period?.totalPaidOrderAmount || 0
          }
        />
      </>
    );
  };

  const renderPaymentsReport = () => {
    const { isLoading, error } = paymentsQuery;
    const paymentsData = paymentsQuery.data;
    const payments = paymentsData?.payments || [];
    const summary = paymentsData?.summary;

    // Filter payments based on search query
    const filteredPayments = getFilteredPayments();

    // When any filter is active (search, date, or method), compute totals
    // from the visible rows rather than the API-level summary so the cards
    // match what the user sees in the table below.
    const isDateFilterActive =
      !!appliedPaymentDateFrom || !!appliedPaymentDateTo;
    const isMethodFilterActive = appliedMethods.length > 0;
    const isFilterActive =
      !!paymentSearchQuery || isDateFilterActive || isMethodFilterActive;

    const visibleTotals = filteredPayments.reduce(
      (acc, payment) => {
        acc.totalPayments += 1;
        acc.totalAmount += Number(payment.amount) || 0;
        if (payment.storeId) acc.customerIds.add(payment.storeId);
        else if (payment.storeName)
          acc.customerIds.add(payment.storeName.toLowerCase());
        if (payment.method === "check") acc.checkTotal += Number(payment.amount) || 0;
        if (payment.method === "cash") acc.cashTotal += Number(payment.amount) || 0;
        if (payment.method === "cc") acc.ccTotal += Number(payment.amount) || 0;
        return acc;
      },
      {
        totalPayments: 0,
        totalAmount: 0,
        customerIds: new Set<string>(),
        checkTotal: 0,
        cashTotal: 0,
        ccTotal: 0,
      },
    );

    // Card display values: filtered when filtering, otherwise full summary
    const displayTotals = isFilterActive
      ? {
          totalPayments: visibleTotals.totalPayments,
          totalAmount: visibleTotals.totalAmount,
          totalCustomers: visibleTotals.customerIds.size,
          checkAmount: visibleTotals.checkTotal,
          cashAmount: visibleTotals.cashTotal,
          ccAmount: visibleTotals.ccTotal,
        }
      : summary
        ? {
            totalPayments: summary.totalPayments,
            totalAmount: summary.totalAmount,
            totalCustomers: summary.totalCustomers,
            checkAmount: summary.paymentMethods.check,
            cashAmount: summary.paymentMethods.cash,
            ccAmount: summary.paymentMethods.cc,
          }
        : null;

    if (isLoading)
      return (
        <Loading
          title="Loading Payments Report"
          message="Fetching payments report"
        />
      );
    if (error)
      return (
        <div className="text-red-700 text-center py-8">
          Error loading report
        </div>
      );
    if (!payments.length)
      return (
        <div className="text-slate-500 text-center py-8">No payments found</div>
      );

    // Helper function to copy text to clipboard
    const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard!");
    };

    // Helper function to format method badge
    const getMethodBadge = (method: string) => {
      const styles = {
        check: "bg-blue-100 text-blue-700",
        cash: "bg-green-100 text-green-700",
        cc: "bg-purple-100 text-purple-700",
        donation: "bg-pink-100 text-pink-700",
      };
      const labels = {
        check: "Check",
        cash: "Cash",
        cc: "Card",
        donation: "Donation",
      };
      return (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            styles[method as keyof typeof styles] || styles.check
          }`}
        >
          {labels[method as keyof typeof labels] || method}
        </span>
      );
    };

    return (
      <>
        {/* Summary Cards */}
        {displayTotals && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
              <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
                <p className="text-sm text-slate-500">Total Payments</p>
                <p className="text-2xl font-bold text-slate-800">
                  {displayTotals.totalPayments}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
                <p className="text-sm text-slate-500">Total Amount</p>
                <p className="text-2xl font-bold text-red-700">
                  ${displayTotals.totalAmount.toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
                <p className="text-sm text-slate-500">Total Customers</p>
                <p className="text-2xl font-bold text-slate-800">
                  {displayTotals.totalCustomers}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
                <p className="text-sm text-slate-500">Check Payments</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${displayTotals.checkAmount.toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
                <p className="text-sm text-slate-500">Card Payments</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${displayTotals.ccAmount.toFixed(2)}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4 border border-slate-200">
                <p className="text-sm text-slate-500">Cash Payments</p>
                <p className="text-2xl font-bold text-emerald-600">
                  ${displayTotals.cashAmount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payments Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search payments by customer, invoice number, or transaction ID..."
              value={paymentSearchQuery}
              onChange={(e) => setPaymentSearchQuery(e.target.value)}
              className="pl-12 h-12 border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>
          {paymentSearchQuery && (
            <div className="text-sm text-slate-500 mt-2">
              Found {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Payments Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden border border-slate-200">
            <thead className="bg-black text-white text-sm">
              <tr>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">
                  <div className="flex items-center gap-2">
                    <span>Date</span>
                    <div className="relative" ref={dateFilterRef}>
                      <button
                        onClick={() => {
                          setShowDateFilterPopover((prev) => !prev);
                          setShowMethodFilterPopover(false);
                        }}
                        className={`flex items-center justify-center p-1 rounded transition-colors ${
                          isDateFilterActive
                            ? "bg-red-700 text-white hover:bg-red-600"
                            : "text-white/80 hover:text-white hover:bg-white/10"
                        }`}
                        title="Filter by date range"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>
                      {showDateFilterPopover &&
                        mounted &&
                        datePopoverPos &&
                        createPortal(
                          <div
                            data-popover="date-filter"
                            style={{
                              position: "fixed",
                              top: datePopoverPos.top,
                              left: datePopoverPos.left,
                            }}
                            className="w-72 bg-white text-slate-800 rounded-lg shadow-2xl border border-slate-200 z-[9999] p-4"
                          >
                            <div className="flex justify-between items-center mb-3">
                              <h4 className="text-sm font-semibold">
                                Filter by Date Range
                              </h4>
                              <button
                                onClick={() => setShowDateFilterPopover(false)}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                  From
                                </label>
                                <input
                                  type="date"
                                  value={paymentDateFrom}
                                  onChange={(e) =>
                                    setPaymentDateFrom(e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                  To
                                </label>
                                <input
                                  type="date"
                                  value={paymentDateTo}
                                  min={paymentDateFrom || undefined}
                                  onChange={(e) =>
                                    setPaymentDateTo(e.target.value)
                                  }
                                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                              </div>
                            </div>
                            <div className="flex justify-between gap-2 mt-4">
                              <button
                                onClick={clearDateFilter}
                                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 border border-slate-300 rounded-md hover:bg-slate-50"
                              >
                                Clear
                              </button>
                              <button
                                onClick={applyDateFilter}
                                className="px-3 py-1.5 text-sm bg-red-700 text-white rounded-md hover:bg-red-800"
                              >
                                Apply Filter
                              </button>
                            </div>
                          </div>,
                          document.body,
                        )}
                    </div>
                    {isDateFilterActive && (
                      <span className="text-[10px] font-semibold bg-red-700 text-white px-1.5 py-0.5 rounded">
                        {appliedPaymentDateFrom && appliedPaymentDateTo
                          ? `${appliedPaymentDateFrom} → ${appliedPaymentDateTo}`
                          : appliedPaymentDateFrom
                            ? `From ${appliedPaymentDateFrom}`
                            : `Until ${appliedPaymentDateTo}`}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-left">Orders Paid</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <span>Method</span>
                    <div className="relative" ref={methodFilterRef}>
                      <button
                        onClick={() => {
                          setShowMethodFilterPopover((prev) => !prev);
                          setShowDateFilterPopover(false);
                        }}
                        className={`flex items-center justify-center p-1 rounded transition-colors ${
                          isMethodFilterActive
                            ? "bg-red-700 text-white hover:bg-red-600"
                            : "text-white/80 hover:text-white hover:bg-white/10"
                        }`}
                        title="Filter by method"
                      >
                        <Filter className="w-4 h-4" />
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {showMethodFilterPopover &&
                        mounted &&
                        methodPopoverPos &&
                        createPortal(
                          <div
                            data-popover="method-filter"
                            style={{
                              position: "fixed",
                              top: methodPopoverPos.top,
                              right: methodPopoverPos.right,
                            }}
                            className="w-56 bg-white text-slate-800 rounded-lg shadow-2xl border border-slate-200 z-[9999] p-3"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="text-sm font-semibold">
                                Filter by Method
                              </h4>
                              <button
                                onClick={() => setShowMethodFilterPopover(false)}
                                className="text-slate-400 hover:text-slate-600"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="space-y-1 max-h-56 overflow-auto">
                              {(["check", "cash", "cc", "donation"] as const).map(
                                (method) => {
                                  const labels: Record<string, string> = {
                                    check: "Check",
                                    cash: "Cash",
                                    cc: "Card",
                                    donation: "Donation",
                                  };
                                  return (
                                    <label
                                      key={method}
                                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer text-sm"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedMethods.includes(method)}
                                        onChange={() =>
                                          toggleMethodSelection(method)
                                        }
                                        className="w-4 h-4 accent-red-700"
                                      />
                                      <span>{labels[method]}</span>
                                    </label>
                                  );
                                },
                              )}
                            </div>
                            <div className="flex justify-between gap-2 mt-3 pt-3 border-t border-slate-200">
                              <button
                                onClick={clearMethodFilter}
                                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 border border-slate-300 rounded-md hover:bg-slate-50"
                              >
                                Clear
                              </button>
                              <button
                                onClick={applyMethodFilter}
                                className="px-3 py-1.5 text-sm bg-red-700 text-white rounded-md hover:bg-red-800"
                              >
                                Apply Filter
                              </button>
                            </div>
                          </div>,
                          document.body,
                        )}
                    </div>
                    {isMethodFilterActive && (
                      <span className="text-[10px] font-semibold bg-red-700 text-white px-1.5 py-0.5 rounded">
                        {appliedMethods.length}
                      </span>
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-center">Check Image</th>
                <th className="px-4 py-3 text-center">Transaction ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <tr key={payment.paymentId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {payment.storeName}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {new Date(payment.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {payment.forOrders.map((order, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded"
                          >
                            {order}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-red-700">
                      ${payment.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getMethodBadge(payment.method)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(payment.checkImage && payment.method === "check") ? (
                        <button
                          onClick={() => window.open(payment.checkImage, "_blank")}
                          className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
                        >
                          View Check
                        </button>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {payment.transactionId ? (
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-xs font-mono text-slate-600 truncate max-w-[100px]">
                            {payment.transactionId}
                          </span>
                          <button
                            onClick={() => copyToClipboard(payment.transactionId!)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            Copy
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
                    No payments found matching your search
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  const renderActiveReport = () => {
    switch (activeReport) {
      case "topProducts":
        return renderTopProductsReport();
      case "overallSales":
        return renderOverallSalesReport();
      case "customerSales":
        return renderCustomerSalesReport();
      case "salesPersonPerformance":
        return renderSalesPersonPerformanceReport();
      case "payments":
        return renderPaymentsReport();
      default:
        return null;
    }
  };

  const isDataLoadedForCurrentReport = isDataLoaded();
  const isDownloading = isPdfDownloading || isExcelDownloading;

  // Determine if we should show the main search bar
  const showMainSearch = activeReport !== "payments";

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-[90%] mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-6">
          Sales Reports Dashboard
        </h1>

        <div className="mb-6">
          <div className="bg-white border border-slate-200 rounded-lg p-1 shadow-sm inline-flex flex-wrap gap-1 items-center">
            {tabs.map((tab) => {
              const isActive = activeReport === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveReport(tab.id)}
                  className={`
                    px-4 py-2 rounded-md font-medium transition-all duration-200
                    flex items-center gap-2 text-sm
                    ${getTabColorClasses(tab.color, isActive)}
                  `}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}

            {/* Aging Report Button */}
            <button
              onClick={() => setShowDownloadAgingConfirm(true)}
              className="px-4 py-2 rounded-md font-medium transition-all duration-200 text-sm text-black hover:bg-blue-100 border-1"
            >
              <span className="flex items-center gap-2">
                <FaFileExcel className="w-4 h-4" />
                Aging Report
              </span>
            </button>
          </div>

          {/* Search Bar + Action Buttons */}
          <div className="flex justify-between w-full mt-6 relative">
            {showMainSearch ? (
              <div className="w-[80%]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by name, ID, or field values..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 border-slate-300 focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            ) : (
              <div className="w-[80%]" />
            )}
            <div className="flex gap-2 items-center justify-center">
              <Button
                className="bg-[#D9D9D9] hover:bg-gray-200 text-red-700"
                size="icon"
                onClick={handleDownloadExcel}
                disabled={!isDataLoadedForCurrentReport || isDownloading}
              >
                {isExcelDownloading ? (
                  <CloudCog className="w-5 h-5 animate-spin" />
                ) : (
                  <FaFileExcel className="w-5 h-5" />
                )}
              </Button>
              <Button
                className="bg-[#D9D9D9] hover:bg-gray-200 text-red-700"
                size="icon"
                onClick={handleDownloadPDF}
                disabled={!isDataLoadedForCurrentReport || isDownloading}
              >
                {isPdfDownloading ? (
                  <CloudCog className="w-5 h-5 animate-spin" />
                ) : (
                  <ImFilePdf className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {renderParameterControls()}

        <div className="mt-6">
          {activeReport === "payments" ? (
            // Payments report auto-loads when tab is selected
            renderPaymentsReport()
          ) : shouldFetch ? (
            renderActiveReport()
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow border border-slate-200">
              <p className="text-slate-500">
                Select parameters and click "Get Report" to view data
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Aging Report Download Confirmation Modal */}
      {showDownloadAgingConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <FaFileExcel className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Download Aging Report</h3>
              </div>
              <button
                onClick={() => setShowDownloadAgingConfirm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                Are you sure you want to download the aging report as an Excel file?
              </p>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setShowDownloadAgingConfirm(false)}
                className="px-4 py-2 border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 flex items-center gap-2 px-4 py-2 text-white"
                onClick={handleDownloadAgingReport}
                disabled={isDownloadingAging}
              >
                {isDownloadingAging ? (
                  <CloudCog className="w-4 h-4 animate-spin" />
                ) : (
                  <FaFileExcel className="w-4 h-4" />
                )}
                Download Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesReportsPage;
