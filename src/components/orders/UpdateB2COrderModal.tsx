"use client";

import { useState, useEffect, useRef } from "react";
import { useGetCategoriesQuery } from "@/redux/api/categories";
import {
  useGetProductsQuery,
  useGetProductsByCategoryQuery,
} from "@/redux/api/product";
import { useUpdateOrderMutation } from "@/redux/api/orders";
import {
  Calendar,
  MapPin,
  Search,
  Plus,
  Minus,
  Package,
  ShoppingCart,
  Calculator,
  Edit,
  User,
  Mail,
  Phone,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import imageUpload from "@/lib/ImageUploader";
import { useUpdateB2COrderMutation } from "@/redux/api/b2cOrders";
import { UserData } from "@/Features/Customers/CustomerTable";
import { useCurrentUser } from "@/hooks/useCurrentUser";

// ── Types ──
interface Product {
  _id: string;
  name: string;
  itemNumber: string;
  salesPrice: number;
  quantity: number;
  categoryId: { _id: string; name: string };
  weightUnit: string;
  isB2CProduct?: boolean;
}

interface OrderItem {
  product: {
    id: string;
    name: string;
    itemCode: string;
    category: string;
    price: number;
    availableQty: number;
    unit: string;
  };
  quantity: number;
  discount: number;
  total: number;
}

interface B2COrder {
  _id: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingDate: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  pickUpAtStore: boolean;
  orderAmount: number;
  orderStatus: string;
  products: Array<{
    productId: any;
    quantity: number;
    discount: number;
    price: number;
  }>;
}

interface UpdateB2COrderModalProps {
  order: B2COrder;
  onUpdateSuccess?: () => void;
  onCancel?: () => void;
  isModal?: boolean;
}

const UpdateB2COrderModal: React.FC<UpdateB2COrderModalProps> = ({
  order,
  onUpdateSuccess,
  onCancel,
  isModal = false,
}) => {
  const [orderDate, setOrderDate] = useState(
    order?.date ? new Date(order.date).toISOString().split("T")[0] : "",
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [orderStatus, setOrderStatus] = useState<
    "verified" | "completed" | "cancelled" | "pending"
  >((order?.orderStatus as any) || "pending");
  const [deliveryDocUrl, setDeliveryDocUrl] = useState<string | null>(null);

  // Source user from redux (persisted). No more localStorage round-trips.
  const userData = useCurrentUser();

  // Editable customer fields
  const [customerName, setCustomerName] = useState(order?.customerName || "");
  const [customerEmail, setCustomerEmail] = useState(
    order?.customerEmail || "",
  );
  const [customerPhone, setCustomerPhone] = useState(
    order?.customerPhone || "",
  );

  // New: track which product is selected/focused from summary
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );

  const router = useRouter();

  // Refs for scrolling to product cards
  const productRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // RTK Queries
  const { data: categoryData } = useGetCategoriesQuery();
  const { data: allProductsRes } = useGetProductsQuery();
  const { data: catProductsRes } = useGetProductsByCategoryQuery(
    selectedCategoryId,
    {
      skip: !selectedCategoryId,
    },
  );
  const [shippingDate, setShippingDate] = useState<string>(
    order?.shippingDate
      ? new Date(order.shippingDate)
          .toLocaleString("sv-SE", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })
          .replace(" ", "T")
          .slice(0, 16)
      : "",
  );

  const allProducts = (allProductsRes?.data ?? []).filter(
    (p: Product) => p.isB2CProduct === true,
  );

  const categories = categoryData?.data ?? [];
  const categoryProducts = (catProductsRes?.data ?? []).filter(
    (p: Product) => p.isB2CProduct === true,
  );

  const [updateOrder, { isLoading: submitting }] = useUpdateB2COrderMutation();

  // Safe product details resolver
  const resolveProductDetails = (productId: any) => {
    if (!productId)
      return {
        name: "Unknown",
        price: 0,
        itemNumber: "N/A",
        category: "Unknown",
      };

    if (typeof productId === "object" && productId.name) {
      return {
        name: productId.name,
        price: Number(productId.salesPrice) || 0,
        itemNumber: productId.itemNumber || "N/A",
        category: productId.categoryId?.name || "Unknown",
      };
    }

    const id =
      typeof productId === "object"
        ? productId._id || productId.toString()
        : productId;
    const found = allProducts.find((p: Product) => p._id === id);
    return {
      name: found?.name || `Product #${id.slice(-6)}`,
      price: found?.salesPrice || 0,
      itemNumber: found?.itemNumber || "N/A",
      category: found?.categoryId?.name || "Unknown",
    };
  };

  // Initialize order items
  useEffect(() => {
    if (order?.products?.length && !isInitialized && allProducts.length > 0) {
      const items = order.products.map((p) => {
        const details = resolveProductDetails(p.productId);
        const id =
          typeof p.productId === "object"
            ? p.productId._id || p.productId.toString()
            : p.productId;

        return {
          product: {
            id,
            name: details.name,
            itemCode: details.itemNumber,
            category: details.category,
            price: p.price || details.price,
            availableQty: 999,
            unit: "pcs",
          },
          quantity: Number(p.quantity) || 1,
          discount: Number(p.discount) || 0,
          total:
            (p.price || details.price) * Number(p.quantity || 1) -
            Number(p.discount || 0),
        };
      });

      setOrderItems(items);
      setIsInitialized(true);
    }
  }, [order?.products, allProducts, isInitialized]);

  // Auto-select first category
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0]._id);
    }
  }, [categories]);

  // Add product
  const addToOrder = (product: Product) => {
    const exists = orderItems.find((i) => i.product.id === product._id);
    if (exists) {
      updateQuantity(product._id, exists.quantity + 1);
    } else {
      setOrderItems((prev) => [
        ...prev,
        {
          product: {
            id: product._id,
            name: product.name,
            itemCode: product.itemNumber,
            category: product.categoryId.name,
            price: product.salesPrice,
            availableQty: product.quantity,
            unit: product.weightUnit,
          },
          quantity: 1,
          discount: 0,
          total: product.salesPrice,
        },
      ]);
    }
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      removeFromOrder(id);
      return;
    }
    setOrderItems((prev) =>
      prev.map((item) =>
        item.product.id === id
          ? {
              ...item,
              quantity: qty,
              total: item.product.price * qty - item.discount,
            }
          : item,
      ),
    );
  };

  const updateDiscount = (id: string, discount: number) => {
    setOrderItems((prev) =>
      prev.map((item) =>
        item.product.id === id
          ? {
              ...item,
              discount,
              total: item.product.price * item.quantity - discount,
            }
          : item,
      ),
    );
  };

  const updatePrice = (id: string, price: number) => {
    setOrderItems((prev) =>
      prev.map((item) =>
        item.product.id === id
          ? {
              ...item,
              product: { ...item.product, price },
              total: price * item.quantity - item.discount,
            }
          : item,
      ),
    );
  };

  const removeFromOrder = (id: string) => {
    setOrderItems((prev) => prev.filter((i) => i.product.id !== id));
  };

  const filteredProducts = searchTerm
    ? allProducts.filter(
        (p: Product) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.itemNumber.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : categoryProducts;

  const totals = orderItems.reduce(
    (acc, item) => ({
      totalAmount: acc.totalAmount + item.total,
      totalQty: acc.totalQty + item.quantity,
    }),
    { totalAmount: 0, totalQty: 0 },
  );

  // ── New: When user clicks an existing order item in summary ──
  const handleSelectExistingItem = (productId: string) => {
    setSelectedProductId(productId);

    // Find which category this product belongs to
    const product = allProducts.find((p: Product) => p._id === productId);
    if (
      product &&
      product.categoryId?._id &&
      product.categoryId._id !== selectedCategoryId
    ) {
      setSelectedCategoryId(product.categoryId._id);
    }

    // Scroll to the product card after a small delay (category switch takes time)
    setTimeout(() => {
      const ref = productRefs.current.get(productId);
      if (ref) {
        ref.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 300);
  };

  const handleUpdate = async () => {
    if (orderItems.length === 0) {
      toast.error("Add at least one product");
      return;
    }

    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!customerEmail.trim()) {
      toast.error("Customer email is required");
      return;
    }
    if (!customerPhone.trim()) {
      toast.error("Customer phone is required");
      return;
    }
    if (!shippingDate && orderStatus === "verified") {
      toast.error("Delivery/Pickup time is required to verify order");
      return;
    }

    const payload = {
      id: order._id,
      date: orderDate,
      customerName,
      customerEmail,
      customerPhone,
      shippingDate: shippingDate || undefined,
      orderAmount: Number(totals.totalAmount.toFixed(2)),
      products: orderItems.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        discount: i.discount,
        price: i.product.price,
      })),
      orderStatus,
      ...(deliveryDocUrl && { deliveryImages: [deliveryDocUrl] }),
    };

    try {
      await updateOrder(payload).unwrap();
      toast.success("B2C order updated successfully!");
      onUpdateSuccess?.();
      if (!isModal) router.push("/b2c-order-management");
    } catch (err: any) {
      toast.error(err?.data?.message || "Update failed");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="w-5 h-5" />
          B2C
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Customer Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="mb-2">Customer Name *</Label>
            <Input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="John Doe"
            />
          </div>
          <div>
            <Label className="mb-2">Customer Email *</Label>
            <Input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="customer@example.com"
            />
          </div>
          <div>
            <Label className="mb-2">Customer Phone *</Label>
            <Input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="+880 1X XXX XXXX"
            />
          </div>
        </div>

        {/* Order Date & Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="mb-2">Order Date</Label>
            <Input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
            />
          </div>
          <div>
            <Label className="mb-2">Order Status</Label>
            <Select
              value={orderStatus}
              onValueChange={(v) => setOrderStatus(v as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2">Delivery Date & Time</Label>
            <Input
              type="datetime-local"
              value={shippingDate}
              onChange={(e) => setShippingDate(e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Delivery Document */}
        <div>
          <Label className="mb-2">Delivery Document (optional)</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                const url = await imageUpload(file);
                if (url) setDeliveryDocUrl(url);
              }
            }}
          />
          {deliveryDocUrl && (
            <p className="text-sm text-green-600 mt-1">
              Uploaded: {deliveryDocUrl.split("/").pop()}
            </p>
          )}
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Categories */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  {categories.map((cat: any) => (
                    <Button
                      key={cat._id}
                      variant={
                        selectedCategoryId === cat._id ? "default" : "ghost"
                      }
                      className="w-full justify-start mb-1 text-left"
                      onClick={() => setSelectedCategoryId(cat._id)}
                    >
                      {cat.name}
                    </Button>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Products (only B2C + highlight selected) */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Products (B2C only)</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  {filteredProducts.length === 0 ? (
                    <p className="text-center text-gray-500 pt-20">
                      No B2C products found
                    </p>
                  ) : (
                    filteredProducts.map((p: Product) => {
                      const item = orderItems.find(
                        (i) => i.product.id === p._id,
                      );
                      const isSelected = selectedProductId === p._id;

                      return (
                        <div
                          key={p._id}
                          ref={(el) => {
                            if (el) productRefs.current.set(p._id, el);
                          }}
                          className={`border rounded-lg p-4 mb-3 transition-all duration-200 ${
                            isSelected
                              ? "border-2 bg-blue-50/50 shadow-md"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold">{p.name}</p>
                              <p className="text-sm text-gray-500">
                                Stock: {p.quantity} | Item: {p.itemNumber}
                              </p>
                            </div>
                            <p className="font-bold text-lg">${p.salesPrice}</p>
                          </div>

                          {item ? (
                            <div className="mt-4 bg-blue-50 p-4 rounded">
                              <div className="flex items-center gap-3 mb-3">
                                <Button
                                  size="icon"
                                  onClick={() =>
                                    updateQuantity(p._id, item.quantity - 1)
                                  }
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                                <span className="font-bold text-lg w-12 text-center">
                                  {item.quantity}
                                </span>
                                <Button
                                  size="icon"
                                  onClick={() =>
                                    updateQuantity(p._id, item.quantity + 1)
                                  }
                                >
                                  <Plus className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => removeFromOrder(p._id)}
                                >
                                  Remove
                                </Button>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-sm">
                                <div>
                                  <Label className="mb-2">Price</Label>
                                  <Input
                                    type="number"
                                    value={item.product.price}
                                    readOnly
                                    disabled
                                    className="w-full bg-gray-100 cursor-not-allowed text-gray-700"
                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                  />
                                </div>
                                <div>
                                  <Label className="mb-2">Discount</Label>
                                  <Input
                                    type="number"
                                    value={item.discount}
                                    onChange={(e) =>
                                      updateDiscount(p._id, +e.target.value)
                                    }
                                    className="w-full"
                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                  />
                                </div>
                                <div className="flex items-end">
                                  <span className="font-bold">
                                    Total: ${item.total.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <Button
                              className="mt-3 w-full"
                              onClick={() => addToOrder(p)}
                            >
                              <Plus className="w-4 h-4 mr-2" /> Add to Order
                            </Button>
                          )}
                        </div>
                      );
                    })
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary – Clickable items */}
          <div>
            <Card className="h-full flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" /> Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <ScrollArea className="h-96">
                  {orderItems.length === 0 ? (
                    <p className="text-center text-gray-500 pt-20">
                      No items in order
                    </p>
                  ) : (
                    orderItems.map((item, i) => (
                      <div
                        key={i}
                        onClick={() =>
                          handleSelectExistingItem(item.product.id)
                        }
                        className={`flex justify-between py-3 border-b last:border-0 cursor-pointer hover:bg-gray-100 transition-colors ${
                          selectedProductId === item.product.id
                            ? "bg-blue-50"
                            : ""
                        }`}
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-xs text-gray-600">
                            {item.quantity} × ${item.product.price.toFixed(2)}
                            {item.discount > 0 &&
                              ` − $${item.discount.toFixed(2)}`}
                          </p>
                        </div>
                        <p className="font-bold ml-4">
                          ${item.total.toFixed(2)}
                        </p>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </CardContent>
              <div className="border-t p-4 bg-gray-50 space-y-2">
                <div className="flex justify-between">
                  <span>Total Items:</span>
                  <span className="font-bold">{totals.totalQty}</span>
                </div>
                <div className="flex justify-between text-xl font-bold">
                  <span>Order Total:</span>
                  <span className="text-blue-600">
                    ${totals.totalAmount.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-gray-600">
                  Original: ${order.orderAmount.toFixed(2)}
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button variant="outline" onClick={onCancel || (() => router.back())}>
            Cancel
          </Button>
          {order.orderStatus === "completed" && userData?.role !== "admin" ? (
            <div className="bg-red-100 text-red-700 px-4 py-2 rounded">
              Cannot edit completed order
            </div>
          ) : (
            <Button
              onClick={handleUpdate}
              disabled={submitting || orderItems.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? "Updating..." : "Update B2C Order"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UpdateB2COrderModal;
