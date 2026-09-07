'use client';

import React, { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Container, ContainerProduct } from "@/types";
import {
  useUpdateContainerBasicInfoMutation,
  useUpdateContainerProductsMutation,
  useGetContainerQuery,
} from "@/redux/api/containerApi";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Loading from "@/redux/Shared/Loading";
import { Trash2, PlusCircle, Truck, Package, DollarSign, Calendar, Box, Save, X, Loader2, Upload, FileText, Eye, Plus } from "lucide-react";
import { useGetCategoriesQuery } from "@/redux/api/categories";
import { useGetProductsQuery } from "@/redux/api/product";
import AddProductModal from "./AddProductModal";

const EditContainerPage = () => {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    data: containerData,
    isLoading: loadingContainer,
    error: containerError,
  } = useGetContainerQuery(id, { skip: !id });

  const { data: categoriesData } = useGetCategoriesQuery();
  const { data: productsData } = useGetProductsQuery();

  const [updateContainerBasicInfo, { isLoading: isUpdatingBasicInfo }] =
    useUpdateContainerBasicInfoMutation();

  const [updateContainerProducts, { isLoading: isUpdatingProducts }] =
    useUpdateContainerProductsMutation();

  const [container, setContainer] = useState<Container>({
    _id: "",
    containerNumber: "",
    containerName: "",
    isDeleted: false,
    containerStatus: "onTheWay",
    deliveryDate: "",
    shippingCost: 0,
    perCaseShippingCost: 0,
    containerProducts: [],
    createdAt: "",
    updatedAt: "",
    __v: 0,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [paidAmountStr, setPaidAmountStr] = useState("");
  const [existingDocuments, setExistingDocuments] = useState<string[]>([]);
  const [newDocuments, setNewDocuments] = useState<File[]>([]);
  const [removedDocuments, setRemovedDocuments] = useState<string[]>([]);

  // Baseline snapshot of original products (used to detect "dirty" rows).
  // Use a flexible record type so the spread `{ ...p }` does not fail when the
  // API returns a ContainerProduct without the `productName` field that the
  // `@/types` version requires.
  const originalProductsRef = useRef<Record<string, any>>({});
  const PRODUCT_EDITABLE_FIELDS: (keyof ContainerProduct)[] = [
    "category",
    "quantity",
    "purchasePrice",
    "salesPrice",
    "packetSize",
  ];

  const isProductDirty = (prod: ContainerProduct): boolean => {
    const orig = originalProductsRef.current[prod._id];
    if (!orig) return false;
    const normalize = (v: unknown): unknown => {
      if (typeof v === "number") return v;
      if (v === "" || v === null || v === undefined) return 0;
      const n = Number(v);
      return Number.isNaN(n) ? v : n;
    };
    return PRODUCT_EDITABLE_FIELDS.some((f) => {
      const a = normalize((orig as any)[f]);
      const b = normalize((prod as any)[f]);
      return a !== b;
    });
  };

  const categories = categoriesData?.data || [];
  const allProducts = productsData?.data || [];

  // Create a lookup map: itemNumber → product name
  const productNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    const products = allProducts || [];
    
    products.forEach((product: any) => {
      if (product.itemNumber) {
        map[product.itemNumber] = product.name || "Unknown Product";
      }
    });
    return map;
  }, [allProducts]);

  // Calculate Total CBM directly from containerProducts
  const totalCBM = useMemo(() => {
    return container.containerProducts.reduce((sum, prod) => {
      const cbm = Number(prod.cbm || 0);
      return sum + (cbm * (prod.quantity || 0));
    }, 0);
  }, [container.containerProducts]);

  // Calculate Total Quantity
  const totalQuantity = useMemo(() => {
    return container.containerProducts.reduce((sum, prod) => {
      return sum + (prod.quantity || 0);
    }, 0);
  }, [container.containerProducts]);

  // Calculate Total Purchase Price
  const totalPurchasePrice = useMemo(() => {
    return container.containerProducts.reduce((sum, prod) => {
      return sum + (prod.purchasePrice || 0);
    }, 0);
  }, [container.containerProducts]);

  // Containers equivalent (50 CBM per container)
  const cbmPerContainer = 50;
  const containersEquivalent = totalCBM / cbmPerContainer;

  // Helper to remove trailing zeros after decimal
  const formatCBM = (num: number): string => {
    return parseFloat(num.toFixed(10)).toString();
  };

  // Helper to calculate per case purchase price
  const getPerCasePurchasePrice = (prod: any): number => {
    if (prod.perCaseCost) {
      return prod.perCaseCost;
    }
    if (prod.quantity > 0 && prod.purchasePrice > 0) {
      return prod.purchasePrice / prod.quantity;
    }
    return 0;
  };

  // Helper function to get file extension from URL
  const getFileExtension = (url: string): string => {
    const lastDot = url.lastIndexOf('.');
    if (lastDot === -1) return '';
    return url.substring(lastDot + 1).toLowerCase();
  };

  // Helper function to get file name from URL
  const getFileName = (url: string): string => {
    return url.split('/').pop() || 'Document';
  };

  useEffect(() => {
    if (containerData?.data) {
      setContainer(containerData.data);
      setPaidAmountStr(containerData.data.paidAmount?.toString() || "0");
      setExistingDocuments(containerData.data.containerDocuments || []);

      // Capture the original baseline so we can detect dirty rows later.
      const baseline: Record<string, any> = {};
      for (const p of containerData.data.containerProducts || []) {
        baseline[p._id] = { ...p };
      }
      originalProductsRef.current = baseline;
    }
  }, [containerData]);

  if (loadingContainer) return <Loading title="Loading container..." />;
  if (containerError || !containerData?.data)
    return <div className="p-6 text-red-500">Failed to load container.</div>;

  const handleContainerChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setContainer((prev) => ({ ...prev, [name]: value }));
  };

  const handleProductChange = (
    productId: string,
    field: keyof ContainerProduct,
    value: string | number,
  ) => {
    setContainer((prev) => ({
      ...prev,
      containerProducts: prev.containerProducts.map((prod) => {
        if (prod._id === productId) {
          const updatedProd = { ...prod, [field]: value };
          return updatedProd;
        }
        return prod;
      }),
    }));
  };

  const removeProduct = async (productId: string) => {
    // Find the product to remove to grab its itemNumber
    const targetProduct = container.containerProducts.find(
      (p) => p._id === productId,
    );
    if (!targetProduct) {
      toast.error("Product not found");
      return;
    }

    try {
      const result = await updateContainerProducts({
        id: container._id,
        action: "remove",
        productData: {
          itemNumber: targetProduct.itemNumber,
          quantity: targetProduct.quantity,
        },
      }).unwrap();

      // Sync local state with the freshly returned container
      if (result?.data?.updatedContainer) {
        setContainer((prev) => ({
          ...prev,
          containerProducts: result.data.updatedContainer.containerProducts,
        }));
      }
      toast.success("Product removed from container");
    } catch (err: any) {
      console.error("[CLIENT] Remove product failed:", err);
      toast.error(err?.data?.message || "Failed to remove product");
    }
  };

  const updateProduct = async (prod: ContainerProduct) => {
    try {
      const payload = {
        category: prod.category,
        quantity: Number(prod.quantity) || 0,
        purchasePrice: Number(prod.purchasePrice) || 0,
        salesPrice: Number(prod.salesPrice) || 0,
        packetSize: prod.packetSize,
        itemName: (prod as any).itemName ?? prod.productName ?? "",
        cbm: Number(prod.cbm) || 0,
      };
      const result = await updateContainerProducts({
        id: container._id,
        action: "update",
        productData: { itemNumber: prod.itemNumber, ...payload },
      }).unwrap();

      // Sync local state with the freshly returned container if available.
      const updated = (result as any)?.data?.updatedContainer as
        | Container
        | undefined;
      if (updated) {
        setContainer((prev) => ({
          ...prev,
          containerProducts: updated.containerProducts,
          perCaseShippingCost:
            updated.perCaseShippingCost ?? prev.perCaseShippingCost,
        }));
      }

      // Reset baseline so the row is no longer dirty.
      originalProductsRef.current[prod._id] = { ...prod };
      toast.success("Product updated successfully");
    } catch (err: any) {
      console.error("[CLIENT] Update product failed:", err);
      toast.error(err?.data?.message || "Failed to update product");
    }
  };

  // Handle document upload
  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setNewDocuments((prev) => [...prev, ...files]);
    }
  };

  // Remove existing document (marked for deletion)
  const removeExistingDocument = (index: number) => {
    const docToRemove = existingDocuments[index];
    setRemovedDocuments((prev) => [...prev, docToRemove]);
    setExistingDocuments((prev) => prev.filter((_, i) => i !== index));
    toast.success("Document marked for removal");
  };

  // Remove new document
  const removeNewDocument = (index: number) => {
    setNewDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const addProduct = (productData: {
    category: string;
    itemNumber: string;
    packetSize: string;
    quantity: number;
    purchasePrice: number;
    salesPrice: number;
    perCaseCost: number;
    cbm: number;
  }) => {
    // Check if product already exists in container
    const isProductAlreadyAdded = container.containerProducts.some(
      (product) => product.itemNumber === productData.itemNumber
    );

    if (isProductAlreadyAdded) {
      toast.error(`Product "${productData.itemNumber}" already added to this container!`);
      return;
    }

    const newProduct: ContainerProduct = {
      _id: Date.now().toString(),
      category: productData.category,
      itemNumber: productData.itemNumber,
      packetSize: productData.packetSize,
      quantity: productData.quantity || 1,
      purchasePrice: productData.purchasePrice,
      salesPrice: productData.salesPrice || 0,
      perCaseCost: productData.perCaseCost || 0,
      // perCaseShippingCost is no longer sent per-product — the server
      // computes and stores it at the container root level.
      cbm: productData.cbm || 0
    };

    setContainer((prev) => ({
      ...prev,
      containerProducts: [...prev.containerProducts, newProduct],
    }));
    toast.success("Product added successfully!");
  };

  const handleBasicInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !container.containerNumber.trim() ||
      !container.containerName.trim() ||
      !container.deliveryDate ||
      container.shippingCost <= 0
    ) {
      toast.error("Please fill all container fields correctly.");
      return;
    }

    try {
      const containerDataPayload = {
        containerNumber: container.containerNumber.trim(),
        containerName: container.containerName.trim(),
        containerStatus: container.containerStatus,
        deliveryDate: container.deliveryDate,
        shippingCost: Number(container.shippingCost),
        paidAmount: Number(paidAmountStr),
        removedDocuments: removedDocuments,
      };

      const formData = new FormData();
      formData.append("data", JSON.stringify(containerDataPayload));

      // Add new documents
      newDocuments.forEach((doc) => {
        formData.append("containerDocuments", doc);
      });

      await updateContainerBasicInfo({
        id: container._id,
        data: formData,
      }).unwrap();

      // Clear staged changes since they have been persisted
      setRemovedDocuments([]);
      setNewDocuments([]);
      toast.success("Container basic info updated successfully!");
    } catch (err: any) {
      console.error("[CLIENT] Update basic info failed:", err);
      toast.error(err?.data?.message || "Failed to update container basic info");
    }
  };

  // Kept for backwards compatibility - redirects to the basic info flow
  const handleSubmit = handleBasicInfoSubmit;

  const totalQty = container.containerProducts.reduce(
    (sum, p) => sum + Number(p.quantity || 0),
    0,
  );
  const perCaseShipping =
    totalQty > 0 ? Number(container.shippingCost) / totalQty : 0;

  return (
    <div className="mx-auto max-w-[90%] px-4 sm:px-6 lg:px-8">
      <div className="p-6 bg-white rounded-lg shadow-lg min-h-screen">
        <h1 className="text-2xl font-bold mb-6 text-red-700">Edit Container</h1>

        <form onSubmit={handleBasicInfoSubmit} className="space-y-8">
          {/* Container Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-800">Container Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="containerNumber" className="text-sm font-medium text-gray-700">
                  Container Number <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="containerNumber"
                  name="containerNumber"
                  type="text"
                  value={container.containerNumber}
                  onChange={handleContainerChange}
                  placeholder="Enter container number"
                  className="focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="containerName" className="text-sm font-medium text-gray-700">
                  Container Name <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="containerName"
                  name="containerName"
                  type="text"
                  value={container.containerName}
                  onChange={handleContainerChange}
                  placeholder="Enter container name"
                  className="focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryDate" className="text-sm font-medium text-gray-700">
                  Delivery Date <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="deliveryDate"
                  name="deliveryDate"
                  type="date"
                  value={container.deliveryDate}
                  onChange={handleContainerChange}
                  className="focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="containerStatus" className="text-sm font-medium text-gray-700">Status</Label>
                <select
                  id="containerStatus"
                  name="containerStatus"
                  value={container.containerStatus}
                  onChange={handleContainerChange}
                  className="w-full h-10 rounded-md border border-input bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="onTheWay">On The Way</option>
                  <option value="arrived">Arrived</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingCost" className="text-sm font-medium text-gray-700">
                  Shipping Cost <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="shippingCost"
                  name="shippingCost"
                  type="number"
                  value={container.shippingCost}
                  onChange={handleContainerChange}
                  placeholder="Enter shipping cost"
                  className="focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  min="0"
                  step="0.01"
                  required
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paidAmount" className="text-sm font-medium text-gray-700">
                  Paid Amount
                </Label>
                <Input
                  id="paidAmount"
                  type="number"
                  value={paidAmountStr}
                  onChange={(e) => setPaidAmountStr(e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  placeholder="Enter paid amount"
                  className="focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>


          {/* Documents Section - part of basic info */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-800">Container Documents</h2>
              <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">optional</span>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50 hover:border-red-500 transition-colors">
              <div className="flex flex-col items-center justify-center">
                <Upload className="w-10 h-10 text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-2">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-500">PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, JPEG (max 10MB each)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                  onChange={handleDocumentUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
                >
                  Select Documents
                </button>
              </div>
            </div>

            {/* Existing Documents */}
            {existingDocuments.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Current Documents ({existingDocuments.length})</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {existingDocuments.map((docUrl, idx) => {
                    const fileName = getFileName(docUrl);
                    const fileExt = getFileExtension(docUrl);

                    return (
                      <div key={idx} className="relative group border rounded-lg p-3 bg-gray-50 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg border">
                            <FileText className="w-5 h-5 text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate" title={fileName}>
                              {fileName}
                            </p>
                            <p className="text-xs text-gray-500 uppercase mt-1">
                              {fileExt || 'file'}
                            </p>
                          </div>
                          <a href={docUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-red-600">
                            <Eye className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => removeExistingDocument(idx)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* New Documents */}
            {newDocuments.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">New Documents to Add ({newDocuments.length})</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {newDocuments.map((file, idx) => (
                    <div key={idx} className="relative group border rounded-lg p-3 bg-blue-50 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg border">
                          <FileText className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate" title={file.name}>
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {(file.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeNewDocument(idx)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

                    {/* Action Buttons - basic info only (products save incrementally) */}
          <div className="flex justify-end gap-4 py-6 border-b">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/containers")}
              className="px-6 border-gray-300 hover:bg-gray-100 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUpdatingBasicInfo}
              className="bg-red-700 hover:bg-red-600 text-white px-8 flex items-center gap-2"
            >
              {isUpdatingBasicInfo ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating basic info...
                </>
              ) : (
                "Update basic info"
              )}
            </Button>
          </div>

          <p className=" text-red-500 self-center">
            Make sure you update Shipping Cost before editing products (not
            after)!
          </p>


          {/* Products Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-semibold text-gray-800">
                  Products ({container.containerProducts.length})
                </h2>
              </div>
              <Button
                type="button"
                onClick={() => setModalOpen(true)}
                className="bg-black hover:bg-gray-700 text-white gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Product
              </Button>
            </div>

            {perCaseShipping > 0 && (
              <div className="bg-blue-50 w-auto p-3 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700 text-center">
                  Per Case Shipping: <span className="font-semibold text-blue-800">${Number(perCaseShipping.toFixed(4)).toString()}</span>
                </p>
              </div>
            )}

            {container.containerProducts.length > 0 ? (
              <div className="overflow-x-auto border border-red-700/40 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-gray-200">
                    <tr className="text-red-800">
                      <th className="p-3 text-left font-medium">Product Name</th>
                      <th className="p-3 text-left font-medium">Category</th>
                      <th className="p-3 text-left font-medium">Item Number</th>
                      <th className="p-3 text-left font-medium">Qty</th>
                      <th className="p-3 text-left font-medium">Per Case Purchase Price</th>
                      <th className="p-3 text-left font-medium">Total Purchase Price</th>
                      <th className="p-3 text-left font-medium">CBM</th>
                      <th className="p-3 text-left font-medium">Total CBM</th>
                      <th className="p-3 text-left font-medium">Sales Price</th>
                      <th className="p-3 text-left font-medium">Packet Size</th>
                      <th className="p-3 text-left font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {container.containerProducts.map((prod: any) => {
                      const productName = productNameMap[prod.itemNumber] || "Unknown Product";
                      const hasProductInfo = !!productNameMap[prod.itemNumber];
                      const cbm = Number(prod.cbm || 0);
                      const totalCbmForRow = cbm * prod.quantity;
                      const perCasePurchasePrice = getPerCasePurchasePrice(prod);
                      const totalPurchasePrice = prod.purchasePrice || 0;

                      return (
                        <tr key={prod._id} className="border-t hover:bg-gray-50">
                          <td className="p-3">
                            {hasProductInfo ? (
                              <span className="font-medium text-blue-600">{productName}</span>
                            ) : (
                              <span className="font-medium text-amber-600 italic">
                                ⚠️ Product not found
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="text-gray-800">
                              {prod.category || ""}
                            </span>
                          </td>
                          <td className="p-3 font-medium text-gray-800">{prod.itemNumber}</td>
                          <td className="p-3 font-medium text-gray-800">
                            {prod.quantity || 0}
                          </td>
                          <td className="p-3 text-purple-600 font-medium">
                            ${perCasePurchasePrice.toFixed(2)}
                          </td>
                          <td className="p-3 text-green-600 font-medium">
                            ${Number(totalPurchasePrice || 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-blue-600">{formatCBM(cbm)}</td>
                          <td className="p-3 font-medium text-green-700">
                            {formatCBM(totalCbmForRow)}
                          </td>
                          <td className="p-3 text-blue-600">
                            ${Number(prod.salesPrice || 0).toFixed(2)}
                          </td>
                          <td className="p-3 text-gray-800">
                            {prod.packetSize || ""}
                          </td>
                          <td className="p-3 text-center">
                            {isProductDirty(prod) ? (
                              <button
                                type="button"
                                onClick={() => updateProduct(prod)}
                                disabled={isUpdatingProducts}
                                className="text-green-600 hover:text-green-800 transition-colors disabled:opacity-50"
                                title="Save changes to this product"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => removeProduct(prod._id)}
                                disabled={isUpdatingProducts}
                                className="text-red-600 hover:text-red-800 transition-colors disabled:opacity-50"
                                title="Remove from container"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-semibold border-t">
                      <td colSpan={3} className="p-3 text-right text-gray-700">
                        Totals:
                      </td>
                      <td className="p-3 text-center text-gray-900 font-bold">
                        {totalQuantity}
                      </td>
                      <td colSpan={2} className="p-3 text-right text-gray-700">
                        Total Purchase: <span className="text-green-700">${totalPurchasePrice.toFixed(2)}</span>
                      </td>
                      <td className="p-3 text-right text-gray-700">
                        Total CBM:
                      </td>
                      <td className="p-3 text-green-700 font-bold">
                        {formatCBM(totalCBM)}
                      </td>
                      <td colSpan={3} className="p-3 text-gray-600">
                        ({Number(containersEquivalent.toFixed(5)).toString()} containers @ 50 CBM/container)
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 p-8 rounded-lg border border-gray-200 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No products added yet.</p>
                <Button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  variant="outline"
                  className="mt-3 border-gray-300 hover:border-red-500 hover:bg-red-50"
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Add Your First Product
                </Button>
              </div>
            )}
          </div>

        </form>

        <AddProductModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onAdd={addProduct}
          onProductAdded={(updatedContainer) => {
            // Refresh local state with the container returned by the API
            // (perCaseShippingCost will be recalculated server-side at
            // the root level)
            if (updatedContainer && updatedContainer.containerProducts) {
              setContainer((prev) => ({
                ...prev,
                containerProducts: updatedContainer.containerProducts,
                perCaseShippingCost:
                  updatedContainer.perCaseShippingCost ?? prev.perCaseShippingCost,
              }));
            }
          }}
          containerId={container._id}
          categories={categories}
          products={allProducts}
        />

        {/* Notes Section */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <Box className="w-4 h-4 text-red-600" />
            Notes
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
            <li>Per Case Purchase Price = Total Purchase Price ÷ Quantity (updates automatically when quantity or purchase price changes)</li>
            <li>Per Case Cost = Purchase Price ÷ Quantity (calculated on save)</li>
            <li>Per Case Shipping Cost = Total Shipping ÷ Total Cases (calculated on save)</li>
            <li>Item Number must match exactly</li>
            <li>CBM values come directly from container products</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default EditContainerPage;