"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Edit, Trash2, Search, X, Loader2, FileDown, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Loading from "@/redux/Shared/Loading";
import {
  useDeleteSupplierCreditMemoMutation,
  useGetAllSupplierCreditMemosQuery,
  useLazyGenerateSupplierCreditMemoPdfQuery,
  SupplierCreditMemo,
} from "@/redux/api/supplierCreditMemoApi";
import { useAllowance } from "@/hooks/useAllowance";

function formatDate(iso?: string): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return "-";
  }
}

export default function SupplierCreditMemoTable() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pdfConfirmOpen, setPdfConfirmOpen] = useState(false);
  const [pdfTargetId, setPdfTargetId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useGetAllSupplierCreditMemosQuery();
  const [deleteSupplierCreditMemo, { isLoading: isDeleting }] =
    useDeleteSupplierCreditMemoMutation();
  const [triggerPdf, { isFetching: isPdfLoading }] =
    useLazyGenerateSupplierCreditMemoPdfQuery();

  const memos: SupplierCreditMemo[] = data?.data || [];

  // Reuses the "container" allowance family — Supplier Credit Memo lives
  // alongside Containers/Container PO as a third tab, not a separate
  // permission domain.
  const canAddSupplierCreditMemo = useAllowance("containerAdd");
  const canUpdateSupplierCreditMemo = useAllowance("containerUpdate");
  const canDeleteSupplierCreditMemo = useAllowance("containerDelete");

  const filtered = useMemo(() => {
    if (!search.trim()) return memos;
    const q = search.toLowerCase();
    return memos.filter(
      (m) =>
        m.supplierCreditMemoId.toLowerCase().includes(q) ||
        m.supplierName.toLowerCase().includes(q),
    );
  }, [memos, search]);

  if (isLoading) {
    return (
      <Loading
        title="Loading supplier credit memos..."
        message="Fetching all supplier credit memos"
      />
    );
  }
  if (error) {
    return (
      <div className="p-4 text-red-500">Error loading supplier credit memos.</div>
    );
  }

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteSupplierCreditMemo(deleteId).unwrap();
      toast.success("Supplier credit memo deleted", { duration: 3000 });
      setDeleteDialogOpen(false);
      setDeleteId(null);
      refetch();
    } catch (err: any) {
      toast.error(
        err?.data?.message || err?.message || "Failed to delete",
        { duration: 4000 },
      );
    }
  };

  const handleConfirmPdf = async () => {
    if (!pdfTargetId) return;
    try {
      const blob = await triggerPdf(pdfTargetId).unwrap();
      const memo = memos.find((x) => x._id === pdfTargetId);
      const filename = `supplier-credit-memo-${memo?.supplierCreditMemoId || pdfTargetId}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      // Open in new tab — browser's built-in PDF viewer handles it.
      window.open(url, "_blank");
      // Also prepare a download link (in case the user wants to save).
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF ready", { duration: 2000 });
    } catch (err: any) {
      toast.error(
        err?.data?.message || err?.message || "Failed to generate PDF",
        { duration: 4000 },
      );
    } finally {
      setPdfConfirmOpen(false);
      setPdfTargetId(null);
    }
  };

  return (
    <div className="w-full">
      <div className="p-5">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">
        Supplier Credit Memos
      </h2>

      {/* Action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            placeholder="Search by memo ID or supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-10 focus:ring-2 focus:ring-gray-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {canAddSupplierCreditMemo && (
          <Button
            className="bg-gray-900 hover:bg-gray-800 text-white gap-2"
            onClick={() => router.push("/containers/supplier-credit-memo/new")}
          >
            <PlusCircle className="h-4 w-4" /> Create Supplier Credit Memo
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <Table>
          <TableHeader className="bg-gray-100">
            <TableRow>
              <TableHead>Memo ID</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Updated At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No supplier credit memos found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((memo) => (
                <TableRow key={memo._id}>
                  <TableCell>
                    <button
                      className="font-medium text-gray-900 hover:underline"
                      onClick={() =>
                        router.push(`/containers/supplier-credit-memo/${memo._id}/view`)
                      }
                    >
                      {memo.supplierCreditMemoId}
                    </button>
                  </TableCell>
                  <TableCell>{memo.supplierName}</TableCell>
                  <TableCell className="text-center">
                    {memo.items?.length || 0}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        memo.isStatusOpen
                          ? "bg-gray-100 text-gray-700 border-gray-300"
                          : "bg-green-100 text-green-800 border-green-300"
                      }`}
                    >
                      {memo.isStatusOpen ? "Open" : "Closed"}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(memo.createdAt)}</TableCell>
                  <TableCell>{formatDate(memo.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        title="View"
                        className="p-2 rounded hover:bg-gray-100"
                        onClick={() =>
                          router.push(`/containers/supplier-credit-memo/${memo._id}/view`)
                        }
                      >
                        <Eye className="h-4 w-4 text-gray-700" />
                      </button>
                      <button
                        title="Generate PDF"
                        className="p-2 rounded hover:bg-gray-100"
                        onClick={() => {
                          setPdfTargetId(memo._id);
                          setPdfConfirmOpen(true);
                        }}
                      >
                        <FileDown className="h-4 w-4 text-black" />
                      </button>
                      {canUpdateSupplierCreditMemo && (
                        <button
                          title="Edit"
                          className="p-2 rounded hover:bg-gray-100"
                          onClick={() =>
                            router.push(`/containers/supplier-credit-memo/${memo._id}/edit`)
                          }
                        >
                          <Edit className="h-4 w-4 text-gray-700" />
                        </button>
                      )}
                      {canDeleteSupplierCreditMemo && (
                        <button
                          title="Delete"
                          className="p-2 rounded hover:bg-gray-100"
                          onClick={() => {
                            setDeleteId(memo._id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-700" />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this Supplier Credit Memo?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The supplier credit memo will be soft-deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-700 hover:bg-red-600 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* PDF confirmation */}
      <Dialog open={pdfConfirmOpen} onOpenChange={setPdfConfirmOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Generate PDF?</DialogTitle>
            <DialogDescription>
              This will generate a Supplier Credit Memo PDF that opens in a new tab.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPdfConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-gray-900 hover:bg-gray-800 text-white"
              onClick={handleConfirmPdf}
              disabled={isPdfLoading}
            >
              {isPdfLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </div>
  );
}
