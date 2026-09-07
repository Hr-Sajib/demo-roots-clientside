'use client';

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileDown, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import toast from "react-hot-toast";
import Loading from "@/redux/Shared/Loading";
import {
  useGetContainerPoByIdQuery,
  useLazyGenerateContainerPoPdfQuery,
} from "@/redux/api/containerPoApi";
import { useGetInventoryQuery, payload as InventoryItem } from "@/redux/api/inventory";
import AccessGate from "@/components/shared/AccessDenied";

function formatDate(iso?: string): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function ViewContainerPoBody(): React.ReactElement {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data, isLoading, error } = useGetContainerPoByIdQuery(id ?? "", {
    skip: !id,
  });

  const { data: inventoryResponse } = useGetInventoryQuery();
  const allInventory: InventoryItem[] = inventoryResponse?.data || [];

  const [triggerPdf, { isFetching: isPdfLoading }] =
    useLazyGenerateContainerPoPdfQuery();

  const [pdfConfirmOpen, setPdfConfirmOpen] = useState(false);

  // Build a lookup for barcode by itemNumber for display.
  const barcodeByItemNumber = useMemo(() => {
    const m = new Map<string, string>();
    allInventory.forEach((p) => {
      m.set((p.itemNumber || "").toLowerCase(), p.barcodeString || "");
    });
    return m;
  }, [allInventory]);

  if (isLoading || !id) {
    return <Loading title="Loading Container PO..." />;
  }

  if (error || !data?.data) {
    return (
      <div className="p-6 text-red-500">
        Failed to load Container PO. It may have been deleted.
      </div>
    );
  }

  const cp = data.data;

  const handleConfirmPdf = async () => {
    try {
      const blob = await triggerPdf(id).unwrap();
      const filename = `rootsBeyond-container-po-${cp.containerPOId}.pdf`;
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF ready", { duration: 2000 });
      setPdfConfirmOpen(false);
    } catch (err: any) {
      toast.error(
        err?.data?.message || err?.message || "Failed to generate PDF",
        { duration: 4000 },
      );
    }
  };

  return (
    <div className="p-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/containers/container-po")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
            {cp.containerPOId}
          </h2>
        </div>
        <Button
          className="bg-red-700 hover:bg-red-600 text-white gap-2"
          onClick={() => setPdfConfirmOpen(true)}
        >
          <FileDown className="h-4 w-4" /> Generate PDF
        </Button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-xs uppercase text-gray-500 mb-1">
            Purchase Order For
          </p>
          <p className="text-lg font-medium text-gray-800">
            {cp.purchaseOrderFor || "-"}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-xs uppercase text-gray-500 mb-1">Created At</p>
          <p className="text-lg font-medium text-gray-800">
            {formatDate(cp.createdAt)}
          </p>
          <p className="text-xs uppercase text-gray-500 mt-3 mb-1">
            Updated At
          </p>
          <p className="text-lg font-medium text-gray-800">
            {formatDate(cp.updatedAt)}
          </p>
        </div>
      </div>

      {/* Product list */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-5 border-b">
          <h3 className="text-lg font-semibold text-gray-800">
            Product List ({cp.productList?.length || 0})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="text-left py-3 px-5">#</th>
                <th className="text-left py-3 px-5">Barcode</th>
                <th className="text-left py-3 px-5">Item Number</th>
                <th className="text-left py-3 px-5">Item Name</th>
                <th className="text-right py-3 px-5">Asking Qty</th>
              </tr>
            </thead>
            <tbody>
              {(!cp.productList || cp.productList.length === 0) ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-6 text-gray-500"
                  >
                    No products.
                  </td>
                </tr>
              ) : (
                cp.productList.map((p, idx) => {
                  const barcode = barcodeByItemNumber.get(
                    (p.itemNumber || "").toLowerCase(),
                  );
                  return (
                    <tr key={idx} className="border-t">
                      <td className="py-3 px-5">{idx + 1}</td>
                      <td className="py-3 px-5 font-mono text-sm">
                        {barcode || <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-3 px-5">{p.itemNumber}</td>
                      <td className="py-3 px-5">{p.itemName}</td>
                      <td className="py-3 px-5 text-right">
                        {typeof p.askingQuantity === "number"
                          ? p.askingQuantity
                          : "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF confirm modal */}
      <Dialog open={pdfConfirmOpen} onOpenChange={setPdfConfirmOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Generate PDF?</DialogTitle>
            <DialogDescription>
              The Container PO PDF will open in a new tab.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPdfConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-700 hover:bg-red-600 text-white"
              onClick={handleConfirmPdf}
              disabled={isPdfLoading}
            >
              {isPdfLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Generate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ViewContainerPoPage(): React.ReactElement {
  return (
    <AccessGate allowance="containerSee" label="container purchase orders">
      <ViewContainerPoBody />
    </AccessGate>
  );
}