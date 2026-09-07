"use client";

import { useState } from "react";

import Loading from "@/redux/Shared/Loading";
import toast from "react-hot-toast";
import Link from "next/link";
import { Prospect } from "@/types";
import { ArrowUpDown, Edit, PlusCircle, Trash2, Loader2, X, Download } from "lucide-react";
import ProspectDetailsModal from "./ProspectDetailsModal";
import { Button } from "@/components/ui/button";
import { useConvertProspectMutation, useDeleteProspectMutation, useGetProspectsQuery, useSendEmailMutation, useUpdateProspectMutation } from "@/redux/api/prospects";
import { useGetAllUsersQuery } from "@/redux/api/admin";
import { apiFetch, triggerDownload } from "@/lib/apiFetch";
import { FaFileExcel } from "react-icons/fa6";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useAllowance } from "@/hooks/useAllowance";


export default function ProspectDetails() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [prospectToAssign, setProspectToAssign] = useState<Prospect | null>(null);
  const [newSalespersonId, setNewSalespersonId] = useState("");
  // role and userEmail now come from the persisted user slice instead
  // of being read once via a useEffect from cookies + localStorage.
  const currentUser = useCurrentUser();
  const role = currentUser?.role ?? "";
  const userEmail = currentUser?.email ?? "";
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | null>(null);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [prospectToDelete, setProspectToDelete] = useState<{ name: string; id: string } | null>(null);
  
  // Download states
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [convertProspect] = useConvertProspectMutation();
  const [sendEmail] = useSendEmailMutation();
  const [updateProspect, { isLoading: isUpdating }] = useUpdateProspectMutation();
  const [deleteProspect, { isLoading: isDeleting }] = useDeleteProspectMutation();

  const { data: salesUsersResponse, isLoading: isSalesUsersLoading } = useGetAllUsersQuery(undefined);
  const { data: prospectsResponse, error, isLoading, refetch } =
    useGetProspectsQuery(undefined, { refetchOnMountOrArgChange: true });

  const isAdminOrManager = role === "admin" || role === "manager";

  // Per-action gating from the centralized allowance hook.
  // Admin/manager are bypassed by the hook itself (returns `true`).
  const canAddProspect = useAllowance("prospectAdd");
  const canUpdateProspect = useAllowance("prospectUpdate");

  const handleDownloadExcel = async () => {
    setIsDownloading(true);
    setShowDownloadConfirm(false);

    try {
      const blob = await apiFetch("/prospect/export/excel");
      triggerDownload(blob, `prospects_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Prospects exported successfully");
    } catch {
      toast.error("Failed to export prospects");
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading)
    return (
      <div className="min-h-screen p-4 flex items-center justify-center">
        <Loading />
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen p-4 text-center text-red-600">
        Error loading prospects
      </div>
    );

  const prospects = prospectsResponse?.data || [];
  const salesUsers = salesUsersResponse?.data || [];

  // Helper: Get email from assignedSalesPerson (object or ID)
  const getAssignedEmail = (assigned: any): string | null => {
    if (!assigned) return null;
    if (typeof assigned === "object" && assigned.email) return assigned.email;
    if (typeof assigned === "string") {
      const user = salesUsers.find((u: any) => u._id === assigned);
      return user?.email || null;
    }
    return null;
  };

  // Search + Sort
  const searched = prospects.filter((p) =>
    p.storeName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sorted = [...searched].sort((a, b) => {
    const getDate = (p: Prospect) =>
      p.followUpActivities?.[0]?.activityDate
        ? new Date(p.followUpActivities[0].activityDate).getTime()
        : 0;
    const da = getDate(a), db = getDate(b);
    return sortOrder === "asc" ? da - db : sortOrder === "desc" ? db - da : 0;
  });

  const activeProspects = sorted.filter((p) => p.status !== "converted");

  // Modal handlers
  const openDetails = (prospect: Prospect) => setSelectedProspect(prospect);
  const closeDetails = () => setSelectedProspect(null);

  const openAssignModal = (prospect: Prospect) => {
    const assignedId = typeof prospect.assignedSalesPerson === "object"
      ? prospect.assignedSalesPerson?._id
      : prospect.assignedSalesPerson;
    setProspectToAssign(prospect);
    setNewSalespersonId(assignedId || "");
    setAssignModalOpen(true);
  };

  const closeAssignModal = () => {
    setAssignModalOpen(false);
    setProspectToAssign(null);
    setNewSalespersonId("");
  };

  const handleAssign = async () => {
    if (!prospectToAssign?._id || !newSalespersonId) {
      toast.error("Please select a salesperson");
      return;
    }

    try {
      await updateProspect({
        _id: prospectToAssign._id,
        assignedSalesPerson: newSalespersonId,
      }).unwrap();
      toast.success("Salesperson assigned!");
      refetch();
      closeAssignModal();
    } catch {
      toast.error("Failed to assign");
    }
  };

  const handleConvert = async (id: string) => {
    setConvertingId(id);
    try {
      await convertProspect(id).unwrap();
      toast.success("Converted successfully!");
      refetch();
    } catch (error) {
      toast.error("Failed to convert prospect");
      console.error(error);
    } finally {
      setConvertingId(null);
    }
  };

  const handleSendEmail = async (id: string) => {
    setSendingEmailId(id);
    try {
      await sendEmail(id).unwrap();
      toast.success("Email sent successfully!");
    } catch (error) {
      toast.error("Failed to send email");
      console.error(error);
    } finally {
      setSendingEmailId(null);
    }
  };

  const openDeleteModal = (name: string, id: string) => {
    setProspectToDelete({ name, id });
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setProspectToDelete(null);
  };

  const handleDelete = async () => {
    if (!prospectToDelete) return;
    
    setDeletingId(prospectToDelete.id);
    try {
      await deleteProspect(prospectToDelete.id).unwrap();
      toast.success("Deleted successfully");
      refetch();
      closeDeleteModal();
    } catch (error) {
      toast.error("Failed to delete prospect");
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-white p-4">
      <div className="mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-red-800 mb-6">
          Prospects
        </h2>

        {/* Search & Add */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8">
          <input
            type="text"
            placeholder="Search by Client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-100 p-3 text-sm border h-9 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-700"
          />
          <div className="flex gap-3">
            {isAdminOrManager && (
              <Button
                onClick={() => setShowDownloadConfirm(true)}
                disabled={isDownloading}
                className="bg-black hover:bg-gray-800 text-white gap-2"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <FaFileExcel className="w-5 h-5" />
                    Export Excel
                  </>
                )}
              </Button>
            )}
            {canAddProspect && (
              <Link href="/prospects/new">
                <Button className="bg-red-700 hover:bg-red-600 gap-2">
                  <PlusCircle className="h-4 w-4" /> Add Prospect
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Table with red border and red headers */}
        <div className="border border-red-700/40 rounded-lg overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-red-800">Client</th>
                  <th className="px-3 py-2 text-left font-semibold text-red-800">Email</th>
                  <th className="px-3 py-2 text-left font-semibold text-red-800">
                    <div className="flex items-center gap-1">
                      Next Follow-Up
                      <button
                        onClick={() =>
                          setSortOrder((p) =>
                            p === "asc" ? "desc" : p === "desc" ? null : "asc"
                          )
                        }
                        className="p-1 rounded hover:bg-gray-200"
                      >
                        <ArrowUpDown className="w-4 h-4 text-red-800" />
                      </button>
                    </div>
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-red-800">Quote</th>
                  <th className="px-3 py-2 text-left font-semibold text-red-800">Quote Mail</th>
                  <th className="px-3 py-2 text-left font-semibold text-red-800">Comp.</th>
                  <th className="px-3 py-2 text-left font-semibold text-red-800">Notes</th>
                  <th className="px-3 py-2 text-left font-semibold text-red-800">Convert</th>
                  <th className="px-3 py-2 text-left font-semibold text-red-800">Action</th>
                </tr>
              </thead>
              <tbody>
                {activeProspects.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-500">
                      {searchTerm ? "No match" : "No prospects"}
                    </td>
                  </tr>
                ) : (
                  activeProspects.map((p) => (
                    <tr key={p._id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <button
                          onClick={() => openDetails(p)}
                          className="font-bold hover:text-red-700 hover:underline"
                        >
                          {p.storeName}
                        </button>
                      </td>
                      <td className="p-3">{p.storePersonEmail || "—"}</td>
                      <td className="p-3">
                        {p.followUpActivities?.[0]?.activityDate || "—"}
                      </td>
                      <td className="p-3">
                        {p.quotedList.length > 0 ? (
                          <span className="text-orange-600 font-medium">
                            {p.quotedList.length} item(s)
                          </span>
                        ) : (
                          "Pending"
                        )}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleSendEmail(p._id)}
                          disabled={sendingEmailId === p._id}
                          className="bg-black text-white px-3 py-1.5 rounded text-xs hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-1 min-w-[70px] justify-center"
                        >
                          {sendingEmailId === p._id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            "Send"
                          )}
                        </button>
                      </td>
                      <td className="p-3">{p.competitorStatement ? "Yes" : "—"}</td>
                      <td className="p-3">{p.note ? "Yes" : "—"}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleConvert(p._id)}
                          disabled={convertingId === p._id}
                          className="bg-red-700 text-white px-3 py-1.5 rounded text-xs hover:bg-red-600 disabled:bg-red-400 disabled:cursor-not-allowed flex items-center gap-1 min-w-[70px] justify-center"
                        >
                          {convertingId === p._id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Converting...
                            </>
                          ) : (
                            "Convert"
                          )}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-5">
                          {canUpdateProspect && (
                            <Link href={`/prospects/${p._id}/edit`}>
                              <Edit className="w-4 h-4 text-gray-600 hover:text-gray-900" />
                            </Link>
                          )}

                          {(role === "admin") && (
                            <button
                              onClick={() => openDeleteModal(p.storeName, p._id)}
                              disabled={deletingId === p._id}
                            >
                              {deletingId === p._id ? (
                                <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4 text-red-600 hover:text-red-800" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Download Confirmation Modal - Red Theme */}
        {showDownloadConfirm && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <FaFileExcel className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Export Prospects</h3>
                </div>
                <button
                  onClick={() => setShowDownloadConfirm(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <p className="text-gray-700">
                  Are you sure you want to export all prospects data to Excel?
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  The exported file will include all prospect information including follow-up activities, quoted items, and contact details.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <Button
                  type="button"
                  onClick={() => setShowDownloadConfirm(false)}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleDownloadExcel}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
                  disabled={isDownloading}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <FaFileExcel className="w-4 h-4" />
                      Export Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modals */}
        {selectedProspect && (
          <ProspectDetailsModal prospect={selectedProspect} onClose={closeDetails} />
        )}

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && prospectToDelete && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Confirm Delete</h3>
                </div>
                <button
                  onClick={closeDeleteModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6">
                <p className="text-gray-700">
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-red-600">"{prospectToDelete.name}"</span>?
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This action cannot be undone. The prospect will be permanently removed from the system.
                </p>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
                <Button
                  type="button"
                  onClick={closeDeleteModal}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white"
                  disabled={deletingId === prospectToDelete.id}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white"
                  disabled={deletingId === prospectToDelete.id}
                >
                  {deletingId === prospectToDelete.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Deleting...
                    </>
                  ) : (
                    "Yes, Delete"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}