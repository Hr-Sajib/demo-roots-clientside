"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, apiFetchWithHeaders } from "@/lib/apiFetch";
import Cookies from "js-cookie";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  DollarSign,
  History,
  X,
  Trash2,
  AlertCircle,
  Package,
  CreditCard,
  TruckIcon,
  FileImage,
  FileText,
  File,
  Warehouse,
  Pencil,
} from "lucide-react";
import { ImFilePdf } from "react-icons/im";
import Link from "next/link";
import Loading from "@/components/shared/FullScreenSpinner";
import {
  useGiteSingleOrderQuery,
  useUpdateOrderMutation,
  useGiveCreditToCustomerMutation,
} from "../../redux/api/orders";
import { useGetProductsQuery } from "../../redux/api/product";
import { toast } from "react-hot-toast";
import { useAllowance } from "@/hooks/useAllowance";

const OrderDetails = ({ id }: { id: string }) => {
  const [isBestLoading, setIsBestLoading] = useState(false);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isReturnCreditModalOpen, setIsReturnCreditModalOpen] = useState(false);
  const [isReturnHistoryModalOpen, setIsReturnHistoryModalOpen] =
    useState(false);
  const [isReturnRequestModalOpen, setIsReturnRequestModalOpen] =
    useState(false);
  const role = Cookies.get("role");
  const loggedInUserRole = Cookies.get("role");
  const isAdminOrManager =
    loggedInUserRole === "admin" || loggedInUserRole == "manager";

  // Per-action gating — admin/manager are bypassed by the hook itself.
  const canUpdateOrder = useAllowance("orderUpdate");

  // Custom dropdown state
  const [showPdfDropdown, setShowPdfDropdown] = useState(false);
  const pdfDropdownRef = useRef<HTMLDivElement>(null);

  const [shippingChargeInput, setShippingChargeInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState("");
  const [discount, setDiscount] = useState("0");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const productSearchFieldRef = useRef<HTMLDivElement>(null);
  const [productDropdownPos, setProductDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [creditAmount, setCreditAmount] = useState("");
  const [quantityError, setQuantityError] = useState("");
  const [returnedProducts, setReturnedProducts] = useState<
    Array<{
      productId: string;
      returnedQuantity: number;
      readdOrNot: boolean;
    }>
  >([]);

  const [productToDelete, setProductToDelete] = useState<{
    index: number;
    productName: string;
  } | null>(null);

  const {
    data: orderData,
    isError: orderError,
    isLoading: orderLoading,
    refetch: refetchOrder,
  } = useGiteSingleOrderQuery(id);

  const {
    data: productsData,
    isLoading: productsLoading,
    isError: productsError,
  } = useGetProductsQuery();

  const [updateOrder, { isLoading: isUpdating }] = useUpdateOrderMutation();
  const [giveCreditToCustomer, { isLoading: isCrediting }] =
    useGiveCreditToCustomerMutation();

  useEffect(() => {
    refetchOrder();
  }, [id, refetchOrder]);

  // Handle click outside for custom dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pdfDropdownRef.current &&
        !pdfDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPdfDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Product search dropdown is portaled to document.body (see render below)
  // so it isn't clipped by the "Add Additional Product" modal's
  // overflow-y-auto body — track the search field's screen position while
  // the dropdown is open so the portal can be positioned under it.
  useEffect(() => {
    if (!isDropdownOpen) return;

    const updatePosition = () => {
      const rect = productSearchFieldRef.current?.getBoundingClientRect();
      if (rect) {
        setProductDropdownPos({
          top: rect.bottom,
          left: rect.left,
          width: rect.width,
        });
      }
    };

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [isDropdownOpen]);

  // Validate quantity when selected product or quantity changes
  useEffect(() => {
    if (selectedProduct && quantity) {
      const qty = Number(quantity);
      const availableStock = selectedProduct.quantity || 0;
      // Treat NaN, 0, and any non-positive value as invalid. Using isNaN
      // first because `NaN <= 0` and `NaN > 0` both evaluate to false, so
      // a bare numeric comparison would silently let through values like
      // "abc" or "1e" that parse to NaN.
      if (isNaN(qty) || qty <= 0) {
        setQuantityError("Quantity must be greater than 0");
      } else if (qty > availableStock) {
        setQuantityError(`Only ${availableStock} units available in stock`);
      } else {
        setQuantityError("");
      }
    } else {
      setQuantityError("");
    }
  }, [selectedProduct, quantity]);

  // PDF Downloads – with clean filename
  const handleDownloadInvoice = async (id: string, invoiceNumber: string) => {
    setIsBestLoading(true);
    try {
      const { blob, headers } = await apiFetchWithHeaders(
        `/order/orderInvoice/${id}`,
      );

      let filename = `Invoice_${invoiceNumber || "Unknown"}.pdf`;
      const contentDisposition = headers.get("Content-Disposition");
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?$/);
        if (match?.[1]) {
          filename = match[1];
        }
      }

      const fileURL = URL.createObjectURL(blob);

      const newTab = window.open(fileURL, "_blank");

      if (newTab) {
        newTab.document.title = filename.replace(/\.pdf$/i, "");
        setTimeout(() => {
          if (newTab.document.title !== filename.replace(/\.pdf$/i, "")) {
            newTab.document.title = filename.replace(/\.pdf$/i, "");
          }
        }, 300);
      }

      setTimeout(() => {
        URL.revokeObjectURL(fileURL);
      }, 30000);
    } catch {
      toast.error("Failed to load invoice PDF");
    } finally {
      setIsBestLoading(false);
    }
  };

  const handleDownloadDeliverySlip = async (id: string) => {
    setIsBestLoading(true);
    try {
      const blob = await apiFetch(`/order/deliverySheet/${id}`);
      const fileURL = URL.createObjectURL(blob);
      window.open(fileURL, "_blank");
      setTimeout(() => URL.revokeObjectURL(fileURL), 10);
    } catch {
      // no-op; surface nothing for slip downloads (matches prior behavior)
    } finally {
      setIsBestLoading(false);
    }
  };

  const handleDownloadShipToAddress = async (id: string) => {
    setIsBestLoading(true);
    try {
      const blob = await apiFetch(`/order/${id}/ship-to-address-pdf`);
      const fileURL = URL.createObjectURL(blob);
      window.open(fileURL, "_blank");
      setTimeout(() => URL.revokeObjectURL(fileURL), 10);
    } catch {
      // no-op; surface nothing for ship-to downloads (matches prior behavior)
    } finally {
      setIsBestLoading(false);
    }
  };

  // Add Shipping Charge
  const handleAddShippingCharge = async () => {
    if (
      !shippingChargeInput ||
      isNaN(Number(shippingChargeInput)) ||
      Number(shippingChargeInput) < 0
    ) {
      toast.error("Please enter a valid shipping charge amount.");
      return;
    }
    try {
      await updateOrder({
        id,
        shippingCharge: Number(shippingChargeInput),
      }).unwrap();
      toast.success("Shipping charge updated successfully!");
      await refetchOrder();
      setIsShippingModalOpen(false);
      setShippingChargeInput("");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update shipping charge");
    }
  };

  // Add these types near your other state declarations
  interface WarehouseSelection {
    location: string;
    quantity: number;
    maxAvailable: number;
  }

  // Add this state for warehouse selections in the modal
  const [warehouseSelections, setWarehouseSelections] = useState<
    WarehouseSelection[]
  >([]);
  const [selectedProductForModal, setSelectedProductForModal] =
    useState<any>(null);

  // Add Product with warehouse support
  const handleAddProduct = async () => {
    if (!selectedProductForModal) {
      toast.error("Please select a product.");
      return;
    }

    // ── Defense-in-depth: reject zero/NaN quantity at the entry ─────────────
    // The Add button is also disabled when quantity is invalid, but if any
    // state-desync lets through a 0 / NaN value we still refuse to send it
    // to the server. The server's Zod gate is the ultimate check.
    const rawQty = Number(quantity);
    if (isNaN(rawQty) || rawQty <= 0) {
      toast.error("Quantity must be greater than 0.");
      return;
    }

    // Check if product has warehouse locations
    const warehouseLocations =
      selectedProductForModal.quantityInWarehouseLocation || {};
    const hasWarehouseLocations = Object.keys(warehouseLocations).length > 0;

    let warehouseLocationsMap = {};
    let totalQuantity = 0;

    if (hasWarehouseLocations) {
      // Get list of warehouse locations with available stock
      const availableLocations = Object.entries(warehouseLocations)
        .filter(([_, qty]) => qty > 0)
        .map(([location, qty]) => ({ location, available: qty }));

      if (availableLocations.length === 0) {
        toast.error("No stock available in any warehouse.");
        return;
      }

      // If there's only ONE warehouse location, use simple quantity
      if (availableLocations.length === 1) {
        const singleLocation = availableLocations[0];

        if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
          toast.error("Please enter a valid quantity.");
          return;
        }

        totalQuantity = Number(quantity);

        if (totalQuantity > singleLocation.available) {
          toast.error(
            `Only ${singleLocation.available} units available at ${singleLocation.location}.`,
          );
          return;
        }

        warehouseLocationsMap = {
          [singleLocation.location]: totalQuantity,
        };
      } else {
        // Multiple locations - use warehouse selection UI
        if (warehouseSelections.length === 0) {
          toast.error("Please select at least one warehouse location.");
          return;
        }

        // Build warehouse locations map and calculate total quantity
        warehouseSelections.forEach((selection) => {
          if (selection.quantity > 0) {
            warehouseLocationsMap = {
              ...warehouseLocationsMap,
              [selection.location]: selection.quantity,
            };
            totalQuantity += selection.quantity;
          }
        });

        if (totalQuantity === 0) {
          toast.error("Please enter quantities for selected warehouses.");
          return;
        }

        // Check if total quantity exceeds available stock
        const totalAvailable = availableLocations.reduce(
          (sum, loc) => sum + loc.available,
          0,
        );
        if (totalQuantity > totalAvailable) {
          toast.error(
            `Total quantity (${totalQuantity}) exceeds available stock (${totalAvailable}).`,
          );
          return;
        }
      }
    } else {
      // No warehouse locations - use simple quantity
      if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
        toast.error("Please enter a valid quantity.");
        return;
      }
      totalQuantity = Number(quantity);

      const availableStock = selectedProductForModal.quantity || 0;
      if (totalQuantity > availableStock) {
        toast.error(`Only ${availableStock} units available in stock.`);
        return;
      }
    }

    const newProduct = {
      productId: selectedProductForModal._id,
      quantity: totalQuantity,
      warehouseLocations: hasWarehouseLocations ? warehouseLocationsMap : {},
      discount: Number(discount),
      price: selectedProductForModal.salesPrice,
    };

    try {
      // Get current products and clean them up
      const currentProducts = orderData?.data?.products || [];
      const cleanedProducts = currentProducts.map((item: any) => ({
        productId: item.productId._id || item.productId,
        quantity: item.quantity,
        warehouseLocations: item.warehouseLocations || {},
        discount: item.discount || 0,
        price: item.price,
      }));

      const updatedProducts = [...cleanedProducts, newProduct];

      await updateOrder({ id, products: updatedProducts }).unwrap();
      toast.success("Product added successfully!");
      await refetchOrder();

      // Reset modal state
      setIsAddProductModalOpen(false);
      setSelectedProductForModal(null);
      setSelectedProduct(null);
      setQuantity("");
      setDiscount("0");
      setProductSearch("");
      setQuantityError("");
      setWarehouseSelections([]);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to add product");
      console.error("Add product error:", err);
    }
  };

  // DELETE PRODUCT FROM ORDER
  const handleDeleteProduct = async (productIndex: number) => {
    try {
      // Get the current products and filter out the deleted one
      const currentProducts = orderData?.data?.products || [];
      const updatedProducts = currentProducts
        .filter((_: any, i: number) => i !== productIndex)
        .map((item: any) => ({
          productId: item.productId._id || item.productId, // Extract just the ID
          quantity: item.quantity,
          warehouseLocations: item.warehouseLocations || {},
          discount: item.discount || 0,
          price: item.price,
        }));

      await updateOrder({ id, products: updatedProducts }).unwrap();
      toast.success("Product removed from order successfully!");
      await refetchOrder();
      setProductToDelete(null);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to remove product");
    }
  };

  // Issue Credit
  const handleIssueCredit = async () => {
    if (
      !creditAmount ||
      isNaN(Number(creditAmount)) ||
      Number(creditAmount) <= 0 ||
      returnedProducts.length === 0
    ) {
      toast.error(
        "Please enter a valid credit amount and select at least one product.",
      );
      return;
    }
    const payload = {
      orderId: id,
      creditAmount: Number(creditAmount),
      returnedProductInfo: returnedProducts,
    };
    try {
      await giveCreditToCustomer(payload).unwrap();
      toast.success("Credit issued successfully!");
      await refetchOrder();
      setIsReturnCreditModalOpen(false);
      setCreditAmount("");
      setReturnedProducts([]);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to issue credit");
    }
  };

  const handleAddReturnedProduct = (product: any) => {
    setReturnedProducts((prev) => {
      if (prev.some((item) => item.productId === product.productId._id))
        return prev;
      return [
        ...prev,
        {
          productId: product.productId._id,
          returnedQuantity: 0,
          readdOrNot: false,
        },
      ];
    });
  };

  const handleUpdateReturnedProduct = (
    productId: string,
    field: "returnedQuantity" | "readdOrNot",
    value: number | boolean,
  ) => {
    setReturnedProducts((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, [field]: value } : item,
      ),
    );
  };

  const filteredProducts =
    orderData?.data?.products?.filter((item: any) =>
      item?.productId?.name?.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  // Enhanced product search - by name OR barcode
  const filteredAvailableProducts =
    productsData?.data?.filter((product: any) => {
      const searchLower = productSearch.toLowerCase();
      const matchesName = product.name.toLowerCase().includes(searchLower);
      const matchesBarcode =
        product.barcodeString &&
        product.barcodeString.toLowerCase().includes(searchLower);
      return matchesName || matchesBarcode;
    }) || [];

  const returnHistory = orderData?.data?.returnData || [];

  if (orderLoading || productsLoading) {
    return (
      <div className="p-6 text-center text-gray-700">
        Loading order details...
      </div>
    );
  }

  if (orderError || productsError) {
    return (
      <div className="p-6 text-center text-red-600">
        Error loading data. Please try again.
      </div>
    );
  }

  const handleOpenReturnRequestDataModal = () => {
    setIsReturnRequestModalOpen(true);
  };

  // Helper to determine file type icon from URL extension
  const getFileIcon = (url: string) => {
    const extension = url.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension || "")) {
      return <FileImage className="w-5 h-5 text-blue-500" />;
    }
    if (extension === "pdf") {
      return <ImFilePdf className="w-5 h-5 text-red-500" />;
    }
    return <FileText className="w-5 h-5 text-gray-500" />;
  };

  return (
    <div>
      {isBestLoading && <Loading />}

      <div className="p-6 bg-white">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Order Details{" "}
            {orderData?.data?.isReturnRequested == true ? (
              <button>
                <span
                  onClick={handleOpenReturnRequestDataModal}
                  className="text-sm font-semibold bg-red-100 px-2 py-0.5 rounded-full"
                >
                  Return requested
                </span>
              </button>
            ) : null}
          </h1>

          {/* TOP INFO GRID — restructured into clear sections */}
          <div className="mb-6 bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
            {/* Section 1: Order Identification */}
            <div className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Order Identification
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Invoice Number</span>
                  <span className="font-semibold text-orange-600 text-lg">
                    {orderData?.data?.invoiceNumber || "N/A"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Store Name</span>
                  <span className="font-semibold text-orange-600 text-lg">
                    {orderData?.data?.storeId?.storeName || "N/A"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">PO Number</span>
                  <span className="font-medium text-gray-900 text-lg">
                    {orderData?.data?.PONumber || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Timeline */}
            <div className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Timeline
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Order Date</span>
                  <span className="font-medium text-gray-900">
                    {orderData?.data?.date || "N/A"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Due Date</span>
                  <span className="font-medium text-gray-900">
                    {orderData?.data?.paymentDueDate || "N/A"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Shipping Date</span>
                  <span className="font-medium text-gray-900">
                    {orderData?.data?.shippingDate || "N/A"}
                    {orderData?.data?.shippingDate && (
                      <span className="text-xs text-gray-400 ml-1">
                        (Autof)
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 3: Financial Breakdown */}
            <div className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Financial Breakdown
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Order Amount</span>
                  <span className="font-medium text-gray-900">
                    $
                    {(
                      Number(orderData?.data?.orderAmount?.toFixed(2) ?? 0) +
                      Number(
                        orderData?.data?.discountGiven?.toFixed(2) ?? 0
                      )
                    ).toFixed(2) || "N/A"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Shipping Charge</span>
                  <span className="font-medium text-gray-900">
                    ${orderData?.data?.shippingCharge?.toFixed(2) || "0.00"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-gray-500">Discount Given</span>
                  <span className="font-medium text-gray-900">
                    ${orderData?.data?.discountGiven?.toFixed(2) || "0.00"}
                  </span>
                </div>
                <div className="flex flex-col bg-white p-2 rounded border border-gray-200">
                  <span className="text-xs text-gray-500">Total Payable</span>
                  <span className="font-bold text-gray-900 text-lg">
                    ${orderData?.data?.totalPayable?.toFixed(2) || "N/A"}
                  </span>
                </div>
                {isAdminOrManager && (
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Profit Amount</span>
                    <span className="font-medium text-emerald-700">
                      $
                      {orderData?.data?.profitAmount?.toFixed(2) || "N/A"}
                    </span>
                  </div>
                )}
                {isAdminOrManager && (
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">
                      Profit Percentage
                    </span>
                    <span className="font-medium text-emerald-700">
                      {orderData?.data?.profitPercentage?.toFixed(2) || "N/A"}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: Payment + Order Status */}
            <div className="p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Payment &amp; Status
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Payment Bundle */}
                <div className="border border-gray-200 rounded-md p-3 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">
                      Payment Bundle
                    </span>
                    {/* Hand-editing paymentStatus/paymentAmountReceived/openBalance
                        from here is disabled for now — these must only ever be
                        derived from an actual Payment record. Trigger removed;
                        backend also rejects these fields on this endpoint. */}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Status</span>
                      <Badge
                        variant={
                          orderData?.data?.paymentStatus === "paid"
                            ? "secondary"
                            : orderData?.data?.paymentStatus === "partiallyPaid"
                              ? "default"
                              : orderData?.data?.paymentStatus === "notPaid"
                                ? "destructive"
                                : "default"
                        }
                        className={
                          orderData?.data?.paymentStatus === "paid"
                            ? "bg-green-100 text-green-800"
                            : orderData?.data?.paymentStatus === "partiallyPaid"
                              ? "bg-yellow-100 text-yellow-800"
                              : ""
                        }
                      >
                        {orderData?.data?.paymentStatus || "N/A"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Paid</span>
                      <span className="font-medium text-gray-900">
                        $
                        {orderData?.data?.paymentAmountReceived?.toFixed(2) ||
                          "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                      <span className="text-xs text-gray-500">
                        Open Balance
                      </span>
                      <span className="font-semibold text-gray-900">
                        ${orderData?.data?.openBalance?.toFixed(2) || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Order Status Bundle */}
                <div className="border border-gray-200 rounded-md p-3 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-700">
                      Order Status
                    </span>
                    <Badge
                      variant={
                        orderData?.data?.orderStatus === "completed"
                          ? "secondary"
                          : orderData?.data?.orderStatus === "cancelled"
                            ? "destructive"
                            : "default"
                      }
                      className={
                        orderData?.data?.orderStatus === "completed"
                          ? "bg-green-100 text-green-800"
                          : ""
                      }
                    >
                      {orderData?.data?.orderStatus || "N/A"}
                    </Badge>
                  </div>

                  {orderData?.data?.deliveredByPersonEmail && (
                    <div className="flex items-center justify-between py-1">
                      <span className="text-xs text-gray-500">Delivered By</span>
                      <span className="bg-green-200 rounded-full px-2 text-xs text-gray-800">
                        {orderData?.data?.deliveredByPersonEmail}
                      </span>
                    </div>
                  )}

                  {orderData?.data?.creditInfo && (
                    <div className="flex items-center justify-between py-1 border-t border-gray-100">
                      <span className="text-xs text-gray-500">Credit Info</span>
                      <span className="font-medium text-gray-900 text-sm">
                        $
                        {orderData?.data?.creditInfo?.amount?.toFixed(2) ||
                          "N/A"}
                        {orderData?.data?.creditInfo?.date && (
                          <span className="text-xs text-gray-400 ml-1">
                            (Last Issued:{" "}
                            {orderData.data.creditInfo.date.slice(0, 10)})
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {orderData?.data?.deliveryImages?.length > 0 && (
                    <div className="flex items-center justify-between py-1 border-t border-gray-100">
                      <span className="text-xs text-gray-500">
                        Delivery Photos
                      </span>
                      <div className="flex -space-x-2 gap-2">
                        {orderData.data.deliveryImages.map(
                          (img: string, idx: number) => (
                            <a
                              key={idx}
                              href={img}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img
                                src={img}
                                alt={`Delivery ${idx + 1}`}
                                className="w-10 h-10 rounded border-2 border-white shadow hover:scale-110 transition-transform object-cover"
                              />
                            </a>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                  {orderData?.data?.deliverySignImage && (
                    <div className="flex items-center justify-between py-1 border-t border-gray-100">
                      <span className="text-xs text-gray-500">
                        Customer Signature
                      </span>
                      <div className="flex items-center gap-2">
                        <a
                          href={orderData.data.deliverySignImage}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={orderData.data.deliverySignImage}
                            alt="Customer Signature"
                            className="w-8 h-8 rounded border shadow hover:scale-110 transition object-contain bg-white"
                          />
                        </a>
                        <Badge
                          variant={"secondary"}
                          className="bg-green-100 text-green-800"
                        >
                          Signed
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <h2 className="font-medium">
              {orderData?.data?.PONumber || "N/A"}
            </h2>
            <div className="flex items-center gap-2 ml-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search product in this order..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-68"
                />
              </div>

              {canUpdateOrder === true &&
                orderData?.data?.orderStatus === "completed" && (
                  <Button
                    onClick={() => setIsReturnCreditModalOpen(true)}
                    className="bg-gray-200 text-black border-gray-300 border hover:bg-white"
                  >
                    Return Credit
                  </Button>
                )}

              {returnHistory.length > 0 && (
                <Button
                  onClick={() => setIsReturnHistoryModalOpen(true)}
                  variant="outline"
                  className="flex items-center gap-2 border-blue-400 text-blue-700 hover:bg-blue-50"
                >
                  <History className="w-4 h-4" />
                  Returns ({returnHistory.length})
                </Button>
              )}

              {canUpdateOrder === true &&
                (orderData.orderStatus === "completed" &&
                role !== "admin" ? null : (
                  <Button
                    onClick={() => setIsAddProductModalOpen(true)}
                    className="bg-gray-200 text-black border-gray-300 border hover:bg-white"
                  >
                    + Add Additional Product
                  </Button>
                ))}

              {canUpdateOrder === true && (
                <Button
                  className="bg-gray-200 text-black border-gray-300 border hover:bg-white"
                  onClick={() => setIsShippingModalOpen(true)}
                >
                  Add Shipping Charge
                </Button>
              )}
              <Link
                href={`/orders/${orderData?.data?._id}/${orderData?.data?.storeId?._id}`}
              >
                <Button size="sm" className="bg-red-700 hover:bg-red-600">
                  <DollarSign className="h-4 h-4" />
                </Button>
              </Link>

              {/* CUSTOM PDF DROPDOWN */}
              <div className="relative" ref={pdfDropdownRef}>
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-9 w-9 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                  onClick={() => {
                    setShowPdfDropdown(!showPdfDropdown);
                  }}
                >
                  <ImFilePdf className="w-5 h-5 text-black" />
                </button>

                {showPdfDropdown && (
                  <div
                    className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg border z-[99999] animate-in fade-in-50 zoom-in-95"
                    style={{
                      display: "block",
                      opacity: 1,
                      visibility: "visible",
                      transformOrigin: "top right",
                    }}
                  >
                    <button
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors rounded-t-md"
                      onClick={() => {
                        handleDownloadInvoice(
                          orderData?.data?._id,
                          orderData?.data?.invoiceNumber,
                        );
                        setShowPdfDropdown(false);
                      }}
                    >
                      Invoice
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors"
                      onClick={() => {
                        handleDownloadDeliverySlip(orderData?.data?._id);
                        setShowPdfDropdown(false);
                      }}
                    >
                      Delivery Slip
                    </button>
                    <button
                      className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 transition-colors rounded-b-md"
                      onClick={() => {
                        handleDownloadShipToAddress(orderData?.data?._id);
                        setShowPdfDropdown(false);
                      }}
                    >
                      Ship to Address
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {orderData?.data?.note && (
          <div className="border p-5 mb-5 rounded-lg">
            Note from customer →{" "}
            <span className="font-bold">{orderData?.data?.note}</span>
          </div>
        )}

        {/* Order Media Section */}
        {orderData?.data?.orderMedia?.length > 0 && (
          <div className="mb-8 border rounded-lg p-6 bg-gray-50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              Attached Media ({orderData.data.orderMedia.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {orderData.data.orderMedia.map((url: string, index: number) => {
                const extension = url.split(".").pop()?.toLowerCase() || "";
                const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(
                  extension,
                );
                const isPdf = extension === "pdf";

                return (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex flex-col items-center justify-center p-3 bg-white border rounded-lg hover:border-emerald-500 hover:shadow-md transition-all duration-200 overflow-hidden"
                  >
                    <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded mb-2">
                      {isImage ? (
                        <img
                          src={url}
                          alt={`Order media ${index + 1}`}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : isPdf ? (
                        <ImFilePdf className="w-10 h-10 text-red-500" />
                      ) : (
                        <FileText className="w-10 h-10 text-gray-500" />
                      )}
                    </div>
                    <span className="text-xs text-gray-600 text-center truncate w-full">
                      {url.split("/").pop() || `File ${index + 1}`}
                    </span>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <span className="text-white text-sm font-medium">
                        Open
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* PRODUCTS TABLE WITH DELETE ACTION */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Product Name</TableHead>
                <TableHead className="font-semibold">Item Number</TableHead>
                <TableHead className="font-semibold">Category Name</TableHead>
                <TableHead className="font-semibold">Quantity</TableHead>
                <TableHead className="font-semibold">Discount</TableHead>
                <TableHead className="font-semibold">Sales Price</TableHead>
                {/* Only show profit columns for admin/manager */}
                {isAdminOrManager && (
                  <>
                    <TableHead className="font-semibold">Pur. Price(Now)</TableHead>
                    <TableHead className="font-semibold">Profit</TableHead>
                    <TableHead className="font-semibold">Profit %</TableHead>
                  </>
                )}
                <TableHead className="font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((item: any, index: number) => (
                <TableRow key={index} className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    {item?.productId?.name}
                  </TableCell>
                  <TableCell className="text-blue-600 cursor-pointer">
                    <Link href="/inventory">{item?.productId?.itemNumber}</Link>
                  </TableCell>
                  <TableCell>{item?.productId?.categoryId?.name}</TableCell>
                  <TableCell>{item?.quantity}</TableCell>

                  <TableCell>${item?.discount?.toFixed(2) || "0.00"}</TableCell>
                  <TableCell>${item?.price?.toFixed(2) || "N/A"}</TableCell>
                  {/* Only show profit columns for admin/manager */}
                  {isAdminOrManager && (
                    <>
                      <TableCell>
                        ${item?.productId?.purchasePrice?.toFixed(2) || "N/A"}
                      </TableCell>
                      <TableCell>
                        $
                        {(
                          item?.productId?.salesPrice * item.quantity -
                          item?.productId?.purchasePrice * item.quantity -
                          item?.discount
                        )?.toFixed(2) || "N/A"}
                      </TableCell>
                      <TableCell>
                        {(
                          ((item?.productId?.salesPrice * item.quantity -
                            item?.productId?.purchasePrice * item.quantity -
                            item?.discount) /
                            (item?.productId?.purchasePrice * item.quantity)) *
                          100
                        )?.toFixed(2) || "N/A"}
                        %
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    <button
                      onClick={() =>
                        setProductToDelete({
                          index,
                          productName: item?.productId?.name || "Product",
                        })
                      }
                      className="text-red-600 hover:text-red-800 transition"
                      title="Remove product from order"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* DELETE PRODUCT CONFIRMATION MODAL */}
        {productToDelete && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col animate-in fade-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center p-6 bg-red-50 rounded-t-2xl">
                <h2 className="text-xl font-bold flex items-center gap-3 text-red-800">
                  <AlertCircle className="w-6 h-6" />
                  Confirm Removal
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setProductToDelete(null)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="p-6">
                <p className="text-gray-700">
                  Are you sure you want to remove{" "}
                  <strong>{productToDelete.productName}</strong> from this
                  order?
                </p>
              </div>

              <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                <Button
                  variant="outline"
                  onClick={() => setProductToDelete(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => handleDeleteProduct(productToDelete.index)}
                  disabled={isUpdating}
                >
                  {isUpdating ? "Removing..." : "Remove"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* RETURN REQUEST MODAL */}
        {isReturnRequestModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center p-6 bg-red-50 rounded-t-2xl">
                <h2 className="text-2xl font-bold flex items-center gap-3 text-red-800">
                  <AlertCircle className="w-6 h-6" />
                  Return Request Details
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsReturnRequestModalOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Return Note */}
                {orderData?.data?.returnNoteFromDriver && (
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                    <h3 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      Driver's Note
                    </h3>
                    <p className="text-gray-700 leading-relaxed">
                      {orderData.data.returnNoteFromDriver}
                    </p>
                  </div>
                )}

                {/* Return Images */}
                {orderData?.data?.returnImages &&
                  orderData.data.returnImages.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        Return Images ({orderData.data.returnImages.length})
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {orderData.data.returnImages.map(
                          (img: string, idx: number) => (
                            <a
                              key={idx}
                              href={img}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group relative aspect-square overflow-hidden rounded-lg border-2 border-gray-200 hover:border-emerald-500 transition-all duration-300"
                            >
                              <img
                                src={img}
                                alt={`Return image ${idx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                                <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                                  View Full Size
                                </span>
                              </div>
                            </a>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {/* Empty State */}
                {(!orderData?.data?.returnImages ||
                  orderData.data.returnImages.length === 0) &&
                  !orderData?.data?.returnNoteFromDriver && (
                    <div className="text-center py-12 text-gray-500">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p>No return data available.</p>
                    </div>
                  )}
              </div>

              <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                <Button
                  variant="outline"
                  onClick={() => setIsReturnRequestModalOpen(false)}
                >
                  Close
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    setIsReturnRequestModalOpen(false);
                    setIsReturnCreditModalOpen(true);
                  }}
                >
                  Process Return
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* SHIPPING CHARGE MODAL */}
        {isShippingModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col animate-in fade-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center p-6 bg-gray-100 rounded-t-2xl">
                <h2 className="text-xl font-bold flex items-center gap-3 text-black">
                  <TruckIcon className="w-6 h-6" />
                  Add Shipping Charge
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsShippingModalOpen(false);
                    setShippingChargeInput("");
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 p-6">
                <label
                  htmlFor="shippingCharge"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Shipping Charge ($)
                </label>
                <Input
                  id="shippingCharge"
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingChargeInput}
                  onChange={(e) => setShippingChargeInput(e.target.value)}
                  placeholder="Enter shipping charge"
                  className="w-full"
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
              </div>

              <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsShippingModalOpen(false);
                    setShippingChargeInput("");
                  }}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddShippingCharge}
                  disabled={isUpdating || !shippingChargeInput}
                  className="bg-black hover:bg-gray-700"
                >
                  {isUpdating ? "Adding..." : "Add"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ENHANCED ADD PRODUCT MODAL WITH WAREHOUSE SELECTION */}
        {isAddProductModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center p-6 bg-gray-100 rounded-t-2xl">
                <h2 className="text-xl font-bold flex items-center gap-3 text-black">
                  <Package className="w-6 h-6" />
                  Add Additional Product
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsAddProductModalOpen(false);
                    setSelectedProductForModal(null);
                    setSelectedProduct(null);
                    setQuantity("");
                    setDiscount("0");
                    setProductSearch("");
                    setQuantityError("");
                    setWarehouseSelections([]);
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Product Search */}
                <div className="relative" ref={productSearchFieldRef}>
                  <label
                    htmlFor="productSearch"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Search Product (by name or barcode)
                  </label>
                  <Input
                    id="productSearch"
                    type="text"
                    value={productSearch}
                    onChange={(e) => {
                      setProductSearch(e.target.value);
                      setIsDropdownOpen(true);
                    }}
                    placeholder="Search by product name or barcode..."
                    className="w-full"
                  />
                  {isDropdownOpen &&
                    productSearch &&
                    filteredAvailableProducts.length > 0 &&
                    productDropdownPos &&
                    createPortal(
                      <div
                        style={{
                          position: "fixed",
                          top: productDropdownPos.top,
                          left: productDropdownPos.left,
                          width: productDropdownPos.width,
                        }}
                        className="z-[100] max-h-60 overflow-y-auto bg-white border rounded-md shadow-lg mt-1"
                      >
                        {filteredAvailableProducts.map((product: any) => {
                          const stockAvailable = product.quantity || 0;
                          const isOutOfStock = stockAvailable === 0;
                          const warehouseLocations =
                            product.quantityInWarehouseLocation || {};
                          const hasWarehouseLocations =
                            Object.keys(warehouseLocations).length > 0;

                          return (
                            <div
                              key={product._id}
                              onClick={() => {
                                if (!isOutOfStock) {
                                  setSelectedProductForModal(product);
                                  setSelectedProduct(product);
                                  setProductSearch(product.name);
                                  setIsDropdownOpen(false);
                                  setQuantityError("");
                                  // Reset warehouse selections when new product is selected
                                  const locations =
                                    product.quantityInWarehouseLocation || {};
                                  const availableLocations = Object.entries(
                                    locations,
                                  )
                                    .filter(([_, qty]) => qty > 0)
                                    .map(([location]) => ({
                                      location,
                                      quantity: 0,
                                      maxAvailable: locations[location],
                                    }));

                                  // Only set warehouse selections if more than 1 location
                                  if (availableLocations.length > 1) {
                                    setWarehouseSelections(availableLocations);
                                  } else {
                                    setWarehouseSelections([]);
                                    // Set default quantity to 1 for single location
                                    setQuantity("1");
                                  }
                                }
                              }}
                              className={`p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0 ${
                                isOutOfStock
                                  ? "opacity-50 cursor-not-allowed bg-gray-50"
                                  : ""
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">
                                    {product.name}
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    Item: {product.itemNumber}
                                    {product.barcodeString && (
                                      <span className="ml-2 text-xs text-gray-400">
                                        Barcode: {product.barcodeString}
                                      </span>
                                    )}
                                  </div>
                                  {hasWarehouseLocations && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      <Warehouse className="w-3 h-3 inline mr-1" />
                                      Locations:{" "}
                                      {Object.entries(warehouseLocations)
                                        .filter(([_, qty]) => qty > 0)
                                        .map(([loc, qty]) => `${loc} (${qty})`)
                                        .join(", ")}
                                    </div>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="font-semibold text-green-600">
                                    ${product.salesPrice}
                                  </div>
                                  <div
                                    className={`text-xs ${
                                      stockAvailable > 0
                                        ? "text-blue-600"
                                        : "text-red-500"
                                    }`}
                                  >
                                    Stock: {stockAvailable}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>,
                      document.body,
                    )}
                  {isDropdownOpen &&
                    productSearch &&
                    filteredAvailableProducts.length === 0 &&
                    productDropdownPos &&
                    createPortal(
                      <div
                        style={{
                          position: "fixed",
                          top: productDropdownPos.top,
                          left: productDropdownPos.left,
                          width: productDropdownPos.width,
                        }}
                        className="z-[100] bg-white border rounded-md shadow-lg mt-1 p-4 text-center text-gray-500"
                      >
                        No products found matching "{productSearch}"
                      </div>,
                      document.body,
                    )}
                </div>

                {/* Selected Product Details */}
                {selectedProductForModal && (
                  <div className="bg-blue-50 p-3 rounded-md">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">
                        Selected Product:
                      </span>
                      <span className="text-sm font-semibold text-gray-900">
                        {selectedProductForModal.name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm text-gray-600">Unit Price:</span>
                      <span className="text-sm font-semibold text-green-600">
                        ${selectedProductForModal.salesPrice}
                      </span>
                    </div>
                  </div>
                )}

                {/* Warehouse Selection - Only show if product has multiple warehouse locations */}
                {selectedProductForModal &&
                  selectedProductForModal.quantityInWarehouseLocation &&
                  (() => {
                    const locations =
                      selectedProductForModal.quantityInWarehouseLocation;
                    const availableLocations = Object.entries(locations)
                      .filter(([_, qty]) => qty > 0)
                      .map(([location]) => location);

                    // Only show warehouse selection UI if there are multiple locations
                    if (availableLocations.length > 1) {
                      return (
                        <div className="border rounded-md p-3">
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            <Warehouse className="w-4 h-4 inline mr-1" />
                            Select Quantities by Warehouse
                          </label>

                          <div className="space-y-3">
                            {warehouseSelections.map((selection, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2"
                              >
                                <span className="text-sm font-medium flex-1">
                                  {selection.location}
                                </span>
                                <span className="text-xs text-gray-500 mr-1">
                                  (Max: {selection.maxAvailable})
                                </span>
                                <Input
                                  type="number"
                                  min="0"
                                  max={selection.maxAvailable}
                                  value={selection.quantity || ""}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 0;
                                    const maxAvailable = selection.maxAvailable;
                                    const validQuantity = Math.min(
                                      Math.max(0, value),
                                      maxAvailable,
                                    );

                                    if (validQuantity !== value && value > 0) {
                                      toast.warning(
                                        `Only ${maxAvailable} units available at ${selection.location}`,
                                      );
                                    }

                                    setWarehouseSelections((prev) =>
                                      prev.map((sel, i) =>
                                        i === idx
                                          ? { ...sel, quantity: validQuantity }
                                          : sel,
                                      ),
                                    );
                                  }}
                                  className="w-24 h-8 text-center text-sm"
                                  placeholder="Qty"
                                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                />
                              </div>
                            ))}
                          </div>

                          {/* Total quantity summary */}
                          <div className="mt-3 pt-2 border-t">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">
                                Total Selected:
                              </span>
                              <span className="font-bold text-red-600">
                                {warehouseSelections.reduce(
                                  (sum, sel) => sum + sel.quantity,
                                  0,
                                )}{" "}
                                units
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                {/* Simple Quantity - Show when:
            1. Product has NO warehouse locations, OR
            2. Product has exactly ONE warehouse location
        */}
                {selectedProductForModal &&
                  (!selectedProductForModal.quantityInWarehouseLocation ||
                    Object.keys(
                      selectedProductForModal.quantityInWarehouseLocation,
                    ).length === 0 ||
                    (() => {
                      const locations =
                        selectedProductForModal.quantityInWarehouseLocation ||
                        {};
                      const availableLocations = Object.entries(locations)
                        .filter(([_, qty]) => qty > 0)
                        .map(([location]) => location);
                      return availableLocations.length === 1;
                    })()) && (
                    <div>
                      <label
                        htmlFor="quantity"
                        className="block text-sm font-medium text-gray-700 mb-2"
                      >
                        Quantity
                        {selectedProductForModal.quantityInWarehouseLocation &&
                          (() => {
                            const locations =
                              selectedProductForModal.quantityInWarehouseLocation;
                            const availableLocations = Object.entries(
                              locations,
                            ).filter(([_, qty]) => qty > 0);
                            if (availableLocations.length === 1) {
                              return (
                                <span className="text-xs text-gray-500 ml-2">
                                  (Warehouse: {availableLocations[0][0]})
                                </span>
                              );
                            }
                            return null;
                          })()}
                      </label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        max={selectedProductForModal?.quantity || 0}
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="Enter quantity"
                        className={`w-full ${quantityError ? "border-red-500 focus:ring-red-500" : ""}`}
                        disabled={
                          !selectedProductForModal ||
                          (selectedProductForModal?.quantity || 0) === 0
                        }
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      />
                      {quantityError && (
                        <p className="text-sm text-red-600 mt-1">
                          {quantityError}
                        </p>
                      )}
                      {selectedProductForModal &&
                        selectedProductForModal.quantity === 0 && (
                          <p className="text-sm text-red-600 mt-1">
                            This product is out of stock and cannot be added.
                          </p>
                        )}
                      {selectedProductForModal.quantityInWarehouseLocation &&
                        (() => {
                          const locations =
                            selectedProductForModal.quantityInWarehouseLocation;
                          const availableLocations = Object.entries(
                            locations,
                          ).filter(([_, qty]) => qty > 0);
                          if (availableLocations.length === 1) {
                            return (
                              <p className="text-xs text-gray-500 mt-1">
                                Available: {availableLocations[0][1]} units at{" "}
                                {availableLocations[0][0]}
                              </p>
                            );
                          }
                          return null;
                        })()}
                    </div>
                  )}

                {/* Discount Input */}
                <div>
                  <label
                    htmlFor="discount"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Discount ($)
                  </label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                    placeholder="Enter discount"
                    className="w-full"
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  />
                </div>
              </div>

              <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAddProductModalOpen(false);
                    setSelectedProductForModal(null);
                    setSelectedProduct(null);
                    setQuantity("");
                    setDiscount("0");
                    setProductSearch("");
                    setQuantityError("");
                    setWarehouseSelections([]);
                  }}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddProduct}
                  disabled={
                    isUpdating ||
                    !selectedProductForModal ||
                    (() => {
                      const locations =
                        selectedProductForModal.quantityInWarehouseLocation ||
                        {};
                      const availableLocations = Object.entries(locations)
                        .filter(([_, qty]) => qty > 0)
                        .map(([location]) => location);

                      // If multiple warehouse locations
                      if (availableLocations.length > 1) {
                        return (
                          warehouseSelections.reduce(
                            (sum, sel) => sum + sel.quantity,
                            0,
                          ) === 0
                        );
                      }

                      // If no warehouse or single warehouse
                      const qtyNum = Number(quantity);
                      return (
                        !quantity ||
                        !!quantityError ||
                        isNaN(qtyNum) ||
                        qtyNum <= 0 ||
                        qtyNum > (selectedProductForModal?.quantity || 0)
                      );
                    })()
                  }
                  className="bg-black hover:bg-gray-700"
                >
                  {isUpdating ? "Adding..." : "Add"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* RETURN CREDIT MODAL */}
        {isReturnCreditModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center p-6 bg-emerald-50 rounded-t-2xl">
                <h2 className="text-2xl font-bold flex items-center gap-3 text-emerald-800">
                  <CreditCard className="w-6 h-6" />
                  Issue Return Credit
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsReturnCreditModalOpen(false);
                    setCreditAmount("");
                    setReturnedProducts([]);
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label
                    htmlFor="creditAmount"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Credit Amount ($)
                  </label>
                  <Input
                    id="creditAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    placeholder="Enter credit amount"
                    className="w-full"
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Products to Return
                  </label>
                  <div className="max-h-40 overflow-y-auto border rounded-md p-2">
                    {orderData?.data?.products?.map((product: any) => (
                      <div
                        key={product.productId._id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={returnedProducts.some(
                            (item) => item.productId === product.productId._id,
                          )}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleAddReturnedProduct(product);
                            } else {
                              setReturnedProducts((prev) =>
                                prev.filter(
                                  (item) =>
                                    item.productId !== product.productId._id,
                                ),
                              );
                            }
                          }}
                          className="h-4 w-4"
                        />
                        <span>
                          {product.productId.name} (Qty: {product.quantity})
                        </span>
                        <span className="font-bold">
                          @ {product.productId.salesPrice} $
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {returnedProducts.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Returned Product Details
                    </label>
                    {returnedProducts.map((item) => {
                      const product = orderData?.data?.products.find(
                        (p: any) => p.productId._id === item.productId,
                      );
                      return (
                        <div
                          key={item.productId}
                          className="border p-2 rounded-md mb-2"
                        >
                          <p className="text-sm font-medium">
                            {product?.productId?.name}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <label className="text-sm text-gray-600">
                              Return Quantity:
                            </label>
                            <Input
                              type="number"
                              min="1"
                              max={product?.quantity}
                              value={item.returnedQuantity || ""}
                              onChange={(e) =>
                                handleUpdateReturnedProduct(
                                  item.productId,
                                  "returnedQuantity",
                                  Number(e.target.value),
                                )
                              }
                              className="w-20"
                              onWheel={(e) => (e.target as HTMLInputElement).blur()}
                            />
                            <label className="flex items-center gap-1 text-sm text-gray-600">
                              <input
                                type="checkbox"
                                checked={item.readdOrNot}
                                onChange={(e) =>
                                  handleUpdateReturnedProduct(
                                    item.productId,
                                    "readdOrNot",
                                    e.target.checked,
                                  )
                                }
                                className="h-4 w-4"
                              />
                              Keep in inventory
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsReturnCreditModalOpen(false);
                    setCreditAmount("");
                    setReturnedProducts([]);
                  }}
                  disabled={isCrediting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleIssueCredit}
                  disabled={isCrediting || !creditAmount}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isCrediting ? "Issuing..." : "Issue"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* RETURN HISTORY MODAL */}
        {isReturnHistoryModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center p-6 bg-blue-50 rounded-t-2xl">
                <h2 className="text-2xl font-bold flex items-center gap-3 text-blue-800">
                  <History className="w-6 h-6" />
                  Return History
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsReturnHistoryModalOpen(false)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {returnHistory.length === 0 ? (
                  <p className="text-center text-gray-500 py-12">
                    No returns recorded yet.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-center">
                          Returned Qty
                        </TableHead>
                        <TableHead>Sales Price</TableHead>
                        <TableHead>Credit Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returnHistory.map((entry: any, index: number) => {
                        const product = orderData?.data?.products?.find(
                          (p: any) =>
                            p.productId._id === entry.product.productId,
                        );
                        return (
                          <TableRow key={index} className="hover:bg-gray-50">
                            <TableCell className="text-sm">
                              {new Date(entry.dateTime).toLocaleString()}
                            </TableCell>
                            <TableCell className="font-medium">
                              {product?.productId?.name || "Unknown Product"}
                            </TableCell>
                            <TableCell className="text-center font-bold text-orange-600">
                              {entry.product.quantity}
                            </TableCell>
                            <TableCell>
                              ${Number(entry.product.salesPrice).toFixed(2)}
                            </TableCell>
                            <TableCell className="font-bold text-green-600">
                              ${Number(entry.creditAmount || 0).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="p-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                <Button
                  onClick={() => setIsReturnHistoryModalOpen(false)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetails;
