"use client";

import { useState, useMemo } from "react";
import { useGetLogsQuery } from "@/redux/api/logs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Package, ShoppingCart, Container, User, Clock, Edit, Trash2, Plus } from "lucide-react";
import Loading from "@/redux/Shared/Loading";
import Cookies from "js-cookie";

type LogModule = 'customer' | 'order' | 'inventory' | 'payment' | 'container' | 'containerPo' | 'supplierCreditMemo';
type LogAction = 'add' | 'update' | 'delete';

interface ILog {
  _id: string;
  module: LogModule;
  documentId: string;
  action: LogAction;
  dataChanges: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  performedBy: string;
  createdAt: string;
}

const LogsPage = () => {
  // Defense-in-depth: hide cost data (purchase price in containerProducts
  // change values) from non-admin/manager even though /logs is
  // admin/manager-only at the route level. The route gate runs in
  // useEffect — would otherwise flash sensitive numbers for one tick.
  const role = Cookies.get("role");
  const isAdminOrManager = role === "admin" || role === "manager";

  const { data: logsData, isLoading, error } = useGetLogsQuery({});
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | LogModule>("all");

  const logs: ILog[] = logsData?.data || [];

  // Count logs by module with safe checking
  const logCounts = useMemo(() => {
    return {
      all: logs?.length || 0,
      inventory: logs?.filter(log => log?.module === "inventory")?.length || 0,
      order: logs?.filter(log => log?.module === "order")?.length || 0,
      container: logs?.filter(log => log?.module === "container")?.length || 0,
      customer: logs?.filter(log => log?.module === "customer")?.length || 0,
      payment: logs?.filter(log => log?.module === "payment")?.length || 0,
    };
  }, [logs]);

  // Filter logs with safe checking
  const filteredLogs = useMemo(() => {
    if (!logs || logs.length === 0) return [];
    
    let filtered = [...logs];

    if (activeTab !== "all") {
      filtered = filtered.filter(log => log?.module === activeTab);
    }

    if (searchQuery?.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        log?.performedBy?.toLowerCase().includes(query) ||
        log?.documentId?.toLowerCase().includes(query) ||
        (log?.dataChanges && Array.isArray(log.dataChanges) && log.dataChanges.some(change =>
          change?.field?.toLowerCase().includes(query)
        ))
      );
    }

    return filtered;
  }, [logs, activeTab, searchQuery]);

  // ==================== NON-TECHNICAL CHANGES-MADE FORMATTING ====================
  // Maps raw DB field names to plain-English labels, and formats values so a
  // non-technical person (currency, dates, yes/no, counts, readable summaries)
  // never sees a raw field key or a JSON dump.

  const FIELD_LABELS: Record<string, string> = {
    // Order
    orderStatus: "Order Status",
    paymentStatus: "Payment Status",
    shippingCharge: "Shipping Charge",
    payableAdjustment: "Payment Adjustment",
    payableAdjustmentNote: "Adjustment Note",
    openBalance: "Open Balance",
    orderAmount: "Order Amount",
    discountGiven: "Discount Given",
    totalPayable: "Total Payable",
    profitAmount: "Profit Amount",
    profitPercentage: "Profit Margin",
    paymentAmountReceived: "Payment Received",
    products: "Products",
    returnedProducts: "Returned Products",
    creditInfo: "Store Credit Given",
    deliveryImages: "Delivery Photos",
    deliverySignImage: "Delivery Signature",
    deliveryNote: "Delivery Note",
    returnImages: "Return Photos",
    returnNoteFromDriver: "Driver's Return Note",
    isReturnRequested: "Return Requested",
    PONumber: "PO Number",
    invoiceNumber: "Invoice Number",
    date: "Order Date",
    shippingDate: "Shipping Date",
    paymentDueDate: "Payment Due Date",
    note: "Note",
    // Product / inventory
    name: "Product Name",
    packetSize: "Pack Size",
    weight: "Weight",
    weightUnit: "Weight Unit",
    categoryId: "Category",
    reorderPointOfQuantity: "Reorder Point",
    incomingQuantity: "Incoming Quantity",
    purchasePrice: "Purchase Price",
    b2cSalesPrice: "B2C Sales Price",
    salesPrice: "Sales Price",
    competitorPrice: "Competitor Price",
    barcodeString: "Barcode",
    quantity: "Quantity",
    cbm: "CBM",
    isB2BProduct: "Sold to Businesses (B2B)",
    isB2CProduct: "Sold to Consumers (B2C)",
    packageDimensions: "Package Dimensions",
    caseDimensions: "Case Dimensions",
    images: "Product Photos",
    quantityInWarehouseLocation: "Warehouse Stock",
    isDeleted: "Deleted",
    // Container
    containerProducts: "Container Products",
    containerNumber: "Container Number",
    containerName: "Container Name",
    paidAmount: "Amount Paid",
    shippingCost: "Shipping Cost",
    arrivalDate: "Arrival Date",
    status: "Status",
  };

  const CURRENCY_FIELDS = new Set([
    "shippingCharge", "payableAdjustment", "openBalance", "orderAmount",
    "discountGiven", "totalPayable", "profitAmount", "paymentAmountReceived",
    "purchasePrice", "b2cSalesPrice", "salesPrice", "competitorPrice",
    "creditAmount", "paidAmount", "shippingCost", "price",
  ]);
  const PERCENT_FIELDS = new Set(["profitPercentage"]);
  const DATE_FIELDS = new Set(["date", "shippingDate", "paymentDueDate", "arrivalDate"]);
  const BOOLEAN_FIELDS = new Set([
    "isReturnRequested", "isDeleted", "isB2BProduct", "isB2CProduct", "restockedToInventory",
  ]);

  // Turn `camelCaseFieldName` into "Camel Case Field Name" as a fallback for
  // any field not explicitly listed above, so nothing ever renders as a raw key.
  const humanizeFieldName = (field: string): string => {
    if (FIELD_LABELS[field]) return FIELD_LABELS[field];
    const spaced = field
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/^./, (c) => c.toUpperCase());
    return spaced;
  };

  const formatMoney = (n: any) => `$${Number(n || 0).toFixed(2)}`;

  const formatDateShort = (value: any) => {
    const d = new Date(value);
    if (isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Generic fallback for any object/array shape we don't have a bespoke
  // renderer for — readable "Label: value" lines instead of raw JSON.
  const renderGenericObject = (value: Record<string, any>) => (
    <div className="space-y-0.5">
      {Object.entries(value)
        .filter(([k]) => !/id$/i.test(k))
        .map(([k, v]) => (
          <div key={k} className="text-xs text-slate-700">
            <span className="text-slate-500">{humanizeFieldName(k)}:</span>{" "}
            {v === null || v === undefined || v === "" ? "—" : String(v)}
          </div>
        ))}
    </div>
  );

  const formatLogValue = (field: string, value: any): React.ReactNode => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-slate-400 italic">Not set</span>;
    }

    // Products changed on an order/container — one card per line item.
    if ((field === "products" || field === "containerProducts") && Array.isArray(value)) {
      if (value.length === 0) return <span className="text-slate-400 italic">None</span>;
      return (
        <div className="space-y-2 mt-1">
          {value.map((item, idx) => (
            <div key={idx} className="text-sm p-2 rounded border bg-white/60 border-inherit">
              <div className="font-medium">
                {item?.productName || item?.category || "Unknown Product"}
              </div>
              <div className="text-xs text-slate-600">
                {field === "containerProducts"
                  ? `Item: ${item?.itemNumber || "N/A"} • Qty: ${item?.quantity || 0}${
                      // Defense-in-depth: hide cost data from non-admin/manager
                      // even though /logs is admin/manager-only at the route
                      // level — the route gate runs in useEffect and would
                      // otherwise flash sensitive numbers for one tick.
                      isAdminOrManager ? ` • Price: ${formatMoney(item?.purchasePrice)}` : ""
                    }`
                  : `Qty: ${item?.quantity || 0} • Price: ${formatMoney(item?.price)}${item?.discount ? ` • Discount: ${formatMoney(item?.discount)}` : ""}${item?.note ? ` • Note: "${item.note}"` : ""}`}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Returned-items summary from the credit/return flow.
    if (field === "returnedProducts" && Array.isArray(value)) {
      if (value.length === 0) return <span className="text-slate-400 italic">None</span>;
      return (
        <div className="space-y-2 mt-1">
          {value.map((item, idx) => (
            <div key={idx} className="text-sm p-2 rounded border bg-white/60 border-inherit">
              <div className="font-medium">{item?.productName || "Unknown Product"}</div>
              <div className="text-xs text-slate-600">
                Returned Qty: {item?.returnedQuantity ?? 0}
                {item?.restockedToInventory ? " • Restocked to inventory" : ""}
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Photo/signature fields — show a count/confirmation, never raw URLs.
    if ((field === "deliveryImages" || field === "returnImages" || field === "images") && Array.isArray(value)) {
      if (value.length === 0) return <span className="text-slate-400 italic">None</span>;
      return <span>{value.length} photo{value.length !== 1 ? "s" : ""}</span>;
    }
    if (field === "deliverySignImage" && typeof value === "string") {
      return <span>Signature captured</span>;
    }

    // Store credit given on this order.
    if (field === "creditInfo" && typeof value === "object") {
      return <span>{formatMoney((value as any)?.amount)}</span>;
    }

    // Per-warehouse stock counts.
    if (field === "quantityInWarehouseLocation" && typeof value === "object" && !Array.isArray(value)) {
      const entries = Object.entries(value as Record<string, any>);
      if (entries.length === 0) return <span className="text-slate-400 italic">No stock</span>;
      return (
        <div className="text-xs text-slate-700 space-y-0.5">
          {entries.map(([loc, qty]) => (
            <div key={loc}>{loc}: {String(qty)}</div>
          ))}
        </div>
      );
    }

    if (field === "categoryId" && typeof value === "object") {
      return <span>{(value as any)?.name || "—"}</span>;
    }

    if ((field === "packageDimensions" || field === "caseDimensions") && typeof value === "object") {
      const d = value as any;
      if (!d.length && !d.width && !d.height) return <span className="text-slate-400 italic">Not set</span>;
      return <span>{d.length ?? "?"} × {d.width ?? "?"} × {d.height ?? "?"} {d.unit || ""}</span>;
    }

    if (CURRENCY_FIELDS.has(field) && typeof value === "number") {
      // Purchase price is cost data — keep it hidden from non-admin/manager,
      // same rule as the containerProducts card above.
      if (field === "purchasePrice" && !isAdminOrManager) {
        return <span className="text-slate-400 italic">Hidden</span>;
      }
      return <span>{formatMoney(value)}</span>;
    }
    if (PERCENT_FIELDS.has(field) && typeof value === "number") return <span>{value.toFixed(1)}%</span>;
    if (DATE_FIELDS.has(field)) {
      const formatted = formatDateShort(value);
      if (formatted !== String(value)) return <span>{formatted}</span>;
    }
    if (BOOLEAN_FIELDS.has(field) || typeof value === "boolean") {
      return <span>{value ? "Yes" : "No"}</span>;
    }
    if (field.toLowerCase().includes("status")) {
      return <span className="capitalize">{String(value)}</span>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-slate-400 italic">None</span>;
      if (value.every((v) => typeof v !== "object")) return <span>{value.join(", ")}</span>;
      return (
        <div className="space-y-1">
          {value.map((item, idx) => (
            <div key={idx}>{renderGenericObject(item)}</div>
          ))}
        </div>
      );
    }

    if (typeof value === "object") {
      return renderGenericObject(value);
    }

    return <span>{String(value)}</span>;
  };

  const getModuleIcon = (module: LogModule) => {
    switch (module) {
      case "inventory": return <Package className="w-4 h-4" />;
      case "order": return <ShoppingCart className="w-4 h-4" />;
      case "container": return <Container className="w-4 h-4" />;
      case "customer": return <User className="w-4 h-4" />;
      case "payment": return <Clock className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getActionIcon = (action: LogAction) => {
    switch (action) {
      case "add": return <Plus className="w-3.5 h-3.5" />;
      case "update": return <Edit className="w-3.5 h-3.5" />;
      case "delete": return <Trash2 className="w-3.5 h-3.5" />;
      default: return <Edit className="w-3.5 h-3.5" />;
    }
  };

  const getActionBadge = (action: LogAction) => {
    const styles = {
      add: "bg-green-100 text-green-700 border-green-300",
      update: "bg-blue-100 text-blue-700 border-blue-300",
      delete: "bg-red-100 text-red-700 border-red-300",
    };
    return styles[action] || "bg-gray-100 text-gray-700 border-gray-300";
  };

  const getModuleBadge = (module: LogModule) => {
    const styles: Record<LogModule, string> = {
      inventory: "bg-purple-100 text-purple-700 border-purple-300",
      order: "bg-orange-100 text-orange-700 border-orange-300",
      container: "bg-teal-100 text-teal-700 border-teal-300",
      customer: "bg-indigo-100 text-indigo-700 border-indigo-300",
      payment: "bg-emerald-100 text-emerald-700 border-emerald-300",
      containerPo: "bg-cyan-100 text-cyan-700 border-cyan-300",
      supplierCreditMemo: "bg-amber-100 text-amber-700 border-amber-300",
    };
    return styles[module] || "bg-gray-100 text-gray-700 border-gray-300";
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Invalid date";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Invalid date";
    }
  };

  const tabs = [
    { id: "all", label: "All Logs", count: logCounts.all, color: "slate" },
    { id: "inventory", label: "Products", count: logCounts.inventory, icon: Package, color: "purple" },
    { id: "order", label: "Orders", count: logCounts.order, icon: ShoppingCart, color: "orange" },
    { id: "container", label: "Containers", count: logCounts.container, icon: Container, color: "teal" }
  ];

  const getTabColorClasses = (color: string, isActive: boolean) => {
    if (!isActive) return "bg-white text-slate-700 hover:bg-slate-50 border-slate-200";
    
    const colorMap: Record<string, string> = {
      slate: "bg-slate-800 text-white border-slate-800",
      purple: "bg-purple-600 text-white border-purple-600",
      orange: "bg-orange-600 text-white border-orange-600",
      teal: "bg-teal-600 text-white border-teal-600",
      indigo: "bg-indigo-600 text-white border-indigo-600",
      emerald: "bg-emerald-600 text-white border-emerald-600",
    };
    return colorMap[color] || "bg-slate-800 text-white border-slate-800";
  };

  if (isLoading) {
    return (
      <Loading
        title="Loading Logs"
        message="Fetching activity history"
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-red-600 font-semibold">Error loading logs</p>
            <p className="text-slate-600 mt-2">Please try again later</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2">
            Activity Logs
          </h1>
          <p className="text-slate-600">Track all system activities and changes</p>
        </div>

        {/* Tabs + Search */}
        <div className="mb-6">
          <div className="bg-white border border-slate-200 rounded-lg p-1 shadow-sm inline-flex flex-wrap gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    px-4 py-2 rounded-md font-medium transition-all duration-200
                    flex items-center gap-2 text-sm
                    ${getTabColorClasses(tab.color, isActive)}
                  `}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{tab.label}</span>
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by user, ID, or field name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 border-slate-300 focus:ring-2 focus:ring-slate-400"
            />
          </div>
        </div>

        {/* Log Entries */}
        <div className="space-y-4">
          {!filteredLogs || filteredLogs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">No logs found</h3>
                <p className="text-slate-500">
                  {searchQuery ? "Try adjusting your search" : "No activity recorded yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredLogs.map((log) => (
              <Card key={log?._id || Math.random()} className="border-slate-200 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getModuleBadge(log?.module || 'inventory')}`}>
                        {getModuleIcon(log?.module || 'inventory')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`${getActionBadge(log?.action || 'update')} border font-semibold`}>
                            {getActionIcon(log?.action || 'update')}
                            <span className="ml-1.5 capitalize">{log?.action || 'update'}</span>
                          </Badge>
                          <Badge className={`${getModuleBadge(log?.module || 'inventory')} border font-semibold capitalize`}>
                            {log?.module || 'inventory'}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">
                          Document: <span className="font-mono text-slate-800">{log?.documentId || 'N/A'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-700">{log?.performedBy || 'Unknown User'}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 justify-end mt-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(log?.createdAt || '')}
                      </p>
                    </div>
                  </div>

                  {/* Data Changes */}
                  {log?.dataChanges && Array.isArray(log.dataChanges) && log.dataChanges.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <p className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">
                        Changes Made
                      </p>
                      <div className="space-y-4">
                        {log.dataChanges.map((change, idx) => (
                          <div key={idx} className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-40">
                              <p className="text-sm font-semibold text-slate-700">
                                {humanizeFieldName(change?.field || 'unknown')}
                              </p>
                            </div>

                            <div className="flex-1 grid grid-cols-2 gap-4">
                              {/* Old Value */}
                              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                                <p className="text-xs text-red-600 font-semibold mb-1">Before</p>
                                {formatLogValue(change?.field || '', change?.oldValue)}
                              </div>

                              {/* New Value */}
                              <div className="bg-green-50 border border-green-500 rounded-md p-3">
                                <p className="text-xs text-green-600 font-semibold mb-1">After</p>
                                {formatLogValue(change?.field || '', change?.newValue)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Show message if no data changes */}
                  {(!log?.dataChanges || log.dataChanges.length === 0) && (
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center">
                      <p className="text-sm text-slate-500">No detailed changes recorded for this action</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default LogsPage;