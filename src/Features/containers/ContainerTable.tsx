"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PlusCircle,
  Eye,
  Edit,
  Trash2,
  Upload,
  Download,
  Loader2,
  Search,
  X,
  AlertCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useGetContainersQuery,
  useImportContainerExcelMutation,
  Container,
} from "@/redux/api/containerApi";
import { useDeleteContainerMutation } from "@/redux/api/containerApi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import toast from "react-hot-toast";
import Loading from "@/redux/Shared/Loading";
import ContainerViewModal from "./ContainerViewModal";
import { BsFileSpreadsheetFill } from "react-icons/bs";
import { FaFileImport } from "react-icons/fa6";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserData {
  role: string;
}

export default function ContainerTable() {
  const [containerSearch, setContainerSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const router = useRouter();
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [containerToDelete, setContainerToDelete] = useState<string | null>(
    null,
  );

  // Import dialog states
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [containerName, setContainerName] = useState("");
  const [containerNumber, setContainerNumber] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [containerStatus, setContainerStatus] = useState("arrived");
  const [shippingCost, setShippingCost] = useState("");

  // Confirmation modal states
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showSampleExcelConfirm, setShowSampleExcelConfirm] = useState(false);

  const [importContainerExcel, { isLoading: isImporting }] =
    useImportContainerExcelMutation();
  const { data: response, isLoading, error, refetch } = useGetContainersQuery();
  const [deleteContainer] = useDeleteContainerMutation();

  const containers: Container[] = response?.data || [];

  // Permissions read from persisted redux store; same shape as the
  // legacy localStorage payload so the rest of the file is unchanged.
  const userData = useCurrentUser();

  const isAdmin = userData?.role?.toLowerCase() === "admin";

  // Calculate Purchase Cost, Paid Amount, and Payment Due
  const getContainerPurchaseCost = (container: Container): number => {
    return container.containerProducts.reduce((sum, p) => sum + p.purchasePrice, 0);
  };

  const getPaidAmount = (container: Container): number => {
    return container.paidAmount || 0;
  };

  const getPaymentDue = (container: Container): number | null => {
    const purchaseCost = getContainerPurchaseCost(container);
    const paidAmount = getPaidAmount(container);
    
    // If either purchase cost or paid amount is not available/valid
    if (purchaseCost === 0 && paidAmount === 0) {
      return null; // No data
    }
    
    return purchaseCost - paidAmount;
  };

  // Filter containers by container name/number OR product name
  const filteredData = useMemo(() => {
    return containers.filter((cont) => {
      const matchesContainer =
        !containerSearch ||
        cont.containerName
          .toLowerCase()
          .includes(containerSearch.toLowerCase()) ||
        cont.containerNumber
          .toLowerCase()
          .includes(containerSearch.toLowerCase());

      const matchesProduct =
        !productSearch ||
        cont.containerProducts.some(
          (prod) =>
            prod.itemNumber
              ?.toLowerCase()
              .includes(productSearch.toLowerCase()) ||
            prod.category?.toLowerCase().includes(productSearch.toLowerCase()),
        );

      return matchesContainer && matchesProduct;
    });
  }, [containers, containerSearch, productSearch]);

  if (isLoading)
    return (
      <Loading
        title="Loading containers..."
        message="Fetching all container data"
      />
    );
  if (error) return <div className="p-4 text-red-500">Error loading data.</div>;

  const handleDelete = async (id: string) => {
    try {
      await deleteContainer(id).unwrap();
      toast.success("Container deleted successfully", { duration: 3000 });
      setDeleteDialogOpen(false);
      setContainerToDelete(null);
      refetch();
    } catch (error) {
      console.error("Delete failed:", error);
      toast.error("Failed to delete container", { duration: 3000 });
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const isExcel =
        file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type === "application/vnd.ms-excel" ||
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls");

      if (isExcel) {
        setSelectedFile(file);
      } else {
        toast.error("Please select a valid Excel (.xlsx or .xls) file");
        event.target.value = "";
      }
    }
  };

  const resetImportForm = () => {
    setSelectedFile(null);
    setContainerName("");
    setContainerNumber("");
    setDeliveryDate("");
    setContainerStatus("arrived");
    setShippingCost("");
    const fileInput = document.getElementById(
      "excel-file-input",
    ) as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  const handleImportClick = () => {
    if (!selectedFile) {
      toast.error("Please select an Excel file");
      return;
    }
    if (!containerName.trim()) {
      toast.error("Please enter a container name");
      return;
    }
    if (!containerNumber.trim()) {
      toast.error("Please enter a container number");
      return;
    }
    setShowImportConfirm(true);
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("Please select an Excel file");
      return;
    }
    if (!containerName.trim()) {
      toast.error("Please enter a container name");
      return;
    }
    if (!containerNumber.trim()) {
      toast.error("Please enter a container number");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("containerName", containerName.trim());
    formData.append("containerNumber", containerNumber.trim());
    formData.append(
      "deliveryDate",
      deliveryDate || new Date().toISOString().split("T")[0],
    );
    formData.append("containerStatus", containerStatus);
    formData.append("shippingCost", shippingCost || "0");

    try {
      await importContainerExcel(formData).unwrap();
      toast.success("Container imported successfully!", { duration: 3000 });
      setImportDialogOpen(false);
      setShowImportConfirm(false);
      resetImportForm();
      refetch();
    } catch (err: any) {
      const errorMessage =
        err?.data?.message || err?.message || "Failed to import container";
      toast.error(errorMessage, { duration: 4000 });
    }
  };

  const handleDownloadSample = () => {
    setShowSampleExcelConfirm(false);
    try {
      const link = document.createElement("a");
      link.href = "/Roots Container Bulk Entry.xlsx";
      link.download = "Roots Container Bulk Entry.xlsx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Sample Excel downloaded!", { duration: 2000 });
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Failed to download sample file");
    }
  };

  const clearSearch = () => {
    setContainerSearch("");
    setProductSearch("");
  };

  const hasActiveFilters = containerSearch || productSearch;

  return (
    <div className="p-5">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">
        Containers
      </h2>

      {/* Search and Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-2xl">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              placeholder="Search by Container Name or Number..."
              value={containerSearch}
              onChange={(e) => setContainerSearch(e.target.value)}
              className="pl-10 pr-10 focus:ring-2 focus:ring-red-500"
            />
            {containerSearch && (
              <button
                onClick={() => setContainerSearch("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              placeholder="Search by Product Name or Item Number..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pl-10 pr-10 focus:ring-2 focus:ring-red-500"
            />
            {productSearch && (
              <button
                onClick={() => setProductSearch("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          {/* Add Container */}
          <Button
            className="bg-red-700 hover:bg-red-600 text-white gap-2"
            onClick={() => router.push("/containers/new")}
          >
            <PlusCircle className="h-4 w-4" /> Add Container
          </Button>

          <div className="flex gap-2">
            {/* Import Excel */}
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogTrigger asChild>
                <button className="text-white h-9 px-3 rounded-l-md bg-black/60 hover:bg-black/70 flex items-center gap-2">
                  <FaFileImport className="w-4 h-4" /> Import Excel
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Import Container from Excel</DialogTitle>
                  <DialogDescription>
                    Upload an Excel file with proper instructed format and fill
                    in the container details below.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Excel File <span className="text-red-600">*</span>
                    </label>
                    <input
                      id="excel-file-input"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="w-full p-2 border border-gray-300 rounded-md cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
                    />
                    {selectedFile && (
                      <p className="text-sm text-green-600">
                        Selected: {selectedFile.name}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Container Number <span className="text-red-600">*</span>
                    </label>
                    <Input
                      placeholder="e.g., C12345"
                      value={containerNumber}
                      onChange={(e) => setContainerNumber(e.target.value)}
                      className="focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Container Name <span className="text-red-600">*</span>
                    </label>
                    <Input
                      placeholder="e.g., Container India"
                      value={containerName}
                      onChange={(e) => setContainerName(e.target.value)}
                      className="focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Delivery Date</label>
                    <Input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      className="focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <select
                      value={containerStatus}
                      onChange={(e) => setContainerStatus(e.target.value)}
                      className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="arrived">Arrived</option>
                      <option value="onTheWay">On The Way</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Shipping Cost</label>
                    <Input
                      type="number"
                      placeholder="e.g., 200"
                      value={shippingCost}
                      onChange={(e) => setShippingCost(e.target.value)}
                      min="0"
                      step="0.01"
                      className="focus:ring-2 focus:ring-red-500"
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setImportDialogOpen(false);
                      resetImportForm();
                    }}
                    disabled={isImporting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImportClick}
                    disabled={
                      !selectedFile ||
                      !containerName.trim() ||
                      !containerNumber.trim() ||
                      isImporting
                    }
                    className="bg-red-700 hover:bg-red-600 text-white"
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Importing...
                      </>
                    ) : (
                      "Import Container"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Download Sample Button */}
            <div className="relative group">
              <button
                onClick={() => setShowSampleExcelConfirm(true)}
                className="text-white h-9 w-9 rounded-r-md bg-black/60 hover:bg-black/70 flex items-center justify-center transition-colors"
              >
                <BsFileSpreadsheetFill className="h-4" />
              </button>

              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Download Sample Excel
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Import Confirmation Modal */}
      {showImportConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <FaFileImport className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold">Confirm Import</h3>
            </div>
            <div className="space-y-3 mb-6">
              <p className="text-gray-600">
                Are you sure you want to import this container with the following details?
              </p>
              <div className="bg-gray-50 p-3 rounded-md space-y-1 text-sm">
                <p><strong>Container Number:</strong> {containerNumber}</p>
                <p><strong>Container Name:</strong> {containerName}</p>
                <p><strong>Status:</strong> {containerStatus}</p>
                <p><strong>File:</strong> {selectedFile?.name}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowImportConfirm(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-red-700 hover:bg-red-600 flex items-center gap-2"
                onClick={handleImport}
              >
                <FaFileImport className="w-4 h-4" />
                Confirm Import
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Sample Excel Download Confirmation Modal */}
      {showSampleExcelConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <BsFileSpreadsheetFill className="w-6 h-6 text-gray-500" />
              <h3 className="text-lg font-semibold">Download Sample Excel</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to download the sample Excel template for bulk container entry?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSampleExcelConfirm(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-gray-600 hover:bg-gray-700 flex items-center gap-2"
                onClick={handleDownloadSample}
              >
                <BsFileSpreadsheetFill className="w-4 h-4" />
                Download Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {hasActiveFilters && (
        <div className="mb-4 p-2 bg-gray-50 rounded text-sm">
          Showing {filteredData.length} of {containers.length} containers
        </div>
      )}

      {/* Table with red border and red headers */}
      <div className="overflow-x-auto border border-red-700/40 rounded-lg">
        <Table className="w-full min-w-max">
          <TableHeader>
            <TableRow className="bg-gray-200">
              {[
                "Container No",
                "Container Name",
                "Status",
                "Arrived Date",
                "Purchase Cost",
                "Shipping Cost",
                "Total Cost",
                "Payment Due",
                "Action",
              ].map((heading) => (
                <TableHead key={heading} className="p-3 whitespace-nowrap font-medium text-red-800">
                  {heading}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  {hasActiveFilters ? "No matching containers" : "No containers found"}
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((row) => {
                const purchaseCost = getContainerPurchaseCost(row);
                const paidAmount = getPaidAmount(row);
                const paymentDue = getPaymentDue(row);
                const isPaymentDueMissing = paymentDue === null;
                const isPaymentDueNegative = paymentDue !== null && paymentDue < 0;

                const totalCost = (purchaseCost + row.shippingCost).toFixed(2);

                return (
                  <TableRow key={row._id} className="border-t hover:bg-gray-50">
                    <TableCell className="p-3 whitespace-nowrap font-bold">
                      {row.containerNumber}
                    </TableCell>
                    <TableCell className="p-3 whitespace-nowrap font-bold hover:text-red-700 hover:underline cursor-pointer">
                      <button onClick={() => setSelectedContainer(row)}>
                        {row.containerName}
                      </button>
                    </TableCell>
                    <TableCell className="p-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          row.containerStatus === "arrived"
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {row.containerStatus === "arrived" ? "Arrived" : "On The Way"}
                      </span>
                    </TableCell>
                    <TableCell className="p-3 whitespace-nowrap">
                      {row.deliveryDate ? new Date(row.deliveryDate).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell className="p-3 whitespace-nowrap">
                      ${purchaseCost.toFixed(2)}
                    </TableCell>
                    <TableCell className="p-3 whitespace-nowrap">
                      ${row.shippingCost.toFixed(2)}
                    </TableCell>
                    <TableCell className="p-3 whitespace-nowrap font-semibold">
                      ${totalCost}
                    </TableCell>
                    <TableCell className="p-3 whitespace-nowrap">
                      {isPaymentDueMissing ? (
                        <div className="flex items-center gap-1 text-amber-600" title="Missing payment information">
                          <AlertCircle className="w-4 h-4" />
                          <span className="text-sm">!</span>
                        </div>
                      ) : isPaymentDueNegative ? (
                        <div className="flex items-center gap-1 text-green-600" title="Overpaid">
                          <span className="text-sm font-medium">
                            ${(paymentDue).toFixed(2)}
                          </span>
                        </div>
                      ) : paymentDue === 0 ? (
                        <span className="text-green-600 font-medium">$0.00</span>
                      ) : (
                        <span className="text-red-600 font-medium">
                          ${paymentDue.toFixed(2)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="p-3 whitespace-nowrap">
                      <div className="flex gap-4">
                        <Eye
                          className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-700 transition-colors"
                          onClick={() => setSelectedContainer(row)}
                        />
                        <Edit
                          className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-700 transition-colors"
                          onClick={() =>
                            router.push(`/containers/${row._id}/edit`)
                          }
                        />
                        {isAdmin && (
                          <AlertDialog
                            open={deleteDialogOpen && containerToDelete === row._id}
                            onOpenChange={(open) => {
                              setDeleteDialogOpen(open);
                              if (!open) setContainerToDelete(null);
                            }}
                          >
                            <AlertDialogTrigger asChild>
                              <Trash2
                                className="w-4 h-4 text-gray-500 cursor-pointer hover:text-red-700 transition-colors"
                                onClick={() => {
                                  setContainerToDelete(row._id);
                                  setDeleteDialogOpen(true);
                                }}
                              />
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirm Delete</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete container{" "}
                                  <span className="font-semibold">{row.containerNumber}</span>? 
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-700 hover:bg-red-600"
                                  onClick={() =>
                                    containerToDelete &&
                                    handleDelete(containerToDelete)
                                  }
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Modal */}
      {selectedContainer && (
        <ContainerViewModal
          container={selectedContainer}
          onClose={() => setSelectedContainer(null)}
        />
      )}
    </div>
  );
}