"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Image from "next/image";
import {
  useAddCategoryMutation,
  useGetCategoriesQuery,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} from "@/redux/api/categories";
import Loading from "@/redux/Shared/Loading";
import ErrorState from "@/redux/Shared/ErrorState";
import { Edit, Eye, PlusCircle, Trash2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface Category {
  _id: string;
  name: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

const Categories: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: "", description: "" });
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );

  // Use redux-stored CurrentUser (persisted). Falls back to null while
  // rehydrating from localStorage on first paint; the role check still
  // works once the user lands on /categories after auth.
  const userData = useCurrentUser();
  const isAdmin = userData?.role?.toLowerCase() === "admin";

  const { data, isLoading, isError, refetch } = useGetCategoriesQuery();
  const [addCategory, { isLoading: isCreating }] = useAddCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] =
    useUpdateCategoryMutation();
  const [deleteCategory, { isLoading: isDeleting }] =
    useDeleteCategoryMutation();

  // ✅ Extract array safely

  const categoriesData: Category[] = data?.data ?? [];

  console.log(categoriesData);

  const filteredCategories = categoriesData.filter(
    (category) =>
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentCategories = filteredCategories.slice(
    indexOfFirstItem,
    indexOfLastItem,
  );
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleAddCategory = () => {
    setIsAddModalOpen(true);
  };

  const handleSave = async () => {
    if (newCategory.name && newCategory.description) {
      try {
        const cattegoryData = await addCategory(newCategory).unwrap();

        toast.success("Category added successfully!");
        setNewCategory({ name: "", description: "" });
        setIsAddModalOpen(false);
        refetch();
      } catch (error) {
        toast.error(
          "Failed to add category: " +
            (error instanceof Error ? error.message : "Unknown error"),
        );
      }
    } else {
      toast.error("Please fill in both name and description");
    }
  };

  const handleCancel = () => {
    setNewCategory({ name: "", description: "" });
    setIsAddModalOpen(false);
    setIsUpdateModalOpen(false);
    setIsViewModalOpen(false);
    setIsDeleteConfirmOpen(false);
    setSelectedCategory(null);
  };

  const handleView = (category: Category) => {
    setSelectedCategory(category);
    setIsViewModalOpen(true);
  };

  const handleUpdate = (category: Category) => {
    setSelectedCategory(category);
    setNewCategory({ name: category.name, description: category.description });
    setIsUpdateModalOpen(true);
  };

  const handleSaveUpdate = async () => {
    if (selectedCategory && newCategory.name) {
      // Only name is required, description is optional
      try {
        // Only include description if it has been changed and is not empty
        const updateData: { _id: string; name: string; description?: string } = {
          _id: selectedCategory._id,
          name: newCategory.name,
        };
        
        // Only add description if it's provided and different from original
        if (newCategory.description && newCategory.description !== selectedCategory.description) {
          updateData.description = newCategory.description;
        }

        await updateCategory(updateData).unwrap();
        toast.success("Category updated successfully!");
        setNewCategory({ name: "", description: "" });
        setIsUpdateModalOpen(false);
        refetch();
      } catch (error) {
        toast.error(
          "Failed to update category: " +
            (error instanceof Error ? error.message : "Unknown error"),
        );
      }
    } else {
      toast.error("Category name is required");
    }
  };

  const handleDelete = (category: Category) => {
    setSelectedCategory(category);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedCategory) {
      try {
        console.log("select category data", selectedCategory);
        const deleteCategorys = await deleteCategory(
          selectedCategory._id,
        ).unwrap();
        console.log(deleteCategory);
        toast.success(`Deleted ${selectedCategory.name} successfully!`);
        setIsDeleteConfirmOpen(false);
        setSelectedCategory(null);
        refetch();
      } catch (error) {
        toast.error(
          "Failed to delete category: " +
            (error instanceof Error ? error.message : "Unknown error"),
        );
      }
    }
  };

  const cancelDelete = () => {
    setIsDeleteConfirmOpen(false);
    setSelectedCategory(null);
  };

  if (isLoading)
    return (
      <Loading
        title="Loading categories"
        message="all categories data fetched "
      />
    );
  if (isError)
    return (
      <ErrorState title="fetch error" message=" categories data fetch error" />
    );

  return (
    <div className="p-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">
        Categories
      </h2>
      <div className="flex justify-between items-center mb-4 text-sm">
        <input
          type="text"
          placeholder="Search category..."
          className="p-2 border rounded-lg w-100"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={handleAddCategory}
              className="px-4 py-2 bg-red-700 text-white cursor-pointer hover:bg-red-600"
            >
              <PlusCircle className="h-4 w-4" /> Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add Category</DialogTitle>
              <DialogDescription>
                Add a new category here. Click save when you are done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-3">
                <Label htmlFor="name-1">Name <span className="text-red-600">*</span></Label>
                <Input
                  id="name-1"
                  value={newCategory.name}
                  onChange={(e) =>
                    setNewCategory({ ...newCategory, name: e.target.value })
                  }
                  placeholder="Enter category name"
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="description-1">Description</Label>
                <Input
                  id="description-1"
                  value={newCategory.description}
                  onChange={(e) =>
                    setNewCategory({
                      ...newCategory,
                      description: e.target.value,
                    })
                  }
                  placeholder="Enter category description (optional)"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </DialogClose>
              <Button
                className="bg-red-700 hover:bg-red-600"
                onClick={handleSave}
                disabled={isCreating}
              >
                {isCreating ? "Adding..." : "Save changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl overflow-hidden border border-red-700/40 bg-white text-sm">
        <table className="w-full text-left border-collapse">
          <thead className="rounded-t-2xl">
            <tr className="bg-gray-200 text-red-800 rounded-t-2xl">
              <th className="p-2">Name</th>
              <th className="p-2">Description</th>
              <th className="p-2 border w-30">Action</th>
            </tr>
          </thead>
          <tbody>
            {currentCategories.length > 0 ? (
              currentCategories.map((category) => (
                <tr key={category._id} className="border-t">
                  <td className="p-2 font-semibold py-3">{category.name}</td>
                  <td className="p-2">{category.description}</td>
                  <td className="p-2 flex space-x-2">
                    <Dialog
                      open={isViewModalOpen && selectedCategory?._id === category._id}
                      onOpenChange={(open) => {
                        if (!open) handleCancel();
                        setIsViewModalOpen(open);
                      }}
                    >
                      <DialogTrigger asChild>
                        <button
                          onClick={() => handleView(category)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <Eye className="w-4 h-4 mr-3 text-gray-500 cursor-pointer hover:text-gray-700" />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px] ">
                        <DialogHeader>
                          <DialogTitle>View Details</DialogTitle>
                          <DialogDescription>
                            Details for {selectedCategory?.name}.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4">
                          <div className="grid gap-3">
                            <Label htmlFor="view-name">Name</Label>
                            <Input
                              id="view-name"
                              value={selectedCategory?.name || ""}
                              readOnly
                            />
                          </div>
                          <div className="grid gap-3">
                            <Label htmlFor="view-description">
                              Description
                            </Label>
                            <Input
                              id="view-description"
                              value={selectedCategory?.description || ""}
                              readOnly
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline" onClick={handleCancel}>
                              Close
                            </Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Dialog
                      open={isUpdateModalOpen && selectedCategory?._id === category._id}
                      onOpenChange={(open) => {
                        if (!open) handleCancel();
                        setIsUpdateModalOpen(open);
                      }}
                    >
                      <DialogTrigger asChild>
                        <button
                          onClick={() => handleUpdate(category)}
                          className="text-gray-600 cursor-pointer hover:text-gray-800"
                        >
                          <Edit className="w-4 h-4 text-gray-500 cursor-pointer hover:text-gray-700" />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Update Category</DialogTitle>
                          <DialogDescription>
                            Update the category name. Description is optional.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4">
                          <div className="grid gap-3">
                            <Label htmlFor="name-2">Name <span className="text-red-600">*</span></Label>
                            <Input
                              id="name-2"
                              value={newCategory.name}
                              onChange={(e) =>
                                setNewCategory({
                                  ...newCategory,
                                  name: e.target.value,
                                })
                              }
                              placeholder="Enter category name"
                            />
                          </div>
                          <div className="grid gap-3">
                            <Label htmlFor="description-2">Description (Optional)</Label>
                            <Input
                              id="description-2"
                              value={newCategory.description}
                              onChange={(e) =>
                                setNewCategory({
                                  ...newCategory,
                                  description: e.target.value,
                                })
                              }
                              placeholder="Enter category description (optional)"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline" onClick={handleCancel}>
                              Cancel
                            </Button>
                          </DialogClose>
                          <Button
                            onClick={handleSaveUpdate}
                            disabled={isUpdating}
                            className="bg-red-700 hover:bg-red-600"
                          >
                            {isUpdating ? "Updating..." : "Save changes"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    {isAdmin && (
                      <Dialog
                        open={isDeleteConfirmOpen && selectedCategory?._id === category._id}
                        onOpenChange={setIsDeleteConfirmOpen}
                      >
                        <DialogTrigger asChild>
                          <button
                            onClick={() => handleDelete(category)}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            <Trash2 className="w-4 h-4 ml-3 text-gray-500 cursor-pointer hover:text-gray-700" />
                          </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>Confirm Delete</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to delete{" "}
                              {selectedCategory?.name}? This action cannot be
                              undone. All the products in this category will
                              also be deleted!
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline" onClick={cancelDelete}>
                                Cancel
                              </Button>
                            </DialogClose>
                            <Button
                              onClick={confirmDelete}
                              disabled={isDeleting}
                              variant="destructive"
                            >
                              {isDeleting ? "Deleting..." : "Delete"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="text-center text-gray-500 p-4">
                  No categories found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ToastContainer position="top-center" autoClose={3000} />
    </div>
  );
};

export default Categories;