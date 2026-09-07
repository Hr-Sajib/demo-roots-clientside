"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PlusCircle,
  Edit,
  Trash2,
  Search,
  X,
  Loader2,
  FileDown,
  Eye,
} from "lucide-react";
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
  useDeleteContainerPoMutation,
  useGetAllContainerPosQuery,
  useLazyGenerateContainerPoPdfQuery,
  ContainerPo,
} from "@/redux/api/containerPoApi";
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

export default function ContainerPoTable() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pdfConfirmOpen, setPdfConfirmOpen] = useState(false);
  const [pdfTargetId, setPdfTargetId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useGetAllContainerPosQuery();
  const [deleteContainerPo, { isLoading: isDeleting }] =
    useDeleteContainerPoMutation();
  const [triggerPdf, { isFetching: isPdfLoading }] =
    useLazyGenerateContainerPoPdfQuery();

  const containerPos: ContainerPo[] = data?.data || [];

  // Per-action gating — admin/manager are bypassed by the hook itself.
  const canAddContainerPo = useAllowance("containerAdd");
  const canUpdateContainerPo = useAllowance("containerUpdate");
  const canDeleteContainerPo = useAllowance("containerDelete");

  const filtered = useMemo(() => {
    if (!search.trim()) return containerPos;
    const q = search.toLowerCase();
    return containerPos.filter(
      (cp) =>
        cp.containerPOId.toLowerCase().includes(q) ||
        cp.purchaseOrderFor.toLowerCase().includes(q) ||
        (cp.productList || []).some(
          (p) =>
            p.itemNumber?.toLowerCase().includes(q) ||
            p.itemName?.toLowerCase().includes(q),
        ),
    );
  }, [containerPos, search]);

  if (isLoading) {
    return (
      <Loading
        title="Loading container POs..."
        message="Fetching all container purchase orders"
      />
    );
  }
  if (error) {
    return (
      <div className="p-4 text-red-500">Error loading container POs.</div>
    );
  }

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteContainerPo(deleteId).unwrap();
      toast.success("Container PO deleted", { duration: 3000 });
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
      const cp = containerPos.find((x) => x._id === pdfTargetId);
      const filename = `rootsBeyond-container-po-${cp?.containerPOId || pdfTargetId}.pdf`;
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
    <div className="p-5">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">
        Container Purchase Orders
      </h2>

      {/* Action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            placeholder="Search by PO ID, supplier, item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-10 focus:ring-2 focus:ring-red-500"
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

        {canAddContainerPo && (
          <Button
            className="bg-red-700 hover:bg-red-600 text-white gap-2"
            onClick={() => router.push("/containers/container-po/new")}
          >
            <PlusCircle className="h-4 w-4" /> Create Container PO
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-red-200">
        <Table>
          <TableHeader className="bg-gray-100">
            <TableRow>
              <TableHead>Container PO ID</TableHead>
              <TableHead>Purchase Order For</TableHead>
              <TableHead className="text-center">Products</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Updated At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-8 text-gray-500"
                >
                  No container POs found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((cp) => (
                <TableRow key={cp._id}>
                  <TableCell>
                    <button
                      className="font-medium text-red-700 hover:underline"
                      onClick={() =>
                        router.push(`/containers/container-po/${cp._id}/view`)
                      }
                    >
                      {cp.containerPOId}
                    </button>
                  </TableCell>
                  <TableCell>{cp.purchaseOrderFor}</TableCell>
                  <TableCell className="text-center">
                    {cp.productList?.length || 0}
                  </TableCell>
                  <TableCell className="text-center">
                    {cp.convertedToContainer ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                        Converted
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-300">
                        Open
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(cp.createdAt)}</TableCell>
                  <TableCell>{formatDate(cp.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        title="View"
                        className="p-2 rounded hover:bg-gray-100"
                        onClick={() =>
                          router.push(`/containers/container-po/${cp._id}/view`)
                        }
                      >
                        <Eye className="h-4 w-4 text-gray-700" />
                      </button>
                      <button
                        title="Generate PDF"
                        className="p-2 rounded hover:bg-gray-100"
                        onClick={() => {
                          setPdfTargetId(cp._id);
                          setPdfConfirmOpen(true);
                        }}
                      >
                        <FileDown className="h-4 w-4 text-black" />
                      </button>
                      {canUpdateContainerPo && (
                        <button
                          title="Edit"
                          className="p-2 rounded hover:bg-gray-100"
                          onClick={() =>
                            router.push(`/containers/container-po/${cp._id}/edit`)
                          }
                        >
                          <Edit className="h-4 w-4 text-green-700" />
                        </button>
                      )}
                      {canDeleteContainerPo && (
                        <button
                          title="Delete"
                          className="p-2 rounded hover:bg-gray-100"
                          onClick={() => {
                            setDeleteId(cp._id);
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
            <AlertDialogTitle>Delete this Container PO?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The Container PO will be soft-deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-700 hover:bg-red-600 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
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
              This will generate a Container PO PDF that opens in a new tab.
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