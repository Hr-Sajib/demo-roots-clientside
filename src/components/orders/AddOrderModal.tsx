"use client";

import { useState, useEffect, useMemo } from "react";
import { useGetCustomersQuery } from "@/redux/api/customers";
import { useGetCategoriesQuery } from "@/redux/api/categories";
import { useGetProductsQuery } from "@/redux/api/product";
import { useAddOrderMutation } from "@/redux/api/orders";
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
  History,
  Warehouse,
  DollarSign,
  ChevronDown,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Select from "react-select";
import { useDispatch } from "react-redux";
import inventoryApi from "@/redux/api/inventory";
import { toast } from "react-toastify";
import { useCurrentUser } from "@/hooks/useCurrentUser";

// Define types
interface Product {
  _id: string;
  name: string;
  itemNumber: string;
  barcodeString?: string;
  salesPrice: number;
  priceForCustomersRecords?: Map<string, { lastPurchasePrice: number; purchaseCount: number }>;
  quantity: number;
  quantityInWarehouseLocation?: Map<string, number> | Record<string, number>;
  weight: number;
  weightUnit: string;
  categoryId: {
    _id: string;
    name: string;
  };
}

interface WarehouseSelection {
  location: string;
  quantity: number;
  maxAvailable: number;
}

interface OrderItem {
  product: ProductDetails;
  warehouseSelections: WarehouseSelection[];
  simpleQuantity: number;
  totalQuantity: number;
  price: number;
  discount: number;
  note: string;
  noteExpanded: boolean;
  total: number;
  hasWarehouseLocations: boolean;
}

interface ProductDetails {
  id: string;
  name: string;
  itemCode: string;
  category: string;
  price: number;
  lastSoldPrice?: number;
  availableQty: number;
  unit: string;
  warehouseLocations: WarehouseLocationInfo[];
}

interface WarehouseLocationInfo {
  location: string;
  available: number;
}

interface Client {
  _id: string;
  storeName: string;
  shippingAddress: string;
  termDays?: number; // Added termDays field
}

interface Category {
  _id: string;
  name: string;
}

interface OrderProduct {
  productId: string;
  quantity: number;
  warehouseLocations?: Record<string, number>;
  price: number;
  discount: number;
  note: string;
}

interface OrderPayload {
  date: string;
  shippingDate: string;
  storeId: string;
  paymentDueDate: string;
  shippingCharge: number;
  orderAmount: number;
  products: OrderProduct[];
}

interface AddOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddSuccess: () => void;
}

interface OptionType {
  value: string;
  label: string;
  shippingAddress?: string;
}

// Custom category for previously purchased items
const PREVIOUSLY_PURCHASED_CATEGORY = {
  _id: "previously-purchased",
  name: "📦 Previously Purchased",
};

