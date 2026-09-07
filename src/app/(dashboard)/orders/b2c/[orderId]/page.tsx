"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/apiFetch";
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
  MapPin,
  Store,
  FileText,
  ExternalLink,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { ImFilePdf } from "react-icons/im";
import Link from "next/link";
import Loading from "@/redux/Shared/Loading";
import { toast } from "react-hot-toast";
import { useGetProductsQuery } from "@/redux/api/product";
import { useGetB2CSingleOrderQuery } from "@/redux/api/b2cOrders";

const B2COrderDetails = ({ params }: { params: { orderId: string } }) => {
  const [isBestLoading, setIsBestLoading] = useState(false);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isReturnCreditModalOpen, setIsReturnCreditModalOpen] = useState(false);
  const [isReturnHistoryModalOpen, setIsReturnHistoryModalOpen] =
    useState(false);
  const [isReturnRequestModalOpen, setIsReturnRequestModalOpen] =
    useState(false);

  const role = Cookies.get("role");
  const isAdminOrManager = role === "admin" || role === "manager";

  // Custom PDF dropdown
  const [showPdfDropdown, setShowPdfDropdown] = useState(false);
  const pdfDropdownRef = useRef<HTMLDivElement>(null);

  const [shippingChargeInput, setShippingChargeInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState("");
  const [discount, setDiscount] = useState("0");

  const [creditAmount, setCreditAmount] = useState("");
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
  } = useGetB2CSingleOrderQuery(params.orderId);

  const {
    data: productsData,
    isLoading: productsLoading,
    isError: productsError,
  } = useGetProductsQuery();

  console.log(orderData); // ✅ works

  useEffect(() => {
    refetchOrder();
  }, [params.orderId, refetchOrder]);

  // Close PDF dropdown on outside click
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

  const orderId = params.orderId

  // PDF Downloads (adjust endpoints if needed)
  const handleDownloadInvoice = async () => {
    setIsBestLoading(true);
    try {
      const blob = await apiFetch(`/b2cOrder/orderInvoice/${orderId}`);
      const fileURL = URL.createObjectURL(blob);
      window.open(fileURL, "_blank");
      setTimeout(() => URL.revokeObjectURL(fileURL), 100);
    } catch {
      toast.error("Failed to download invoice");
    } finally {
      setIsBestLoading(false);
    }
  };

  // Add Product
  const handleAddProduct = async () => {
    if (
      !selectedProduct ||
      !quantity ||
      isNaN(Number(quantity)) ||
      Number(quantity) <= 0
    ) {
      toast.error("Please select a product and enter a valid quantity.");
      return;
    }

    const newProduct = {
      productId: selectedProduct._id,
      quantity: Number(quantity),
      discount: Number(discount),
      price: selectedProduct.salesPrice, // important: use actual sales price
    };

    try {
      const updatedProducts = [
        ...(orderData?.data?.products || []),
        newProduct,
      ];

      //   await updateOrder({ id, products: updatedProducts }).unwrap();
      toast.success("Product added successfully!");
      refetchOrder();

      setIsAddProductModalOpen(false);
      setSelectedProduct(null);
      setQuantity("");
      setDiscount("0");
      setProductSearch("");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to add product");
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

  const filteredAvailableProducts =
    productsData?.data?.filter((product: any) =>
      product.name.toLowerCase().includes(productSearch.toLowerCase()),
    ) || [];

  const returnHistory = orderData?.data?.returnData || [];

  if (orderLoading || productsLoading) {
    return (
      <Loading
        title="Loading Order Details"
        message="Fetching order, products, and shipping info"
      />
    );
  }

  if (orderError || productsError) {
    return (
      <div className="p-6 text-center text-red-600">
        Error loading data. Please try again.
      </div>
    );
  }

  const hasLabelInfo = !!orderData?.data?.transactionId;

  return (
    <div className="p-6 bg-white min-h-screen">
      {isBestLoading && <Loading title="Updating..." message="" showProgressDots={false} />}

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          B2C Order Details
          {orderData?.data?.isReturnRequested && (
            <button onClick={() => setIsReturnRequestModalOpen(true)}>
              <span className="ml-3 text-sm font-semibold bg-red-100 px-3 py-1 rounded-full text-red-700">
                Return Requested
              </span>
            </button>
          )}
        </h1>

        {/* Top Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8 bg-gray-50 p-6 rounded-xl shadow-sm">
          <div>
            <span className="text-sm text-gray-600 block">Invoice Number</span>
            <span className="font-semibold text-lg">
              {orderData?.data?.invoiceNumber || "N/A"}
            </span>
          </div>
          <div>
            <span className="text-sm text-gray-600 block">PO Number</span>
            <span className="font-medium">
              {orderData?.data?.PONumber || "N/A"}
            </span>
          </div>
          <div>
            <span className="text-sm text-gray-600 block">Order Date</span>
            <span className="font-medium">
              {orderData?.data?.date || "N/A"}
            </span>
          </div>
          <div>
            <span className="text-sm text-gray-600 block">Due Date</span>
            <span className="font-medium">
              {orderData?.data?.paymentDueDate || "N/A"}
            </span>
          </div>
          <div>
            <span className="text-sm text-gray-600 block">Shipping Date</span>
            <span className="font-medium">
              {orderData?.data?.shippingDate || "N/A"}
            </span>
          </div>

          {/* Delivery / Pickup Info */}
          {orderData?.data?.pickUpAtStore ? (
            <div className="col-span-1 md:col-span-2 lg:col-span-1">
              <span className="text-sm text-gray-600 block">Delivery</span>
              <div className="flex items-center gap-2 mt-1">
                <Store className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-amber-700">
                  Pickup at Store
                </span>
              </div>
            </div>
          ) : (
            <div className="col-span-1 md:col-span-2 lg:col-span-1">
              <span className="text-sm text-gray-600 block">Ship To</span>
              <div className="mt-1 text-sm">
                {orderData?.data?.address || "N/A"}
                <br />
                {orderData?.data?.city}, {orderData?.data?.state}{" "}
                {orderData?.data?.zipCode}
              </div>
            </div>
          )}

          <div>
            <span className="text-sm text-gray-600 block">Order Amount</span>
            <span className="font-semibold text-emerald-700">
              ${Number(orderData?.data?.orderAmount?.toFixed(2)) || "0.00"}
            </span>
          </div>
          <div>
            <span className="text-sm text-gray-600 block">Shipping Charge</span>
            <span className="font-medium">
              ${Number(orderData?.data?.shippingCharge?.toFixed(2)) || "0.00"}
            </span>
          </div>
          <div>
            <span className="text-sm text-gray-600 block">Discount Given</span>
            <span className="font-medium text-orange-600">
              -${Number(orderData?.data?.discountGiven?.toFixed(2)) || "0.00"}
            </span>
          </div>
          <div>
            <span className="text-sm text-gray-600 block font-semibold">
              Total Payable
            </span>
            <span className="text-xl font-bold text-indigo-700">
              ${Number(orderData?.data?.totalPayable?.toFixed(2)) || "0.00"}
            </span>
          </div>
          {isAdminOrManager && (
            <>
              <div>
                <span className="text-sm text-gray-600 block">Profit Amount</span>
                <span className="font-medium text-green-700">
                  ${Number(orderData?.data?.profitAmount?.toFixed(2)) || "0.00"}
                </span>
              </div>
              <div>
                <span className="text-sm text-gray-600 block">Profit %</span>
                <span className="font-medium">
                  {Number(orderData?.data?.profitPercentage?.toFixed(2)) || "0"}%
                </span>
              </div>
            </>
          )}
          <div>
            <span className="text-sm text-gray-600 block">Order Status</span>
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
                  : orderData?.data?.orderStatus === "cancelled"
                    ? "bg-red-100 text-red-800"
                    : ""
              }
            >
              {orderData?.data?.orderStatus?.toUpperCase() || "N/A"}
            </Badge>
          </div>
          <div>
            <span className="text-sm text-gray-600 block">Payment Status</span>
            <Badge
              variant={
                orderData?.data?.paymentStatus === "paid"
                  ? "secondary"
                  : "destructive"
              }
              className={
                orderData?.data?.paymentStatus === "paid"
                  ? "bg-green-100 text-green-800"
                  : ""
              }
            >
              {orderData?.data?.paymentStatus?.toUpperCase() || "N/A"}
            </Badge>
          </div>
        </div>

        {/* Customer Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-white border rounded-xl p-6 shadow-sm">
          <div>
            <span className="text-sm text-gray-600 block mb-1">
              Customer Name
            </span>
            <p className="font-medium text-lg">
              {orderData?.data?.customerName || "N/A"}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600 block mb-1">Email</span>
            <p className="font-medium">
              {orderData?.data?.customerEmail || "N/A"}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-600 block mb-1">Phone</span>
            <p className="font-medium">
              {orderData?.data?.customerPhone || "N/A"}
            </p>
          </div>
        </div>

        {/* Note from customer */}
        {orderData?.data?.note && (
          <div className="border-l-4 border-blue-500 pl-4 mb-6 bg-blue-50 p-4 rounded-r-lg">
            <p className="text-gray-700">
              <strong>Note from customer:</strong> {orderData.data.note}
            </p>
          </div>
        )}

        {/* ── NEW: Compact Shipping Label Info ────────────────────────────────────── */}
        {hasLabelInfo && (
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 mb-8 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-emerald-800 flex items-center gap-2">
                <TruckIcon className="w-5 h-5" />
                Shipping Label
              </h3>
              <Badge
                variant="outline"
                className={
                  orderData?.data?.labelStatus === "SUCCESS"
                    ? "bg-green-100 text-green-800 border-green-300 text-xs"
                    : "bg-red-100 text-red-800 border-red-300 text-xs"
                }
              >
                {orderData?.data?.labelStatus || "Unknown"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              {/* Tracking */}
              {orderData?.data?.trackingNumber && (
                <div>
                  <p className="text-gray-600 text-xs">Tracking</p>
                  {orderData.data.trackingUrl ? (
                    <a
                      href={orderData.data.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      {orderData.data.trackingNumber}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <p className="font-medium">{orderData.data.trackingNumber}</p>
                  )}
                </div>
              )}

              {/* Label PDF */}
              {orderData?.data?.labelUrl && (
                <div>
                  <p className="text-gray-600 text-xs">Label</p>
                  <a
                    href={orderData.data.labelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-0.5 px-3 py-1.5 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition text-sm font-medium"
                  >
                    <FileText className="w-4 h-4 text-red-600" />
                    View PDF
                  </a>
                </div>
              )}

              {/* Purchased */}
              {orderData?.data?.labelPurchasedAt && (
                <div>
                  <p className="text-gray-600 text-xs">Purchased</p>
                  <p className="font-medium">
                    {new Date(orderData.data.labelPurchasedAt).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              )}

              {/* Mode */}
              {orderData?.data?.labelTestMode && (
                <div>
                  <p className="text-gray-600 text-xs">Mode</p>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-xs">
                    Test
                  </Badge>
                </div>
              )}
            </div>

            {/* Messages */}
            {orderData?.data?.labelMessages?.length > 0 && (
              <div className="mt-4 pt-3 border-t border-emerald-200">
                <p className="text-xs font-medium text-gray-700 mb-1.5">Carrier Notes:</p>
                <ul className="space-y-1 text-xs text-gray-600">
                  {orderData.data.labelMessages.map((msg:any, idx:any) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <span>{msg.text} {msg.source && `(${msg.source})`}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Products Table */}
        <div className="border rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="font-semibold">Product</TableHead>
                <TableHead className="font-semibold">Item No.</TableHead>
                <TableHead className="font-semibold">Category</TableHead>
                <TableHead className="font-semibold">Qty</TableHead>
                <TableHead className="font-semibold">Sales Price</TableHead>
                <TableHead className="font-semibold">Discount</TableHead>
                <TableHead className="font-semibold">Line Total</TableHead>
                <TableHead className="font-semibold">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-10 text-gray-500"
                  >
                    No products in this order
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((item: any, index: number) => (
                  <TableRow key={index} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      {item?.productId?.name}
                    </TableCell>
                    <TableCell>{item?.productId?.itemNumber}</TableCell>
                    <TableCell>
                      {item?.productId?.categoryId?.name || "N/A"}
                    </TableCell>
                    <TableCell>{item?.quantity}</TableCell>
                    <TableCell>${item?.price?.toFixed(2) || "N/A"}</TableCell>
                    <TableCell>
                      ${item?.discount?.toFixed(2) || "0.00"}
                    </TableCell>
                    <TableCell className="font-semibold">
                      $
                      {(item?.price * item?.quantity - item?.discount).toFixed(
                        2,
                      )}
                    </TableCell>
                    <TableCell>
                      {orderData?.data?.orderStatus !== "completed" && (
                        <button
                          onClick={() =>
                            setProductToDelete({
                              index,
                              productName: item?.productId?.name || "Product",
                            })
                          }
                          className="text-red-600 hover:text-red-800"
                          title="Remove from order"
                        >
                          {/* <Trash2 className="w-4 h-4" /> */}
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>


      </div>
    </div>
  );
};

export default B2COrderDetails;