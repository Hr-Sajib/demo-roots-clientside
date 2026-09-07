"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  AlertCircle,
  PackagePlus,
  Truck,
  Calendar,
  DollarSign,
  FileText,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ContainerPo,
  useUpdateContainerPoMutation,
} from "@/redux/api/containerPoApi";
import {
  useAddContainerMutation,
  ContainerProduct,
} from "@/redux/api/containerApi";
import { useGetInventoryQuery, payload as InventoryItem } from "@/redux/api/inventory";

// ── Per-row form for a single product being prepared for the Container ──
interface ConvertProductRow {
  itemNumber: string;
  itemName: string;
  // ── fields the user must fill or confirm ──
  category: string;
  packetSize: string;
  quantity: number; // total units (used to compute perCaseCost)
  purchasePrice: number; // total purchase price for this product line
  cbm: number;
  salesPrice: number;
}

interface ConvertPayload extends ConvertProductRow {
  // Final payload field shape for container create API.
  perCaseCost: number;
}

const emptyConvertRow = (cp: ContainerPo["productList"][number]): ConvertProductRow => ({
  itemNumber: cp.itemNumber,
  itemName: cp.itemName,
  category: "",
  packetSize: "",
  quantity: typeof cp.askingQuantity === "number" ? cp.askingQuantity : 0,
  // Purchase price intentionally blank by default — the user must enter it
  // explicitly when converting. Pre-filling from inventory was confusing.
  purchasePrice: 0,
  cbm: 0,
  salesPrice: 0,
});

export interface ConvertToContainerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  containerPo: ContainerPo;
  onSuccess?: () => void;
}

