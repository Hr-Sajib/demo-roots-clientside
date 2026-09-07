"use client";
import { BsFileSpreadsheetFill } from "react-icons/bs";
import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { apiFetch, apiFetchWithHeaders, triggerDownload } from "@/lib/apiFetch";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  ArrowUpDown,
  Edit,
  PlusCircle,
  Trash2,
  Upload,
  Printer,
  ChevronDown,
  X,
  Loader2,
  Check,
  DollarSign,
} from "lucide-react";
import { FaFileExcel, FaFileImport } from "react-icons/fa6";
import { ImFilePdf } from "react-icons/im";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useGetInventoryQuery,
  useDeleteInventoryMutation,
  useUpdateInventoryMutation,
  payload,
  UpdateInventoryPayload,
} from "@/redux/api/inventory";
import { useImportProductExcelMutation } from "@/redux/api/inventory";
import { useRouter } from "next/navigation";
import Loading from "@/redux/Shared/Loading";
import BestLoding from "@/components/shared/FullScreenSpinner";
import ErrorState from "@/redux/Shared/ErrorState";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAllowance, isAdminOrManager } from "@/hooks/useAllowance";
import ProductFiltersModal from "./FilterModal";
import { useGetCategoriesQuery } from "@/redux/api/categories";
import type { Category } from "@/redux/api/categories";
import { toast, ToastContainer } from "react-toastify";
import ProductDeleteModal from "./ProductDeleteModal";
import ProductUpdateModal from "./ProductUpdateModal";
import ProductDetailsModal from "./ProductDetailsModal";

