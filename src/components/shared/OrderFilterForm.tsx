// components/OrderFilterForm.tsx
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetCustomersQuery } from "@/redux/api/customers";
import React from "react";
import { FilterFormValues, OrderFilterFormProps } from "@/types";

export function OrderFilterForm({
  onSubmit,
  onClear,
  initialValues,
}: OrderFilterFormProps) {
  const [form, setForm] = React.useState<FilterFormValues>({
    startDate: "",
    endDate: "",
    paymentDueStartDate: "",
    paymentDueEndDate: "",
    orderStatus: [],
    paymentStatus: [],
    storeIds: [],
    minOrderAmount: undefined,
    maxOrderAmount: undefined,
    hasOpenBalance: undefined,
  });

  // Load customers for store selection
  const { data: customers } = useGetCustomersQuery();
  const stores = customers?.data ?? [];

  // Initialize form with existing values
  React.useEffect(() => {
    if (initialValues) {
      setForm(initialValues);
    }
  }, [initialValues]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value, type } = e.target;
    setForm({
      ...form,
      [name]: type === "number" ? (value ? Number(value) : undefined) : value,
    });
  }

  function handleStatusChange(
    statusType: "orderStatus" | "paymentStatus",
    value: string,
    checked: boolean
  ) {
    setForm((prev) => ({
      ...prev,
      [statusType]: checked
        ? [...(prev[statusType] || []), value]
        : (prev[statusType] || []).filter((status) => status !== value),
    }));
  }

  function handleStoreChange(storeId: string, checked: boolean) {
    setForm((prev) => ({
      ...prev,
      storeIds: checked
        ? [...(prev.storeIds || []), storeId]
        : (prev.storeIds || []).filter((id) => id !== storeId),
    }));
  }

  function handleOpenBalanceChange(value: string) {
    setForm((prev) => ({
      ...prev,
      hasOpenBalance: value === "all" ? undefined : value === "yes",
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Filter out empty arrays and undefined values
    const cleanForm = Object.entries(form).reduce((acc, [key, value]) => {
      if (Array.isArray(value) && value.length === 0) return acc;
      if (value === undefined || value === "") return acc;
      acc[key] = value;
      return acc;
    }, {} as any);

    onSubmit(cleanForm);
  }

  function handleClear() {
    const clearedForm: FilterFormValues = {
      startDate: "",
      endDate: "",
      paymentDueStartDate: "",
      paymentDueEndDate: "",
      orderStatus: [],
      paymentStatus: [],
      storeIds: [],
      minOrderAmount: undefined,
      maxOrderAmount: undefined,
      hasOpenBalance: undefined,
    };
    setForm(clearedForm);
    if (onClear) onClear();
  }

  const orderStatusOptions = [
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "verified", label: "Verified" },
    { value: "processing", label: "Processing" },
    { value: "shipped", label: "Shipped" },
    { value: "delivered", label: "Delivered" },
    { value: "completed", label: "Completed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const paymentStatusOptions = [
    { value: "notPaid", label: "Not Paid" },
    { value: "paid", label: "Paid" },
    { value: "partiallyPaid", label: "Partially Paid" },
    { value: "partial", label: "Partial" },
    { value: "overdue", label: "Overdue" },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-h-[70vh] overflow-y-auto"
    >
      {/* Date Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Date Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-gray-600">Order Start Date</Label>
            <Input
              type="date"
              name="startDate"
              value={form.startDate}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label className="text-xs text-gray-600">Order End Date</Label>
            <Input
              type="date"
              name="endDate"
              value={form.endDate}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label className="text-xs text-gray-600">Payment Due Start</Label>
            <Input
              type="date"
              name="paymentDueStartDate"
              value={form.paymentDueStartDate}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label className="text-xs text-gray-600">Payment Due End</Label>
            <Input
              type="date"
              name="paymentDueEndDate"
              value={form.paymentDueEndDate}
              onChange={handleChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* Amount Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Amount Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-gray-600">
              Min Order Amount ($)
            </Label>
            <Input
              type="number"
              name="minOrderAmount"
              placeholder="0.00"
              min="0"
              step="0.01"
              value={form.minOrderAmount ?? ""}
              onChange={handleChange}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
            />
          </div>
          <div>
            <Label className="text-xs text-gray-600">
              Max Order Amount ($)
            </Label>
            <Input
              type="number"
              name="maxOrderAmount"
              placeholder="999999.99"
              min="0"
              step="0.01"
              value={form.maxOrderAmount ?? ""}
              onChange={handleChange}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
            />
          </div>
        </CardContent>
      </Card>

      {/* Status Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Status Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Order Status */}
          <div>
            <Label className="text-xs text-gray-600 mb-2 block">
              Order Status
            </Label>
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {orderStatusOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`order-${option.value}`}
                    checked={(form.orderStatus || []).includes(option.value)}
                    onCheckedChange={(checked) =>
                      handleStatusChange("orderStatus", option.value, !!checked)
                    }
                  />
                  <Label
                    htmlFor={`order-${option.value}`}
                    className="text-xs cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Status */}
          <div>
            <Label className="text-xs text-gray-600 mb-2 block">
              Payment Status
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {paymentStatusOptions.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`payment-${option.value}`}
                    checked={(form.paymentStatus || []).includes(option.value)}
                    onCheckedChange={(checked) =>
                      handleStatusChange(
                        "paymentStatus",
                        option.value,
                        !!checked
                      )
                    }
                  />
                  <Label
                    htmlFor={`payment-${option.value}`}
                    className="text-xs cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Open Balance Filter */}
          <div>
            <Label className="text-xs text-gray-600 mb-2 block">
              Open Balance
            </Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="balance-all"
                  checked={form.hasOpenBalance === undefined}
                  onCheckedChange={() => handleOpenBalanceChange("all")}
                />
                <Label htmlFor="balance-all" className="text-xs cursor-pointer">
                  All
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="balance-yes"
                  checked={form.hasOpenBalance === true}
                  onCheckedChange={() => handleOpenBalanceChange("yes")}
                />
                <Label htmlFor="balance-yes" className="text-xs cursor-pointer">
                  Has Balance
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="balance-no"
                  checked={form.hasOpenBalance === false}
                  onCheckedChange={() => handleOpenBalanceChange("no")}
                />
                <Label htmlFor="balance-no" className="text-xs cursor-pointer">
                  No Balance
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Store/Customer Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Store/Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label className="text-xs text-gray-600 mb-2 block">
              Select Stores
            </Label>
            <div className="max-h-40 overflow-y-auto border rounded-md p-2">
              {stores.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">
                  No stores available
                </p>
              ) : (
                stores.map((store) => (
                  <div
                    key={store._id}
                    className="flex items-center space-x-2 py-1"
                  >
                    <Checkbox
                      id={`store-${store._id}`}
                      checked={(form.storeIds || []).includes(store._id)}
                      onCheckedChange={(checked) =>
                        handleStoreChange(store._id, !!checked)
                      }
                    />
                    <Label
                      htmlFor={`store-${store._id}`}
                      className="text-xs cursor-pointer flex-1"
                    >
                      {store.storeName}
                    </Label>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={handleClear}>
          Clear All
        </Button>
        <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
          Apply Filters
        </Button>
      </div>
    </form>
  );
}
