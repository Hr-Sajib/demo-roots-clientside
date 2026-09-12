"use client";

import { useState, useEffect, useRef } from "react";
import { useGetCustomersQuery } from "@/redux/api/customers";
import Cookies from "js-cookie";
import { useGetCategoriesQuery } from "@/redux/api/categories";
import {
  useGetProductsQuery,
  useGetProductsByCategoryQuery,
} from "@/redux/api/product";
import { useUpdateOrderMutation, useUploadDeliveryImagesMutation } from "@/redux/api/orders";
import {
  Calendar,
  MapPin,
  Search,
  Plus,
  Minus,
  User,
  Package,
  ShoppingCart,
  Calculator,
  Edit,
  Warehouse,
  Building2,
  X,
  ChevronDown,
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
import { Textarea } from "../ui/textarea";
import { ScrollArea } from "../ui/scroll-area";
import { Button } from "../ui/button";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

// Types
interface Product {
  _id: string;
  name: string;
  itemNumber: string;
  barcodeString?: string;
  salesPrice: number;
  quantity: number;
  quantityInWarehouseLocation?: Map<string, number> | Record<string, number>;
  categoryId: { _id: string; name: string };
  weightUnit: string;
}

interface WarehouseSelection {
  location: string;
  quantity: number;
  maxAvailable: number;
  alreadyAllocated?: number;
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
    warehouseLocations: WarehouseLocationInfo[];
  };
  warehouseSelections: WarehouseSelection[];
  simpleQuantity: number;
  totalQuantity: number;
  discount: number;
  note: string;
  noteExpanded: boolean;
  total: number;
  hasWarehouseLocations: boolean;
}

interface WarehouseLocationInfo {
  location: string;
  available: number;
}

interface Order {
  _id: string;
  invoiceNumber: string;
  date: string;
  // Needed to mirror the server's freeze rule: once money has been received,
  // the order's products can no longer change.
  paymentAmountReceived?: number;
  paymentDueDate: string;
  shippingDate: string;
  shippingCharge: number;
  orderAmount: number;
  orderStatus: string;
  storeId: {
    _id: string;
    storeName: string;
    shippingAddress: string;
    shippingCity: string;
    shippingPostalCode: string;
    shippingCountry: string;
  };
  products: Array<{
    productId: any;
    quantity: number | Record<string, number>;
    discount: number;
    price?: number;
    note?: string;
    warehouseLocations?: Record<string, number>;
  }>;
}

interface UpdateOrderPageProps {
  order: Order;
  onUpdateSuccess?: () => void;
  onCancel?: () => void;
  isModal?: boolean;
}