export default function ConvertToContainerModal({
  open,
  onOpenChange,
  containerPo,
  onSuccess,
}: ConvertToContainerModalProps) {
  const { data: inventoryResponse } = useGetInventoryQuery();
  const allProducts: InventoryItem[] = useMemo(
    () => inventoryResponse?.data || [],
    [inventoryResponse?.data],
  );

  const [containerNumber, setContainerNumber] = useState("");
  const [containerName, setContainerName] = useState(containerPo.purchaseOrderFor || "");
  const [deliveryDate, setDeliveryDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [containerStatus, setContainerStatus] = useState<"onTheWay" | "arrived">(
    "onTheWay",
  );
  const [shippingCost, setShippingCost] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [rows, setRows] = useState<ConvertProductRow[]>([]);
  const [rowErrors, setRowErrors] = useState<Record<number, Record<string, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [addContainer] = useAddContainerMutation();
  const [updateContainerPo] = useUpdateContainerPoMutation();

  // Reset / prefill when the modal opens for a new PO.
  useEffect(() => {
    if (open) {
      setContainerName(containerPo.purchaseOrderFor || "");
      setRows(containerPo.productList.map(emptyConvertRow));
      setRowErrors({});
      setContainerNumber("");
      setDeliveryDate(new Date().toISOString().slice(0, 10));
      setContainerStatus("onTheWay");
      setShippingCost(0);
      setPaidAmount(0);
    }
  }, [open, containerPo]);

  // Pre-fill NON-purchasePrice fields from inventory when rows mount.
  // Purchase price is intentionally left blank — user must enter it.
  useEffect(() => {
    if (!open) return;
    setRows((prev) =>
      prev.map((r) => {
        const match = allProducts.find(
          (p) =>
            (p.itemNumber || "").toLowerCase() === r.itemNumber.toLowerCase(),
        );
        if (!match) return r;
        return {
          ...r,
          category: r.category || (match as any).categoryId?.name || "",
          packetSize: r.packetSize || match.packetSize || "",
          cbm: r.cbm > 0 ? r.cbm : match.cbm || 0,
          // purchasePrice intentionally NOT prefilled.
          salesPrice:
            r.salesPrice > 0 ? r.salesPrice : match.salesPrice || 0,
        };
      }),
    );
  }, [open, allProducts]);

  const setRow = (idx: number, patch: Partial<ConvertProductRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const totalQuantity = useMemo(
    () => rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0),
    [rows],
  );

  const totalCBM = useMemo(
    () =>
      rows.reduce(
        (s, r) => s + (Number(r.cbm) || 0) * (Number(r.quantity) || 0),
        0,
      ),
    [rows],
  );

  const validate = (): boolean => {
    const errs: Record<number, Record<string, string>> = {};
    let ok = true;

    if (!containerNumber.trim()) {
      toast.error("Container number is required", { duration: 3000 });
      ok = false;
    }
    if (!containerName.trim()) {
      toast.error("Container name is required", { duration: 3000 });
      ok = false;
    }
    if (!deliveryDate.trim()) {
      toast.error("Delivery date is required", { duration: 3000 });
      ok = false;
    }
    if (!shippingCost || shippingCost <= 0) {
      toast.error("Shipping cost must be > 0", { duration: 3000 });
      ok = false;
    }

    rows.forEach((r, idx) => {
      const e: Record<string, string> = {};
      if (!r.category.trim()) e.category = "Required";
      if (!r.packetSize.trim()) e.packetSize = "Required";
      if (!r.quantity || r.quantity <= 0) e.quantity = "Must be > 0";
      if (!r.purchasePrice || r.purchasePrice <= 0)
        e.purchasePrice = "Must be > 0";
      if (r.cbm < 0) e.cbm = "Must be ≥ 0";
      if (Object.keys(e).length > 0) {
        errs[idx] = e;
        ok = false;
      }
    });
    setRowErrors(errs);
    return ok;
  };

  const handleConfirmConvert = async () => {
    if (!validate()) {
      toast.error("Please fix the errors before converting", {
        duration: 3000,
      });
      return;
    }

    // Build the container payload in the exact shape the Container
    // service expects. perCaseCost = purchasePrice / quantity.
    // perCaseShippingCost is NOT sent per-product — it's calculated by
    // the backend and saved at the container root level (the server
    // recomputes (shippingCost / totalQtyAcrossAllFinalProducts)).
    const containerProducts = rows.map<ConvertPayload>((r) => ({
      ...r,
      perCaseCost:
        r.quantity > 0 ? Number(r.purchasePrice) / Number(r.quantity) : 0,
    }));

    const containerPayload = {
      containerNumber: containerNumber.trim(),
      containerName: containerName.trim(),
      containerStatus,
      deliveryDate,
      shippingCost: Number(shippingCost),
      paidAmount: Number(paidAmount) || 0,
      containerDocuments: [] as string[],
      containerProducts: containerProducts.map((p) => ({
        category: p.category.trim(),
        itemNumber: p.itemNumber,
        itemName: p.itemName,
        packetSize: p.packetSize.trim(),
        // Cases (orderQuantityCase) intentionally omitted — the backend
        // falls back to `quantity` when this field is missing, which is
        // exactly what we want here. The Convert flow uses Qty as the
        // single source of truth.
        quantity: Number(p.quantity),
        purchasePrice: Number(p.purchasePrice),
        perCaseCost: Number(p.perCaseCost),
        salesPrice: Number(p.salesPrice) || 0,
        cbm: Number(p.cbm) || 0,
      })) as unknown as ContainerProduct[],
      totalCBM: Number(totalCBM.toFixed(3)),
      isDeleted: false,
    };

    setIsSubmitting(true);
    try {
      // 1. Create the container.
      const createdContainer = await addContainer(
        containerPayload as any,
      ).unwrap();

      const createdId = (createdContainer as any)?._id;

      // 2. Mark the PO as converted.
      try {
        await updateContainerPo({
          id: containerPo._id,
          data: {
            convertedToContainer: true,
            convertedContainerId: createdId,
          },
        }).unwrap();
      } catch (markErr: any) {
        console.error(
          "Failed to mark PO as converted (container was created):",
          markErr,
        );
        toast.error(
          `Container was created, but failed to mark PO as converted: ${
            markErr?.data?.message || markErr?.message
          }`,
          { duration: 5000 },
        );
      }

      toast.success("Container created from PO", { duration: 3000 });
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      const msg =
        err?.data?.message ||
        err?.data?.errorSources?.[0]?.message ||
        err?.message ||
        "Failed to convert PO to container";
      toast.error(msg, { duration: 4000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-7xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-red-700" />
            Convert PO to Container
          </DialogTitle>
          <DialogDescription>
            Fill in the missing fields below to create an actual Container
            from <b>{containerPo.containerPOId}</b>. Once converted, this
            PO will be marked as converted and cannot be converted again.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Basic info */}
          <section className="border rounded-md p-4 space-y-3 bg-gray-50">
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <Truck className="h-4 w-4" /> Container Basic Info
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium block mb-1">
                  Container Number <span className="text-red-600">*</span>
                </label>
                <Input
                  placeholder="e.g. CON-2026-01"
                  value={containerNumber}
                  onChange={(e) => setContainerNumber(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">
                  Container Name <span className="text-red-600">*</span>
                </label>
                <Input
                  placeholder="e.g. Roots Container 22"
                  value={containerName}
                  onChange={(e) => setContainerName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Delivery Date{" "}
                  <span className="text-red-600">*</span>
                </label>
                <Input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">
                  Status
                </label>
                <select
                  className="h-10 w-full border rounded-md px-3 text-sm bg-white"
                  value={containerStatus}
                  onChange={(e) =>
                    setContainerStatus(e.target.value as "onTheWay" | "arrived")
                  }
                >
                  <option value="onTheWay">On The Way</option>
                  <option value="arrived">Arrived</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Shipping Cost{" "}
                  <span className="text-red-600">*</span>
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={shippingCost}
                  onChange={(e) =>
                    setShippingCost(Number(e.target.value) || 0)
                  }
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Saved at the container root as perCaseShippingCost (spread
                  across all products' total quantity).
                </p>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1 flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> Paid Amount
                </label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={paidAmount}
                  onChange={(e) =>
                    setPaidAmount(Number(e.target.value) || 0)
                  }
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
              </div>
            </div>
          </section>

          {/* Per-product rows */}
          <section>
            <h3 className="font-semibold text-gray-800 text-sm mb-2">
              Products ({rows.length})
            </h3>
            <div className="space-y-3">
              {rows.map((r, idx) => (
                <div
                  key={idx}
                  className="border rounded-md p-3 grid grid-cols-1 md:grid-cols-12 gap-3"
                >
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium block mb-1">
                      Item
                    </label>
                    <div className="text-sm">
                      <div className="font-medium text-gray-800">
                        {r.itemName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {r.itemNumber}
                      </div>
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium block mb-1">
                      Category <span className="text-red-600">*</span>
                    </label>
                    <Input
                      value={r.category}
                      onChange={(e) =>
                        setRow(idx, { category: e.target.value })
                      }
                    />
                    {rowErrors[idx]?.category && (
                      <p className="text-xs text-red-600 mt-1">
                        {rowErrors[idx]?.category}
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium block mb-1">
                      Packet Size <span className="text-red-600">*</span>
                    </label>
                    <Input
                      value={r.packetSize}
                      onChange={(e) =>
                        setRow(idx, { packetSize: e.target.value })
                      }
                    />
                    {rowErrors[idx]?.packetSize && (
                      <p className="text-xs text-red-600 mt-1">
                        {rowErrors[idx]?.packetSize}
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-xs font-medium block mb-1">
                      Qty <span className="text-red-600">*</span>
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={r.quantity}
                      onChange={(e) =>
                        setRow(idx, {
                          quantity: Number(e.target.value) || 0,
                        })
                      }
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium block mb-1">
                      Purchase Price <span className="text-red-600">*</span>
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Enter purchase price"
                      value={r.purchasePrice === 0 ? "" : String(r.purchasePrice)}
                      onChange={(e) =>
                        setRow(idx, {
                          purchasePrice:
                            e.target.value === ""
                              ? 0
                              : Number(e.target.value),
                        })
                      }
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium block mb-1">
                      Sales Price
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={r.salesPrice === 0 ? "" : String(r.salesPrice)}
                      onChange={(e) =>
                        setRow(idx, {
                          salesPrice:
                            e.target.value === ""
                              ? 0
                              : Number(e.target.value),
                        })
                      }
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="text-xs font-medium block mb-1">
                      CBM
                    </label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={r.cbm}
                      onChange={(e) =>
                        setRow(idx, {
                          cbm: Number(e.target.value) || 0,
                        })
                      }
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    />
                  </div>
                  {Object.values(rowErrors[idx] || {}).some(Boolean) && (
                    <div className="md:col-span-12">
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Please fix the highlighted fields.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Summary */}
          <section className="border-t pt-3 text-xs text-gray-600 flex flex-wrap gap-4">
            <span>
              Total Quantity: <b>{totalQuantity}</b>
            </span>
            <span>
              Total CBM: <b>{Number(totalCBM.toFixed(3))}</b>
            </span>
            <span>
              Per-case Shipping Cost (auto):{" "}
              <b>
                {totalQuantity > 0 && shippingCost > 0
                  ? Number((shippingCost / totalQuantity).toFixed(2))
                  : 0}
              </b>
            </span>
          </section>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-red-700 hover:bg-red-600 text-white gap-2"
            onClick={handleConfirmConvert}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Convert to Container
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
