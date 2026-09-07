"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowUpDown,
  PlusCircle,
  Eye,
  Edit,
  Trash2,
  CloudCog,
} from "lucide-react";
import { FaFileExcel } from "react-icons/fa6";
import { useRouter } from "next/navigation";
import {
  useGetCustomersQuery,
  useDeleteCustomerMutation,
} from "@/redux/api/customers";
import Loading from "@/redux/Shared/Loading";
import { toast } from "react-hot-toast";
import { apiFetch, triggerDownload } from "@/lib/apiFetch";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAllowance } from "@/hooks/useAllowance";
import type { CurrentUser } from "@/redux/slices/userSlice";
import { Customer } from "@/types";
import {
  setCustomers,
  selectCustomers,
  selectCustomersLoading,
  selectCustomersError,
} from "@/redux/slices/customers";

/**
 * Public type alias kept for downstream consumers that still import
 * `UserData` from this module. New code should prefer `CurrentUser`
 * from the user slice directly.
 */
export type UserData = CurrentUser;

export default function CustomerTable() {
  const dispatch = useDispatch();
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDownloadingCustomers, setIsDownloadingCustomers] = useState(false);
  const [showDownloadCustomersConfirm, setShowDownloadCustomersConfirm] = useState(false);


  // RTK Query
  const { data: response, isLoading: queryLoading, error: queryError } = useGetCustomersQuery();


  // Redux Slice
  const customersFromSlice = useSelector(selectCustomers);
  const sliceLoading = useSelector(selectCustomersLoading);
  const sliceError = useSelector(selectCustomersError);

  const [deleteCustomer] = useDeleteCustomerMutation();

  // Sync RTK Query → Redux
  useEffect(() => {
    if (response?.data) {
      dispatch(setCustomers(response.data as Customer[]));
    }
  }, [response?.data, dispatch]);

  // User permissions — same shape as the old localStorage payload, but
  // now sourced from the persisted redux store.
  const userData = useCurrentUser();

  const isAdminOrManagerFlag =
    userData?.role?.toLowerCase() === "admin" ||
    userData?.role?.toLowerCase() === "manager";
  const userEmail = userData?.email ?? "";
  const userId = userData?._id ?? "";

  // Per-action gating via the centralized allowance hook.
  // Admin/manager are bypassed by the hook itself (returns `true`).
  const canAddCustomer = useAllowance("customerAdd");
  const canUpdateCustomer = useAllowance("customerUpdate");

  const showAddCustomer = canAddCustomer === true;
  const showUpdateCustomer = canUpdateCustomer === true;
  // Delete remains strict-admin (matches the original behavior).
  const showDeleteCustomer = userData?.role?.toLowerCase() === "admin";

  const customers: Customer[] = customersFromSlice;

  // Helper function to check if customer has missing required documents
  const hasMissingDocuments = (customer: Customer): boolean => {
    return !customer.creditApplication || !customer.salesTaxId || !customer.ownerLegalFrontImage;
  };

  // Role-based filtering
  const roleFilteredCustomers = isAdminOrManagerFlag
    ? customers
    : customers.filter((c) => c.addedBy === userEmail || c.assignedSalesPerson === userId);

  console.log("role filter customers: ",roleFilteredCustomers)
  
  // Sorting
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Customer | "";
    direction: "asc" | "desc" | null;
  }>({
    key: "",
    direction: null,
  });

  const columnToKeyMap: Partial<Record<string, keyof Customer>> = {
    "Open Balance": "openBalance",
    "Credit Balance": "creditBalance",
    "No of Order": "totalOrders",
    "Order Amount": "totalOrderAmount",
    "Auth Person Name": "storePersonName",
  };

  const handleSort = (heading: string) => {
    const key = columnToKeyMap[heading];
    if (!key) return;

    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: "desc" };
      if (prev.direction === "desc") return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: null };
      return { key, direction: "desc" };
    });
  };

  const sortedData = [...roleFilteredCustomers].sort((a, b) => {
    if (!sortConfig.direction || !sortConfig.key) return 0;

    const aVal = a[sortConfig.key] ?? 0;
    const bVal = b[sortConfig.key] ?? 0;

    let aCompare: string | number = typeof aVal === "number" ? aVal : String(aVal).toLowerCase();
    let bCompare: string | number = typeof bVal === "number" ? bVal : String(bVal).toLowerCase();

    if (aCompare < bCompare) return sortConfig.direction === "asc" ? -1 : 1;
    if (aCompare > bCompare) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  // Search filter
  const filteredData = sortedData.filter(
    (c) =>
      c.storeName?.toLowerCase().includes(search.toLowerCase()) ||
      c.storePersonName?.toLowerCase().includes(search.toLowerCase())
  );

  // Combined loading & error
  const isLoading = queryLoading || sliceLoading;
  const error = queryError || sliceError;

  if (isLoading) {
    return <Loading title="Loading Customer data...." message="All Customer data fetched successfully" />;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {JSON.stringify(error)}</div>;
  }

  // Delete handler
  const handleDeleteConfirm = async (id: string) => {
    try {
      await deleteCustomer(id).unwrap();
      toast.success("Customer deleted successfully");
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete customer");
    }
  };

  const handleViewDetails = (id: string) => {
    router.push(`/customers/${id}`);
  };

  const formatDate = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  
  const handleDownloadExcel = async () => {
    setIsDownloadingCustomers(true);
    try {
      const blob = await apiFetch(
        "/customer/all-customers-excel?download=true",
      );
      triggerDownload(blob, `Customers-${formatDate()}.xlsx`);
      toast.success("Customers Excel downloaded");
    } catch {
      toast.error("Failed to download Customers Excel");
    } finally {
      setIsDownloadingCustomers(false);
      setShowDownloadCustomersConfirm(false);
    }
  };



  return (
    <div className="p-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">
        Customers
      </h2>
      <div className="flex justify-between items-center mb-6">
        <Input
          placeholder="Search customer..."
          className="max-w-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex gap-3">


          {isAdminOrManagerFlag && (
            <Button
              className="bg-[#D9D9D9] hover:bg-gray-200 flex items-center text-gray-600 gap-2 px-4 py-2"
              onClick={() => setShowDownloadCustomersConfirm(true)}
              disabled={isDownloadingCustomers}
            >
              {isDownloadingCustomers ? (
                <CloudCog className="w-5 h-5 animate-spin" />
              ) : (
                <FaFileExcel className="w-5 h-5" />
              )}
              <span>All Customers</span>
            </Button>
          )}

          {showAddCustomer && (
            <Button
              className="bg-red-700 hover:bg-red-600 flex items-center gap-2"
              onClick={() => router.push("/customers/new")}
            >
              <PlusCircle className="h-4 w-4" />
              Add Customer
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-red-700/40 bg-white">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-gray-200 text-red-800 sticky top-0">
            <tr>
              {[
                "Store Name",
                "Auth Person Name",
                "Store Phone",
                "Cell Phone",
                "Store Email",
                "Open Balance",
                "Credit Balance",
                "No of Order",
                "Order Amount",
                "Customer Source",
                "Action",
              ].map((heading, i) => (
                <th key={i} className="p-3 font-medium whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    {heading}
                    {["Open Balance", "Credit Balance", "No of Order", "Order Amount", "Auth Person Name"].includes(heading) && (
                      <button onClick={() => handleSort(heading)} className="focus:outline-none">
                        <ArrowUpDown
                          className={`w-3 h-3 transition-colors ${
                            sortConfig.key === columnToKeyMap[heading]
                              ? "text-green-600"
                              : "text-gray-500"
                          } ${sortConfig.direction === "asc" ? "rotate-180" : ""}`}
                        />
                      </button>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-16 text-gray-500">
                  No customers found
                </td>
              </tr>
            ) : (
              filteredData.map((row) => {
                const hasCredit = (row.creditBalance || 0) > 0;
                const isMissingDocs = hasMissingDocuments(row);

                return (
                  <tr key={row._id} className="border-t hover:bg-gray-50">
                    <td
                      className={`p-3 whitespace-nowrap cursor-pointer hover:underline font-semibold ${
                        isMissingDocs ? "text-red-700" : "text-gray-900"
                      }`}
                      onClick={() => handleViewDetails(row._id)}
                    >
                      {row.storeName}
                      {hasCredit && <span className="text-yellow-600 ml-1">★</span>}
                    </td>
                    <td className="p-3 whitespace-nowrap">{row.storePersonName}</td>
                    <td className="p-3 whitespace-nowrap">{row.storePhone}</td>
                    <td className="p-3 whitespace-nowrap">{row.storePersonPhone}</td>
                    <td className="p-3 whitespace-nowrap">{row.storePersonEmail}</td>
                    <td className="p-3 whitespace-nowrap">${(row.openBalance || 0).toFixed(2)}</td>
                    <td className="p-3 whitespace-nowrap font-medium text-orange-700">
                      ${(row.creditBalance || 0).toFixed(2)}
                    </td>
                    <td className="p-3 whitespace-nowrap">{row.totalOrders || 0}</td>
                    <td className="p-3 whitespace-nowrap">${(row.totalOrderAmount || 0).toFixed(2)}</td>
                    <td className="p-3 whitespace-nowrap">
                      {row.isCustomerSourceProspect === true ? "Convert" : "Direct"}
                    </td>
                    <td className="p-3 whitespace-nowrap flex gap-5">
                      {showUpdateCustomer && (
                        <Edit
                          className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-700"
                          onClick={() => router.push(`/customers/${row._id}/edit`)}
                        />
                      )}
                      {showDeleteCustomer && (
                        <Trash2
                          className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-700"
                          onClick={() => setDeleteId(row._id)}
                        />
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Confirm Delete</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this customer?</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={() => handleDeleteConfirm(deleteId)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Download All Customers Confirmation Modal */}
      {showDownloadCustomersConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <FaFileExcel className="w-6 h-6" />
              <h3 className="text-lg font-semibold">Download All Customers</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to download the complete customers list as an Excel file?
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDownloadCustomersConfirm(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-black hover:bg-gray-700 flex items-center gap-2"
                onClick={handleDownloadExcel}
              >
                <FaFileExcel className="w-4 h-4" />
                Download
              </Button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}