const UpdateOrderPage: React.FC<UpdateOrderPageProps> = ({
  order,
  onUpdateSuccess,
  onCancel,
  isModal = false,
}) => {
  const router = useRouter();
  const role = Cookies.get("role");
  const isAdminOrManager = role === "admin" || role === "manager";

  // String states for numeric fields
  const [shippingChargeStr, setShippingChargeStr] = useState(
    order?.shippingCharge?.toString() || "0",
  );

  const [orderDate, setOrderDate] = useState(
    order?.date ? new Date(order.date).toISOString().split("T")[0] : "",
  );

  const [paymentDueDate, setPaymentDueDate] = useState(
    order?.paymentDueDate
      ? new Date(order.paymentDueDate).toISOString().split("T")[0]
      : "",
  );

  const [shippingDate, setShippingDate] = useState<string>(
    order?.shippingDate
      ? new Date(order.shippingDate).toISOString().slice(0, 16)
      : "",
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [orderStatus, setOrderStatus] = useState<
    "verified" | "completed" | "cancelled"
  >((order?.orderStatus as any) || "verified");

  const [deliveryImageUrls, setDeliveryImageUrls] = useState<string[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );

  const productRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // RTK Queries
  const { data: customers } = useGetCustomersQuery();
  const { data: categoryData } = useGetCategoriesQuery();
  const { data: allProductsRes } = useGetProductsQuery();
  const { data: catProductsRes } = useGetProductsByCategoryQuery(
    selectedCategoryId,
    { skip: !selectedCategoryId },
  );

  const allProducts = allProductsRes?.data ?? [];
  const categories = categoryData?.data ?? [];
  const categoryProducts = catProductsRes?.data ?? [];

  const [updateOrder, { isLoading: submitting }] = useUpdateOrderMutation();
  const [uploadDeliveryImages, { isLoading: uploadingImages }] = useUploadDeliveryImagesMutation();

  // Helper function to get warehouse locations array from product
  const getWarehouseLocationsArray = (product: Product): WarehouseLocationInfo[] => {
    const locations = product.quantityInWarehouseLocation;
    if (!locations) return [];

    if (locations instanceof Map) {
      return Array.from(locations.entries())
        .filter(([_, quantity]) => quantity > 0)
        .map(([location, quantity]) => ({
          location,
          available: quantity
        }));
    }

    if (typeof locations === 'object') {
      return Object.entries(locations)
        .filter(([_, quantity]) => quantity > 0)
        .map(([location, quantity]) => ({
          location,
          available: quantity
        }));
    }

    return [];
  };

  // Helper function to get total available quantity from product
  const getTotalAvailableQuantity = (product: Product): number => {
    const warehouseLocations = getWarehouseLocationsArray(product);
    if (warehouseLocations.length === 0) {
      return product.quantity || 0;
    }
    return warehouseLocations.reduce((sum, loc) => sum + loc.available, 0);
  };

  // Helper function to get single warehouse location if only one exists
  const getSingleWarehouseLocation = (product: Product): string | null => {
    const warehouseLocations = getWarehouseLocationsArray(product);
    if (warehouseLocations.length === 1) {
      return warehouseLocations[0].location;
    }
    return null;
  };

  // Helper function to convert warehouse selections to object for payload
  const warehouseSelectionsToObject = (selections: WarehouseSelection[]): Record<string, number> => {
    const obj: Record<string, number> = {};
    selections.forEach(sel => {
      if (sel.quantity > 0) {
        obj[sel.location] = sel.quantity;
      }
    });
    return obj;
  };

  const resolveProductDetails = (productId: any) => {
    if (!productId)
      return {
        name: "Unknown",
        price: 0,
        itemNumber: "N/A",
        category: "Unknown",
        warehouseLocations: [] as WarehouseLocationInfo[],
        hasWarehouseLocations: false,
        currentStock: 0,
        barcodeString: "",
      };

    if (typeof productId === "object" && productId.name) {
      const warehouseLocations = getWarehouseLocationsArray(productId);
      const currentStock = getTotalAvailableQuantity(productId);
      return {
        name: productId.name,
        price: Number(productId.salesPrice) || 0,
        itemNumber: productId.itemNumber || "N/A",
        category: productId.categoryId?.name || "Unknown",
        warehouseLocations,
        hasWarehouseLocations: warehouseLocations.length > 0,
        currentStock,
        barcodeString: productId.barcodeString || "",
      };
    }

    const id =
      typeof productId === "object"
        ? productId._id || productId.toString()
        : productId;
    const found = allProducts.find((p: any) => p._id === id);
    const warehouseLocations = found ? getWarehouseLocationsArray(found) : [];
    const currentStock = found ? getTotalAvailableQuantity(found) : 0;

    return {
      name: found?.name || `Product #${id.slice(-6)}`,
      price: found?.salesPrice || 0,
      itemNumber: found?.itemNumber || "N/A",
      category: found?.categoryId?.name || "Unknown",
      warehouseLocations,
      hasWarehouseLocations: warehouseLocations.length > 0,
      currentStock,
      barcodeString: found?.barcodeString || "",
    };
  };

  // Initialize order items
  useEffect(() => {
    if (order?.products?.length && !isInitialized && allProducts.length > 0) {
      const items = order.products.map((p) => {
        const details = resolveProductDetails(p.productId);
        const id = typeof p.productId === "object"
          ? p.productId._id || p.productId.toString()
          : p.productId;

        const orderPrice = (p as any).price || details.price;

        // Check if the order has warehouseLocations for this product
        const hasWarehouseInOrder = p.warehouseLocations && Object.keys(p.warehouseLocations).length > 0;

        let warehouseSelections: WarehouseSelection[] = [];
        let simpleQuantity = 0;
        let totalQuantity = 0;

        if (hasWarehouseInOrder && p.warehouseLocations) {
          const originalTotalQty = Object.values(p.warehouseLocations).reduce((sum, qty) => sum + (qty as number), 0);

          if (details.warehouseLocations.length === 1) {
            // Product currently has only one active warehouse location.
            // Always use *that* current location — sourced from
            // product.quantityInWarehouseLocation via details.warehouseLocations
            // — rather than whatever location(s) the order was originally
            // placed against. Stock can move/consolidate between locations
            // after an order is placed, so trusting the order's stale saved
            // location can point at a location the product no longer stocks.
            const currentLocation = details.warehouseLocations[0];
            const alreadyAllocatedHere = (p.warehouseLocations as any)[currentLocation.location] ?? 0;

            warehouseSelections = [{
              location: currentLocation.location,
              quantity: originalTotalQty,
              maxAvailable: currentLocation.available + alreadyAllocatedHere,
              alreadyAllocated: alreadyAllocatedHere,
            }];
          } else {
            // Multiple current locations - trust the order's saved
            // per-location breakdown, refreshed against live availability.
            warehouseSelections = Object.entries(p.warehouseLocations).map(([location, qty]) => {
              // Find the current available quantity for this location
              const currentAvailable = details.warehouseLocations.find(l => l.location === location)?.available || 0;

              return {
                location,
                quantity: qty as number,
                maxAvailable: currentAvailable + (qty as number),
                alreadyAllocated: qty as number
              };
            });
          }

          totalQuantity = originalTotalQty;
          simpleQuantity = 0;
        } else {
          // Simple quantity (no warehouse locations)
          simpleQuantity = typeof p.quantity === 'number' ? p.quantity : 1;
          totalQuantity = simpleQuantity;
          warehouseSelections = [];
        }

        return {
          product: {
            id,
            name: details.name,
            itemCode: details.itemNumber,
            category: details.category,
            price: orderPrice,
            availableQty: details.currentStock,
            unit: "pcs",
            warehouseLocations: details.warehouseLocations,
          },
          warehouseSelections,
          simpleQuantity,
          totalQuantity,
          discount: Number(p.discount) || 0,
          note: (p as any).note || "",
          noteExpanded: false,
          total: orderPrice * totalQuantity - Number(p.discount || 0),
          hasWarehouseLocations: details.hasWarehouseLocations,
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

  // Update total quantity from warehouse selections
  const updateTotalQuantityFromWarehouses = (productId: string, selections: WarehouseSelection[]) => {
    const totalQty = selections.reduce((sum, sel) => sum + sel.quantity, 0);
    setOrderItems((prev) =>
      prev.map((item) =>
        item.product.id === productId && item.hasWarehouseLocations
          ? {
              ...item,
              warehouseSelections: selections,
              totalQuantity: totalQty,
              total: item.product.price * totalQty - item.discount,
            }
          : item
      )
    );
  };

  // Update simple quantity for single warehouse product
  const updateSingleWarehouseQuantity = (productId: string, newQuantity: number) => {
    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.product.id === productId && item.hasWarehouseLocations && item.warehouseSelections.length === 1) {
          const availableQty = item.product.availableQty;
          const validQuantity = Math.min(Math.max(1, newQuantity), availableQty);
          const maxAvailable = item.warehouseSelections[0].maxAvailable;

          if (validQuantity !== newQuantity) {
            toast(`Only ${maxAvailable} units available at ${item.warehouseSelections[0].location}`);
          }

          const finalQuantity = Math.max(0, validQuantity);

          const updatedSelections = [{
            ...item.warehouseSelections[0],
            quantity: finalQuantity
          }];

          return {
            ...item,
            warehouseSelections: updatedSelections,
            totalQuantity: finalQuantity,
            total: item.product.price * finalQuantity - item.discount,
          };
        }
        return item;
      }),
    );
  };

  const addToOrder = (product: Product) => {
    const warehouseLocations = getWarehouseLocationsArray(product);
    const hasWarehouseLocations = warehouseLocations.length > 0;
    const totalAvailable = getTotalAvailableQuantity(product);
    const singleWarehouseLocation = getSingleWarehouseLocation(product);

    const exists = orderItems.find((i) => i.product.id === product._id);
    if (exists) {
      toast("Product already in order. Adjust quantities in the order summary.");
      return;
    }

    const orderPrice = product.salesPrice;

    if (hasWarehouseLocations) {
      if (singleWarehouseLocation) {
        // If only one warehouse location, automatically select it with quantity 1
        const locationInfo = warehouseLocations.find(l => l.location === singleWarehouseLocation);
        setOrderItems((prev) => [
          ...prev,
          {
            product: {
              id: product._id,
              name: product.name,
              itemCode: product.itemNumber,
              category: product.categoryId.name,
              price: orderPrice,
              availableQty: totalAvailable,
              unit: product.weightUnit,
              warehouseLocations,
            },
            warehouseSelections: [{
              location: singleWarehouseLocation,
              quantity: 1,
              maxAvailable: locationInfo?.available || 0
            }],
            simpleQuantity: 0,
            totalQuantity: 1,
            discount: 0,
            note: "",
            noteExpanded: false,
            price: orderPrice,
            total: orderPrice,
            hasWarehouseLocations: true,
          },
        ]);
      } else {
        // Multiple warehouses - start with empty selections
        setOrderItems((prev) => [
          ...prev,
          {
            product: {
              id: product._id,
              name: product.name,
              itemCode: product.itemNumber,
              category: product.categoryId.name,
              price: orderPrice,
              availableQty: totalAvailable,
              unit: product.weightUnit,
              warehouseLocations,
            },
            warehouseSelections: [],
            simpleQuantity: 0,
            totalQuantity: 0,
            discount: 0,
            note: "",
            noteExpanded: false,
            price: orderPrice,
            total: 0,
            hasWarehouseLocations: true,
          },
        ]);
      }
    } else {
      setOrderItems((prev) => [
        ...prev,
        {
          product: {
            id: product._id,
            name: product.name,
            itemCode: product.itemNumber,
            category: product.categoryId.name,
            price: orderPrice,
            availableQty: totalAvailable,
            unit: product.weightUnit,
            warehouseLocations: [],
          },
          warehouseSelections: [],
          simpleQuantity: 1,
          totalQuantity: 1,
          discount: 0,
          note: "",
          noteExpanded: false,
          price: orderPrice,
          total: orderPrice,
          hasWarehouseLocations: false,
        },
      ]);
    }
  };

  // Update simple quantity for products without warehouse locations
  const updateSimpleQuantity = (id: string, newQuantity: number) => {
    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.product.id === id && !item.hasWarehouseLocations) {
          const availableQty = item.product.availableQty;
          const validQuantity = Math.min(Math.max(1, newQuantity), availableQty);

          if (validQuantity !== newQuantity) {
            toast(`Only ${availableQty} units available`);
          }

          return {
            ...item,
            simpleQuantity: validQuantity,
            totalQuantity: validQuantity,
            total: item.product.price * validQuantity - item.discount,
          };
        }
        return item;
      }),
    );
  };

  // Update warehouse selection quantity
  const updateWarehouseQuantity = (
    productId: string,
    locationIndex: number,
    newQuantity: number
  ) => {
    const item = orderItems.find(i => i.product.id === productId);
    if (!item) return;

    const updatedSelections = [...item.warehouseSelections];
    const location = updatedSelections[locationIndex];

    const maxAllowed = location.maxAvailable;
    const validQuantity = Math.min(Math.max(0, newQuantity), maxAllowed);

    if (validQuantity !== newQuantity) {
      toast(`Maximum ${maxAllowed} allowed for ${location.location}`);
    }

    updatedSelections[locationIndex] = {
      ...location,
      quantity: validQuantity
    };

    const filteredSelections = updatedSelections.filter(sel => sel.quantity > 0);
    updateTotalQuantityFromWarehouses(productId, filteredSelections);
  };

  // Add new warehouse location selection
  const addWarehouseLocation = (productId: string, locationName: string) => {
    const item = orderItems.find(i => i.product.id === productId);
    if (!item) return;

    const location = item.product.warehouseLocations.find(
      loc => loc.location === locationName
    );
    if (!location) return;

    const alreadySelected = item.warehouseSelections.some(
      sel => sel.location === locationName
    );
    if (alreadySelected) {
      toast.error("This warehouse location already added");
      return;
    }

    const newSelection: WarehouseSelection = {
      location: locationName,
      quantity: 1,
      maxAvailable: location.available,
      alreadyAllocated: 0
    };

    const updatedSelections = [...item.warehouseSelections, newSelection];
    updateTotalQuantityFromWarehouses(productId, updatedSelections);
  };

  // Remove warehouse location selection
  const removeWarehouseLocation = (productId: string, locationIndex: number) => {
    const item = orderItems.find(i => i.product.id === productId);
    if (!item) return;

    const updatedSelections = item.warehouseSelections.filter((_, idx) => idx !== locationIndex);
    updateTotalQuantityFromWarehouses(productId, updatedSelections);
  };

  const updateDiscount = (id: string, discount: number) => {
    setOrderItems((prev) =>
      prev.map((item) =>
        item.product.id === id
          ? {
              ...item,
              discount,
              total: item.product.price * item.totalQuantity - discount,
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
              total: price * item.totalQuantity - item.discount,
            }
          : item,
      ),
    );
  };

  const updateNote = (id: string, note: string) => {
    setOrderItems((prev) =>
      prev.map((item) => (item.product.id === id ? { ...item, note } : item)),
    );
  };

  const toggleNoteExpanded = (id: string) => {
    setOrderItems((prev) =>
      prev.map((item) =>
        item.product.id === id
          ? { ...item, noteExpanded: !item.noteExpanded }
          : item,
      ),
    );
  };

  const removeFromOrder = (id: string) => {
    setOrderItems((prev) => prev.filter((i) => i.product.id !== id));
  };

  // Enhanced product search - by name, SKU, or barcode
  const filteredProducts = searchTerm
    ? allProducts.filter(
        (p: Product) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.itemNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.barcodeString && p.barcodeString.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    : categoryProducts;

  const totals = orderItems.reduce(
    (acc, item) => ({
      totalAmount: acc.totalAmount + item.total,
      totalQty: acc.totalQty + item.totalQuantity,
    }),
    { totalAmount: 0, totalQty: 0 },
  );

  const handleSelectExistingItem = (productId: string) => {
    setSelectedProductId(productId);
    const product = allProducts.find((p: Product) => p._id === productId);
    if (
      product &&
      product.categoryId?._id &&
      product.categoryId._id !== selectedCategoryId
    ) {
      setSelectedCategoryId(product.categoryId._id);
    }

    setTimeout(() => {
      const ref = productRefs.current.get(productId);
      if (ref) ref.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 300);
  };

  const handleUpdate = async () => {
    if (orderItems.length === 0) {
      toast.error("Add at least one product");
      return;
    }

    // [ORDER-UPDATE-DEBUG] Raw product data exactly as currently held in
    // allProducts (i.e. straight from the API, before any resolution logic
    // runs), for every product in this order. Shows both the legacy
    // warehouseLocation string field and the actual quantityInWarehouseLocation
    // map side by side, so it's visible which one holds real data for each
    // product. Temporary diagnostic logging — remove once the
    // location-source bug report is resolved.
    console.log(
      "[ORDER-UPDATE-DEBUG] Raw product data for all order items (before any processing):",
      orderItems.map((item) => {
        const rawProduct = allProducts.find(
          (p: any) => p._id === item.product.id,
        );
        return {
          productId: item.product.id,
          productName: rawProduct?.name,
          "raw_product.warehouseLocation (legacy field, should NOT be used)":
            (rawProduct as any)?.warehouseLocation,
          "raw_product.quantityInWarehouseLocation (source of truth)":
            rawProduct?.quantityInWarehouseLocation,
          "raw_product.quantity (flat total, no location breakdown)":
            rawProduct?.quantity,
        };
      }),
    );

    const orderHasPayment = Number(order?.paymentAmountReceived ?? 0) > 0.01;

    const payload: any = {};

    // Date fields
    if (orderDate !== (order.date ? new Date(order.date).toISOString().split("T")[0] : "")) {
      payload.date = orderDate;
    }

    if (paymentDueDate !== (order.paymentDueDate ? new Date(order.paymentDueDate).toISOString().split("T")[0] : "")) {
      payload.paymentDueDate = paymentDueDate;
    }

    if (shippingDate !== (order.shippingDate ? new Date(order.shippingDate).toISOString().slice(0, 16) : "")) {
      payload.shippingDate = shippingDate;
    }

    // Shipping Charge
    const newShippingCharge = shippingChargeStr === "" ? 0 : parseFloat(shippingChargeStr);
    if (newShippingCharge !== (order.shippingCharge ?? 0)) {
      payload.shippingCharge = newShippingCharge;
    }

    // Order Status
    if (orderStatus !== order.orderStatus) {
      payload.orderStatus = orderStatus;
    }

    // [ORDER-UPDATE-DEBUG] Show exactly what each order line item resolved
    // its warehouse location(s) from, before the payload is built. This is
    // temporary diagnostic logging — remove once the location-source bug
    // report is resolved.
    console.log(
      "[ORDER-UPDATE-DEBUG] orderItems snapshot before building payload:",
      orderItems.map((item) => {
        const rawProduct = allProducts.find(
          (p: any) => p._id === item.product.id,
        );
        return {
          productId: item.product.id,
          productName: item.product.name,
          hasWarehouseLocations: item.hasWarehouseLocations,
          simpleQuantity: item.simpleQuantity,
          totalQuantity: item.totalQuantity,
          warehouseSelections: item.warehouseSelections,
          "raw_product.quantityInWarehouseLocation (source of truth)":
            rawProduct?.quantityInWarehouseLocation,
          "raw_product.warehouseLocation (legacy, should NOT be used)":
            (rawProduct as any)?.warehouseLocation,
        };
      }),
    );

    // Products Array
    const currentProducts = orderItems
      .map((item) => {
        const rawQuantity = item.hasWarehouseLocations
          ? item.totalQuantity
          : item.simpleQuantity;
        // Backend Zod schema requires quantity >= 1. Coerce invalid (0/NaN) values to 1.
        const quantity =
          typeof rawQuantity === "number" && rawQuantity >= 1
            ? rawQuantity
            : 1;
        const productData: any = {
          productId: item.product.id,
          quantity,
          discount: item.discount,
          price: item.product.price,
          note: item.note,
        };

        // Add warehouseLocations if product has them and they are selected
        if (item.hasWarehouseLocations && item.warehouseSelections.length > 0) {
          productData.warehouseLocations = warehouseSelectionsToObject(
            item.warehouseSelections,
          );
        }

        return productData;
      })
      // Drop any line items that still somehow have quantity < 1 (defense-in-depth
      // before the backend Zod gate at order.validation.ts:9 which rejects these).
      .filter((p) => typeof p.quantity === "number" && p.quantity >= 1);

    // Deep compare products array with original
    const originalProducts = order.products.map((p: any) => {
      const productId = typeof p.productId === "object"
        ? p.productId._id || p.productId.toString()
        : p.productId;

      let originalPrice = 0;
      if (typeof p.productId === "object" && p.productId.salesPrice) {
        originalPrice = Number(p.productId.salesPrice);
      } else if (p.price) {
        originalPrice = Number(p.price);
      } else {
        const foundProduct = allProducts.find((prod: any) => prod._id === productId);
        originalPrice = foundProduct?.salesPrice || 0;
      }

      const originalData: any = {
        productId: productId,
        quantity: p.quantity,
        discount: Number(p.discount) || 0,
        price: originalPrice,
        note: p.note || "",
      };

      if (p.warehouseLocations && Object.keys(p.warehouseLocations).length > 0) {
        originalData.warehouseLocations = p.warehouseLocations;
      }

      return originalData;
    });

    const productsChanged = JSON.stringify(currentProducts) !== JSON.stringify(originalProducts);

    // Mirrors the server rule: once money has been received the order's
    // financial shape is frozen, so the basis the customer paid against is
    // preserved. Caught here so the user is told before submitting rather than
    // after. Other edits (dates, shipping, status) remain allowed.
    if (productsChanged && orderHasPayment) {
      toast.error(
        "This order already has a payment against it, so its products can no longer be changed. Issue customer credit instead.",
      );
      return;
    }

    if (productsChanged) {
      payload.products = currentProducts;
    }

    // Delivery Images
    if (deliveryImageUrls.length > 0) {
      payload.deliveryImages = deliveryImageUrls;
    }

    if (Object.keys(payload).length === 0) {
      toast("No changes detected");
      return;
    }

    console.log("Update Payload:", payload);
    console.log(
      "[ORDER-UPDATE-DEBUG] Final products payload being sent to API:",
      JSON.stringify(payload.products, null, 2),
    );

    try {
      await updateOrder({ id: order._id, ...payload }).unwrap();
      onUpdateSuccess?.();
      if (!isModal) router.push("/order-management");
    } catch (err: any) {
      toast.error(err?.data?.message || "Update failed");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit className="w-5 h-5" />
          B2B | Delivering to{" "}
          <span className="text-green-700">
            {order.storeId.shippingAddress} {order.storeId.shippingCity}{" "}
            {order.storeId.shippingPostalCode} {order.storeId.shippingCountry}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Top Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="mb-2">Client</Label>
            <div className="p-2 bg-gray-50 rounded border">
              {order.storeId.storeName}
            </div>
          </div>

          <div>
            <Label className="mb-2">Order Date</Label>
            <Input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
            />
          </div>

          <div>
            <Label className="mb-2">Payment Due Date</Label>
            <Input
              type="date"
              value={paymentDueDate}
              onChange={(e) => setPaymentDueDate(e.target.value)}
            />
          </div>

          <div>
            <Label className="mb-2">Delivery Date & Time</Label>
            <Input
              type="datetime-local"
              value={shippingDate}
              onChange={(e) => setShippingDate(e.target.value)}
            />
          </div>

          <div>
            <Label className="mb-2">Shipping Charge ($)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={shippingChargeStr}
              onChange={(e) => setShippingChargeStr(e.target.value)}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
            />
          </div>

          <div className="flex-1">
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
        </div>

        {/* Delivery Images */}
        <div className="flex gap-4">
          <div className="flex-1">
            <Label className="mb-2">Delivery Images</Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              disabled={uploadingImages}
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length === 0) return;
                try {
                  const result = await uploadDeliveryImages(files).unwrap();
                  setDeliveryImageUrls((prev) => [...prev, ...result.data.urls]);
                } catch (err: any) {
                  toast.error(err?.data?.message || "Failed to upload images");
                }
                e.target.value = "";
              }}
            />
            {deliveryImageUrls.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {deliveryImageUrls.map((url, index) => (
                  <div key={url} className="relative">
                    <img
                      src={url}
                      alt={`Delivery image ${index + 1}`}
                      className="w-16 h-16 object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setDeliveryImageUrls((prev) => prev.filter((u) => u !== url))
                      }
                      className="absolute -top-2 -right-2 bg-white rounded-full border shadow p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search products by name, SKU or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Categories */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  {categories.map((cat) => (
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

          {/* Product List */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Products</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  {filteredProducts.map((p: Product) => {
                    const item = orderItems.find((i) => i.product.id === p._id);
                    const isSelected = selectedProductId === p._id;
                    const warehouseLocations = getWarehouseLocationsArray(p);
                    const hasWarehouseLocations = warehouseLocations.length > 0;
                    const singleWarehouseLocation = getSingleWarehouseLocation(p);
                    const totalAvailable = getTotalAvailableQuantity(p);
                    const originalOrderProduct = order.products.find(
                      (op) => {
                        const opId = typeof op.productId === "object"
                          ? op.productId._id || op.productId.toString()
                          : op.productId;
                        return opId === p._id;
                      }
                    );
                    const originalQuantity = originalOrderProduct
                      ? (typeof originalOrderProduct.quantity === 'number'
                          ? originalOrderProduct.quantity
                          : Object.values(originalOrderProduct.warehouseLocations || {}).reduce((a, b) => a + b, 0))
                      : 0;

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
                            {/* {p.barcodeString && (
                              <p className="text-xs text-gray-400">
                                Barcode: {p.barcodeString}
                              </p>
                            )} */}
                            <p className="text-sm text-gray-500">
                              Available Stock: {totalAvailable} | Item: {p.itemNumber}
                            </p>
                            {hasWarehouseLocations && (
                              <p className="text-xs text-gray-500 mt-1">
                                <Warehouse className="w-3 h-3 inline mr-1" />
                                Locations: {warehouseLocations.map(l => `${l.location} (${l.available})`).join(", ")}
                              </p>
                            )}
                          </div>
                          <p className="font-bold text-lg">${p.salesPrice}</p>
                        </div>

                        {item ? (
                          <div className="mt-4 bg-blue-50 p-4 rounded">
                            {item.hasWarehouseLocations ? (
                              <>
                                {item.warehouseSelections.length === 1 && singleWarehouseLocation ? (
                                  // Single warehouse location - show simple quantity UI
                                  <div className="mb-4">
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                      Quantity
                                    </Label>
                                    <div className="flex items-center gap-3">
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() => updateSingleWarehouseQuantity(p._id, item.totalQuantity - 1)}
                                        disabled={item.totalQuantity <= 1}
                                      >
                                        <Minus className="w-4 h-4" />
                                      </Button>
                                      <Input
                                        type="number"
                                        value={item.totalQuantity}
                                        onChange={(e) => {
                                          let newQty = parseInt(e.target.value);
                                          if (isNaN(newQty)) newQty = 1;
                                          if (newQty > totalAvailable) {
                                            toast.error(
                                              `Only ${totalAvailable} units available in stock`,
                                            );
                                            newQty = totalAvailable;
                                          }
                                          if (newQty < 1) newQty = 1;
                                          updateSingleWarehouseQuantity(p._id, newQty);
                                        }}
                                        className="w-24 h-9 text-center"
                                        min="1"
                                        max={totalAvailable}
                                        step="1"
                                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                      />
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() => updateSingleWarehouseQuantity(p._id, item.totalQuantity + 1)}
                                        disabled={item.totalQuantity >= totalAvailable}
                                      >
                                        <Plus className="w-4 h-4" />
                                      </Button>
                                      {/* <span className="text-sm text-gray-500 ml-2">
                                        Warehouse: {singleWarehouseLocation}
                                      </span> */}
                                    </div>
                                    <div className="mt-2 text-xs text-gray-500">
                                      Original: {originalQuantity}
                                    </div>
                                  </div>
                                ) : (
                                  // Multiple warehouses - show warehouse selection UI
                                  <div className="mb-4">
                                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                      <Building2 className="w-4 h-4 inline mr-1" />
                                      Warehouse Breakdown:
                                    </Label>

                                    <div className="space-y-3">
                                      {item.warehouseSelections.map((selection, idx) => (
                                        <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-lg border">
                                          <div className="flex-1">
                                            <span className="font-medium text-gray-800">{selection.location}</span>
                                            <span className="text-xs text-gray-500 ml-2">
                                              (Max: {selection.maxAvailable})
                                            </span>
                                          </div>
                                          <div className="w-32">
                                            <Input
                                              type="number"
                                              value={selection.quantity}
                                              onChange={(e) => {
                                                let newQty = parseInt(e.target.value);
                                                if (isNaN(newQty)) newQty = 0;
                                                updateWarehouseQuantity(p._id, idx, newQty);
                                              }}
                                              min="0"
                                              max={selection.maxAvailable}
                                              className="text-center"
                                              onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            />
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeWarehouseLocation(p._id, idx)}
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                          >
                                            <X className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      ))}

                                      {/* Add warehouse dropdown */}
                                      {hasWarehouseLocations && (() => {
                                        const selectedLocations = item.warehouseSelections.map(s => s.location);
                                        const availableLocations = warehouseLocations.filter(
                                          loc => !selectedLocations.includes(loc.location) && loc.available > 0
                                        );
                                        if (availableLocations.length > 0) {
                                          return (
                                            <select
                                              className="w-full p-2 border rounded-md text-sm focus:ring-green-500 focus:border-green-500"
                                              onChange={(e) => {
                                                if (e.target.value) {
                                                  addWarehouseLocation(p._id, e.target.value);
                                                  e.target.value = "";
                                                }
                                              }}
                                              value=""
                                            >
                                              <option value="">+ Add a warehouse</option>
                                              {availableLocations.map(loc => (
                                                <option key={loc.location} value={loc.location}>
                                                  {loc.location} (Available: {loc.available})
                                                </option>
                                              ))}
                                            </select>
                                          );
                                        }
                                        return null;
                                      })()}
                                    </div>

                                    <div className="mt-3 pt-2 text-sm">
                                      <span className="text-gray-600">Total Quantity:</span>
                                      <span className="font-bold text-green-700 ml-2">
                                        {item.totalQuantity}
                                      </span>
                                      <span className="text-xs text-gray-500 ml-3">
                                        Original: {originalQuantity}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              // Simple Quantity UI for products without warehouses
                              <div className="mb-4">
                                <Label className="text-sm font-medium text-gray-700 mb-2 block">
                                  Quantity
                                </Label>
                                <div className="flex items-center gap-3">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => updateSimpleQuantity(p._id, item.simpleQuantity - 1)}
                                    disabled={item.simpleQuantity <= 1}
                                  >
                                    <Minus className="w-4 h-4" />
                                  </Button>
                                  <Input
                                    type="number"
                                    value={item.simpleQuantity}
                                    onChange={(e) => {
                                      let newQty = parseInt(e.target.value);
                                      if (isNaN(newQty)) newQty = 1;
                                      updateSimpleQuantity(p._id, newQty);
                                    }}
                                    min="1"
                                    max={totalAvailable}
                                    className="w-24 h-9 text-center"
                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                  />
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    onClick={() => updateSimpleQuantity(p._id, item.simpleQuantity + 1)}
                                    disabled={item.simpleQuantity >= totalAvailable}
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                  <span className="text-sm text-gray-500 ml-2">
                                    Available: {totalAvailable} | Original: {originalQuantity}
                                  </span>
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-3 gap-3 text-sm mt-3">
                              <div>
                                <label className="text-xs text-gray-600 mb-1 block">
                                  Price
                                </label>
                                <Input
                                  type="number"
                                  value={item.product.price}
                                  onChange={(e) => {
                                    const newPrice = parseFloat(e.target.value);
                                    updatePrice(p._id, isNaN(newPrice) ? 0 : newPrice);
                                  }}
                                  readOnly={!isAdminOrManager}
                                  disabled={!isAdminOrManager}
                                  className={
                                    isAdminOrManager
                                      ? "w-full focus:ring-red-500 focus:border-red-500"
                                      : "w-full bg-gray-100 cursor-not-allowed text-gray-700"
                                  }
                                  min="0"
                                  step="0.01"
                                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-600 mb-1 block">
                                  Discount
                                </label>
                                <Input
                                  type="number"
                                  value={item.discount}
                                  onChange={(e) =>
                                    updateDiscount(p._id, +e.target.value)
                                  }
                                  className="w-full"
                                  min="0"
                                  step="0.01"
                                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-600 mb-1 block">
                                  Total
                                </label>
                                <span className="font-bold text-green-700 text-lg block">
                                  ${item.total.toFixed(2)}
                                </span>
                              </div>
                            </div>

                            <div className="mt-3 flex justify-end">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => removeFromOrder(p._id)}
                              >
                                Remove Product
                              </Button>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleNoteExpanded(p._id)}
                              className="mt-3 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                            >
                              <ChevronDown
                                className={`w-3.5 h-3.5 transition-transform duration-300 ${
                                  item.noteExpanded ? "rotate-180" : ""
                                }`}
                              />
                              {item.note ? "Note" : "Add note"}
                            </button>
                            <div
                              className="grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out"
                              style={{
                                gridTemplateRows: item.noteExpanded ? "1fr" : "0fr",
                              }}
                            >
                              <div className="overflow-hidden">
                                <Textarea
                                  placeholder="Optional note"
                                  value={item.note}
                                  onChange={(e) => updateNote(p._id, e.target.value)}
                                  rows={2}
                                  className="mt-2 text-sm"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <Button
                            className="mt-3 w-full"
                            onClick={() => addToOrder(p)}
                            disabled={totalAvailable === 0}
                          >
                            <Plus className="w-4 h-4 mr-2" /> Add to Order
                          </Button>
                        )}

                        {totalAvailable === 0 && (
                          <p className="text-xs text-red-500 mt-2">
                            Out of stock
                          </p>
                        )}
                      </div>
                    );
                  })}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
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
                        onClick={() => handleSelectExistingItem(item.product.id)}
                        className={`flex justify-between py-3 border-b last:border-0 cursor-pointer hover:bg-gray-100 transition-colors ${
                          selectedProductId === item.product.id
                            ? "bg-blue-50"
                            : ""
                        }`}
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-xs text-gray-600">
                            {item.totalQuantity} × ${item.product.price.toFixed(2)}
                            {item.discount > 0 &&
                              ` − $${item.discount.toFixed(2)}`}
                          </p>
                          {item.hasWarehouseLocations && item.warehouseSelections.length > 0 && (
                            <div className="text-xs text-gray-400 mt-1">
                              {item.warehouseSelections.map(sel => (
                                <div key={sel.location}>
                                  {sel.location}: {sel.quantity}
                                </div>
                              ))}
                            </div>
                          )}
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
                  <span className="text-red-700">
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

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pt-6 border-t">
          <Button variant="outline" onClick={onCancel || (() => router.back())}>
            Cancel
          </Button>
          {order.orderStatus === "completed" && role !== "admin" ? (
            <div className="bg-red-100 text-red-700 px-4 py-2 rounded">
              Cannot edit completed order
            </div>
          ) : (
            <Button
              onClick={handleUpdate}
              disabled={submitting || orderItems.length === 0}
              className="bg-red-700 hover:bg-red-600 px-10"
            >
              {submitting ? "Updating..." : "Update Order"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default UpdateOrderPage;
