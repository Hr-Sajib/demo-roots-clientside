'use client';

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { payload, useUpdateInventoryMutation } from "@/redux/api/inventory";
import { useGetCategoriesQuery } from "@/redux/api/categories";
import toast from 'react-hot-toast';
import { X, Upload, Package, DollarSign, Scale, Box, Tag, MapPin, Barcode, Layers, Loader2, Plus, Trash2, Calendar } from 'lucide-react';
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface ProductUpdateModalProps {
  product: payload | null;
  trigger: React.ReactNode;
  categories: { _id: string; name: string }[];
}

interface WarehouseLocation {
  location: string;
  quantity: number;
}

export default function ProductUpdateModal({
  product: initialProduct,
  trigger,
  categories,
}: ProductUpdateModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [updateInventory, { isLoading }] = useUpdateInventoryMutation();

  // Defense-in-depth: ensure category list is available even if the parent
  // page never loaded it (e.g. user navigates straight to update via deep link
  // and the /category route hasn't been visited yet to seed the cache).
  const { data: fetchedCategoriesData, isLoading: isCategoriesLoading } = useGetCategoriesQuery();
  const fetchedCategories = fetchedCategoriesData?.data || [];
  const effectiveCategories =
    categories && categories.length > 0 ? categories : fetchedCategories;

  // User permission (persisted via redux)
  const userData = useCurrentUser();
  const isAdminOrManager = userData?.role?.toLowerCase() === "admin" ||
                          userData?.role?.toLowerCase() === "manager";

  // Form states
  const [formData, setFormData] = useState<any>({});

  // String states for numeric fields
  const [totalQuantityStr, setTotalQuantityStr] = useState("");
  const [incomingQuantityStr, setIncomingQuantityStr] = useState("");
  const [reorderPointStr, setReorderPointStr] = useState("");
  const [weightStr, setWeightStr] = useState("");
  const [purchasePriceStr, setPurchasePriceStr] = useState("");
  const [salesPriceStr, setSalesPriceStr] = useState("");
  const [competitorPriceStr, setCompetitorPriceStr] = useState("");
  const [b2cSalesPriceStr, setB2cSalesPriceStr] = useState("");
  const [cbmStr, setCbmStr] = useState("");
  const [expiryDateStr, setExpiryDateStr] = useState("");

  // Warehouse locations state
  const [warehouseLocations, setWarehouseLocations] = useState<WarehouseLocation[]>([]);
  const [newLocation, setNewLocation] = useState("");
  const [newLocationQuantity, setNewLocationQuantity] = useState("");

  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);

  // Helper function to convert Map/object to array
  const convertWarehouseLocationsToArray = (locations: any): WarehouseLocation[] => {
    if (!locations) return [];

    // If it's a Map
    if (locations instanceof Map) {
      const arr = Array.from(locations.entries()).map(([location, quantity]) => ({
        location,
        quantity: typeof quantity === 'number' ? quantity : 0
      }));
      // Sort to maintain consistent order
      return arr.sort((a, b) => a.location.localeCompare(b.location));
    }

    // If it's a plain object
    if (typeof locations === 'object' && !Array.isArray(locations)) {
      const arr = Object.entries(locations).map(([location, quantity]) => ({
        location,
        quantity: typeof quantity === 'number' ? quantity : 0
      }));
      // Sort to maintain consistent order
      return arr.sort((a, b) => a.location.localeCompare(b.location));
    }

    return [];
  };

  // Helper function to convert array to object (for JSON serialization)
  const convertArrayToObject = (locations: WarehouseLocation[]): Record<string, number> => {
    const obj: Record<string, number> = {};
    locations.forEach(loc => {
      // Keep all locations including those with quantity 0
      if (loc.location) {
        obj[loc.location] = loc.quantity;
      }
    });
    return obj;
  };

  // Calculate total quantity from warehouse locations
  const calculateTotalQuantity = (locations: WarehouseLocation[]) => {
    return locations.reduce((sum, loc) => sum + loc.quantity, 0);
  };

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen && initialProduct) {
      setFormData({
        name: initialProduct.name || "",
        packetSize: initialProduct.packetSize || "",
        weightUnit: initialProduct.weightUnit || "",
        categoryId: typeof initialProduct.categoryId === "object"
          ? initialProduct.categoryId._id
          : initialProduct.categoryId || "",
        barcodeString: initialProduct.barcodeString || "",
        isB2CProduct: initialProduct.isB2CProduct ?? false,
        isB2BProduct: initialProduct.isB2BProduct ?? true,
        packageDimensions: initialProduct.packageDimensions || {},
        caseDimensions: initialProduct.caseDimensions || {},
      });

      // Handle warehouse locations
      const locations = convertWarehouseLocationsToArray(initialProduct.quantityInWarehouseLocation);
      setWarehouseLocations(locations);

      // Set main quantity from product.quantity (independent field)
      const mainQty = initialProduct.quantity || 0;
      setTotalQuantityStr(mainQty.toString());

      setIncomingQuantityStr(initialProduct.incomingQuantity?.toString() || "0");
      setReorderPointStr(initialProduct.reorderPointOfQuantity?.toString() || "0");
      setWeightStr(initialProduct.weight?.toString() || "0");
      setPurchasePriceStr(initialProduct.purchasePrice?.toString() || "0");
      setSalesPriceStr(initialProduct.salesPrice?.toString() || "0");
      setCompetitorPriceStr(initialProduct.competitorPrice?.toString() || "0");
      setB2cSalesPriceStr(initialProduct.b2cSalesPrice?.toString() || "0");
      setCbmStr(initialProduct.cbm?.toString() || "0");
      setExpiryDateStr(initialProduct.expiryDate?.toString() || "");

      setCurrentImages(initialProduct.images || []);
      setNewImages([]);
    }
  }, [isOpen, initialProduct]);

  // Add new warehouse location
  const handleAddLocation = () => {
    if (!newLocation.trim()) {
      toast.error("Please enter a warehouse location name");
      return;
    }
    if (!newLocationQuantity || parseFloat(newLocationQuantity) < 0) {
      toast.error("Please enter a valid quantity (0 or greater)");
      return;
    }

    const existingLocationIndex = warehouseLocations.findIndex(
      (loc) => loc.location.toLowerCase() === newLocation.trim().toLowerCase()
    );

    if (existingLocationIndex !== -1) {
      toast.error("This location already exists. Please edit the existing entry or use a different name.");
      return;
    }

    const newQuantity = parseFloat(newLocationQuantity);
    const newLoc = {
      location: newLocation.trim(),
      quantity: newQuantity
    };

    const updatedLocations = [...warehouseLocations, newLoc].sort((a, b) => a.location.localeCompare(b.location));
    setWarehouseLocations(updatedLocations);

    setNewLocation("");
    setNewLocationQuantity("");
    toast.success("Location added successfully");
  };

  // Update existing location
  const handleUpdateLocation = (index: number, field: 'location' | 'quantity', value: string | number) => {
    const updatedLocations = [...warehouseLocations];
    if (field === 'location') {
      updatedLocations[index].location = value as string;
    } else {
      const newQuantity = typeof value === 'string' ? parseFloat(value) : value;
      updatedLocations[index].quantity = newQuantity;
    }

    // Sort to maintain consistent order if location name changed
    const sortedLocations = updatedLocations.sort((a, b) => a.location.localeCompare(b.location));
    setWarehouseLocations(sortedLocations);
  };

  // Remove location
  const handleRemoveLocation = (index: number) => {
    const updatedLocations = warehouseLocations.filter((_, i) => i !== index);
    setWarehouseLocations(updatedLocations);

    // Never decrease main quantity when removing locations
    // Only auto-fill if needed (which won't happen since we're removing)
    toast.success("Location removed");
  };

  // Handle manual total quantity change (always allowed, independent)
  const handleTotalQuantityChange = (value: string) => {
    setTotalQuantityStr(value);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewImages((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeExistingImage = (index: number) => {
    setCurrentImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const toNumber = (val: string): number => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!initialProduct?._id) {
    toast.error("Product ID is missing");
    return;
  }

  if (hasQuantityMismatch) {
    toast.error("Warehouse location quantities must add up to the Main Quantity before saving");
    return;
  }

  // Main quantity is completely independent - use exactly what user entered
  const finalQuantity = toNumber(totalQuantityStr);

  const changedData: any = {};

  // Non-numeric fields
  Object.keys(formData).forEach((key) => {
    const original = (initialProduct as any)[key];
    const current = formData[key];
    if (JSON.stringify(original) !== JSON.stringify(current)) {
      changedData[key] = current;
    }
  });

  // Prepare warehouse locations as object for JSON serialization
  // ALWAYS send the current warehouse locations data exactly as entered
  const quantityInWarehouseLocationObj = convertArrayToObject(warehouseLocations);

  // ALWAYS set quantityInWarehouseLocation in changedData, regardless of whether it changed
  // This ensures the API always receives the current state of warehouse locations
  changedData.quantityInWarehouseLocation = quantityInWarehouseLocationObj;

  // Numeric fields
  const numericUpdates = {
    quantity: finalQuantity,
    incomingQuantity: toNumber(incomingQuantityStr),
    reorderPointOfQuantity: toNumber(reorderPointStr),
    weight: toNumber(weightStr),
    purchasePrice: toNumber(purchasePriceStr),
    salesPrice: toNumber(salesPriceStr),
    competitorPrice: toNumber(competitorPriceStr),
    b2cSalesPrice: toNumber(b2cSalesPriceStr),
    cbm: toNumber(cbmStr),
  };

  Object.entries(numericUpdates).forEach(([key, value]) => {
    const originalValue = (initialProduct as any)[key];
    if (originalValue !== value) {
      changedData[key] = value;
    }
  });

  // Check if expiry date changed
  if (expiryDateStr !== (initialProduct.expiryDate || "")) {
    changedData.expiryDate = expiryDateStr || null;
  }

  // Images
  const hasImageChanges =
    currentImages.length !== (initialProduct.images?.length || 0) ||
    newImages.length > 0;

  if (hasImageChanges) {
    changedData.imagesJson = JSON.stringify(currentImages);
  }

  if (Object.keys(changedData).length === 0 && newImages.length === 0) {
    toast("No changes detected");
    setIsOpen(false);
    return;
  }

  const formDataToSend = new FormData();
  formDataToSend.append("_id", initialProduct._id);

  console.log("[DIMENSIONS DEBUG] ProductUpdateModal changedData.packageDimensions:", changedData.packageDimensions);
  console.log("[DIMENSIONS DEBUG] ProductUpdateModal changedData.caseDimensions:", changedData.caseDimensions);
  console.log("[DIMENSIONS DEBUG] ProductUpdateModal formData.packageDimensions:", formData.packageDimensions);
  console.log("[DIMENSIONS DEBUG] ProductUpdateModal formData.caseDimensions:", formData.caseDimensions);

  Object.keys(changedData).forEach((key) => {
    if (key === "imagesJson") {
      formDataToSend.append("imagesJson", changedData.imagesJson);
    } else if (key === "quantityInWarehouseLocation") {
      // ALWAYS send warehouse locations as JSON string - backend will convert to Map
      // This includes ALL locations with their current quantities (including 0)
      formDataToSend.append("quantityInWarehouseLocation", JSON.stringify(changedData.quantityInWarehouseLocation));
    } else if (key === "packageDimensions") {
      const pd = changedData.packageDimensions || {};
      formDataToSend.append("packageDimensions[length]", (pd.length || 0).toString());
      formDataToSend.append("packageDimensions[width]", (pd.width || 0).toString());
      formDataToSend.append("packageDimensions[height]", (pd.height || 0).toString());
      formDataToSend.append("packageDimensions[unit]", pd.unit || "");
    } else if (key === "caseDimensions") {
      const cd = changedData.caseDimensions || {};
      formDataToSend.append("caseDimensions[length]", (cd.length || 0).toString());
      formDataToSend.append("caseDimensions[width]", (cd.width || 0).toString());
      formDataToSend.append("caseDimensions[height]", (cd.height || 0).toString());
      formDataToSend.append("caseDimensions[unit]", cd.unit || "");
    } else {
      formDataToSend.append(key, String(changedData[key]));
    }
  });

  newImages.forEach((file) => formDataToSend.append("newImages", file));

  try {
    await updateInventory({ _id: initialProduct._id, data: formDataToSend }).unwrap();
    toast.success("Product updated successfully!");
    setIsOpen(false);
  } catch (error: any) {
    console.error("Update failed:", error);
    toast.error(error?.data?.message || "Failed to update product");
  }
};

  if (!initialProduct) return null;

  const totalWarehouseQty = calculateTotalQuantity(warehouseLocations);
  const mainQty = toNumber(totalQuantityStr);
  const hasQuantityMismatch =
    warehouseLocations.length > 0 && totalWarehouseQty !== mainQty;

  return (
    <>
      <div onClick={() => setIsOpen(true)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-6 flex justify-between items-center border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <Package className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold text-red-700">Update Product</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
              {/* Images Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Upload className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Product Images</h3>
                  <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">optional</span>
                </div>

                {currentImages.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">Current Images</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {currentImages.map((url, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={url}
                            alt={`Existing ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 bg-gray-50"
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingImage(idx)}
                            className="absolute top-2 right-2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {newImages.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-3">New Images to Add</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {newImages.map((file, idx) => (
                        <div key={idx} className="relative group">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`New ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg border border-gray-200 bg-gray-50"
                          />
                          <button
                            type="button"
                            onClick={() => removeNewImage(idx)}
                            className="absolute top-2 right-2 bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <label className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-700 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" />
                  <span>Add Images</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Basic Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Package className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Basic Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-gray-700">
                      Product Name <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name || ""}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter product name"
                      className="focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="packetSize" className="text-gray-700">
                      Packet Size <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="packetSize"
                      value={formData.packetSize || ""}
                      onChange={(e) => setFormData({ ...formData, packetSize: e.target.value })}
                      placeholder="Enter packet size"
                      className="focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="categoryId" className="text-gray-700">
                      Category <span className="text-red-600">*</span>
                    </Label>
                    <select
                      id="categoryId"
                      value={formData.categoryId || ""}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full h-10 rounded-md border border-input bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    >
                      <option value="">
                        {isCategoriesLoading ? "Loading categories..." : "Select Category"}
                      </option>
                      {effectiveCategories.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="barcodeString" className="text-gray-700">Barcode</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Barcode className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        id="barcodeString"
                        value={formData.barcodeString || ""}
                        onChange={(e) => setFormData({ ...formData, barcodeString: e.target.value })}
                        placeholder="Enter barcode"
                        className="pl-10 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Inventory Section with Warehouse Locations */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Box className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Inventory</h3>
                </div>

                {/* Warehouse Locations Section */}
                <div className="space-y-4">
                  <Label className="text-gray-700">Warehouse Locations</Label>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      <div className="md:col-span-1">
                        <Input
                          type="text"
                          placeholder="Location name (e.g., Main Warehouse)"
                          value={newLocation}
                          onChange={(e) => setNewLocation(e.target.value)}
                          className="focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <Input
                          type="number"
                          placeholder="Quantity"
                          value={newLocationQuantity}
                          onChange={(e) => setNewLocationQuantity(e.target.value)}
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          min="0"
                          step="1"
                          className="focus:ring-red-500 focus:border-red-500"
                        />
                      </div>
                      <div>
                        <Button
                          type="button"
                          onClick={handleAddLocation}
                          className="bg-black hover:bg-gray-700 text-white w-full md:w-auto"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Location
                        </Button>
                      </div>
                    </div>

                    {warehouseLocations.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="text-sm font-medium text-gray-700 mb-2">Added Locations:</div>
                        {warehouseLocations.map((loc, index) => (
                          <div key={index} className="flex items-center gap-3 bg-white p-3 rounded-lg border">
                            <div className="flex-1">
                              <Input
                                type="text"
                                value={loc.location}
                                onChange={(e) => handleUpdateLocation(index, 'location', e.target.value)}
                                className="focus:ring-red-500 focus:border-red-500"
                                placeholder="Location name"
                              />
                            </div>
                            <div className="w-32">
                              <Input
                                type="number"
                                value={loc.quantity}
                                onChange={(e) => handleUpdateLocation(index, 'quantity', e.target.value)}
                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                min="0"
                                step="1"
                                className="focus:ring-red-500 focus:border-red-500"
                                placeholder="Quantity"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => handleRemoveLocation(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="totalQuantity"
                      className={hasQuantityMismatch ? "text-red-700" : "text-gray-700"}
                    >
                      Main Quantity <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="totalQuantity"
                      type="number"
                      value={totalQuantityStr}
                      onChange={(e) => handleTotalQuantityChange(e.target.value)}
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      placeholder="Total Quantity"
                      min="0"
                      step="1"
                      readOnly={!isAdminOrManager}
                      disabled={!isAdminOrManager}
                      className={
                        hasQuantityMismatch
                          ? "border-red-700 focus:ring-red-700 focus:border-red-700"
                          : !isAdminOrManager
                          ? "bg-gray-100 cursor-not-allowed text-gray-700"
                          : "focus:ring-red-500 focus:border-red-500"
                      }
                    />
                    {hasQuantityMismatch && (
                      <p className="text-xs text-red-700 mt-1">
                        Warehouse location quantities ({totalWarehouseQty}) must add up to the Main Quantity ({mainQty || 0}) before you can save.
                      </p>
                    )}
                    {!hasQuantityMismatch && warehouseLocations.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Warehouse sum: {totalWarehouseQty} | Main: {mainQty || 0}
                      </p>
                    )}
                    {!isAdminOrManager && (
                      <p className="text-xs text-gray-500 mt-1">
                        Only admins and managers can change the Main Quantity. You can still rearrange quantities across locations.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="incomingQuantity" className="text-gray-700">Incoming Quantity</Label>
                    <Input
                      id="incomingQuantity"
                      type="number"
                      value={incomingQuantityStr}
                      onChange={(e) => setIncomingQuantityStr(e.target.value)}
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      placeholder="Incoming Quantity"
                      min="0"
                      step="1"
                      className="focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reorderPointOfQuantity" className="text-gray-700">
                      Reorder Point <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="reorderPointOfQuantity"
                      type="number"
                      value={reorderPointStr}
                      onChange={(e) => setReorderPointStr(e.target.value)}
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      placeholder="Reorder Point"
                      min="0"
                      step="1"
                      className="focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Weight & Dimensions */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Scale className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Weight & Dimensions</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="weight" className="text-gray-700">
                      Weight <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="weight"
                      type="number"
                      step="0.1"
                      value={weightStr}
                      onChange={(e) => setWeightStr(e.target.value)}
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      placeholder="Weight"
                      className="focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weightUnit" className="text-gray-700">
                      Weight Unit <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="weightUnit"
                      value={formData.weightUnit || ""}
                      onChange={(e) => setFormData({ ...formData, weightUnit: e.target.value })}
                      placeholder="KILOGRAM / POUND"
                      className="focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cbm" className="text-gray-700">CBM per Case</Label>
                    <Input
                      id="cbm"
                      type="number"
                      step="0.0000001"
                      value={cbmStr}
                      onChange={(e) => setCbmStr(e.target.value)}
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      placeholder="e.g. 0.125"
                      className="focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Package Dimensions */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-red-600" />
                    Package Dimensions
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Length</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.packageDimensions?.length ?? 0}
                        onChange={(e) => setFormData({
                          ...formData,
                          packageDimensions: {
                            ...formData.packageDimensions,
                            length: parseFloat(e.target.value) || 0,
                          }
                        })}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        className="focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Width</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.packageDimensions?.width ?? 0}
                        onChange={(e) => setFormData({
                          ...formData,
                          packageDimensions: {
                            ...formData.packageDimensions,
                            width: parseFloat(e.target.value) || 0,
                          }
                        })}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        className="focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Height</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.packageDimensions?.height ?? 0}
                        onChange={(e) => setFormData({
                          ...formData,
                          packageDimensions: {
                            ...formData.packageDimensions,
                            height: parseFloat(e.target.value) || 0,
                          }
                        })}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        className="focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Unit</label>
                      <select
                        value={formData.packageDimensions?.unit || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          packageDimensions: {
                            ...formData.packageDimensions,
                            unit: e.target.value,
                          }
                        })}
                        className="w-full h-10 rounded-md border border-input bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="">Select Unit</option>
                        <option value="CM">CM</option>
                        <option value="INCH">INCH</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Case Dimensions */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-red-600" />
                    Case Dimensions
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Length</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.caseDimensions?.length ?? 0}
                        onChange={(e) => setFormData({
                          ...formData,
                          caseDimensions: {
                            ...formData.caseDimensions,
                            length: parseFloat(e.target.value) || 0,
                          }
                        })}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        className="focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Width</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.caseDimensions?.width ?? 0}
                        onChange={(e) => setFormData({
                          ...formData,
                          caseDimensions: {
                            ...formData.caseDimensions,
                            width: parseFloat(e.target.value) || 0,
                          }
                        })}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        className="focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Height</label>
                      <Input
                        type="number"
                        step="0.1"
                        value={formData.caseDimensions?.height ?? 0}
                        onChange={(e) => setFormData({
                          ...formData,
                          caseDimensions: {
                            ...formData.caseDimensions,
                            height: parseFloat(e.target.value) || 0,
                          }
                        })}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        className="focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Unit</label>
                      <select
                        value={formData.caseDimensions?.unit || ""}
                        onChange={(e) => setFormData({
                          ...formData,
                          caseDimensions: {
                            ...formData.caseDimensions,
                            unit: e.target.value,
                          }
                        })}
                        className="w-full h-10 rounded-md border border-input bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        <option value="">Select Unit</option>
                        <option value="CM">CM</option>
                        <option value="INCH">INCH</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Pricing</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {isAdminOrManager && (
                    <div className="space-y-2">
                      <Label htmlFor="purchasePrice" className="text-gray-700">
                        Purchase Price <span className="text-red-600">*</span>
                      </Label>
                      <Input
                        id="purchasePrice"
                        type="number"
                        step="0.01"
                        value={purchasePriceStr}
                        onChange={(e) => setPurchasePriceStr(e.target.value)}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        placeholder="Purchase Price"
                        className="focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="salesPrice" className="text-gray-700">
                      Sales Price <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="salesPrice"
                      type="number"
                      step="0.01"
                      value={salesPriceStr}
                      onChange={(e) => setSalesPriceStr(e.target.value)}
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      placeholder="Sales Price"
                      className="focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="competitorPrice" className="text-gray-700">Competitor Price</Label>
                    <Input
                      id="competitorPrice"
                      type="number"
                      step="0.01"
                      value={competitorPriceStr}
                      onChange={(e) => setCompetitorPriceStr(e.target.value)}
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      placeholder="Competitor Price"
                      className="focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Product Type Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Tag className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Product Type</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isB2BProduct"
                      checked={formData.isB2BProduct ?? true}
                      onChange={(e) => setFormData({ ...formData, isB2BProduct: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <Label htmlFor="isB2BProduct" className="text-gray-700">Is B2B Product?</Label>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isB2CProduct"
                      checked={formData.isB2CProduct || false}
                      onChange={(e) => setFormData({ ...formData, isB2CProduct: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <Label htmlFor="isB2CProduct" className="text-gray-700">Is B2C Product?</Label>
                  </div>

                  {formData.isB2CProduct && (
                    <div className="space-y-2">
                      <Label htmlFor="b2cSalesPrice" className="text-gray-700">B2C Sales Price</Label>
                      <Input
                        id="b2cSalesPrice"
                        type="number"
                        step="0.01"
                        value={b2cSalesPriceStr}
                        onChange={(e) => setB2cSalesPriceStr(e.target.value)}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        placeholder="Enter B2C sales price"
                        className="focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Expiry Date Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-gray-800">Expiry Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate" className="text-gray-700">Expiry Date</Label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Calendar className="h-4 w-4 text-gray-400" />
                      </div>
                      <Input
                        id="expiryDate"
                        type="date"
                        value={expiryDateStr}
                        onChange={(e) => setExpiryDateStr(e.target.value)}
                        placeholder="Select expiry date"
                        className="pl-10 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500">Optional - Product expiry date</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="border-gray-300 hover:bg-gray-100 text-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || hasQuantityMismatch}
                  className="bg-red-700 hover:bg-red-600 text-white px-8 flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