// Helper function to calculate days until expiry
const getDaysUntilExpiry = (expiryDate: string | undefined): number | null => {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export default function AllGetProducts() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isBestLoading, setIsBestLoading] = useState(false);
  const router = useRouter();

  // Confirmation modal states
  const [showPdfConfirm, setShowPdfConfirm] = useState(false);
  const [showPOTemplateConfirm, setShowPOTemplateConfirm] = useState(false);
  const [showInventoryReportConfirm, setShowInventoryReportConfirm] =
    useState(false);
  const [showSampleExcelConfirm, setShowSampleExcelConfirm] = useState(false);
  const [showPrinterDropdown, setShowPrinterDropdown] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // PDF category selection state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectAllCategories, setSelectAllCategories] = useState(true);

  // PDF price inclusion state
  const [includePrice, setIncludePrice] = useState<boolean>(true);

  // Ref for printer dropdown
  const printerDropdownRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isError, refetch } = useGetInventoryQuery();
  const [deleteInventory] = useDeleteInventoryMutation();
  const [updateInventory] = useUpdateInventoryMutation();
  const [importExcel] = useImportProductExcelMutation();

  // Fetch categories
  const { data: categoryData } = useGetCategoriesQuery();
  const categoriesData: Category[] = categoryData?.data ?? [];
  const products: payload[] = data?.data ?? [];

  const [activeFilters, setActiveFilters] = useState({
    categories: [] as string[],
    outOfStock: false,
    lowStock: false,
    isB2CProduct: false,
    noLocationSpecified: false,
    mismatchedQuantity: false,
    expiringIn30Days: false,
    expiringIn60Days: false,
    expiringIn90Days: false,
  });

  const [b2bB2cFilter, setB2bB2cFilter] = useState<
    "B2B only" | "B2C only" | "B2B and B2C"
  >("B2B and B2C");

  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: "desc" | "asc" | null;
  }>({
    key: null,
    direction: null,
  });

  // Source from redux (persisted). Avoid localStorage round-trips.
  const userData = useCurrentUser();
  const isAdminOrManagerFlag = isAdminOrManager(userData);
  const isAdmin = userData?.role?.toLowerCase() === "admin";
  const isSalesUser = userData?.role?.toLowerCase() === "salesuser";

  // Use the centralized allowance hook (returns true | false | undefined).
  // While the persisted user hydrates, the hook returns undefined and
  // we treat that as "no" to avoid flashing action buttons.
  const canSeeInventory = useAllowance("inventorySee");
  const canAddProduct = useAllowance("inventoryAdd");
  const canUpdateProduct = useAllowance("inventoryUpdate");
  const canDeleteProduct = useAllowance("inventoryDelete");

  const showProduct = canSeeInventory === true;
  const showAddProduct = canAddProduct === true;
  const showUpdateProduct = canUpdateProduct === true;
  // Delete remains strict-admin (matches the original behavior where
  // the inventory `*Delete` allowance was only ever granted to admins).
  const showDeleteProduct = isAdmin || canDeleteProduct === true;

  // Initialize selected categories when modal opens
  useEffect(() => {
    if (showPdfConfirm && categoriesData.length > 0) {
      const allCategoryNames = categoriesData.map((cat) => cat.name);
      setSelectedCategories(allCategoryNames);
      setSelectAllCategories(true);
      setIncludePrice(true);
    }
  }, [showPdfConfirm, categoriesData]);

  // Click outside handler for printer dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        printerDropdownRef.current &&
        !printerDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPrinterDropdown(false);
      }
    };

    if (showPrinterDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showPrinterDropdown]);

  const handleApplyFilters = (newFilters: {
    categories?: string[];
    outOfStock?: boolean;
    lowStock?: boolean;
    isB2CProduct?: boolean;
    noLocationSpecified?: boolean;
    mismatchedQuantity?: boolean;
    expiringIn30Days?: boolean;
    expiringIn60Days?: boolean;
    expiringIn90Days?: boolean;
  }) => {
    setActiveFilters({
      categories: newFilters.categories || [],
      outOfStock: newFilters.outOfStock || false,
      lowStock: newFilters.lowStock || false,
      isB2CProduct: newFilters.isB2CProduct || false,
      noLocationSpecified: newFilters.noLocationSpecified || false,
      mismatchedQuantity: newFilters.mismatchedQuantity || false,
      expiringIn30Days: newFilters.expiringIn30Days || false,
      expiringIn60Days: newFilters.expiringIn60Days || false,
      expiringIn90Days: newFilters.expiringIn90Days || false,
    });
    setIsModalOpen(false);
  };

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const searchLower = search.toLowerCase();

      const matchesSearch =
        search === "" ||
        product.name?.toLowerCase().includes(searchLower) ||
        product.itemNumber?.toLowerCase().includes(searchLower) ||
        product.barcodeString?.toLowerCase().includes(searchLower) ||
        (product.categoryId?.name?.toLowerCase() ?? "").includes(searchLower);

      const matchesCategory =
        activeFilters.categories.length === 0 ||
        (product.categoryId?.name &&
          activeFilters.categories.includes(product.categoryId.name));

      const matchesOutOfStock =
        !activeFilters.outOfStock || (product.quantity ?? 0) === 0;

      const matchesLowStock =
        !activeFilters.lowStock ||
        ((product.quantity ?? 0) < 50 && (product.quantity ?? 0) > 0);

      const hasB2B = product.isB2BProduct ?? true;
      const hasB2C = product.isB2CProduct ?? false;

      let matchesB2B_B2C = true;
      if (b2bB2cFilter === "B2B only") {
        matchesB2B_B2C = hasB2B && !hasB2C;
      } else if (b2bB2cFilter === "B2C only") {
        matchesB2B_B2C = hasB2C && !hasB2B;
      }

      const matchesB2CProduct = !activeFilters.isB2CProduct || hasB2C;

      // Sum the per-warehouse quantities stored in `quantityInWarehouseLocation`
      // (a Mongoose Map keyed by warehouse location name).
      const warehouseMap: Map<string, number> | undefined =
        product.quantityInWarehouseLocation;
      let warehouseTotal = 0;
      let hasWarehouseLocation = false;
      if (warehouseMap && typeof (warehouseMap as any).forEach === "function") {
        warehouseMap.forEach((qty) => {
          warehouseTotal += Number(qty) || 0;
          hasWarehouseLocation = true;
        });
      } else if (warehouseMap && typeof warehouseMap === "object") {
        const entries = Object.entries(
          warehouseMap as Record<string, number>,
        );
        if (entries.length > 0) hasWarehouseLocation = true;
        for (const [, qty] of entries) {
          warehouseTotal += Number(qty) || 0;
        }
      }
      // "No location specified" → product has no warehouse locations
      // recorded (empty/missing map).
      const matchesNoLocation =
        !activeFilters.noLocationSpecified || !hasWarehouseLocation;
      // "Mismatched quantity" → product has at least one warehouse
      // location but the sum of per-location quantities does not equal
      // the product's overall quantity.
      const matchesMismatchedQuantity =
        !activeFilters.mismatchedQuantity ||
        (hasWarehouseLocation && (product.quantity ?? 0) !== warehouseTotal);

      let matchesExpiry = true;
      const daysUntilExpiry = getDaysUntilExpiry(product.expiryDate);

      if (daysUntilExpiry !== null) {
        if (activeFilters.expiringIn30Days) {
          matchesExpiry = daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
        } else if (activeFilters.expiringIn60Days) {
          matchesExpiry = daysUntilExpiry >= 0 && daysUntilExpiry <= 60;
        } else if (activeFilters.expiringIn90Days) {
          matchesExpiry = daysUntilExpiry >= 0 && daysUntilExpiry <= 90;
        }
      } else if (
        activeFilters.expiringIn30Days ||
        activeFilters.expiringIn60Days ||
        activeFilters.expiringIn90Days
      ) {
        matchesExpiry = false;
      }

      return (
        matchesSearch &&
        matchesCategory &&
        matchesOutOfStock &&
        matchesLowStock &&
        matchesB2B_B2C &&
        matchesB2CProduct &&
        matchesNoLocation &&
        matchesMismatchedQuantity &&
        matchesExpiry
      );
    });
  }, [products, search, activeFilters, b2bB2cFilter]);

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortConfig.key) {
      let aValue: any;
      let bValue: any;
      switch (sortConfig.key) {
        case "Qty":
          aValue = a.quantity ?? 0;
          bValue = b.quantity ?? 0;
          break;
        case "Incoming Qty":
          aValue = (a as any).incomingQuantity ?? 0;
          bValue = (b as any).incomingQuantity ?? 0;
          break;
        case "Purchase Price":
          aValue = a.purchasePrice ?? 0;
          bValue = b.purchasePrice ?? 0;
          break;
        case "Sales Price":
        case "B2B Price":
          aValue = a.salesPrice ?? 0;
          bValue = b.salesPrice ?? 0;
          break;
        case "B2C Price":
          aValue = a.b2cSalesPrice ?? 0;
          bValue = b.b2cSalesPrice ?? 0;
          break;
        case "Profit":
          aValue =
            a.salesPrice && a.purchasePrice
              ? a.salesPrice - a.purchasePrice
              : 0;
          bValue =
            b.salesPrice && b.purchasePrice
              ? b.salesPrice - b.purchasePrice
              : 0;
          break;
        case "Profit %":
          aValue =
            a.purchasePrice && a.salesPrice
              ? ((a.salesPrice - a.purchasePrice) / a.purchasePrice) * 100
              : 0;
          bValue =
            b.purchasePrice && b.salesPrice
              ? ((b.salesPrice - b.purchasePrice) / b.purchasePrice) * 100
              : 0;
          break;
        case "Category":
          aValue = (a.categoryId?.name || "").toLowerCase();
          bValue = (b.categoryId?.name || "").toLowerCase();
          break;
        default:
          return 0;
      }
      if (sortConfig.direction === "asc") {
        if (sortConfig.key === "Category") {
          return aValue.localeCompare(bValue);
        }
        return aValue - bValue;
      } else if (sortConfig.direction === "desc") {
        if (sortConfig.key === "Category") {
          return bValue.localeCompare(aValue);
        }
        return bValue - aValue;
      }
    }
    return 0;
  });

  const calculateProfitPercentage = (
    purchasePrice: number,
    salesPrice: number,
  ) => {
    if (purchasePrice === 0) return "0.00";
    const profit = salesPrice - purchasePrice;
    return ((profit / purchasePrice) * 100).toFixed(2);
  };

  const handleDelete = async (_id: string) => {
    try {
      await deleteInventory(_id).unwrap();
      toast.success("Product deleted successfully!");
      refetch();
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast.error("Failed to delete product.");
    }
  };

  const handleUpdate = async (updatedProduct: payload) => {
    if (!updatedProduct._id) {
      toast.error("Product ID is missing.");
      return;
    }
    try {
      const payload: UpdateInventoryPayload = {
        _id: updatedProduct._id,
        name: updatedProduct.name,
        description: updatedProduct.description,
        packetSize: updatedProduct.packetSize,
        weight: updatedProduct.weight,
        weightUnit: updatedProduct.weightUnit,
        categoryId:
          typeof updatedProduct.categoryId === "object"
            ? updatedProduct.categoryId._id
            : (updatedProduct.categoryId ?? ""),
        reorderPointOfQuantity: updatedProduct.reorderPointOfQuantity,
        quantity: updatedProduct.quantity,
        // @ts-expect-error: warehouseLocation exists on the runtime payload
        // but is not yet modeled on the RTK Query `payload` type.
        warehouseLocation: updatedProduct.warehouseLocation,
        purchasePrice: updatedProduct.purchasePrice,
        salesPrice: updatedProduct.salesPrice,
        competitorPrice: updatedProduct.competitorPrice,
        barcodeString: updatedProduct.barcodeString,
        packageDimensions: updatedProduct.packageDimensions,
        caseDimensions: updatedProduct.caseDimensions,
      };
      // @ts-expect-error: UpdateInventoryPayload is richer than the API
      // signature declares; runtime accepts the extra fields.
      await updateInventory(payload).unwrap();
      toast.success("Product updated successfully!");
      refetch();
    } catch (error: any) {
      console.error("Update failed:", error);
      toast.error(
        `Failed to update: ${error?.data?.message || "Unexpected error"}`,
      );
    }
  };

  const handleCategoryToggle = (categoryName: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(categoryName)) {
        const newSelection = prev.filter((c) => c !== categoryName);
        setSelectAllCategories(newSelection.length === categoriesData.length);
        return newSelection;
      } else {
        const newSelection = [...prev, categoryName];
        setSelectAllCategories(newSelection.length === categoriesData.length);
        return newSelection;
      }
    });
  };

  const handleSelectAllToggle = () => {
    if (selectAllCategories) {
      setSelectedCategories([]);
      setSelectAllCategories(false);
    } else {
      setSelectedCategories(categoriesData.map((cat) => cat.name));
      setSelectAllCategories(true);
    }
  };

  const handleDownloadPDF = async () => {
    console.log("[PDF_DOWNLOAD] Function started");
    console.log("[PDF_DOWNLOAD] Initial states:", {
      isBestLoading,
      selectedCategories,
      selectAllCategories,
      includePrice,
    });

    setIsBestLoading(true);
    setShowPdfConfirm(false);

    // Authorization is now centralized in apiFetch; if the token is
    // missing it surfaces as an ApiFetchError with a clear toast.
    console.log("[PDF_DOWNLOAD] Starting product-catalog PDF flow");

    if (selectedCategories.length === 0) {
      console.error("[PDF_DOWNLOAD] ERROR: No categories selected", {
        selectedCategories,
      });
      toast.error("Please select at least one category to export");
      setIsBestLoading(false);
      return;
    }

    console.log("[PDF_DOWNLOAD] Selected categories:", {
      count: selectedCategories.length,
      categories: selectedCategories,
      selectAllCategories,
      includePrice,
    });

    let retryCount = 0;
    const maxRetries = 2;

    const attemptDownload = async (): Promise<boolean> => {
      const attemptStartTime = Date.now();
      console.log(
        `[PDF_DOWNLOAD] Attempt ${retryCount + 1} started at ${new Date().toISOString()}`,
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.error(
          `[PDF_DOWNLOAD] Attempt ${retryCount + 1} TIMEOUT after 30 seconds`,
        );
        controller.abort();
      }, 30000);

      try {
        const requestBody = {
          categories: selectedCategories,
          selectAll: selectAllCategories,
          includePrice: includePrice,
        };
        console.log(
          `[PDF_DOWNLOAD] Attempt ${retryCount + 1} Request body:`,
          JSON.stringify(requestBody, null, 2),
        );

        // apiFetch centralizes base URL + Authorization; we still need the
        // response headers to validate content-type before triggering the
        // browser download.
        const { blob, headers } = await apiFetchWithHeaders(
          "/payment/all-products-pdf",
          {
            method: "POST",
            json: requestBody,
            headers: { Accept: "application/pdf" },
            signal: controller.signal,
          },
        );

        clearTimeout(timeoutId);

        const responseTime = Date.now() - attemptStartTime;
        console.log(
          `[PDF_DOWNLOAD] Attempt ${retryCount + 1} Response received in ${responseTime}ms`,
        );

        const contentType = headers.get("content-type");
        console.log(
          `[PDF_DOWNLOAD] Attempt ${retryCount + 1} - Content-Type:`,
          contentType,
        );

        if (!contentType?.includes("application/pdf")) {
          console.error(
            `[PDF_DOWNLOAD] Attempt ${retryCount + 1} - Invalid content type, expected PDF`,
          );
          throw new Error("Invalid response format. Expected PDF file.");
        }

        console.log(
          `[PDF_DOWNLOAD] Attempt ${retryCount + 1} - Reading response blob...`,
        );
        console.log(
          `[PDF_DOWNLOAD] Attempt ${retryCount + 1} - Blob size: ${blob.size} bytes (${(blob.size / 1024).toFixed(2)} KB)`,
        );

        const priceText = includePrice ? "with-prices" : "without-prices";
        const filename = `products-catalog-${priceText}-${new Date().toLocaleDateString("en-CA")}.pdf`;

        console.log(
          `[PDF_DOWNLOAD] Attempt ${retryCount + 1} - Filename:`,
          filename,
        );

        triggerDownload(blob, filename);

        console.log(
          `[PDF_DOWNLOAD] Attempt ${retryCount + 1} - SUCCESS! Download completed`,
        );
        toast.success(
          `PDF downloaded with ${selectedCategories.length} categories (${includePrice ? "with" : "without"} prices)`,
        );
        return true;
      } catch (err: any) {
        clearTimeout(timeoutId);

        const attemptDuration = Date.now() - attemptStartTime;
        console.error(
          `[PDF_DOWNLOAD] Attempt ${retryCount + 1} FAILED after ${attemptDuration}ms`,
        );
        console.error(`[PDF_DOWNLOAD] Error details:`, {
          name: err.name,
          message: err.message,
          stack: err.stack,
        });

        if (err.name === "AbortError") {
          console.error(
            `[PDF_DOWNLOAD] Attempt ${retryCount + 1} - Request was aborted (timeout)`,
          );
          throw new Error("Request timeout. Please try again.");
        }
        throw err;
      }
    };

    try {
      console.log(
        `[PDF_DOWNLOAD] Starting download with max ${maxRetries + 1} attempts total`,
      );
      let success = false;

      while (retryCount <= maxRetries && !success) {
        try {
          console.log(
            `[PDF_DOWNLOAD] ATTEMPT ${retryCount + 1}/${maxRetries + 1}`,
          );

          if (retryCount > 0) {
            const waitTime = 1000 * retryCount;
            console.log(
              `[PDF_DOWNLOAD] Waiting ${waitTime}ms before retry ${retryCount + 1}...`,
            );
            toast.info(
              `Retrying... (Attempt ${retryCount + 1}/${maxRetries + 1})`,
            );
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }

          success = await attemptDownload();
          console.log(
            `[PDF_DOWNLOAD] Attempt ${retryCount + 1} returned success: ${success}`,
          );
          break;
        } catch (err: any) {
          retryCount++;
          console.error(`[PDF_DOWNLOAD] Attempt ${retryCount} failed:`, {
            error: err.message,
            retryCount,
            maxRetries,
            willRetry: retryCount <= maxRetries,
          });

          if (retryCount > maxRetries) {
            console.error(
              `[PDF_DOWNLOAD] All ${retryCount} attempts failed. Giving up.`,
            );
            throw err;
          }

          console.log(
            `[PDF_DOWNLOAD] Will retry (attempt ${retryCount + 1}/${maxRetries + 1})`,
          );
        }
      }
    } catch (err: any) {
      console.error("[PDF_DOWNLOAD] FATAL ERROR - All attempts failed:", {
        message: err.message,
        stack: err.stack,
      });

      let errorMessage = err.message || "Failed to download PDF";

      if (err.message?.includes("timeout")) {
        errorMessage =
          "Request timed out. The PDF might be too large. Please try again.";
      } else if (err.message?.includes("network")) {
        errorMessage = "Network error. Please check your connection.";
      } else if (err.message?.includes("Authentication")) {
        errorMessage =
          "Session expired. Please refresh the page and login again.";
      }

      toast.error(errorMessage);
    } finally {
      console.log(
        "[PDF_DOWNLOAD] Cleaning up - setting isBestLoading to false",
      );
      setIsBestLoading(false);
    }

    console.log("[PDF_DOWNLOAD] Function completed");
  };

  const handleDownloadPOTemplate = async () => {
    setIsBestLoading(true);
    setShowPOTemplateConfirm(false);
    try {
      const blob = await apiFetch("/order/po-template?download=true");
      triggerDownload(blob, "purchase_order_template.xlsx");
      toast.success("PO Template downloaded successfully");
    } catch {
      toast.error("Failed to download PO Template");
    } finally {
      setIsBestLoading(false);
    }
  };

  const handleDownloadInventoryReport = async () => {
    setIsBestLoading(true);
    setShowInventoryReportConfirm(false);
    try {
      const blob = await apiFetch("/order/products-data-xl?download=true");
      triggerDownload(blob, "inventory_report.xlsx");
      toast.success("Inventory Report downloaded successfully");
    } catch {
      toast.error("Failed to download Inventory Report");
    } finally {
      setIsBestLoading(false);
    }
  };

  const handleDownloadSampleExcel = () => {
    setShowSampleExcelConfirm(false);
    try {
      const link = document.createElement("a");
      link.href = "/Bulk Product Entry Sheet.xlsx";
      link.download = "Bulk Product Entry Sheet.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Sample Excel template downloaded");
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Failed to download sample file");
    }
  };

  const handleBulkImport = async () => {
    if (!selectedFile) {
      toast.error("Please select an Excel file first");
      return;
    }

    setIsImporting(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await importExcel(formData).unwrap();

      toast.info(
        `${response.data.success} products imported, ${response.data.failed} failed`,
      );

      if (response.data.errors?.length > 0) {
        response.data.errors.forEach((errMsg: string) => {
          toast.error(errMsg, {
            autoClose: 50000,
            icon: <AlertCircle className="h-5 w-5" />,
          });
        });
      }

      setSelectedFile(null);
      setIsImportModalOpen(false);
      refetch();
    } catch (err: any) {
      console.error("Bulk import failed:", err);
      const errorMsg = err?.data?.message || "Failed to import products";
      toast.error(errorMsg);

      if (err?.data?.errors?.length > 0) {
        err.data.errors.forEach((e: string) =>
          toast.error(e, { autoClose: 20000 }),
        );
      }
    } finally {
      setIsImporting(false);
    }
  };

  const requestSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        if (prev.direction === "desc") return { key, direction: "asc" };
        if (prev.direction === "asc") return { key, direction: null };
        return { key, direction: "desc" };
      }
      return { key, direction: "desc" };
    });
  };

  if (isLoading)
    return (
      <Loading
        title="All Product Loading..."
        message="All products fetched successfully"
      />
    );
  if (isError)
    return <ErrorState title="Loading error" message="Fetching error" />;

  return (
    <div className="p-5">
      <h2 className="text-2xl sm:text-3xl font-bold text-red-800 mb-6">
        Products
      </h2>
      <ToastContainer position="top-center" autoClose={3000} />
      {isBestLoading && <BestLoding />}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <Input
          placeholder="Search by name, barcode, SKU or category..."
          className="max-w-sm focus:ring-red-500 focus:border-red-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-3 items-center">
          <ProductFiltersModal
            trigger={
              <Button
                variant="outline"
                className="bg-gray-200 text-black hover:text-white hover:bg-gray-100 hover:text-black"
              >
                Filter
              </Button>
            }
            filterData={products}
            onApplyFilters={handleApplyFilters}
            currentFilters={{
              categories: activeFilters.categories,
              outOfStock: activeFilters.outOfStock,
              lowStock: activeFilters.lowStock,
              isB2CProduct: activeFilters.isB2CProduct,
              noLocationSpecified: activeFilters.noLocationSpecified,
              mismatchedQuantity: activeFilters.mismatchedQuantity,
              expiringIn30Days: activeFilters.expiringIn30Days,
              expiringIn60Days: activeFilters.expiringIn60Days,
              expiringIn90Days: activeFilters.expiringIn90Days,
            }}
            isSalesUser={isSalesUser}
          />

          {!isSalesUser && (
            <select
              value={b2bB2cFilter}
              onChange={(e) =>
                setB2bB2cFilter(
                  e.target.value as "B2B only" | "B2C only" | "B2B and B2C",
                )
              }
              className="border border-red-700 rounded-md px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-red-500"
            >
              <option value="B2B and B2C">B2B and B2C</option>
              <option value="B2B only">B2B only</option>
              <option value="B2C only">B2C only</option>
            </select>
          )}

          {showAddProduct && (
            <Button
              className="bg-red-700 cursor-pointer hover:bg-red-600 text-white gap-2"
              onClick={() => router.push("/inventory/new")}
            >
              <PlusCircle className="h-4 w-4" /> Add Product
            </Button>
          )}

          {showAddProduct && (
            <div className="flex gap-2">
              {/* Bulk Entry Button */}
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="text-white h-9 px-2 rounded-l-md bg-gray-700 hover:bg-gray-800 flex items-center gap-2 transition-colors"
              >
                <FaFileImport className="w-4 h-4" /> Bulk Entry
              </button>

              {/* Sample download button */}
              <div className="relative group">
                <button
                  onClick={() => setShowSampleExcelConfirm(true)}
                  className="text-white h-9 px-2 rounded-r-md bg-gray-700 hover:bg-gray-800 flex items-center gap-2 transition-colors"
                >
                  <BsFileSpreadsheetFill className="h-4" />
                </button>

                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  Download Sample Excel
                </div>
              </div>
            </div>
          )}

          {isAdmin && (
            <div className="relative" ref={printerDropdownRef}>
              <Button
                onClick={() => setShowPrinterDropdown(!showPrinterDropdown)}
                className="bg-gray-200 hover:bg-gray-300 flex items-center gap-2 text-gray-700"
              >
                <Printer className="w-5 h-5" />
                <ChevronDown className="w-4 h-4" />
              </Button>

              {showPrinterDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                  <button
                    onClick={() => {
                      setShowPrinterDropdown(false);
                      setShowPdfConfirm(true);
                    }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors"
                  >
                    <ImFilePdf className="w-5 h-5 text-red-600" />
                    <span className="text-gray-700">Download Products PDF</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowPrinterDropdown(false);
                      setShowPOTemplateConfirm(true);
                    }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors border-t border-gray-100"
                  >
                    <FaFileExcel className="w-5 h-5 text-green-600" />
                    <span className="text-gray-700">
                      Download PO Template XL
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      setShowPrinterDropdown(false);
                      setShowInventoryReportConfirm(true);
                    }}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-3 transition-colors border-t border-gray-100"
                  >
                    <FaFileExcel className="w-5 h-5 text-blue-600" />
                    <span className="text-gray-700">
                      Download Inventory Report
                    </span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bulk Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <FaFileImport className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Import Products from Excel
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Ensure proper template format
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setSelectedFile(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {!selectedFile ? (
                <label
                  htmlFor="dropzone-file"
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:border-red-500 hover:bg-red-50 transition-colors duration-200"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 px-4 text-center">
                    <Upload className="w-12 h-12 mb-4 text-gray-400" />
                    <p className="text-lg font-medium text-gray-700 mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-gray-500">
                      Supported formats: .xlsx, .xls (max 10MB recommended)
                    </p>
                  </div>
                  <Input
                    id="dropzone-file"
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (!file.name.match(/\.(xlsx|xls)$/i)) {
                          toast.error("Only .xlsx or .xls files are allowed");
                          return;
                        }
                        setSelectedFile(file);
                        toast.info(`Selected: ${file.name}`);
                      }
                    }}
                  />
                </label>
              ) : (
                <div className="flex flex-col items-center gap-4 p-6 bg-red-50 rounded-xl border border-red-200">
                  <div className="flex items-center gap-4 w-full max-w-md">
                    <div className="p-3 bg-red-100 rounded-lg">
                      <FaFileExcel className="w-8 h-8 text-red-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-gray-900 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-gray-600 hover:text-gray-900"
                    onClick={() => setSelectedFile(null)}
                  >
                    Change file
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <Button
                variant="outline"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setSelectedFile(null);
                }}
                className="border-gray-300 hover:bg-gray-100 text-gray-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkImport}
                disabled={isImporting || !selectedFile}
                className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  "Import"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Download Confirmation Modal with Category Selection and Price Toggle */}
      {showPdfConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <ImFilePdf className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Download Products PDF
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Select categories and options to include in the PDF
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPdfConfirm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Price Toggle Section */}
              <div className="mb-6 pb-4 border-b border-gray-200">
                <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-3 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    checked={includePrice}
                    onChange={(e) => setIncludePrice(e.target.checked)}
                    className="w-5 h-5 text-red-600 rounded border-gray-300 focus:ring-red-500"
                  />
                  <div className="flex items-center gap-2">
                    <DollarSign
                      className={`w-5 h-5 ${includePrice ? "text-green-600" : "text-gray-400"}`}
                    />
                    <span className="font-semibold text-gray-900">
                      Include Prices
                    </span>
                  </div>
                  <span className="text-sm text-gray-500 ml-auto">
                    {includePrice
                      ? "Prices will be shown in the PDF"
                      : "Prices will be hidden"}
                  </span>
                </label>
                {!includePrice && (
                  <p className="text-xs text-amber-600 mt-2 ml-8">
                    ⚠️ The "Sales Price" column will be hidden in the PDF
                  </p>
                )}
              </div>

              {/* Categories Selection Section */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <label className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    checked={selectAllCategories}
                    onChange={handleSelectAllToggle}
                    className="w-5 h-5 text-red-600 rounded border-gray-300 focus:ring-red-500"
                  />
                  <div className="flex items-center gap-2">
                    <Check
                      className={`w-4 h-4 ${selectAllCategories ? "text-red-600" : "text-gray-400"}`}
                    />
                    <span className="font-semibold text-gray-900">
                      Select All Categories
                    </span>
                  </div>
                  <span className="text-sm text-gray-500 ml-auto">
                    ({selectedCategories.length} / {categoriesData.length}{" "}
                    selected)
                  </span>
                </label>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-2 pr-2">
                {categoriesData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No categories found</p>
                  </div>
                ) : (
                  categoriesData.map((category) => (
                    <label
                      key={category._id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.name)}
                        onChange={() => handleCategoryToggle(category.name)}
                        className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500"
                      />
                      <div className="flex-1">
                        <span className="text-gray-800 font-medium group-hover:text-red-600 transition-colors">
                          {category.name}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">
                        <span className="bg-gray-100 px-2 py-1 rounded-full">
                          {
                            products.filter(
                              (p) => p.categoryId?.name === category.name,
                            ).length
                          }{" "}
                          products
                        </span>
                      </div>
                    </label>
                  ))
                )}
              </div>

              {selectedCategories.length === 0 && (
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Please select at least one category to generate the PDF
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setShowPdfConfirm(false)}
                className="border-gray-300 hover:bg-gray-100 text-gray-700"
              >
                Cancel
              </Button>
              <Button
                disabled={selectedCategories.length === 0}
                className="bg-red-600 hover:bg-red-700 flex items-center gap-2 text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={handleDownloadPDF}
              >
                <ImFilePdf className="w-4 h-4" />
                Generate PDF ({selectedCategories.length} categories
                {includePrice ? " with prices" : ""})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PO Template Download Confirmation Modal */}
      {showPOTemplateConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <FaFileExcel className="w-5 h-5 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Download PO Template
                </h3>
              </div>
              <button
                onClick={() => setShowPOTemplateConfirm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                Are you sure you want to download the Purchase Order template as
                an Excel file?
              </p>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setShowPOTemplateConfirm(false)}
                className="border-gray-300 hover:bg-gray-100 text-gray-700"
              >
                Cancel
              </Button>
              <Button
                className="bg-green-700 hover:bg-green-600 flex items-center gap-2 text-white"
                onClick={handleDownloadPOTemplate}
              >
                <FaFileExcel className="w-4 h-4" />
                Download Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Report Download Confirmation Modal */}
      {showInventoryReportConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <FaFileExcel className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Download Inventory Report
                </h3>
              </div>
              <button
                onClick={() => setShowInventoryReportConfirm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                Are you sure you want to download the detailed inventory report
                as an Excel file?
              </p>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setShowInventoryReportConfirm(false)}
                className="border-gray-300 hover:bg-gray-100 text-gray-700"
              >
                Cancel
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700 flex items-center gap-2 text-white"
                onClick={handleDownloadInventoryReport}
              >
                <FaFileExcel className="w-4 h-4" />
                Download Report
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sample Excel Download Confirmation Modal */}
      {showSampleExcelConfirm && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-full">
                  <BsFileSpreadsheetFill className="w-5 h-5 text-gray-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  Download Sample Excel
                </h3>
              </div>
              <button
                onClick={() => setShowSampleExcelConfirm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-gray-700">
                Are you sure you want to download the sample Excel template for
                bulk product entry?
              </p>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <Button
                variant="outline"
                onClick={() => setShowSampleExcelConfirm(false)}
                className="border-gray-300 hover:bg-gray-100 text-gray-700"
              >
                Cancel
              </Button>
              <Button
                className="bg-gray-600 hover:bg-gray-700 flex items-center gap-2 text-white"
                onClick={handleDownloadSampleExcel}
              >
                <BsFileSpreadsheetFill className="w-4 h-4" />
                Download Sample
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {(search ||
        activeFilters.categories.length > 0 ||
        activeFilters.outOfStock ||
        activeFilters.lowStock ||
        activeFilters.expiringIn30Days ||
        activeFilters.expiringIn60Days ||
        activeFilters.expiringIn90Days ||
        b2bB2cFilter !== "B2B and B2C" ||
        activeFilters.isB2CProduct ||
        activeFilters.noLocationSpecified ||
        activeFilters.mismatchedQuantity) && (
        <div className="mb-4 p-2 bg-gray-50 rounded text-sm text-gray-600">
          Showing {sortedProducts.length} of {products.length} products
          {activeFilters.categories.length > 0 &&
            ` (Categories: ${activeFilters.categories.length} selected)`}
        </div>
      )}

      {/* Table */}
      {showProduct && (
        <div className="overflow-x-auto border border-red-700/40 rounded-lg bg-white">
          <Table className="w-full min-w-max">
            <TableHeader>
              <TableRow className="bg-gray-200">
                {[
                  "Barcode",
                  "Product Name",
                  { label: "Category", sortable: true },
                  { label: "Qty", sortable: true },
                  { label: "Incoming Qty", sortable: true },
                  { label: "B2B Price", sortable: true },
                  ...(isSalesUser ? [] : [{ label: "B2C Price", sortable: true }]),
                  ...(isAdminOrManagerFlag
                    ? [
                        { label: "Purchase Price", sortable: true },
                        { label: "Profit", sortable: true },
                        { label: "Profit %", sortable: true },
                      ]
                    : []),
                  { label: "Competitor Price", sortable: false },
                  "Item No.",
                  "Action",
                ].map((heading, index) => {
                  const isSortable =
                    typeof heading === "object" && heading.sortable;
                  const label =
                    typeof heading === "object" ? heading.label : heading;
                  return (
                    <TableHead
                      key={index}
                      className="p-2 whitespace-nowrap font-medium text-left text-red-800"
                    >
                      <div className="flex items-center gap-1">
                        {label}
                        {isSortable && (
                          <ArrowUpDown
                            className="w-3 h-3 cursor-pointer text-red-800"
                            onClick={() => requestSort(label)}
                          />
                        )}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProducts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdminOrManagerFlag ? 12 : isSalesUser ? 8 : 9}
                    className="text-center py-8 text-gray-500"
                  >
                    {search ||
                    activeFilters.categories.length > 0 ||
                    activeFilters.outOfStock ||
                    activeFilters.lowStock ||
                    activeFilters.expiringIn30Days ||
                    activeFilters.expiringIn60Days ||
                    activeFilters.expiringIn90Days ||
                    b2bB2cFilter !== "B2B and B2C" ||
                    activeFilters.isB2CProduct ||
                    activeFilters.noLocationSpecified ||
                    activeFilters.mismatchedQuantity
                      ? "No matching products"
                      : "No products"}
                  </TableCell>
                </TableRow>
              ) : (
                sortedProducts.map((product) => (
                  <TableRow
                    key={product._id}
                    className="text-sm hover:bg-gray-50"
                  >
                    <TableCell className="font-medium text-gray-800">
                      {product?.barcodeString || ""}
                    </TableCell>
                    <TableCell className=" font-semibold cursor-pointer py-3">
                      <ProductDetailsModal
                        product={product}
                        trigger={
                          <button className="hover:text-red-800 hover:underline">
                            {product.name}
                          </button>
                        }
                      />
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {product.categoryId?.name || ""}
                    </TableCell>
                    <TableCell className="text-gray-800 font-medium">
                      {product.quantity?.toLocaleString() ?? ""}
                    </TableCell>
                    <TableCell className="text-center">
                      {(product as any).incomingQuantity > 0 ? (
                        <span className="text-green-600 font-medium">
                          +{(product as any).incomingQuantity.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-red-700 font-medium">
                      {product.salesPrice
                        ? `$${product.salesPrice.toFixed(2)}`
                        : ""}
                    </TableCell>
                    {!isSalesUser && (
                      <TableCell className="text-blue-700 font-medium">
                        {product.b2cSalesPrice
                          ? `$${product.b2cSalesPrice.toFixed(2)}`
                          : ""}
                      </TableCell>
                    )}
                    {isAdminOrManagerFlag && (
                      <>
                        <TableCell className="text-gray-700">
                          {product.purchasePrice
                            ? `$${product.purchasePrice.toFixed(2)}`
                            : ""}
                        </TableCell>
                        <TableCell className="text-green-700 font-medium">
                          {product.salesPrice && product.purchasePrice
                            ? `$${(product.salesPrice - product.purchasePrice).toFixed(2)}`
                            : ""}
                        </TableCell>
                        <TableCell className="text-blue-700">
                          {product.purchasePrice && product.salesPrice
                            ? `${calculateProfitPercentage(product.purchasePrice, product.salesPrice)}%`
                            : ""}
                        </TableCell>
                      </>
                    )}
                    <TableCell className="text-gray-700">
                      {product.competitorPrice
                        ? `$${product.competitorPrice.toFixed(2)}`
                        : ""}
                    </TableCell>
                    <TableCell className="font-medium text-gray-800">
                      {product?.itemNumber || ""}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex space-x-5">
                        {showUpdateProduct && (
                          <ProductUpdateModal
                            key={product._id}
                            product={product}
                            trigger={
                              <button>
                                <Edit className="w-4 h-4 text-gray-500 cursor-pointer hover:text-red-600 transition-colors" />
                              </button>
                            }
                            categories={categoriesData}
                          />
                        )}
                        {showDeleteProduct && (
                          <ProductDeleteModal
                            product={product}
                            onDelete={handleDelete}
                            trigger={
                              <button>
                                <Trash2 className="w-4 h-4 text-gray-500 cursor-pointer hover:text-red-600 transition-colors" />
                              </button>
                            }
                          />
                        )}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}