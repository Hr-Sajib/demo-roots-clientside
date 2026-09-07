"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowUpDown,
  PlusCircle,
  Eye,
  Edit,
  Trash2,
  Search,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Loading from "@/redux/Shared/Loading";
import { toast } from "react-hot-toast";
import Cookies from "js-cookie";
import { useGetAllUsersQuery, useDeleteUserMutation } from "@/redux/api/admin";
import UserDetailsModal from "@/components/user-management/UserDetailsModal";
import ConfirmationDialog from "@/components/user-management/ConfirmationModal";
import CreateUserModal from "@/components/user-management/CreateUserModal";
import UpdateUserModal from "@/components/user-management/UserUpdateModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function UserTable() {
  // All hooks must be called before any conditional returns
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedUserForUpdate, setSelectedUserForUpdate] = useState<any | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const itemsPerPage = 20;

  const { data: response, isLoading, error, refetch } = useGetAllUsersQuery();
  const [deleteUser] = useDeleteUserMutation();
  const router = useRouter();

  // Check admin status in useEffect
  useEffect(() => {
    const role = Cookies.get("role");
    setIsAdmin(role?.toLowerCase() === "admin");
  }, []);

  // Sorting and filtering hooks - must be called before any conditional returns
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc" | null;
  }>({
    key: "email",
    direction: null,
  });

  const columnToKeyMap: { [key: string]: string } = {
    "Email": "email",
    "First Name": "firstName",
    "Last Name": "lastName",
    "Role": "role",
    "License Expiry Date": "lisenceExpiryDate",
  };

  const handleSort = (heading: string) => {
    const key = columnToKeyMap[heading] || heading.toLowerCase().replace(" ", "");
    setSortConfig((prev) => {
      let newDirection: "asc" | "desc" | null;
      if (prev.key === key && prev.direction === "desc") {
        newDirection = "asc";
      } else if (prev.key === key && prev.direction === "asc") {
        newDirection = null;
      } else {
        newDirection = "desc";
      }
      return { key, direction: newDirection };
    });
  };

  const users = response?.data || [];

  const sortedData = ([...users] as unknown as Array<Record<string, unknown>>).sort(
    (a: Record<string, unknown>, b: Record<string, unknown>) => {
      if (!sortConfig.direction) return 0;

      let aValue: string | Date | undefined;
      let bValue: string | Date | undefined;

      if (sortConfig.key === "lisenceExpiryDate") {
        aValue = a[sortConfig.key]
          ? new Date(a[sortConfig.key] as string)
          : new Date(0);
        bValue = b[sortConfig.key]
          ? new Date(b[sortConfig.key] as string)
          : new Date(0);
      } else {
        aValue = (a[sortConfig.key] ?? "").toString();
        bValue = (b[sortConfig.key] ?? "").toString();
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    },
  );

  const filteredData = sortedData.filter((user) =>
    user.email?.toLowerCase().includes(search.toLowerCase()) ||
    user.firstName?.toLowerCase().includes(search.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // NOW we can do the conditional return - after all hooks
  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <span className="text-3xl">🔒</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600 max-w-md mx-auto">
            Only administrators can access User Management.<br />
            Please contact your administrator if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <Loading title="Loading User data...." message="All User data fetched successfully" />;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error: {JSON.stringify(error)}</div>;
  }

  const handleDeleteConfirm = async (id: string) => {
    try {
      await deleteUser(id).unwrap();
      toast.success("User deleted successfully");
      setDeleteId(null);
      refetch();
    } catch (err) {
      toast.error("Failed to delete user");
    }
  };

  const handleOpenUpdateModal = (user: any) => {
    setSelectedUserForUpdate(user);
    setIsUpdateModalOpen(true);
  };

  const hasActiveFilters = search;

  return (
    <div className="p-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">Users</h2>

      <div className="flex justify-between items-center mb-4">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <Input
            placeholder="Search user..."
            className="pl-10 pr-10 text-gray-700 focus:ring-2 focus:ring-red-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
        <div className="flex gap-2">
          <Button
            className="bg-red-700 text-white cursor-pointer hover:bg-red-600 gap-2 w-30"
            onClick={() => setIsCreateModalOpen(true)}
          >
            <PlusCircle className="h-4 w-4" /> Add User
          </Button>
        </div>
      </div>

      {hasActiveFilters && (
        <div className="mb-4 p-2 bg-gray-50 rounded text-sm">
          Showing {filteredData.length} of {users.length} users
        </div>
      )}

      <div className="overflow-auto rounded-lg border border-red-700/40">
        <Table className="w-full text-left border-collapse text-sm">
          <TableHeader>
            <TableRow className="bg-gray-200">
              <TableHead className="p-2 whitespace-nowrap font-medium text-red-800">Avatar</TableHead>
              <TableHead className="p-2 whitespace-nowrap font-medium text-red-800">
                <div className="flex items-center gap-1">
                  Role
                  <button onClick={() => handleSort("Role")} className="focus:outline-none">
                    <ArrowUpDown className={`w-3 h-3 ${sortConfig.key === "role" ? "text-red-500" : "text-red-800"}`} />
                  </button>
                </div>
              </TableHead>
              <TableHead className="p-2 whitespace-nowrap font-medium text-red-800">
                <div className="flex items-center gap-1">
                  Email
                  <button onClick={() => handleSort("Email")} className="focus:outline-none">
                    <ArrowUpDown className={`w-3 h-3 ${sortConfig.key === "email" ? "text-red-500" : "text-red-800"}`} />
                  </button>
                </div>
              </TableHead>
              <TableHead className="p-2 whitespace-nowrap font-medium text-red-800">
                <div className="flex items-center gap-1">
                  First Name
                  <button onClick={() => handleSort("First Name")} className="focus:outline-none">
                    <ArrowUpDown className={`w-3 h-3 ${sortConfig.key === "firstName" ? "text-red-500" : "text-red-800"}`} />
                  </button>
                </div>
              </TableHead>
              <TableHead className="p-2 whitespace-nowrap font-medium text-red-800">
                <div className="flex items-center gap-1">
                  Last Name
                  <button onClick={() => handleSort("Last Name")} className="focus:outline-none">
                    <ArrowUpDown className={`w-3 h-3 ${sortConfig.key === "lastName" ? "text-red-500" : "text-red-800"}`} />
                  </button>
                </div>
              </TableHead>
              <TableHead className="p-2 whitespace-nowrap font-medium text-red-800">
                <div className="flex items-center gap-1">
                  License Expiry Date
                  <button onClick={() => handleSort("License Expiry Date")} className="focus:outline-none">
                    <ArrowUpDown className={`w-3 h-3 ${sortConfig.key === "lisenceExpiryDate" ? "text-red-500" : "text-red-800"}`} />
                  </button>
                </div>
              </TableHead>
              <TableHead className="p-2 whitespace-nowrap font-medium text-red-800">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  No Users
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((user: Record<string, unknown>) => {
                const expiryRaw = user.lisenceExpiryDate as
                  | string
                  | Date
                  | null
                  | undefined;
                const expiryDate = expiryRaw ? new Date(expiryRaw) : null;
                const isExpired = expiryDate && expiryDate < new Date();

                return (
                  <TableRow key={user._id} className="border-t hover:bg-gray-50">
                    <TableCell className="p-2 whitespace-nowrap">
                      <img
                        src={user.image || "https://arbora-bucket.s3.us-east-2.amazonaws.com/system+assets/gray-male-head-placeholder-vector-23804676.jpg"}
                        alt="User"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    </TableCell>
                    <TableCell className="p-2 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell
                      className="p-2 whitespace-nowrap cursor-pointer font-bold text-red-600 hover:text-red-700 hover:underline"
                      onClick={() => setSelectedUser(user)}
                    >
                      {user.email}
                    </TableCell>
                    <TableCell className="p-2 whitespace-nowrap text-gray-700">
                      {user.firstName || "—"}
                    </TableCell>
                    <TableCell className="p-2 whitespace-nowrap text-gray-700">
                      {user.lastName || "—"}
                    </TableCell>
                    <TableCell
                      className={`p-2 whitespace-nowrap ${isExpired ? "text-red-600 font-semibold" : "text-gray-700"}`}
                    >
                      {expiryDate ? expiryDate.toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell className="p-2 whitespace-nowrap">
                      <div className="flex gap-4">
                        <Eye
                          className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-700 transition-colors"
                          onClick={() => setSelectedUser(user)}
                        />
                        <Edit
                          className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-700 transition-colors"
                          onClick={() => handleOpenUpdateModal(user)}
                        />
                        <Trash2
                          className="w-4 h-4 text-gray-500 cursor-pointer hover:text-red-600 transition-colors"
                          onClick={() => setDeleteId(user._id)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="px-4 py-2 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Modals */}
      <ConfirmationDialog
        deleteId={deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
      />
      <UserDetailsModal
        selectedUser={selectedUser}
        onClose={() => setSelectedUser(null)}
      />
      <CreateUserModal
        onClose={() => setIsCreateModalOpen(false)}
        open={isCreateModalOpen}
        onSuccess={refetch}
      />
      {/* @ts-expect-error: UpdateUserModalProps expects onSuccess to
           return void; refetch returns the RTK action creator result. */}
      <UpdateUserModal
        user={selectedUserForUpdate}
        onClose={() => setIsUpdateModalOpen(false)}
        open={isUpdateModalOpen}
        onSuccess={refetch}
      />
    </div>
  );
}