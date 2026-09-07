"use client";

import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Package, Truck, Users, Box, DollarSign, Tag, Scale, Barcode, X, MapPin, Calendar } from "lucide-react";
import Cookies from "js-cookie";

interface ContainerHistoryEntry {
  containerId: string;
  containerNumber: string;
  containerName: string;
  containerStatus: "arrived" | "onTheWay";
  deliveryDate: string;
  perCaseCost: number;
  perCaseShippingCost: number;
  purchasePrice: number;
  quantity: number;
  packetSize: string;
  arrivedAt?: string | null;
}

interface SoldToEntry {
  storeName: string;
  storePersonName?: string;
  quantity: number;
  _id?: string;
}

interface ProductWithDetails {
  _id: string;
  name: string;
  itemNumber?: string;
  packetSize?: string;
  weight?: number;
  weightUnit?: string;
  categoryId?: { _id: string; name: string };
  quantity?: number;
  incomingQuantity?: number;
  purchasePrice?: number;
  salesPrice?: number;
  barcodeString?: string;
  expiryDate?: string;
  images?: string[];
  containerHistory?: ContainerHistoryEntry[];
  soldTo?: SoldToEntry[];
  quantityInWarehouseLocation?: Map<string, number> | Record<string, number>;
  packageDimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  caseDimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface ProductDetailsModalProps {
  product: ProductWithDetails | null;
  trigger: React.ReactNode;
}

export default function ProductDetailsModal({ product, trigger }: ProductDetailsModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const loggedInUserRole = Cookies.get("role")
  const isAdminOrManager = loggedInUserRole === "admin" || loggedInUserRole == "manager";

  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      window.scrollTo(0, parseInt(scrollY || "0") * -1);
    }
  }, [isOpen]);

  if (!product) return null;

  const images = product.images && product.images.length > 0
    ? product.images
    : ["https://arbora-bucket.s3.us-east-2.amazonaws.com/system+assets/No_Image_Available.jpg"];

  const containerHistory = product.containerHistory ?? [];
  const soldToCustomers = product.soldTo ?? [];

  // Get warehouse locations - handle both Map and plain object
  const getWarehouseLocations = () => {
    const locations = product.quantityInWarehouseLocation;
    if (!locations) return {};

    // If it's a Map, convert to object
    if (locations instanceof Map) {
      return Object.fromEntries(locations);
    }
    // If it's already an object, return as is
    return locations;
  };

  const warehouseLocations = getWarehouseLocations();
  const hasWarehouseLocations = Object.keys(warehouseLocations).length > 0;

  const calculateProfitMargin = () => {
    if (!product.purchasePrice || product.purchasePrice === 0) return "0.00";
    return (((product.salesPrice ?? 0) - product.purchasePrice) / product.purchasePrice * 100).toFixed(2);
  };

  // Calculate total quantity from warehouse locations if available
  const totalQuantityFromWarehouses = Object.values(warehouseLocations).reduce(
    (sum, qty) => sum + (typeof qty === 'number' ? qty : 0),
    0
  );

  // Use warehouse total if available, otherwise use product.quantity
  const displayTotalQuantity = hasWarehouseLocations ? totalQuantityFromWarehouses : (product.quantity ?? 0);

  // Check if expiry date is expired
  const isExpired = () => {
    if (!product.expiryDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(product.expiryDate);
    expiryDate.setHours(0, 0, 0, 0);
    return expiryDate < today;
  };

  // Format currency defensively — container-history entries can carry
  // missing/null numeric fields (e.g. legacy containers without a root
  // perCaseShippingCost). Calling .toFixed() on those used to throw
  // "Cannot read properties of undefined (reading 'toFixed')" during
  // render, which took down the whole page via the error boundary.
  const toUSD = (value: unknown): string => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : "0.00";
  };

  // Format a date defensively — same protective purpose for malformed dates.
  const formatDateSafe = (value?: string | null): string => {
    if (!value) return "—";
    const date = new Date(value);
    return isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
  };

  // Format expiry date for display
  const formatExpiryDate = (dateString: string) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const hasExpiryDate = product.expiryDate && product.expiryDate.trim() !== "";
  const expired = hasExpiryDate && isExpired();

  return (
    <>
      <div onClick={() => setIsOpen(true)} className="cursor-pointer inline-block">
        {trigger}
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-md z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col">
            {/* Header */}
            <div className="sticky border-b-1 border-black top-0 bg-white rounded-t-xl px-6 py-5 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                <Package className="w-6 h-6 text-red-600" />
                {product.name}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Scrollable Body */}
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-8 pb-8">
                {/* Images */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Product Images</h3>
                    <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                      {images.length} image(s)
                    </span>
                  </div>

                  {images.length === 1 ? (
                    <div className="flex justify-center">
                      <img
                        src={images[0]}
                        alt={product.name}
                        className="max-w-full max-h-96 object-contain rounded-lg border border-gray-200 bg-gray-50"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {images.map((img, idx) => (
                        <img
                          key={idx}
                          src={img}
                          alt={`${product.name} - ${idx + 1}`}
                          className="w-full h-48 object-cover rounded-lg border border-gray-200 bg-gray-50 hover:shadow-md transition-shadow"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Box className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Product Details</h3>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Item Number</p>
                      <p className="font-semibold text-gray-900">{product.itemNumber || "N/A"}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Category</p>
                      <p className="font-semibold text-gray-900">{product.categoryId?.name || "N/A"}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Packet Size</p>
                      <p className="font-semibold text-gray-900">{product.packetSize || "N/A"}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Incoming Stock</p>
                      <p className="font-semibold text-green-600">
                        {product.incomingQuantity?.toLocaleString() ?? 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Barcode</p>
                      <p className="font-semibold text-gray-900">{product.barcodeString || "—"}</p>
                    </div>
                    {hasExpiryDate && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">Expiry Date</p>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-red-500" />
                          <p className={`font-semibold ${expired ? 'text-red-600' : 'text-gray-900'}`}>
                            {formatExpiryDate(product.expiryDate!)}
                          </p>
                          {expired && (
                            <Badge variant="destructive" className="bg-red-100 text-red-700">
                              Expired
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Stock Information Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Stock Information</h3>
                  </div>

                  <div className="flex gap-4 w-full">
                    {/* Total Quantity */}
                    <div className="bg-gradient-to-r from-red-50 to-rose-50 p-4 rounded-lg border border-red-200">
                      <p className="text-xs text-gray-500 mb-1">Total Stock Quantity</p>
                      <p className="text-5xl font-bold text-red-700">
                        {product.quantity?.toLocaleString()}
                      </p>
                    </div>

                    {/* Warehouse Locations */}
                    {hasWarehouseLocations && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center gap-2 mb-3">
                          <MapPin className="w-4 h-4 text-blue-600" />
                          <p className="text-sm font-semibold text-gray-700">Warehouse-wise Breakdown</p>
                        </div>
                        <div className="space-y-2">
                          {Object.entries(warehouseLocations).map(([location, quantity]) => (
                            <div key={location} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                              <span className="text-sm text-gray-600 capitalize">{location}</span>
                              <span className="font-semibold text-red-600">
                                {typeof quantity === 'number' ? quantity.toLocaleString() : quantity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pricing Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Pricing</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {isAdminOrManager && (<div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Purchase Price</p>
                      <p className="font-semibold text-gray-900">
                        ${product.purchasePrice?.toFixed(2) ?? "0.00"}
                      </p>
                    </div>)}

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Sales Price</p>
                      <p className="font-semibold text-gray-900">
                        ${product.salesPrice?.toFixed(2) ?? "0.00"}
                      </p>
                    </div>
                    {isAdminOrManager && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-500 mb-1">Profit Margin</p>
                      <p className="font-semibold text-gray-900">
                        {calculateProfitMargin()}%
                      </p>
                    </div>
                    )}

                  </div>
                </div>

                {/* Weight & Dimensions Section */}
                {(product.weight || product.weightUnit || product.packageDimensions || product.caseDimensions) && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Scale className="w-5 h-5 text-red-600" />
                      <h3 className="text-lg font-semibold text-gray-800">Weight & Dimensions</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {product.weight && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">Weight</p>
                          <p className="font-semibold text-gray-900">
                            {product.weight} {product.weightUnit || ""}
                          </p>
                        </div>
                      )}
                      {product.packageDimensions && (product.packageDimensions.length || product.packageDimensions.width || product.packageDimensions.height) && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">Package Dimensions (L × W × H)</p>
                          <p className="font-semibold text-gray-900">
                            {product.packageDimensions.length || 0} × {product.packageDimensions.width || 0} × {product.packageDimensions.height || 0} {product.packageDimensions.unit || ""}
                          </p>
                        </div>
                      )}
                      {product.caseDimensions && (product.caseDimensions.length || product.caseDimensions.width || product.caseDimensions.height) && (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">Case Dimensions (L × W × H)</p>
                          <p className="font-semibold text-gray-900">
                            {product.caseDimensions.length || 0} × {product.caseDimensions.width || 0} × {product.caseDimensions.height || 0} {product.caseDimensions.unit || ""}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sold To Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-semibold text-gray-800">
                      Sold To ({soldToCustomers.length})
                    </h3>
                  </div>

                  {soldToCustomers.length > 0 ? (
                    <div className="space-y-3">
                      {soldToCustomers.map((item, i) => (
                        <div key={i} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <p className="font-semibold text-gray-900">{item.storeName}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Quantity sold: <span className="font-semibold text-green-600">{item.quantity}</span>
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-8 rounded-lg border border-gray-200 text-center">
                      <p className="text-gray-500">Not sold yet</p>
                    </div>
                  )}
                </div>

                {/* Import History Section */}
                {isAdminOrManager && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-red-600" />
                    <h3 className="text-lg font-semibold text-gray-800">
                      Import History ({containerHistory.length})
                    </h3>
                  </div>

                  {containerHistory.length > 0 ? (
                    <div className="space-y-3">
                      {containerHistory.map((entry) => (
                        <div
                          key={entry.containerId}
                          className={`p-4 rounded-lg border ${
                            entry.containerStatus === "arrived"
                              ? "bg-green-50 border-green-200"
                              : "bg-amber-50 border-amber-200"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-gray-900">{entry.containerName}</p>
                              <p className="text-sm text-gray-600 mt-1">
                                Container Number: <span className="font-mono text-gray-700">{entry.containerNumber}</span>
                              </p>
                            </div>
                            <Badge
                              variant={entry.containerStatus === "arrived" ? "default" : "secondary"}
                              className={entry.containerStatus === "arrived"
                                ? "bg-green-100 text-green-700 hover:bg-green-100"
                                : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                              }
                            >
                              {entry.containerStatus === "arrived" ? "Arrived" : "On The Way"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-2 text-sm">
                            <div>
                              <p className="text-xs text-gray-500">Quantity</p>
                              <p className="font-semibold text-gray-900">{entry.quantity}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Cost per Case</p>
                              <p className="font-semibold text-gray-900">${toUSD(entry.perCaseCost)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Shipping Cost</p>
                              <p className="font-semibold text-gray-900">${toUSD(entry.perCaseShippingCost)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">Expected Date</p>
                              <p className="font-semibold text-gray-900">
                                {formatDateSafe(entry.deliveryDate)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-8 rounded-lg border border-gray-200 text-center">
                      <p className="text-gray-500">No import history</p>
                    </div>
                  )}
                </div>
                )}

              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </>
  );
}