const AddOrderModal: React.FC<AddOrderModalProps> = ({
  open,
  onOpenChange,
  onAddSuccess,
}) => {
  const { data: productsData, refetch: refetchProducts } =
    useGetProductsQuery();
  const userData = useCurrentUser();
  const isAdminOrManager =
    userData?.role?.toLowerCase() === "admin" ||
    userData?.role?.toLowerCase() === "manager";
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [orderDate, setOrderDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [shippingDate, setShippingDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [paymentDueDate, setPaymentDueDate] = useState<string>("");
  const [shippingCharge, setShippingCharge] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const { data: customers } = useGetCustomersQuery();
  const clients = customers?.data ?? [];

  const { data: categoryData, isLoading: categoryLoading } =
    useGetCategoriesQuery();
  const categories = categoryData?.data ?? [];

  const { data: productResponse, isLoading: productLoading } =
    useGetProductsQuery();
  const products = productResponse?.data ?? [];

  const [addOrder, { isLoading: isOrderSubmitting }] = useAddOrderMutation();

  // Helper function to convert warehouse locations to array
  const getWarehouseLocationsArray = (product: Product): WarehouseLocationInfo[] => {
    const locations = product.quantityInWarehouseLocation;
    if (!locations) return [];

    // Handle Map type
    if (locations instanceof Map) {
      return Array.from(locations.entries())
        .filter(([_, quantity]) => quantity > 0)
        .map(([location, quantity]) => ({
          location,
          available: quantity
        }));
    }

    // Handle plain object
    if (typeof locations === 'object' && locations !== null) {
      return Object.entries(locations)
        .filter(([_, quantity]) => quantity > 0)
        .map(([location, quantity]) => ({
          location,
          available: quantity
        }));
    }

    return [];
  };

  // Set default payment due date when client is selected - based on shipping date
  useEffect(() => {
    if (selectedClient && shippingDate) {
      const client = clients.find((c: Client) => c._id === selectedClient);
      if (client?.termDays) {
        const shippingDateObj = new Date(shippingDate);
        const dueDate = new Date(shippingDateObj);
        dueDate.setDate(shippingDateObj.getDate() + client.termDays);
        setPaymentDueDate(dueDate.toISOString().split("T")[0]);
      } else {
        // If no termDays specified, set to 30 days default from shipping date
        const shippingDateObj = new Date(shippingDate);
        const dueDate = new Date(shippingDateObj);
        dueDate.setDate(shippingDateObj.getDate() + 30);
        setPaymentDueDate(dueDate.toISOString().split("T")[0]);
      }
    } else if (!selectedClient) {
      // Clear payment due date when no client selected
      setPaymentDueDate("");
    }
  }, [selectedClient, clients, shippingDate]);

  // Recalculate payment due date when shipping date changes and client is selected
  useEffect(() => {
    if (selectedClient && shippingDate) {
      const client = clients.find((c: Client) => c._id === selectedClient);
      if (client?.termDays) {
        const shippingDateObj = new Date(shippingDate);
        const dueDate = new Date(shippingDateObj);
        dueDate.setDate(shippingDateObj.getDate() + client.termDays);
        setPaymentDueDate(dueDate.toISOString().split("T")[0]);
      } else {
        // If no termDays specified, set to 30 days default from shipping date
        const shippingDateObj = new Date(shippingDate);
        const dueDate = new Date(shippingDateObj);
        dueDate.setDate(shippingDateObj.getDate() + 30);
        setPaymentDueDate(dueDate.toISOString().split("T")[0]);
      }
    }
  }, [shippingDate, selectedClient, clients]);

  useEffect(() => {
    if (categories.length && !selectedCategoryId) {
      setSelectedCategoryId(categories[0]._id);
      setSelectedCategoryName(categories[0].name);
    }
  }, [categories, selectedCategoryId]);

  // Get products that this customer has purchased before
  const previouslyPurchasedProducts = useMemo(() => {
    if (!selectedClient) return [];

    return products.filter((product: Product) => {
      const hasPriceForCustomer = product.priceForCustomersRecords &&
        (product.priceForCustomersRecords as any)[selectedClient];
      return hasPriceForCustomer;
    });
  }, [products, selectedClient]);

  // Build categories list with "Previously Purchased" on top if a client is selected and has purchases
  const displayCategories = useMemo(() => {
    let baseCategories = [...categories];

    if (selectedClient && previouslyPurchasedProducts.length > 0) {
      return [PREVIOUSLY_PURCHASED_CATEGORY, ...baseCategories];
    }

    return baseCategories;
  }, [categories, selectedClient, previouslyPurchasedProducts.length]);

  // Set default category to "Previously Purchased" when client is selected
  useEffect(() => {
    if (selectedClient && previouslyPurchasedProducts.length > 0 && displayCategories.length > 0) {
      setSelectedCategoryId(PREVIOUSLY_PURCHASED_CATEGORY._id);
      setSelectedCategoryName(PREVIOUSLY_PURCHASED_CATEGORY.name);
    }
  }, [selectedClient, previouslyPurchasedProducts.length, displayCategories]);

  const clientOptions: OptionType[] = clients.map((client: Client) => ({
    value: client._id,
    label: client.storeName,
    shippingAddress: client.shippingAddress,
  }));

  // Calculate total available quantity from all warehouses or simple quantity
  const getTotalAvailableQuantity = (product: Product): number => {
    const warehouseLocations = getWarehouseLocationsArray(product);
    if (warehouseLocations.length === 0) {
      return product.quantity || 0;
    }
    return warehouseLocations.reduce((sum, loc) => sum + loc.available, 0);
  };

  // Get single warehouse location if only one exists
  const getSingleWarehouseLocation = (product: Product): string | null => {
    const warehouseLocations = getWarehouseLocationsArray(product);
    if (warehouseLocations.length === 1) {
      return warehouseLocations[0].location;
    }
    return null;
  };

  const addToOrder = (product: Product) => {
    // Always use product.salesPrice for the editable Price field.
    // The "Last Sold At" field shows the previously paid (potentially
    // discounted) price so the sales rep can see what was actually paid
    // last time.
    const clientPrice = product.salesPrice;

    // Resolve the last sold price (potentially discounted) for display
    let lastSoldPrice: number | undefined;
    if (selectedClient && product.priceForCustomersRecords) {
      const priceForClient = (product.priceForCustomersRecords as any)[
        selectedClient
      ];
      if (priceForClient) {
        lastSoldPrice = priceForClient.lastPurchasePrice || priceForClient;
      }
    }

    const warehouseLocations = getWarehouseLocationsArray(product);
    const totalAvailable = getTotalAvailableQuantity(product);
    const hasWarehouseLocations = warehouseLocations.length > 0;
    const singleWarehouseLocation = getSingleWarehouseLocation(product);

    const item: ProductDetails = {
      id: product._id,
      name: product.name,
      itemCode: product.itemNumber,
      price: clientPrice,
      lastSoldPrice,
      availableQty: totalAvailable,
      unit: product.weightUnit,
      category: product.categoryId.name,
      warehouseLocations: warehouseLocations,
    };

    const exists = orderItems.find((i) => i.product.id === item.id);
    if (exists) {
      toast.info("Product already in order. Adjust quantities in the order summary.");
    } else {
      if (hasWarehouseLocations) {
        // For products with warehouse locations
        if (singleWarehouseLocation) {
          // If only one warehouse location, automatically select it with quantity 1
          const locationInfo = warehouseLocations.find(l => l.location === singleWarehouseLocation);
          setOrderItems([
            ...orderItems,
            {
              product: item,
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
              price: item.price,
              total: item.price,
              hasWarehouseLocations: true,
            },
          ]);
        } else {
          // Multiple warehouses - start with empty selections
          setOrderItems([
            ...orderItems,
            {
              product: item,
              warehouseSelections: [],
              simpleQuantity: 0,
              totalQuantity: 0,
              discount: 0,
              note: "",
              noteExpanded: false,
              price: item.price,
              total: 0,
              hasWarehouseLocations: true,
            },
          ]);
        }
      } else {
        // For products without warehouse locations, start with quantity 1
        setOrderItems([
          ...orderItems,
          {
            product: item,
            warehouseSelections: [],
            simpleQuantity: 1,
            totalQuantity: 1,
            discount: 0,
            note: "",
            noteExpanded: false,
            price: item.price,
            total: item.price,
            hasWarehouseLocations: false,
          },
        ]);
      }
    }
  };

  // Update simple quantity for products without warehouse locations
  const updateSimpleQuantity = (productId: string, newQuantity: number) => {
    setOrderItems((items) =>
      items.map((item) => {
        if (item.product.id === productId && !item.hasWarehouseLocations) {
          const availableQty = item.product.availableQty;
          const validQuantity = Math.min(Math.max(1, newQuantity), availableQty);

          if (validQuantity !== newQuantity) {
            toast.warning(`Only ${availableQty} units available`);
          }

          return {
            ...item,
            simpleQuantity: validQuantity,
            totalQuantity: validQuantity,
            total: item.price * validQuantity - item.discount,
          };
        }
        return item;
      }),
    );
  };

  // Update simple quantity for products with single warehouse location
  const updateSingleWarehouseQuantity = (productId: string, newQuantity: number) => {
    setOrderItems((items) =>
      items.map((item) => {
        if (item.product.id === productId && item.hasWarehouseLocations && item.warehouseSelections.length === 1) {
          const availableQty = item.product.availableQty;
          const validQuantity = Math.min(Math.max(1, newQuantity), availableQty);
          const maxAvailable = item.warehouseSelections[0].maxAvailable;

          if (validQuantity !== newQuantity) {
            toast.warning(`Only ${maxAvailable} units available at ${item.warehouseSelections[0].location}`);
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
            total: item.price * finalQuantity - item.discount,
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
    setOrderItems((items) =>
      items.map((item) => {
        if (item.product.id === productId && item.hasWarehouseLocations) {
          const updatedSelections = [...item.warehouseSelections];
          const location = updatedSelections[locationIndex];

          // Don't exceed max available for this location
          const validQuantity = Math.min(newQuantity, location.maxAvailable);
          if (validQuantity !== newQuantity) {
            toast.warning(`Only ${location.maxAvailable} available at ${location.location}`);
          }

          // Don't allow negative quantities
          const finalQuantity = Math.max(0, validQuantity);

          updatedSelections[locationIndex] = {
            ...location,
            quantity: finalQuantity
          };

          // Remove selections with 0 quantity
          const filteredSelections = updatedSelections.filter(sel => sel.quantity > 0);

          // Calculate total quantity
          const totalQty = filteredSelections.reduce((sum, sel) => sum + sel.quantity, 0);

          return {
            ...item,
            warehouseSelections: filteredSelections,
            totalQuantity: totalQty,
            total: item.price * totalQty - item.discount,
          };
        }
        return item;
      }),
    );
  };

  // Add new warehouse location selection
  const addWarehouseLocation = (productId: string, locationName: string) => {
    setOrderItems((items) =>
      items.map((item) => {
        if (item.product.id === productId && item.hasWarehouseLocations) {
          const location = item.product.warehouseLocations.find(
            loc => loc.location === locationName
          );
          if (!location) return item;

          // Check if already selected
          const alreadySelected = item.warehouseSelections.some(
            sel => sel.location === locationName
          );
          if (alreadySelected) {
            toast.error("This warehouse location already added");
            return item;
          }

          const newSelection: WarehouseSelection = {
            location: locationName,
            quantity: 1,
            maxAvailable: location.available
          };

          const updatedSelections = [...item.warehouseSelections, newSelection];
          const totalQty = updatedSelections.reduce((sum, sel) => sum + sel.quantity, 0);

          return {
            ...item,
            warehouseSelections: updatedSelections,
            totalQuantity: totalQty,
            total: item.price * totalQty - item.discount,
          };
        }
        return item;
      }),
    );
  };

  // Remove warehouse location selection
  const removeWarehouseLocation = (productId: string, locationIndex: number) => {
    setOrderItems((items) =>
      items.map((item) => {
        if (item.product.id === productId && item.hasWarehouseLocations) {
          const updatedSelections = item.warehouseSelections.filter((_, idx) => idx !== locationIndex);
          const totalQty = updatedSelections.reduce((sum, sel) => sum + sel.quantity, 0);

          return {
            ...item,
            warehouseSelections: updatedSelections,
            totalQuantity: totalQty,
            total: item.price * totalQty - item.discount,
          };
        }
        return item;
      }),
    );
  };

  const updateDiscount = (productId: string, discount: number) => {
    setOrderItems((items) =>
      items.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              discount,
              total: item.price * item.totalQuantity - discount,
            }
          : item,
      ),
    );
  };

  const updateNote = (productId: string, note: string) => {
    setOrderItems((items) =>
      items.map((item) =>
        item.product.id === productId ? { ...item, note } : item,
      ),
    );
  };

  const toggleNoteExpanded = (productId: string) => {
    setOrderItems((items) =>
      items.map((item) =>
        item.product.id === productId
          ? { ...item, noteExpanded: !item.noteExpanded }
          : item,
      ),
    );
  };

  const updatePrice = (productId: string, price: number) => {
    setOrderItems((items) =>
      items.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              price: price,
              total: price * item.totalQuantity - item.discount,
            }
          : item,
      ),
    );
  };

  const removeFromOrder = (productId: string) => {
    setOrderItems((items) =>
      items.filter((item) => item.product.id !== productId),
    );
  };

  // Get filtered products based on selected category - with barcode search support
  const getFilteredProducts = () => {
    if (searchTerm.trim() !== "") {
      const searchLower = searchTerm.toLowerCase();
      return products.filter(
        (product: Product) =>
          product.name.toLowerCase().includes(searchLower) ||
          product.itemNumber.toLowerCase().includes(searchLower) ||
          (product.barcodeString && product.barcodeString.toLowerCase().includes(searchLower)),
      );
    }

    // If "Previously Purchased" category is selected
    if (selectedCategoryId === PREVIOUSLY_PURCHASED_CATEGORY._id) {
      return previouslyPurchasedProducts;
    }

    // Regular category filter
    if (selectedCategoryId) {
      return products.filter(
        (product) => product.categoryId._id === selectedCategoryId,
      );
    }

    return products;
  };

  const filteredProducts = getFilteredProducts();

  const calculateTotals = () => {
    const itemsTotal = orderItems.reduce((acc, item) => acc + item.total, 0);
    const totalAmount = itemsTotal + shippingCharge;
    const totalQuantity = orderItems.reduce(
      (acc, item) => acc + item.totalQuantity,
      0,
    );
    return { itemsTotal, totalAmount, totalQuantity };
  };

  const { itemsTotal, totalAmount, totalQuantity } = calculateTotals();

  const constructOrderPayload = (): OrderPayload => ({
    date: orderDate,
    shippingDate: shippingDate,
    storeId: selectedClient,
    paymentDueDate,
    shippingCharge,
    orderAmount: Math.round(totalAmount),
    products: orderItems.map((item) => {
      if (item.hasWarehouseLocations && item.warehouseSelections.length > 0) {
        // Build warehouse locations object
        const warehouseLocationsMap: Record<string, number> = {};
        item.warehouseSelections.forEach(selection => {
          warehouseLocationsMap[selection.location] = selection.quantity;
        });

        // Calculate total quantity from all warehouse selections
        const totalQty = Object.values(warehouseLocationsMap).reduce((sum, qty) => sum + qty, 0);

        return {
          productId: item.product.id,
          warehouseLocations: warehouseLocationsMap,
          quantity: totalQty,
          price: item.price,
          discount: item.discount,
          note: item.note,
        };
      } else {
        // For products without warehouse locations
        return {
          productId: item.product.id,
          quantity: item.simpleQuantity,
          price: item.price,
          discount: item.discount,
          note: item.note,
        };
      }
    }),
  });

  const dispatch = useDispatch();

  const handlePlaceOrder = async () => {
    if (!selectedClient || orderItems.length === 0) {
      toast.error("Please select a client and add items");
      return;
    }

    // Validate payment due date
    if (!paymentDueDate) {
      toast.error("Payment due date required!");
      return;
    }

    // Validate all items have quantities
    for (const item of orderItems) {
      if (item.totalQuantity === 0) {
        toast.error(`Please select quantity for ${item.product.name}`);
        return;
      }
    }

    const payload = constructOrderPayload();

    try {
      await addOrder(payload).unwrap();
      setOrderItems([]);
      setSearchTerm("");
      setSelectedClient("");
      setOrderDate(new Date().toISOString().split("T")[0]);
      setShippingDate(new Date().toISOString().split("T")[0]);
      setPaymentDueDate("");
      setShippingCharge(0);

      refetchProducts();
      dispatch(inventoryApi.util.invalidateTags(["Products", "Inventory"]));
      onAddSuccess();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Order creation error:", err);
      toast.error(
        "Order failed: " +
          (err?.data?.message || err?.error || "Unknown error"),
      );
    }
  };

  // Get client-specific price info
  const getClientPriceInfo = (product: Product) => {
    if (selectedClient && product.priceForCustomersRecords) {
      const record = (product.priceForCustomersRecords as any)[selectedClient];
      if (record) {
        return {
          price: record.lastPurchasePrice || record,
          purchaseCount: record.purchaseCount || 1,
        };
      }
    }
    return {
      price: product.salesPrice,
      purchaseCount: 0,
    };
  };

  // Get category display name
  const getCategoryDisplayName = () => {
    if (selectedCategoryId === PREVIOUSLY_PURCHASED_CATEGORY._id) {
      return PREVIOUSLY_PURCHASED_CATEGORY.name;
    }
    return selectedCategoryName || "Products";
  };

  // Check if "Previously Purchased" category is selected and has no products
  const showNoPreviouslyPurchasedMessage =
    selectedCategoryId === PREVIOUSLY_PURCHASED_CATEGORY._id &&
    selectedClient &&
    filteredProducts.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-7xl w-full h-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Order</DialogTitle>
        </DialogHeader>

        <Card className="w-full flex flex-col">
          <CardContent className="flex-1 flex flex-col overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <User className="w-4 h-4" /> Select Client{" "}
                  <span className="text-red-700">*</span>
                </Label>
                <Select
                  value={clientOptions.find(
                    (option) => option.value === selectedClient,
                  )}
                  onChange={(option) => {
                    setSelectedClient(option ? option.value : "");
                    // Reset to regular categories when client changes
                    if (categories.length > 0) {
                      setSelectedCategoryId(categories[0]._id);
                      setSelectedCategoryName(categories[0].name);
                    }
                  }}
                  options={clientOptions}
                  placeholder="Search and select client..."
                  isClearable={true}
                  formatOptionLabel={(option: OptionType) => (
                    <div>
                      <span className="font-medium">{option.label}</span>
                      <div className="text-xs text-gray-500 flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {option.shippingAddress}
                      </div>
                    </div>
                  )}
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: "38px",
                    }),
                    valueContainer: (base) => ({
                      ...base,
                      padding: "2px 8px",
                    }),
                    input: (base) => ({
                      ...base,
                      margin: "0px",
                    }),
                  }}
                />
                {/* Show previously purchased count */}
                {selectedClient && previouslyPurchasedProducts.length > 0 && (
                  <p className="text-xs text-blue-600 mt-1 font-bold">
                    <History className="w-3 h-3 inline mr-1" />
                    {previouslyPurchasedProducts.length} previously purchased
                    product(s) available
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Order Date{" "}
                  <span className="text-red-700">*</span>
                </Label>
                <Input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Delivery Date{" "}
                  <span className="text-red-700">*</span>
                </Label>
                <Input
                  type="date"
                  name="shippingDate"
                  value={shippingDate}
                  onChange={(e) => setShippingDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Payment Due Date{" "}
                  <span className="text-red-700">*</span>
                </Label>
                <Input
                  type="date"
                  value={paymentDueDate}
                  onChange={(e) => setPaymentDueDate(e.target.value)}
                  placeholder="Select payment due date"
                />
                {selectedClient && (
                  <p className="text-xs text-gray-500">
                    Based on delivery date + {clients.find((c: Client) => c._id === selectedClient)?.termDays || 30} days term
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Shipping Charge ($)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={shippingCharge}
                  onChange={(e) =>
                    setShippingCharge(parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.00"
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
              </div>
            </div>

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search products by name, SKU or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="col-span-1">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>
                      <Package className="w-5 h-5 mr-2 inline-block" />
                      Categories
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[450px] pr-2">
                      {categoryLoading ? (
                        <p>Loading...</p>
                      ) : (
                        displayCategories.map((cat: any) => (
                          <Button
                            key={cat._id}
                            variant={
                              cat._id === selectedCategoryId ? "default" : "ghost"
                            }
                            className={`w-full mb-2 ${
                              cat._id === selectedCategoryId
                                ? "bg-red-700 hover:bg-red-600 text-white"
                                : "text-gray-700 hover:text-red-700 hover:bg-red-50"
                            }`}
                            onClick={() => {
                              setSelectedCategoryId(cat._id);
                              setSelectedCategoryName(cat.name);
                            }}
                          >
                            {cat.name}
                          </Button>
                        ))
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>

              <div className="col-span-2 space-y-2">
                <Card className="h-[600px] overflow-y-auto">
                  <CardHeader>
                    <CardTitle>{getCategoryDisplayName()}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {productLoading ? (
                      <p>Loading products...</p>
                    ) : showNoPreviouslyPurchasedMessage ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <History className="w-16 h-16 text-gray-300 mb-4" />
                        <p className="text-gray-500 text-lg">
                          No previously purchased products to show
                        </p>
                        <p className="text-gray-400 text-sm mt-2">
                          This customer hasn't purchased any products yet.
                        </p>
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <p>No products found.</p>
                    ) : (
                      filteredProducts.map((product: Product) => {
                        const orderItem = orderItems.find(
                          (item) => item.product.id === product._id,
                        );
                        const productCategory = categories.find(
                          (cat) => cat._id === product.categoryId._id,
                        )?.name;
                        const totalAvailable = getTotalAvailableQuantity(product);
                        const warehouseLocations = getWarehouseLocationsArray(product);
                        const hasWarehouseLocations = warehouseLocations.length > 0;
                        const singleWarehouseLocation = getSingleWarehouseLocation(product);
                        const currentQuantity = orderItem?.totalQuantity || 0;
                        const isAtMaxStock = currentQuantity >= totalAvailable;
                        const { price: clientPrice, purchaseCount } = getClientPriceInfo(product);
                        const isPreviouslyPurchased = selectedClient &&
                          product.priceForCustomersRecords &&
                          (product.priceForCustomersRecords as any)[selectedClient];
                        const purchaseCountValue = isPreviouslyPurchased
                          ? (product.priceForCustomersRecords as any)[selectedClient]?.purchaseCount || 1
                          : 0;

                        return (
                          <div
                            key={product._id}
                            className={`border p-2 rounded mb-2 ${
                              isPreviouslyPurchased
                                ? "border-blue-300 bg-blue-50/30"
                                : "border-gray-200"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="mb-2">
                                  {isPreviouslyPurchased && (
                                    <span className="text-yellow-500 mr-1">★</span>
                                  )}
                                  {product.name}
                                  {isPreviouslyPurchased && purchaseCountValue > 0 && (
                                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                      Purchased {purchaseCountValue} {purchaseCountValue === 1 ? 'time' : 'times'}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-medium">
                                  Category - <span>{productCategory}</span> |
                                  Available Quantity {totalAvailable}
                                </div>
                                {hasWarehouseLocations && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    <Warehouse className="w-3 h-3 inline mr-1" />
                                    Locations: {warehouseLocations.map(l => `${l.location} (${l.available})`).join(", ")}
                                  </div>
                                )}
                              </div>
                              <div className="text-sm font-semibold">
                                ${orderItem?.price || clientPrice}
                              </div>
                            </div>
                            <div className="mt-2">
                              {orderItem ? (
                                <>
                                  {hasWarehouseLocations ? (
                                    orderItem.warehouseSelections.length === 1 && singleWarehouseLocation ? (
                                      // Single warehouse location - show simple quantity UI
                                      <div>
                                        <div className="mb-3">
                                          <div className="flex items-center gap-3">
                                            <Button
                                              size="icon"
                                              variant="outline"
                                              onClick={() =>
                                                updateSingleWarehouseQuantity(
                                                  product._id,
                                                  orderItem.totalQuantity - 1,
                                                )
                                              }
                                              disabled={orderItem.totalQuantity <= 1}
                                              className="border-gray-300 hover:border-red-500"
                                            >
                                              <Minus className="w-4 h-4" />
                                            </Button>
                                            <div className="relative">
                                              <Input
                                                type="number"
                                                value={orderItem.totalQuantity}
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
                                                  updateSingleWarehouseQuantity(
                                                    product._id,
                                                    newQty,
                                                  );
                                                }}
                                                className="w-20 h-9 text-center focus:ring-red-500 focus:border-red-500"
                                                min="1"
                                                max={totalAvailable}
                                                step="1"
                                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                              />
                                              {isAtMaxStock && (
                                                <div className="absolute -top-2 -right-2">
                                                  <span className="flex h-3 w-3">
                                                    <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                            <Button
                                              size="icon"
                                              variant="outline"
                                              onClick={() => {
                                                if (orderItem.totalQuantity + 1 > totalAvailable) {
                                                  toast.error(
                                                    `Cannot add more than ${totalAvailable} units. Only ${totalAvailable} available in stock.`,
                                                  );
                                                } else {
                                                  updateSingleWarehouseQuantity(
                                                    product._id,
                                                    orderItem.totalQuantity + 1,
                                                  );
                                                }
                                              }}
                                              disabled={isAtMaxStock}
                                              className={`border-gray-300 hover:border-red-500 ${isAtMaxStock ? "opacity-50 cursor-not-allowed" : ""}`}
                                            >
                                              <Plus className="w-4 h-4" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    ) : (
                                      // Multiple warehouses - show warehouse selection UI
                                      <div className="space-y-3 mb-3">
                                        {orderItem.warehouseSelections.length === 0 && (
                                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-center text-xs text-yellow-700">
                                            No warehouses selected. Use dropdown below to add warehouses.
                                          </div>
                                        )}

                                        {orderItem.warehouseSelections.map((selection, idx) => (
                                          <div key={idx} className="flex items-center gap-2">
                                            <span className="text-xs font-medium flex-1">{selection.location}</span>
                                            <Input
                                              type="number"
                                              value={selection.quantity}
                                              onChange={(e) => {
                                                let newQty = parseInt(e.target.value);
                                                if (isNaN(newQty)) newQty = 0;
                                                updateWarehouseQuantity(product._id, idx, newQty);
                                              }}
                                              min="0"
                                              max={selection.maxAvailable}
                                              className="w-20 h-8 text-center text-xs"
                                              onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            />
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => removeWarehouseLocation(product._id, idx)}
                                              className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                                            >
                                              <Minus className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        ))}

                                        {/* Add warehouse locations dropdown */}
                                        {(() => {
                                          const selectedLocations = orderItem.warehouseSelections.map(s => s.location);
                                          const availableLocations = warehouseLocations.filter(
                                            loc => !selectedLocations.includes(loc.location) && loc.available > 0
                                          );
                                          if (availableLocations.length > 0) {
                                            return (
                                              <select
                                                className="w-full p-1 border rounded text-xs mt-2"
                                                onChange={(e) => {
                                                  if (e.target.value) {
                                                    addWarehouseLocation(product._id, e.target.value);
                                                    e.target.value = "";
                                                  }
                                                }}
                                                value=""
                                              >
                                                <option value="">+ Add warehouse location</option>
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

                                        <div className="flex items-center justify-between mt-2 pt-2 border-t">
                                          <span className="text-xs text-gray-600">Total Qty:</span>
                                          <span className="text-sm font-semibold text-red-700">{orderItem.totalQuantity}</span>
                                        </div>
                                      </div>
                                    )
                                  ) : (
                                    // Simple quantity UI for products without warehouses
                                    <div className="flex items-center gap-3 mb-3">
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() =>
                                          updateSimpleQuantity(
                                            product._id,
                                            orderItem.simpleQuantity - 1,
                                          )
                                        }
                                        disabled={orderItem.simpleQuantity <= 1}
                                        className="border-gray-300 hover:border-red-500"
                                      >
                                        <Minus className="w-4 h-4" />
                                      </Button>
                                      <div className="relative">
                                        <Input
                                          type="number"
                                          value={orderItem.simpleQuantity}
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
                                            updateSimpleQuantity(
                                              product._id,
                                              newQty,
                                            );
                                          }}
                                          className="w-20 h-9 text-center focus:ring-red-500 focus:border-red-500"
                                          min="1"
                                          max={totalAvailable}
                                          step="1"
                                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                        />
                                        {isAtMaxStock && (
                                          <div className="absolute -top-2 -right-2">
                                            <span className="flex h-3 w-3">
                                              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75"></span>
                                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      <Button
                                        size="icon"
                                        variant="outline"
                                        onClick={() => {
                                          if (orderItem.simpleQuantity + 1 > totalAvailable) {
                                            toast.error(
                                              `Cannot add more than ${totalAvailable} units. Only ${totalAvailable} available in stock.`,
                                            );
                                          } else {
                                            updateSimpleQuantity(
                                              product._id,
                                              orderItem.simpleQuantity + 1,
                                            );
                                          }
                                        }}
                                        disabled={isAtMaxStock}
                                        className={`border-gray-300 hover:border-red-500 ${isAtMaxStock ? "opacity-50 cursor-not-allowed" : ""}`}
                                      >
                                        <Plus className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between mt-2">
                                    <div className="flex gap-3 items-end flex-wrap">
                                      <div>
                                        <p className="text-sm text-gray-600">Price</p>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          placeholder="Price"
                                          value={orderItem.price}
                                          onChange={(e) => {
                                            const newPrice = parseFloat(e.target.value);
                                            updatePrice(product._id, isNaN(newPrice) ? 0 : newPrice);
                                          }}
                                          readOnly={!isAdminOrManager}
                                          disabled={!isAdminOrManager}
                                          className={
                                            isAdminOrManager
                                              ? "w-24 h-8 text-sm focus:ring-red-500 focus:border-red-500"
                                              : "w-24 h-8 text-sm bg-gray-100 cursor-not-allowed text-gray-700"
                                          }
                                          min="0"
                                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                        />
                                      </div>
                                      <div>
                                        <p className="text-sm text-gray-600">Last Sold At (Discounted)</p>
                                        <div className="w-24 h-8 px-2 py-1 bg-gray-100 rounded-md border border-gray-200 text-gray-600 text-sm flex items-center">
                                          ${orderItem.product.lastSoldPrice?.toFixed(2) || "—"}
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-sm text-gray-600">Discount</p>
                                        <Input
                                          type="number"
                                          step="0.01"
                                          placeholder="Discount"
                                          value={orderItem.discount}
                                          onChange={(e) =>
                                            updateDiscount(
                                              product._id,
                                              parseFloat(e.target.value) || 0,
                                            )
                                          }
                                          className="w-24 h-8 text-sm"
                                          min="0"
                                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                        />
                                      </div>
                                    </div>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => removeFromOrder(product._id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                  <div className="text-right mt-2">
                                    <span className="text-sm font-semibold">
                                      Total: ${orderItem.total.toFixed(2)}
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => toggleNoteExpanded(product._id)}
                                    className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                                  >
                                    <ChevronDown
                                      className={`w-3.5 h-3.5 transition-transform duration-300 ${
                                        orderItem.noteExpanded ? "rotate-180" : ""
                                      }`}
                                    />
                                    {orderItem.note ? "Note" : "Add note"}
                                  </button>
                                  <div
                                    className="grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out"
                                    style={{
                                      gridTemplateRows: orderItem.noteExpanded
                                        ? "1fr"
                                        : "0fr",
                                    }}
                                  >
                                    <div className="overflow-hidden">
                                      <Textarea
                                        placeholder="Optional note"
                                        value={orderItem.note}
                                        onChange={(e) =>
                                          updateNote(product._id, e.target.value)
                                        }
                                        rows={2}
                                        className="mt-2 text-sm"
                                      />
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  onClick={() => addToOrder(product)}
                                  className="bg-red-700 hover:bg-red-600 mt-1"
                                  disabled={totalAvailable === 0}
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add
                                </Button>
                              )}
                            </div>
                            {/* Stock warning message */}
                            {orderItem && orderItem.totalQuantity === totalAvailable && totalAvailable > 0 && (
                              <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Max stock reached ({totalAvailable} units)
                              </p>
                            )}
                            {totalAvailable === 0 && (
                              <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                Out of stock
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="col-span-1">
                <Card className="h-full flex flex-col">
                  <CardHeader>
                    <CardTitle>
                      <Calculator className="w-5 h-5 mr-2 inline-block" />
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto">
                    <ScrollArea className="h-96">
                      {orderItems.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center pt-10">
                          <ShoppingCart className="w-8 h-8 mx-auto mb-2" />
                          No items added
                        </p>
                      ) : (
                        orderItems.map((item) => (
                          <div
                            key={item.product.id}
                            className="flex justify-between items-center p-2 border-b"
                          >
                            <div className="flex-1">
                              <span className="font-medium block">
                                {item.product.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                Qty: {item.totalQuantity} | Discount: ${item.discount}
                              </span>
                              {item.hasWarehouseLocations && item.warehouseSelections.length > 0 && (
                                <div className="text-xs text-gray-400 mt-1">
                                  {item.warehouseSelections.map(sel => (
                                    <div key={sel.location}>{sel.location}: {sel.quantity}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className="font-semibold ml-2">
                              ${item.total.toFixed(2)}
                            </span>
                          </div>
                        ))
                      )}
                    </ScrollArea>
                  </CardContent>
                  <div className="border-t px-4 py-2 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Items Subtotal:</span>
                      <span className="font-medium">${itemsTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping Charge:</span>
                      <span className="font-medium">${shippingCharge.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Qty:</span>
                      <span className="font-medium">{totalQuantity}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base border-t pt-2">
                      <span>Order Amount:</span>
                      <span>${totalAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="mr-2"
              >
                Cancel
              </Button>
              <Button
                className="bg-red-700 hover:bg-red-600 px-10"
                disabled={
                  !selectedClient || orderItems.length === 0 || isOrderSubmitting
                }
                onClick={handlePlaceOrder}
              >
                {isOrderSubmitting ? "Placing..." : "Place Order"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

export default AddOrderModal;
