"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Trash2,
  AlertCircle,
  Loader2,
  Search,
  X,
  PackagePlus,
  CheckCircle2,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCreateContainerPoMutation,
  useUpdateContainerPoMutation,
  ContainerPo,
  ContainerPoProduct,
} from "@/redux/api/containerPoApi";
import { useGetInventoryQuery, payload as InventoryItem } from "@/redux/api/inventory";
import ConvertToContainerModal from "@/Features/containerPo/ConvertToContainerModal";

export interface ContainerPoFormProps {
  initialData?: ContainerPo | null;
  mode: "create" | "edit";
}

// Local row shape — extends ContainerPoProduct with a client-side
// `checked` flag (for selecting which rows to send to the API). The
// `barcode` field is looked up from inventory by itemNumber and is
// included in the persisted payload so the PDF can render it.
interface FormProductRow extends ContainerPoProduct {
  barcode?: string;
  checked: boolean;
}

// per spec: "asking quantity value will be initially 0 for all prods"
// New rows start UNCHECKED so the user explicitly opts in to which
// products are included in the create/update call.
const emptyProduct = (): FormProductRow => ({
  itemNumber: "",
  itemName: "",
  askingQuantity: 0,
  barcode: "",
  checked: false,
});

// Compute suggested reorder qty = max(reorderPoint - current, 0).
function suggestedQty(p: InventoryItem): number {
  const target = p?.reorderPointOfQuantity ?? 0;
  const current = p?.quantity ?? 0;
  const diff = target - current;
  return diff > 0 ? diff : 0;
}

interface ProductRowProps {
  p: FormProductRow;
  index: number;
  productCatalog: InventoryItem[];
  onChange: (patch: Partial<FormProductRow>) => void;
  onRemove: () => void;
  canRemove: boolean;
  hasError: { itemNumber?: boolean; itemName?: boolean };
}

