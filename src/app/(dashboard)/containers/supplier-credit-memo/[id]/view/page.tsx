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
  useGetSupplierCreditMemoByIdQuery,
  useLazyGenerateSupplierCreditMemoPdfQuery,
} from "@/redux/api/supplierCreditMemoApi";
import { useGetProductsQuery } from "@/redux/api/product";
import { Product } from "@/types";
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

function ViewSupplierCreditMemoBody(): React.ReactElement {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const { data, isLoading, error } = useGetSupplierCreditMemoByIdQuery(id ?? "", {
    skip: !id,
  });

  const { data: productsData } = useGetProductsQuery();
  const allProducts: Product[] = productsData?.data || [];

  const [triggerPdf, { isFetching: isPdfLoading }] =
    useLazyGenerateSupplierCreditMemoPdfQuery();

  const [pdfConfirmOpen, setPdfConfirmOpen] = useState(false);

  // Build a lookup for product details by productId for display.
  const productById = useMemo(() => {
    const m = new Map<string, Product>();
    allProducts.forEach((p) => m.set(p._id, p));
    return m;
  }, [allProducts]);

  if (isLoading || !id) {
    return <Loading title="Loading Supplier Credit Memo..." />;
  }

  if (error || !data?.data) {
    return (
      <div className="p-6 text-red-500">
        Failed to load Supplier Credit Memo. It may have been deleted.
      </div>
    );
  }

  const memo = data.data;

  const handleConfirmPdf = async () => {
    try {
      const blob = await triggerPdf(id).unwrap();
      const filename = `supplier-credit-memo-${memo.supplierCreditMemoId}.pdf`;
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

  let grandTotal = 0;

  return (
    <div className="p-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/containers/supplier-credit-memo")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">
            {memo.supplierCreditMemoId}
          </h2>
        </div>
        <Button
          className="bg-gray-900 hover:bg-gray-800 text-white gap-2"
          onClick={() => setPdfConfirmOpen(true)}
        >
          <FileDown className="h-4 w-4" /> Generate PDF
        </Button>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-xs uppercase text-gray-500 mb-1">Supplier</p>
          <p className="text-lg font-medium text-gray-800">
            {memo.supplierName || "-"}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-xs uppercase text-gray-500 mb-1">Credit Given</p>
          <p className="text-lg font-medium text-gray-800">
            {typeof memo.creditGiven === "number"
              ? `$${memo.creditGiven.toFixed(2)}`
              : "-"}
          </p>
          <p className="text-xs uppercase text-gray-500 mt-3 mb-1">Status</p>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
              memo.isStatusOpen
                ? "bg-gray-100 text-gray-700 border-gray-300"
                : "bg-green-100 text-green-800 border-green-300"
            }`}
          >
            {memo.isStatusOpen ? "Open" : "Closed"}
          </span>
        </div>
        <div className="bg-white rounded-lg shadow p-5">
          <p className="text-xs uppercase text-gray-500 mb-1">Created At</p>
          <p className="text-lg font-medium text-gray-800">
            {formatDate(memo.createdAt)}
          </p>
          <p className="text-xs uppercase text-gray-500 mt-3 mb-1">
            Updated At
          </p>
          <p className="text-lg font-medium text-gray-800">
            {formatDate(memo.updatedAt)}
          </p>
        </div>
      </div>

      {/* Items list */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-5 border-b">
          <h3 className="text-lg font-semibold text-gray-800">
            Items ({memo.items?.length || 0})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="text-left py-3 px-5">#</th>
                <th className="text-left py-3 px-5">Barcode</th>
                <th className="text-left py-3 px-5">Product Name</th>
                <th className="text-right py-3 px-5">Purchase Price</th>
                <th className="text-right py-3 px-5">Qty</th>
                <th className="text-right py-3 px-5">Subtotal</th>
                <th className="text-left py-3 px-5">Note</th>
              </tr>
            </thead>
            <tbody>
              {(!memo.items || memo.items.length === 0) ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-gray-500">
                    No items.
                  </td>
                </tr>
              ) : (
                memo.items.map((item, idx) => {
                  const product = productById.get(item.productId);
                  const purchasePrice = product?.purchasePrice || 0;
                  const subtotal = purchasePrice * item.quantity;
                  grandTotal += subtotal;
                  return (
                    <tr key={idx} className="border-t">
                      <td className="py-3 px-5">{idx + 1}</td>
                      <td className="py-3 px-5 font-mono text-sm">
                        {product?.barcodeString || (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-5">
                        {product?.name || "Unknown Product"}
                      </td>
                      <td className="py-3 px-5 text-right">
                        ${purchasePrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-5 text-right">{item.quantity}</td>
                      <td className="py-3 px-5 text-right font-medium">
                        ${subtotal.toFixed(2)}
                      </td>
                      <td className="py-3 px-5">
                        {item.note || <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {memo.items && memo.items.length > 0 && (
              <tfoot>
                <tr className="border-t bg-gray-50">
                  <td colSpan={5} className="py-3 px-5 text-right font-semibold text-gray-700">
                    Total Credit Requested
                  </td>
                  <td className="py-3 px-5 text-right font-semibold text-gray-900">
                    ${grandTotal.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* PDF confirm modal */}
      <Dialog open={pdfConfirmOpen} onOpenChange={setPdfConfirmOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Generate PDF?</DialogTitle>
            <DialogDescription>
              The Supplier Credit Memo PDF will open in a new tab.
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
              className="bg-gray-900 hover:bg-gray-800 text-white"
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

export default function ViewSupplierCreditMemoPage(): React.ReactElement {
  return (
    <AccessGate allowance="containerSee" label="supplier credit memos">
      <ViewSupplierCreditMemoBody />
    </AccessGate>
  );
}
