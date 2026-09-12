"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, ArrowUpDown, Pencil, X, DollarSign, CreditCard, Calendar, FileText, AlertCircle } from "lucide-react";
import {
  useForm,
  Controller,
  SubmitHandler,
  FieldValues,
} from "react-hook-form";
import {
  useGetPaymentHistoryQuery,
  useInsertPaymentMutation,
} from "@/redux/api/orders";
import toast from "react-hot-toast";
import Link from "next/link";
import { useGetSingleCustomerQuery } from "@/redux/api/customers";
import ForceUpdateOrderModal from "../Customers/ForceUpdateOrderModal";

export default function Payment({
  productId,
  paymentId,
}: {
  productId: string;
  paymentId: string;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
    reset,
  } = useForm();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isCreditBalanceAdjust, setIsCreditBalanceAdjust] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isAdjustmentsModalOpen, setIsAdjustmentsModalOpen] = useState(false);
  const [currentPaymentAdjustments, setCurrentPaymentAdjustments] = useState<any[]>([]);

  const {
    data: paymentData,
    isLoading: isPaymentLoading,
    isError: isPaymentError,
    refetch: refetchPayment,
  } = useGetPaymentHistoryQuery(paymentId);

  const {
    data: customerData,
    isLoading: isCustomerLoading,
    isError: isCustomerError,
    refetch: refetchCustomer,
  } = useGetSingleCustomerQuery(paymentId);

  const [addPayment, { isLoading: isAddingPayment }] =
    useInsertPaymentMutation();

  const paymentMethod = watch("paymentMethod");

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    if (selectedOrderIds.length === 0) {
      toast.error("Please select at least one order to apply the payment.");
      return;
    }

    // Round to 2 decimals for any client-side validation we do.
    const roundMoney = (num: number) => Math.round(num * 100) / 100;

    const amountReceived = roundMoney(Number(data.amountReceived) || 0);
    if (amountReceived <= 0 && !isCreditBalanceAdjust) {
      toast.error("Amount received must be greater than 0.");
      return;
    }
    // Single order: partial payments are allowed; the balance simply carries
    // over. Multiple orders: the payment must clear their combined balance
    // exactly, so no set of invoices is left half-settled with no record of how
    // the money was split. Mirrors the same rule on the server.
    const availableCredit = roundMoney(
      Number(customerData?.data?.creditBalance) || 0,
    );
    const required = roundMoney(selectedOpenBalanceTotal);

    if (selectedOrderIds.length > 1) {
      const creditApplied = isCreditBalanceAdjust
        ? roundMoney(Math.min(Math.max(0, required - amountReceived), availableCredit))
        : 0;
      const offered = roundMoney(amountReceived + creditApplied);

      if (Math.abs(offered - required) > 0.01) {
        toast.error(
          `A payment covering multiple orders must match their combined open balance exactly. ` +
            `Required: $${required.toFixed(2)}, provided: $${offered.toFixed(2)}.`,
        );
        return;
      }
    }

    if (required <= 0.01) {
      toast.error("The selected order(s) are already settled — there is nothing to pay.");
      return;
    }

    const formData = new FormData();
    formData.append("storeId", paymentId);
    selectedOrderIds.forEach((orderId) => {
      formData.append("forOrderId[]", orderId);
    });
    formData.append("amount", amountReceived.toString());
    formData.append("checkNumber", data.checkNumber || "noCheck");
    formData.append("date", data.paymentDate);
    formData.append("method", data.paymentMethod);
    formData.append("isCreditBalanceAdjust", isCreditBalanceAdjust.toString());

    if (paymentMethod === "check") {
      const file = fileInputRef.current?.files?.[0];
      if (!file) {
        toast.error("Check image or PDF is required for check payments");
        return;
      }
      // Backend multer whitelist accepts both image/* and application/pdf.
      // S3 upload passes non-image files through untouched (no Sharp
      // optimization), so PDFs are stored byte-for-byte with the correct
      // ContentType.
      formData.append("checkImage", file);
    } else {
      formData.append("checkImage", "noCheck");
    }

    try {
      await addPayment(formData).unwrap();
      toast.success("Payment recorded successfully!");
      await Promise.all([refetchPayment(), refetchCustomer()]);
      setRefreshKey((prev) => prev + 1);
      reset();
      setSelectedOrderIds([]);
      setIsCreditBalanceAdjust(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to record payment");
    }
  };

  const ordersWithOpenBalance =
    customerData?.data?.customerOrders?.filter(
      (order: any) =>
        order.paymentStatus !== "paid"
    ) || [];

  // Live sum of the Open Balance values for currently-selected orders.
  // Recomputes on every selection change because selectedOrderIds is
  // tracked in the dependency list below.
  const selectedOpenBalanceTotal = ordersWithOpenBalance
    .filter((order: any) => selectedOrderIds.includes(order._id))
    .reduce(
      (sum: number, order: any) => sum + (Number(order.openBalance) || 0),
      0,
    );

  const handleCheckboxChange = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId],
    );
  };

  const handleEditClick = (order: any) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleAdjustmentsClick = (paymentRow: any) => {
    const orders = Array.isArray(paymentRow.forOrderId)
      ? paymentRow.forOrderId
      : [paymentRow.forOrderId].filter(Boolean);

    const adjustments = orders
      .filter(
        (o: any) =>
          o.payableAdjustment != null &&
          o.payableAdjustment !== 0 &&
          o.payableAdjustmentNote?.trim(),
      )
      .map((o: any) => ({
        poNumber: o.PONumber,
        adjustment: o.payableAdjustment,
        note: o.payableAdjustmentNote,
      }));

    if (adjustments.length > 0) {
      setCurrentPaymentAdjustments(adjustments);
      setIsAdjustmentsModalOpen(true);
    }
  };

  return (
    <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
      <div className="p-6 bg-white rounded-lg shadow-lg min-h-screen">
        <h1 className="text-2xl font-bold mb-6 text-red-700">Payment Info - {customerData?.data.storeName}</h1>

        {/* Payment Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Payment Method */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Payment Method <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    name="paymentMethod"
                    control={control}
                    rules={{ required: "Payment Method is required" }}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger className="focus:ring-2 focus:ring-red-500">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="check">💳 Check</SelectItem>
                          <SelectItem value="cash">💵 Cash</SelectItem>
                          <SelectItem value="cc-manual">💳 Credit Card</SelectItem>
                          <SelectItem value="donation">🎁 Donation</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.paymentMethod && (
                    <p className="text-red-500 text-xs">{errors.paymentMethod.message as string}</p>
                  )}
                </div>

                {/* Payment Date */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Payment Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    // The server rejects future dates — money cannot be
                    // received tomorrow. Cap the picker so it cannot be chosen
                    // rather than failing after submit.
                    max={new Date().toISOString().split("T")[0]}
                    {...register("paymentDate", {
                      required: "Payment Date is required",
                    })}
                    className="focus:ring-2 focus:ring-red-500"
                  />
                  {errors.paymentDate && (
                    <p className="text-red-500 text-xs">{errors.paymentDate.message as string}</p>
                  )}
                </div>

                {/* Amount Received */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Amount Received <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                    <Input
                      type="text"
                      placeholder="0.00"
                      {...register("amountReceived", {
                        required: "Amount is required",
                        pattern: {
                          value: /^\d+(\.\d{1,2})?$/,
                          message: "Enter valid amount (e.g. 123.45)",
                        },
                      })}
                      className="pl-8 focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  {errors.amountReceived && (
                    <p className="text-red-500 text-xs">{errors.amountReceived.message as string}</p>
                  )}
                </div>

                {/* Check Number (conditional) */}
                {paymentMethod === "check" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Check Number <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="text"
                      placeholder="e.g. 12345"
                      {...register("checkNumber", {
                        required: paymentMethod === "check" ? "Check number required" : false,
                      })}
                      className="focus:ring-2 focus:ring-red-500"
                    />
                    {errors.checkNumber && (
                      <p className="text-red-500 text-xs">{errors.checkNumber.message as string}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Check Image / PDF Upload */}
              {paymentMethod === "check" && (
                <div className="mt-6 space-y-2">
                  <Label className="text-sm font-medium text-gray-700">
                    Upload Check Image or PDF <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="file"
                    accept="image/*,application/pdf,.pdf"
                    ref={fileInputRef}
                    className="focus:ring-2 focus:ring-red-500 file:mr-4 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
                  />
                </div>
              )}

              {/* Submit Button */}
              <div className="mt-6 flex justify-end">
                <Button
                  type="submit"
                  className="bg-red-700 hover:bg-red-600 text-white font-semibold px-8"
                  disabled={isAddingPayment}
                >
                  {isAddingPayment ? "Saving..." : "Save Payment"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Credit Balance Section */}
        <div key={refreshKey} className="mt-8 bg-gray-50 rounded-lg border border-gray-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <DollarSign className="w-6 h-6 text-red-600" />
              <h3 className="font-semibold text-gray-800 text-lg">Credit Balance</h3>
              <span className="text-3xl font-bold text-red-700">
                ${customerData?.data?.creditBalance?.toFixed(2) || "0.00"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="useCreditBalance"
                className="w-5 h-5 border-2 border-gray-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                checked={isCreditBalanceAdjust}
                onCheckedChange={(checked) => setIsCreditBalanceAdjust(checked as boolean)}
              />
              <Label htmlFor="useCreditBalance" className="text-sm font-medium text-gray-700 cursor-pointer">
                Use credit balance for this payment
              </Label>
            </div>
          </div>
        </div>

        {/* Orders with Open Balance Section */}
        <div key={refreshKey + 1} className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-red-600" />
            <h2 className="text-lg font-semibold text-gray-800">Orders with Open Balance</h2>
            {selectedOrderIds.length > 0 && (
              <span className="ml-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                Total: ${selectedOpenBalanceTotal.toFixed(2)}
              </span>
            )}
          </div>

          <Card className="border border-gray-200 shadow-sm">
            <CardContent className="p-0">
              {isCustomerLoading ? (
                <div className="p-8 text-center text-gray-500">Loading orders...</div>
              ) : isCustomerError ? (
                <div className="p-8 text-center text-red-500">Failed to load orders</div>
              ) : ordersWithOpenBalance.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No orders with open balance.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-200">
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Invoice No.</TableHead>
                        <TableHead>Order Date</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Order Amt</TableHead>
                        <TableHead>Shipping</TableHead>
                        <TableHead>Payable</TableHead>
                        <TableHead>Adjustment</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Open Balance</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ordersWithOpenBalance.map((order: any) => (
                        <TableRow key={order._id} className="hover:bg-gray-50">
                          <TableCell>
                            <Checkbox
                              checked={selectedOrderIds.includes(order._id)}
                              onCheckedChange={() => handleCheckboxChange(order._id)}
                              className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                            />
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/orders/${order._id}`}
                              className="text-red-600 hover:text-red-700 hover:underline font-medium"
                            >
                              {order.PONumber}
                            </Link>
                          </TableCell>
                          <TableCell>{order.invoiceNumber || "—"}</TableCell>
                          <TableCell>{order.date || "—"}</TableCell>
                          <TableCell>{order.paymentDueDate || "—"}</TableCell>
                          <TableCell>${order.orderAmount?.toFixed(2) ?? "0.00"}</TableCell>
                          <TableCell>${order.shippingCharge?.toFixed(2) ?? "0.00"}</TableCell>
                          <TableCell className="font-semibold">
                            ${order.totalPayable?.toFixed(2) ?? "0.00"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {order.payableAdjustment != null && order.payableAdjustment !== 0 ? (
                                <span className={`font-medium ${order.payableAdjustment > 0 ? "text-green-600" : "text-red-600"}`}>
                                  {order.payableAdjustment > 0 ? "+" : "-"}${Math.abs(order.payableAdjustment).toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                              {order.payableAdjustmentNote?.trim() && (
                                <button
                                  onClick={() => {
                                    setSelectedOrder(order);
                                    setIsNoteModalOpen(true);
                                  }}
                                  className="bg-gray-200 hover:bg-gray-300 rounded-full px-2 py-1 text-xs"
                                  title="View adjustment note"
                                >
                                  📋
                                </button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>${order.paymentAmountReceived?.toFixed(2) ?? "0.00"}</TableCell>
                          <TableCell className="text-red-700 font-bold">
                            ${order.openBalance?.toFixed(2) ?? "0.00"}
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => handleEditClick(order)}
                              className="text-gray-500 hover:text-red-600 transition-colors"
                              title="Edit order"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment History — WITH STAR & ADJUSTMENTS */}
        <h1 className="font-semibold mt-10">Payment History</h1>
        <Card>
          <CardContent className="p-0">
            {isPaymentLoading ? (
              <div className="p-8 text-center text-gray-600">
                Loading payments...
              </div>
            ) : isPaymentError ? (
              <div className="p-8 text-center text-red-600">
                Failed to load payments
              </div>
            ) : !paymentData?.data || paymentData.data.length === 0 ? (
              <div className="p-8 text-center text-gray-600">
                No payment history
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead> {/* Star column */}
                    <TableHead>Order(s)</TableHead>
                    <TableHead>Invoice No(s).</TableHead>
                    <TableHead>Payment Date</TableHead>
                    <TableHead>Due Date(s)</TableHead>
                    <TableHead>Total Order Amt</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead className="text-right">Paid Amount</TableHead>
                    <TableHead>Check</TableHead>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead className="w-32">Adjustments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentData.data.map((row: any) => {
                    const orders = Array.isArray(row.forOrderId)
                      ? row.forOrderId
                      : [row.forOrderId].filter(Boolean);

                    const firstOrderId = orders[0]?._id;

                    const hasReturnCredit = orders.some((o: any) =>
                      o.returnData?.some((r: any) => (r.creditAmount || 0) > 0),
                    );

                    const hasAdjustment = orders.some(
                      (o: any) =>
                        o.payableAdjustment != null &&
                        o.payableAdjustment !== 0 &&
                        o.payableAdjustmentNote?.trim(),
                    );

                    return (
                      <TableRow key={row._id}>
                        <TableCell className="text-center">
                          {hasReturnCredit && (
                            <span className="text-yellow-500 font-bold text-2xl">
                              ★
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          {orders.length > 0 ? (
                            <Link
                              href={`/orders/${firstOrderId}`}
                              className="text-blue-600 hover:underline"
                            >
                              {orders.map((o: any) => o.PONumber).join(", ")}
                            </Link>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                        <TableCell>
                          {orders
                            .map((o: any) => o.invoiceNumber || "—")
                            .join(", ")}
                        </TableCell>
                        <TableCell>
                          {row.date
                            ? new Date(row.date).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {orders
                            .map((o: any) => o.paymentDueDate || "—")
                            .join(", ")}
                        </TableCell>
                        <TableCell>
                          $
                          {orders
                            .reduce(
                              (sum: number, o: any) =>
                                sum + (o.orderAmount || 0),
                              0,
                            )
                            .toFixed(2)}
                        </TableCell>
                        <TableCell className="capitalize">
                          {row.method || "—"}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${row.amount?.toFixed(2) ?? "0.00"}
                        </TableCell>

                        {/* Check Column - Only show if method is "check" */}
                        <TableCell>
                          {row.method === "check" &&
                          row.checkImage &&
                          row.checkImage !== "N/A" ? (
                            <a
                              href={row.checkImage}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline text-sm hover:text-blue-800"
                            >
                              View Check
                            </a>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>

                        {/* Transaction ID Column */}
                        <TableCell>
                          {(row.method === "cc" || row.method === "cc-manual") && row.transactionId ? (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  row.transactionId,
                                );
                                toast.success("Transaction ID copied!");
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-200 transition-colors border border-gray-300 cursor-pointer"
                              title="Click to copy Transaction ID"
                            >
                              <svg
                                className="w-3 h-3"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <rect
                                  x="9"
                                  y="9"
                                  width="13"
                                  height="13"
                                  rx="2"
                                  ry="2"
                                ></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                              </svg>
                              Copy Id
                            </button>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {hasAdjustment ? (
                            <button
                              onClick={() => handleAdjustmentsClick(row)}
                              className="bg-gray-100 text-gray-800 font-bold rounded-sm px-3 py-1 text-xs hover:bg-gray-300 transition"
                              title="View adjustments"
                            >
                              📋 View
                            </button>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Force Update Order Modal */}
      <ForceUpdateOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        order={selectedOrder}
      />

      {/* Adjustment Note Modal */}
      {isNoteModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="text-lg font-semibold text-gray-800">Adjustment Note</h3>
              <button
                onClick={() => setIsNoteModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-700 whitespace-pre-wrap">
                  {selectedOrder.payableAdjustmentNote || "No note provided."}
                </p>
              </div>
            </div>
            <div className="flex justify-end p-5 pt-0">
              <Button onClick={() => setIsNoteModalOpen(false)} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Adjustments Modal */}
      {isAdjustmentsModalOpen && currentPaymentAdjustments.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
            <div className="flex justify-between items-center p-5 border-b">
              <h3 className="text-xl font-semibold text-gray-800">Payment Adjustments</h3>
              <button
                onClick={() => setIsAdjustmentsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-96 overflow-y-auto">
              {currentPaymentAdjustments.map((adj, idx) => (
                <div key={idx} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-gray-800">
                      Order: {adj.poNumber}
                    </span>
                    <span
                      className={`font-bold text-lg ${
                        adj.adjustment > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {adj.adjustment > 0 ? "+" : "-"}${Math.abs(adj.adjustment).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 bg-white rounded p-3 border">
                    <strong>Note:</strong> {adj.note}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end p-5 pt-0">
              <Button onClick={() => setIsAdjustmentsModalOpen(false)} className="bg-red-700 hover:bg-red-600">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}