// One editable product row. A small derived-state memo for the suggested
// value avoids doing linear scans on every keystroke of a single row.
function ProductRow({
  p,
  index,
  productCatalog,
  onChange,
  onRemove,
  canRemove,
  hasError,
}: ProductRowProps) {
  // Suggested quantity — keyed on the entered itemNumber, looked up in the
  // already-fetched inventory so we don't fire another API call per row.
  const suggested = useMemo(() => {
    if (!p.itemNumber) return 0;
    const match = productCatalog.find(
      (x) =>
        (x.itemNumber || "").toLowerCase() === p.itemNumber.toLowerCase(),
    );
    return match ? suggestedQty(match) : 0;
  }, [p.itemNumber, productCatalog]);

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-12 gap-3 items-center border rounded-md p-3 ${
        p.checked ? "bg-white" : "bg-gray-50 opacity-70"
      }`}
    >
      {/* Checkbox */}
      <div className="md:col-span-1 flex items-center justify-center">
        <button
          type="button"
          onClick={() => onChange({ checked: !p.checked })}
          title={p.checked ? "Uncheck to skip" : "Check to include"}
          className="h-10 w-10 flex items-center justify-center rounded hover:bg-gray-100"
        >
          {p.checked ? (
            <CheckSquare className="h-5 w-5 text-red-700" />
          ) : (
            <Square className="h-5 w-5 text-gray-400" />
          )}
        </button>
      </div>

      {/* Barcode (read-only — looked up from inventory by itemNumber and
          persisted with the PO so the generated PDF can render it) */}
      <div className="md:col-span-2">
        <label className="text-xs font-medium block mb-1 leading-tight h-4">Barcode</label>
        <Input
          value={p.barcode || ""}
          readOnly
          placeholder="—"
          className="h-10 bg-gray-50 cursor-not-allowed font-mono"
        />
      </div>

      <div className="md:col-span-3">
        <label className="text-xs font-medium block mb-1 leading-tight h-4">
          Item Number <span className="text-red-600">*</span>
        </label>
        <Input
          value={p.itemNumber}
          onChange={(e) => onChange({ itemNumber: e.target.value })}
          placeholder="e.g. PRO-0001"
          disabled
          className="h-10 bg-gray-50 cursor-not-allowed"
        />
        {hasError.itemNumber && (
          <p className="text-xs text-red-600 mt-1 leading-tight">Required</p>
        )}
      </div>
      <div className="md:col-span-3">
        <label className="text-xs font-medium block mb-1 leading-tight h-4">
          Item Name <span className="text-red-600">*</span>
        </label>
        <Input
          value={p.itemName}
          onChange={(e) => onChange({ itemName: e.target.value })}
          placeholder="e.g. Almond Milk 1L"
          className="h-10"
        />
        {hasError.itemName && (
          <p className="text-xs text-red-600 mt-1 leading-tight">Required</p>
        )}
      </div>
      <div className="md:col-span-1">
        <label className="text-xs font-medium block mb-1 leading-tight h-4">Asking Qty</label>
        <Input
          type="number"
          min={0}
          value={String(p.askingQuantity ?? 0)}
          onChange={(e) =>
            onChange({
              askingQuantity: e.target.value === "" ? 0 : Number(e.target.value),
            })
          }
          className="h-10"
          onWheel={(e) => (e.target as HTMLInputElement).blur()}
        />
      </div>
      <div className="md:col-span-1">
        <label className="text-xs font-medium block mb-1 leading-tight h-4">
          Suggested Qty
        </label>
        <div className="h-10 px-2 border rounded-md flex items-center bg-gray-50 text-sm text-gray-700">
          {suggested > 0 ? (
            <span className="font-medium">{suggested}</span>
          ) : (
            <span className="text-gray-400">—</span>
          )}
        </div>
      </div>
      <div className="md:col-span-1 flex items-center justify-end">
        <button
          type="button"
          className="p-2 rounded hover:bg-red-50"
          onClick={onRemove}
          title="Remove"
          disabled={!canRemove}
        >
          <Trash2
            className={`h-4 w-4 ${canRemove ? "text-red-600" : "text-gray-300"}`}
          />
        </button>
      </div>
    </div>
  );
}

interface ProductPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: InventoryItem[];
  alreadyPickedItemNumbers: Set<string>;
  onSelect: (product: InventoryItem) => void;
}

// Search & multi-select modal. Stays open after a row is added so the
// user can rapidly add multiple items. Has an explicit Close button.
function ProductPicker({
  open,
  onOpenChange,
  catalog,
  alreadyPickedItemNumbers,
  onSelect,
}: ProductPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return catalog;
    const q = search.toLowerCase();
    return catalog.filter((p) => {
      if (p.isDeleted) return false;
      return (
        (p.name || "").toLowerCase().includes(q) ||
        (p.itemNumber || "").toLowerCase().includes(q) ||
        (p.barcodeString || "").toLowerCase().includes(q)
      );
    });
  }, [catalog, search]);

  // Reset search every time the modal opens so the user starts fresh.
  useEffect(() => {
    if (open) setSearch("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add products from inventory</DialogTitle>
          <DialogDescription>
            Search by barcode, item number, or product name. Select a row
            to append it to the PO. The modal stays open after each
            selection — use Close when you&apos;re done.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            autoFocus
            placeholder="Search barcode, item number, or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-9"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto border rounded-md divide-y">
          {filtered.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-sm">
              No matching products.
            </div>
          ) : (
            filtered.map((p) => {
              const picked = alreadyPickedItemNumbers.has(
                (p.itemNumber || "").toLowerCase(),
              );
              const suggested = suggestedQty(p);
              return (
                <button
                  key={p._id}
                  type="button"
                  disabled={picked}
                  onClick={() => {
                    onSelect(p);
                  }}
                  className={`w-full text-left p-3 flex justify-between items-start gap-3 ${
                    picked
                      ? "bg-gray-100 cursor-not-allowed opacity-60"
                      : "hover:bg-red-50"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-800 truncate">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {p.itemNumber} · barcode {p.barcodeString || "-"}
                    </p>
                  </div>
                  <div className="text-right text-xs flex-shrink-0">
                    <p
                      className={`font-medium ${
                        p.quantity < p.reorderPointOfQuantity
                          ? "text-red-600"
                          : "text-gray-700"
                      }`}
                    >
                      Stock: {p.quantity} / reorder {p.reorderPointOfQuantity}
                    </p>
                    {suggested > 0 ? (
                      <p className="text-gray-500 mt-0.5">
                        Suggested: {suggested}
                      </p>
                    ) : (
                      <p className="text-gray-400 mt-0.5">In stock</p>
                    )}
                    {picked && (
                      <p className="text-red-700 mt-0.5 font-medium">
                        Already added
                      </p>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ContainerPoForm({
  initialData,
  mode,
}: ContainerPoFormProps) {
  const router = useRouter();

  const [containerPOId, setContainerPOId] = useState(
    initialData?.containerPOId || "",
  );
  const [purchaseOrderFor, setPurchaseOrderFor] = useState(
    initialData?.purchaseOrderFor || "",
  );
  const [productList, setProductList] = useState<FormProductRow[]>(
    initialData?.productList && initialData.productList.length > 0
      ? initialData.productList.map((p) => ({
          itemNumber: p.itemNumber || "",
          itemName: p.itemName || "",
          askingQuantity: typeof p.askingQuantity === "number" ? p.askingQuantity : 0,
          barcode: "",
          checked: true,
        }))
      : [emptyProduct()],
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pickerOpen, setPickerOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [loadingLowStock, setLoadingLowStock] = useState(false);

  const { data: inventoryResponse } = useGetInventoryQuery();
  const allProducts: InventoryItem[] = useMemo(
    () => inventoryResponse?.data || [],
    [inventoryResponse?.data],
  );

  const [createContainerPo, { isLoading: isCreating }] =
    useCreateContainerPoMutation();
  const [updateContainerPo, { isLoading: isUpdating }] =
    useUpdateContainerPoMutation();

  useEffect(() => {
    if (mode === "edit" && initialData) {
      setContainerPOId(initialData.containerPOId || "");
      setPurchaseOrderFor(initialData.purchaseOrderFor || "");
      // Lookup barcodes by itemNumber for display
      const barcodeByItemNumber = new Map(
        allProducts.map((p) => [
          (p.itemNumber || "").toLowerCase(),
          p.barcodeString || "",
        ]),
      );
      setProductList(
        initialData.productList.length > 0
          ? initialData.productList.map((p) => ({
              itemNumber: p.itemNumber || "",
              itemName: p.itemName || "",
              askingQuantity:
                typeof p.askingQuantity === "number" ? p.askingQuantity : 0,
              barcode:
                barcodeByItemNumber.get(
                  (p.itemNumber || "").toLowerCase(),
                ) || "",
              checked: true,
            }))
          : [emptyProduct()],
      );
    }
  }, [mode, initialData, allProducts]);

  const setRow = (idx: number, patch: Partial<FormProductRow>) => {
    setProductList((prev) =>
      prev.map((p, i) => {
        if (i !== idx) return p;
        const next = { ...p, ...patch };
        // If the user is typing a fresh itemNumber, refresh the barcode
        // by looking it up in inventory for display purposes only.
        if (patch.itemNumber !== undefined) {
          const match = allProducts.find(
            (x) =>
              (x.itemNumber || "").toLowerCase() ===
              (patch.itemNumber || "").toLowerCase(),
          );
          next.barcode = match?.barcodeString || "";
        }
        return next;
      }),
    );
  };

  const addBlankRow = () => {
    setProductList((prev) => [...prev, emptyProduct()]);
  };

  const loadLowStockProducts = () => {
    setLoadingLowStock(true);
    try {
      const lowStock = allProducts.filter(
        (p) =>
          !p.isDeleted &&
          typeof p.quantity === "number" &&
          typeof p.reorderPointOfQuantity === "number" &&
          p.quantity < p.reorderPointOfQuantity,
      );

      if (lowStock.length === 0) {
        toast.error("No low-stock products found", { duration: 3000 });
        return;
      }

      // Append low-stock items to the existing list. Skip ones that are
      // already there by itemNumber. Each loaded row starts UNCHECKED —
      // the user must explicitly opt in to which low-stock items they
      // want included in the create/update call.
      setProductList((prev) => {
        const existing = new Set(
          prev.map((r) => (r.itemNumber || "").toLowerCase()),
        );
        const additions: FormProductRow[] = lowStock
          .filter(
            (p) => !existing.has((p.itemNumber || "").toLowerCase()),
          )
          .map((p) => ({
            itemNumber: p.itemNumber || "",
            itemName: p.name || "",
            askingQuantity: 0,
            barcode: p.barcodeString || "",
            checked: false,
          }));
        if (additions.length === 0) {
          toast("All low-stock items are already in the list", {
            icon: "⚠️",
            duration: 2000,
          });
          return prev;
        }
        return [...prev, ...additions];
      });

      toast.success(
        `Loaded ${lowStock.length} low-stock product${
          lowStock.length === 1 ? "" : "s"
        } — check the rows to include`,
        { duration: 3000 },
      );
    } finally {
      setLoadingLowStock(false);
    }
  };

  const removeRow = (idx: number) => {
    setProductList((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== idx),
    );
  };

  const appendProductFromPicker = (p: InventoryItem) => {
    setProductList((prev) => {
      // already there? skip
      const exists = prev.some(
        (row) =>
          (row.itemNumber || "").toLowerCase() ===
          (p.itemNumber || "").toLowerCase(),
      );
      if (exists) {
        toast("Already in the list", { icon: "⚠️", duration: 1500 });
        return prev;
      }
      return [
        ...prev,
        {
          itemNumber: p.itemNumber || "",
          itemName: p.name || "",
          askingQuantity: 0, // per spec: initial qty is 0
          barcode: p.barcodeString || "",
          checked: true,
        },
      ];
    });
    toast.success(`Added ${p.name}`, { duration: 1500 });
  };

  const alreadyPickedItemNumbers = useMemo(() => {
    return new Set(
      productList.map((p) => (p.itemNumber || "").toLowerCase()),
    );
  }, [productList]);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!purchaseOrderFor.trim()) {
      errs.purchaseOrderFor = "Required";
    }
    // Only validate CHECKED rows. Unchecked rows are excluded from the
    // submission entirely, so they don't need to be required.
    productList.forEach((p, idx) => {
      if (!p.checked) return;
      if (!p.itemNumber.trim()) errs[`productList.${idx}.itemNumber`] = "Required";
      if (!p.itemName.trim()) errs[`productList.${idx}.itemName`] = "Required";
    });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the errors before submitting", {
        duration: 3000,
      });
      return;
    }

    // Send ONLY the checked rows to the API.
    const cleaned = productList.filter(
      (p) => p.checked && p.itemNumber.trim() && p.itemName.trim(),
    );
    if (cleaned.length === 0) {
      toast.error("At least one checked product is required", {
        duration: 3000,
      });
      return;
    }

    const payload = {
      containerPOId: containerPOId.trim() || undefined,
      purchaseOrderFor: purchaseOrderFor.trim(),
      productList: cleaned.map((p) => ({
        itemNumber: p.itemNumber.trim(),
        itemName: p.itemName.trim(),
        askingQuantity:
          typeof p.askingQuantity === "number" ? Number(p.askingQuantity) : 0,
        barcode: (p.barcode || "").trim() || undefined,
      })),
    };

    try {
      if (mode === "create") {
        await createContainerPo(payload).unwrap();
        toast.success("Container PO created", { duration: 3000 });
      } else {
        if (!initialData?._id) {
          toast.error("Missing container PO id", { duration: 3000 });
          return;
        }
        await updateContainerPo({
          id: initialData._id,
          data: {
            containerPOId: payload.containerPOId,
            purchaseOrderFor: payload.purchaseOrderFor,
            productList: payload.productList,
          },
        }).unwrap();
        toast.success("Container PO updated", { duration: 3000 });
      }
      router.push("/containers/container-po");
    } catch (err: any) {
      const msg =
        err?.data?.errorSources?.[0]?.message ||
        err?.data?.message ||
        err?.message ||
        "Failed to save container PO";
      toast.error(msg, { duration: 4000 });
    }
  };

  return (
    <div className="p-5 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
          {mode === "create" ? "Create Container PO" : "Edit Container PO"}
        </h2>
        {mode === "edit" && initialData?.convertedToContainer && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-300">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Converted to Container
          </span>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-lg shadow space-y-6"
      >
        {/* Header fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-1">
              Container PO ID
            </label>
            <Input
              placeholder="Leave blank to auto-generate (e.g. CPO-0001)"
              value={containerPOId}
              onChange={(e) => setContainerPOId(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">
              Purchase Order For <span className="text-red-600">*</span>
            </label>
            <Input
              placeholder="e.g. Supplier A"
              value={purchaseOrderFor}
              onChange={(e) => setPurchaseOrderFor(e.target.value)}
            />
            {errors.purchaseOrderFor && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.purchaseOrderFor}
              </p>
            )}
          </div>
        </div>

        {/* Product list header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-700">Products</h3>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPickerOpen(true)}
              className="gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Add Product
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={loadLowStockProducts}
              disabled={loadingLowStock}
              className="gap-2"
            >
              {loadingLowStock ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlusCircle className="h-4 w-4" />
              )}
              Load low stock products
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={addBlankRow}
              className="gap-2"
            >
              <PlusCircle className="h-4 w-4" />
              Add blank row
            </Button>
          </div>
        </div>

        {/* Product rows */}
        <div className="space-y-3">
          {productList.map((p, idx) => (
            <ProductRow
              key={idx}
              p={p}
              index={idx}
              productCatalog={allProducts}
              onChange={(patch) => setRow(idx, patch)}
              onRemove={() => removeRow(idx)}
              canRemove={productList.length > 1}
              hasError={{
                itemNumber: !!errors[`productList.${idx}.itemNumber`],
                itemName: !!errors[`productList.${idx}.itemName`],
              }}
            />
          ))}
        </div>

        {/* Submit */}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/containers/container-po")}
          >
            Cancel
          </Button>
          {mode === "edit" && !initialData?.convertedToContainer && (
            <Button
              type="button"
              variant="outline"
              className="gap-2 text-black border-black hover:bg-black hover:text-white"
              onClick={() => setConvertOpen(true)}
            >
              <PackagePlus className="h-4 w-4" />
              Convert
            </Button>
          )}
          <Button
            type="submit"
            className="bg-red-700 hover:bg-red-600 text-white"
            disabled={isCreating || isUpdating}
          >
            {isCreating || isUpdating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === "create" ? (
              "Create Container PO"
            ) : (
              "Update Container PO"
            )}
          </Button>
        </div>
      </form>

      <ProductPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        catalog={allProducts.filter((p) => !p.isDeleted)}
        alreadyPickedItemNumbers={alreadyPickedItemNumbers}
        onSelect={appendProductFromPicker}
      />

      {mode === "edit" && initialData && (
        <ConvertToContainerModal
          open={convertOpen}
          onOpenChange={setConvertOpen}
          containerPo={initialData}
          onSuccess={() => {
            // After successful conversion, navigate back to the PO list
            // so the table is freshly loaded with the new
            // convertedToContainer = true flag, and the Convert button
            // is hidden the next time the user opens this PO.
            router.push("/containers/container-po");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
