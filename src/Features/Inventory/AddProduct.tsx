'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGetCategoriesQuery } from '@/redux/api/categories';
import { useAddInventoryMutation, useGetPackSizeQuery } from '@/redux/api/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import toast from 'react-hot-toast';
import { Package, Tag, Box, Scale, DollarSign, Barcode, MapPin, Layers, Image as ImageIcon, Plus, X, Loader2, Trash2, Calendar } from 'lucide-react';

const AddProductPage = () => {
  const router = useRouter();

  // Non-numeric fields
  const [formData, setFormData] = useState({
    name: '',
    itemNumber: '',
    weightUnit: 'KILOGRAM',
    packetSize: '',
    categoryId: '',
    isB2CProduct: false,
    isB2BProduct: true,
    packageDimensions: { length: 0, width: 0, height: 0, unit: 'CM' },
    caseDimensions: { length: 0, width: 0, height: 0, unit: 'CM' },
    barcodeString: '',
    expiryDate: '',
    quantityInWarehouseLocation: {} as Map<string, number>,
  });

  // String states for ALL numeric fields (safe handling)
  const [totalQuantityStr, setTotalQuantityStr] = useState("");
  const [reorderPointStr, setReorderPointStr] = useState("");
  const [weightStr, setWeightStr] = useState("");
  const [purchasePriceStr, setPurchasePriceStr] = useState("");
  const [salesPriceStr, setSalesPriceStr] = useState("");
  const [competitorPriceStr, setCompetitorPriceStr] = useState("");
  const [b2cSalesPriceStr, setB2cSalesPriceStr] = useState("");
  const [cbdStr, setCbdStr] = useState("");

  // Warehouse locations state
  const [warehouseLocations, setWarehouseLocations] = useState<Array<{ location: string; quantity: number }>>([]);
  const [newLocation, setNewLocation] = useState("");
  const [newLocationQuantity, setNewLocationQuantity] = useState("");

  const [images, setImages] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [addInventory] = useAddInventoryMutation();
  const { data: categoryData } = useGetCategoriesQuery();
  const categoriesData: { _id: string; name: string }[] = categoryData?.data ?? [];
  const { data: packSize } = useGetPackSizeQuery();
  const packSizes: string[] = packSize?.data ?? [];

  const weightUnits = ['KILOGRAM', 'POUND', 'OUNCE', 'LITRE', 'PIECE', 'GRAM', 'MILLIGRAM', 'MILLILITER'];
  const packageUnits = ['CM', 'INCH'];

  // Safe number converter
  const toNumber = (val: string): number => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  // Calculate total quantity from warehouse locations
  const calculateTotalQuantity = () => {
    const total = warehouseLocations.reduce((sum, loc) => sum + loc.quantity, 0);
    setTotalQuantityStr(total.toString());
    return total;
  };

  // Add new warehouse location
  const handleAddLocation = () => {
    if (!newLocation.trim()) {
      toast.error("Please enter a warehouse location name");
      return;
    }
    if (!newLocationQuantity || toNumber(newLocationQuantity) <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    const existingLocation = warehouseLocations.find(
      (loc) => loc.location.toLowerCase() === newLocation.trim().toLowerCase()
    );

    if (existingLocation) {
      toast.error("This location already exists. Please edit the existing entry or use a different name.");
      return;
    }

    const newLoc = {
      location: newLocation.trim(),
      quantity: toNumber(newLocationQuantity)
    };

    const updatedLocations = [...warehouseLocations, newLoc];
    setWarehouseLocations(updatedLocations);
    
    // Update total quantity
    const total = updatedLocations.reduce((sum, loc) => sum + loc.quantity, 0);
    setTotalQuantityStr(total.toString());

    // Reset form
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
      updatedLocations[index].quantity = toNumber(value as string);
    }
    setWarehouseLocations(updatedLocations);
    
    // Update total quantity
    const total = updatedLocations.reduce((sum, loc) => sum + loc.quantity, 0);
    setTotalQuantityStr(total.toString());
  };

  // Remove location
  const handleRemoveLocation = (index: number) => {
    const updatedLocations = warehouseLocations.filter((_, i) => i !== index);
    setWarehouseLocations(updatedLocations);
    
    // Update total quantity
    const total = updatedLocations.reduce((sum, loc) => sum + loc.quantity, 0);
    setTotalQuantityStr(total.toString());
    toast.success("Location removed");
  };

  // Handle manual total quantity change
  const handleTotalQuantityChange = (value: string) => {
    setTotalQuantityStr(value);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as any;

    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name.includes('packageDimensions')) {
      const dimension = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        packageDimensions: {
          ...prev.packageDimensions,
          [dimension]: dimension === 'unit' ? value : Number(value),
        },
      }));
    } else if (name.includes('caseDimensions')) {
      const dimension = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        caseDimensions: {
          ...prev.caseDimensions,
          [dimension]: dimension === 'unit' ? value : Number(value),
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleNumericChange = (field: string, value: string) => {
    switch (field) {
      case 'totalQuantity':
        handleTotalQuantityChange(value);
        break;
      case 'reorderPointOfQuantity':
        setReorderPointStr(value);
        break;
      case 'weight':
        setWeightStr(value);
        break;
      case 'purchasePrice':
        setPurchasePriceStr(value);
        break;
      case 'salesPrice':
        setSalesPriceStr(value);
        break;
      case 'competitorPrice':
        setCompetitorPriceStr(value);
        break;
      case 'b2cSalesPrice':
        setB2cSalesPriceStr(value);
        break;
      case 'cbd':
        setCbdStr(value);
        break;
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, categoryId: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const productFormData = new FormData();

    console.log("[DIMENSIONS DEBUG] AddProduct formData.packageDimensions:", formData.packageDimensions);
    console.log("[DIMENSIONS DEBUG] AddProduct formData.caseDimensions:", formData.caseDimensions);

    productFormData.append("name", formData.name);
    productFormData.append("itemNumber", formData.itemNumber);
    productFormData.append("quantity", toNumber(totalQuantityStr).toString());
    productFormData.append("reorderPointOfQuantity", toNumber(reorderPointStr).toString());
    productFormData.append("weight", toNumber(weightStr).toString());
    productFormData.append("weightUnit", formData.weightUnit);
    productFormData.append("purchasePrice", toNumber(purchasePriceStr).toString());
    productFormData.append("salesPrice", toNumber(salesPriceStr).toString());
    productFormData.append("competitorPrice", toNumber(competitorPriceStr).toString());

    // Only append barcodeString if it has a value
    if (formData.barcodeString && formData.barcodeString.trim() !== "") {
      productFormData.append("barcodeString", formData.barcodeString);
    }
    
    // Append expiryDate if it has a value
    if (formData.expiryDate && formData.expiryDate.trim() !== "") {
      productFormData.append("expiryDate", formData.expiryDate);
    }
    
    productFormData.append("packetSize", formData.packetSize);
    productFormData.append("categoryId", formData.categoryId);
    productFormData.append("packageDimensions[length]", formData.packageDimensions.length.toString());
    productFormData.append("packageDimensions[width]", formData.packageDimensions.width.toString());
    productFormData.append("packageDimensions[height]", formData.packageDimensions.height.toString());
    productFormData.append("packageDimensions[unit]", formData.packageDimensions.unit);
    productFormData.append("caseDimensions[length]", formData.caseDimensions.length.toString());
    productFormData.append("caseDimensions[width]", formData.caseDimensions.width.toString());
    productFormData.append("caseDimensions[height]", formData.caseDimensions.height.toString());
    productFormData.append("caseDimensions[unit]", formData.caseDimensions.unit);
    productFormData.append("isDeleted", "false");
    productFormData.append("isB2CProduct", formData.isB2CProduct.toString());
    productFormData.append("isB2BProduct", formData.isB2BProduct.toString());
    productFormData.append("cbd", toNumber(cbdStr).toString());

    // Add warehouse locations as a Map
    const quantityInWarehouseLocation: Record<string, number> = {};
    warehouseLocations.forEach(loc => {
      quantityInWarehouseLocation[loc.location] = loc.quantity;
    });
    productFormData.append("quantityInWarehouseLocation", JSON.stringify(quantityInWarehouseLocation));

    if (formData.isB2CProduct) {
      productFormData.append("b2cSalesPrice", toNumber(b2cSalesPriceStr).toString());
    }

    images.forEach((image) => {
      productFormData.append("images", image);
    });

    try {
      await addInventory(productFormData).unwrap();
      toast.success('Product added successfully!');
      router.push(`/inventory`);

      // Reset form
      setFormData({
        name: '',
        itemNumber: '',
        weightUnit: 'KILOGRAM',
        packetSize: '',
        categoryId: '',
        isB2CProduct: false,
        isB2BProduct: true,
        packageDimensions: { length: 0, width: 0, height: 0, unit: 'CM' },
        caseDimensions: { length: 0, width: 0, height: 0, unit: 'CM' },
        barcodeString: '',
        expiryDate: '',
        quantityInWarehouseLocation: {} as Map<string, number>,
      });

      setTotalQuantityStr("");
      setReorderPointStr("");
      setWeightStr("");
      setPurchasePriceStr("");
      setSalesPriceStr("");
      setCompetitorPriceStr("");
      setB2cSalesPriceStr("");
      setCbdStr("");
      setWarehouseLocations([]);
      setImages([]);
    } catch (err: any) {
      console.error("Failed to add product:", err);
      toast.error(err?.data?.message || 'Failed to add product');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="p-6 bg-white rounded-lg shadow-lg min-h-screen">
        <h1 className="text-2xl font-bold mb-6 text-red-700">Add New Product</h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3">
              <Package className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-800">Basic Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-700">
                  Product Name <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter product name"
                  disabled={isSaving}
                  className="focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryId" className="text-gray-700">
                  Category <span className="text-red-600">*</span>
                </Label>
                <select
                  id="categoryId"
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleCategoryChange}
                  className="w-full h-10 rounded-md border border-input bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={isSaving}
                  required
                >
                  <option value="">Select Category</option>
                  {categoriesData.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="packetSize" className="text-gray-700">
                  Pack Size <span className="text-red-600">*</span>
                </Label>
                <Input
                  list="packSizeOptions"
                  id="packetSize"
                  name="packetSize"
                  value={formData.packetSize}
                  onChange={handleChange}
                  placeholder="Type or select pack size"
                  disabled={isSaving}
                  className="focus:ring-red-500 focus:border-red-500"
                  required
                />
                <datalist id="packSizeOptions">
                  {packSizes.map((size) => (
                    <option key={size} value={size} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Inventory Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3">
              <Box className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-800">Inventory</h2>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {/* Warehouse Locations Section */}
              <div className="space-y-4">
                <Label className="text-gray-700">Warehouse Locations (Optional)</Label>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    <div className="md:col-span-1">
                      <Input
                        type="text"
                        placeholder="Location name (e.g., Main Warehouse)"
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        disabled={isSaving}
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
                        disabled={isSaving}
                        className="focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <div>
                      <Button
                        type="button"
                        onClick={handleAddLocation}
                        disabled={isSaving}
                        className="bg-red-600 hover:bg-red-700 text-white w-full md:w-auto"
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
                              disabled={isSaving}
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
                              disabled={isSaving}
                              className="focus:ring-red-500 focus:border-red-500"
                              placeholder="Quantity"
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleRemoveLocation(index)}
                            disabled={isSaving}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">Add multiple warehouse locations with their respective quantities</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="totalQuantity" className="text-gray-700">
                    Total Product Quantity <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    type="number"
                    id="totalQuantity"
                    value={totalQuantityStr}
                    onChange={(e) => handleNumericChange('totalQuantity', e.target.value)}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    min="0"
                    placeholder="Enter total quantity"
                    disabled={isSaving}
                    className="focus:ring-red-500 focus:border-red-500 bg-gray-50"
                  />
                  <p className="text-xs text-gray-500">Auto-calculated from warehouse locations, or enter manually</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reorderPointOfQuantity" className="text-gray-700">
                    Reorder Quantity <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    type="number"
                    id="reorderPointOfQuantity"
                    value={reorderPointStr}
                    onChange={(e) => setReorderPointStr(e.target.value)}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    min="0"
                    placeholder="Enter reorder quantity"
                    disabled={isSaving}
                    className="focus:ring-red-500 focus:border-red-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barcodeString" className="text-gray-700">Barcode String</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Barcode className="h-4 w-4 text-gray-400" />
                    </div>
                    <Input
                      id="barcodeString"
                      name="barcodeString"
                      value={formData.barcodeString}
                      onChange={handleChange}
                      placeholder="Enter barcode"
                      disabled={isSaving}
                      className="pl-10 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiryDate" className="text-gray-700">Expiry Date</Label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-4 w-4 text-gray-400" />
                    </div>
                    <Input
                      id="expiryDate"
                      name="expiryDate"
                      type="date"
                      value={formData.expiryDate}
                      onChange={handleChange}
                      placeholder="Select expiry date"
                      disabled={isSaving}
                      className="pl-10 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Optional - Product expiry date</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3">
              <DollarSign className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-800">Pricing</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="purchasePrice" className="text-gray-700">
                  Purchase Price <span className="text-red-600">*</span>
                </Label>
                <Input
                  type="number"
                  id="purchasePrice"
                  value={purchasePriceStr}
                  onChange={(e) => setPurchasePriceStr(e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  step="0.01"
                  min="0"
                  placeholder="Enter purchase price"
                  disabled={isSaving}
                  className="focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salesPrice" className="text-gray-700">
                  Sales Price <span className="text-red-600">*</span>
                </Label>
                <Input
                  type="number"
                  id="salesPrice"
                  value={salesPriceStr}
                  onChange={(e) => setSalesPriceStr(e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  step="0.01"
                  min="0"
                  placeholder="Enter sales price"
                  disabled={isSaving}
                  className="focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="competitorPrice" className="text-gray-700">Competitor Price</Label>
                <Input
                  type="number"
                  id="competitorPrice"
                  value={competitorPriceStr}
                  onChange={(e) => setCompetitorPriceStr(e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  step="0.01"
                  min="0"
                  placeholder="Enter competitor price"
                  disabled={isSaving}
                  className="focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>
          </div>

          {/* Product Type Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3">
              <Tag className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-800">Product Type</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="isB2BProduct"
                  checked={formData.isB2BProduct}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isB2BProduct: checked as boolean }))}
                  disabled={isSaving}
                  className="border-red-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                />
                <Label htmlFor="isB2BProduct" className="text-sm font-medium text-gray-700">
                  Is B2B Product?
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <Checkbox
                  id="isB2CProduct"
                  checked={formData.isB2CProduct}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isB2CProduct: checked as boolean }))}
                  disabled={isSaving}
                  className="border-red-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                />
                <Label htmlFor="isB2CProduct" className="text-sm font-medium text-gray-700">
                  Is B2C Product?
                </Label>
              </div>

              {formData.isB2CProduct && (
                <div className="mt-4 max-w-md">
                  <Label htmlFor="b2cSalesPrice" className="text-gray-700">B2C Sales Price</Label>
                  <Input
                    type="number"
                    id="b2cSalesPrice"
                    value={b2cSalesPriceStr}
                    onChange={(e) => setB2cSalesPriceStr(e.target.value)}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    step="0.01"
                    min="0"
                    placeholder="Enter B2C sales price"
                    disabled={isSaving}
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Weight & Dimensions Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3">
              <Scale className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-800">Weight & Dimensions</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="weight" className="text-gray-700">
                  Weight <span className="text-red-600">*</span>
                </Label>
                <Input
                  type="number"
                  id="weight"
                  value={weightStr}
                  onChange={(e) => setWeightStr(e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  step="0.01"
                  min="0"
                  placeholder="Enter weight"
                  disabled={isSaving}
                  className="focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weightUnit" className="text-gray-700">
                  Weight Unit <span className="text-red-600">*</span>
                </Label>
                <select
                  id="weightUnit"
                  name="weightUnit"
                  value={formData.weightUnit}
                  onChange={handleChange}
                  className="w-full h-10 rounded-md border border-input bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={isSaving}
                  required
                >
                  {weightUnits.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Package Dimensions</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Length</label>
                  <Input
                    type="number"
                    name="packageDimensions.length"
                    value={formData.packageDimensions.length}
                    onChange={handleChange}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    placeholder="L"
                    min="0"
                    disabled={isSaving}
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Width</label>
                  <Input
                    type="number"
                    name="packageDimensions.width"
                    value={formData.packageDimensions.width}
                    onChange={handleChange}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    placeholder="W"
                    min="0"
                    disabled={isSaving}
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Height</label>
                  <Input
                    type="number"
                    name="packageDimensions.height"
                    value={formData.packageDimensions.height}
                    onChange={handleChange}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    placeholder="H"
                    min="0"
                    disabled={isSaving}
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Unit</label>
                  <select
                    name="packageDimensions.unit"
                    value={formData.packageDimensions.unit}
                    onChange={handleChange}
                    className="w-full h-10 rounded-md border border-input bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    disabled={isSaving}
                  >
                    {packageUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Case Dimensions</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Length</label>
                  <Input
                    type="number"
                    name="caseDimensions.length"
                    value={formData.caseDimensions.length}
                    onChange={handleChange}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    placeholder="L"
                    min="0"
                    disabled={isSaving}
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Width</label>
                  <Input
                    type="number"
                    name="caseDimensions.width"
                    value={formData.caseDimensions.width}
                    onChange={handleChange}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    placeholder="W"
                    min="0"
                    disabled={isSaving}
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Height</label>
                  <Input
                    type="number"
                    name="caseDimensions.height"
                    value={formData.caseDimensions.height}
                    onChange={handleChange}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    placeholder="H"
                    min="0"
                    disabled={isSaving}
                    className="focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">Unit</label>
                  <select
                    name="caseDimensions.unit"
                    value={formData.caseDimensions.unit}
                    onChange={handleChange}
                    className="w-full h-10 rounded-md border border-input bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    disabled={isSaving}
                  >
                    {packageUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Fields */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
              <Layers className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-800">Additional Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="cbd" className="text-gray-700">CBM per Case</Label>
                <Input
                  type="number"
                  id="cbd"
                  value={cbdStr}
                  onChange={(e) => setCbdStr(e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  step="0.000000001"
                  min="0"
                  placeholder="e.g., 12.5"
                  disabled={isSaving}
                  className="focus:ring-red-500 focus:border-red-500"
                />
                <p className="text-xs text-gray-500">Cubic Meter per case (optional)</p>
              </div>
            </div>
          </div>

          {/* Images Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
              <ImageIcon className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-800">Product Images</h2>
              <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">optional</span>
            </div>

            <div>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:border-red-500 hover:bg-red-50 transition-colors duration-200">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Plus className="w-8 h-8 mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">Click to upload product images</p>
                  <p className="text-xs text-gray-400">PNG, JPG, JPEG (max 10MB each)</p>
                </div>
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={isSaving}
                />
              </label>

              {images.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/inventory")}
              disabled={isSaving}
              className="px-6 border-gray-300 hover:bg-gray-100 text-gray-700"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  name: '',
                  itemNumber: '',
                  weightUnit: 'KILOGRAM',
                  packetSize: '',
                  categoryId: '',
                  isB2CProduct: false,
                  isB2BProduct: true,
                  packageDimensions: { length: 0, width: 0, height: 0, unit: 'CM' },
                  caseDimensions: { length: 0, width: 0, height: 0, unit: 'CM' },
                  barcodeString: '',
                  expiryDate: '',
                  quantityInWarehouseLocation: {} as Map<string, number>,
                });
                setTotalQuantityStr("");
                setReorderPointStr("");
                setWeightStr("");
                setPurchasePriceStr("");
                setSalesPriceStr("");
                setCompetitorPriceStr("");
                setB2cSalesPriceStr("");
                setCbdStr("");
                setWarehouseLocations([]);
                setImages([]);
              }}
              disabled={isSaving}
              className="px-6 border-gray-300 hover:bg-gray-100 text-gray-700"
            >
              Clear
            </Button>
            <Button
              type="submit"
              disabled={isSaving || categoryData === undefined || packSize === undefined}
              className="bg-red-700 hover:bg-red-600 text-white font-semibold px-10 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Product"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductPage;