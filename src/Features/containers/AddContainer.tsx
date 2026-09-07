'use client';

import React, { useState, useMemo, useRef } from 'react';
import { MdDone } from "react-icons/md";
import { useRouter } from 'next/navigation';
import { useAddContainerMutation } from '@/redux/api/containerApi';
import { useGetInventoryQuery } from '@/redux/api/inventory';
import { useGetCategoriesQuery } from '@/redux/api/categories';
import toast from 'react-hot-toast';
import { ChevronDown, X, PlusCircle, Truck, Package, DollarSign, Calendar, MapPin, Box, Loader2, Upload, FileText, Image as ImageIcon, File } from 'lucide-react';
import { Container, ContainerProduct } from '@/types';

const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  disabled,
  renderOption,
}: {
  options: any[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  disabled?: boolean;
  renderOption: (opt: any) => string;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const filtered = options.filter((opt) =>
    renderOption(opt).toLowerCase().includes(search.toLowerCase())
  );

  const selectedOption = options.find((opt) => renderOption(opt) === value);
  const selectedLabel = selectedOption ? renderOption(selectedOption) : "";

  React.useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={`w-full h-10 px-3 border rounded-md flex justify-between items-center bg-white text-left text-sm ${
          disabled ? "opacity-50 cursor-not-allowed bg-gray-100" : "hover:border-red-400 focus:ring-2 focus:ring-red-500"
        } ${value ? "text-gray-900" : "text-gray-500"}`}
      >
        <span className="truncate">
          {value ? selectedLabel : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-2 border-b sticky top-0 bg-white">
            <input
              ref={inputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full p-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
          <div className="max-h-48 overflow-auto">
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-gray-500 text-sm">No options found</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt._id}
                  type="button"
                  onClick={() => {
                    onChange(renderOption(opt));
                    setOpen(false);
                    setSearch("");
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex justify-between items-center text-sm transition-colors"
                >
                  <span className="text-gray-700">{renderOption(opt)}</span>
                  {value === renderOption(opt) && <X className="w-4 h-4 text-red-500" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AddContainerPage = () => {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [container, setContainer] = useState<Container>({
    _id: '',
    containerNumber: '',
    containerName: '',
    isDeleted: false,
    containerStatus: 'onTheWay',
    deliveryDate: '',
    shippingCost: 0,
    perCaseShippingCost: 0,
    containerProducts: [],
    createdAt: '',
    updatedAt: '',
    __v: 0,
  });

  const [newProduct, setNewProduct] = useState<ContainerProduct & { productId?: string, productName?: string }>({
    _id: '',
    category: '',
    itemNumber: '',
    quantity: 0,
    perCaseCost: 0,
    packetSize: '',
    purchasePrice: 0,
    salesPrice: 0,
    productId: '',
    productName: '',
  });

  // Safe String States for Numeric Fields
  const [shippingCostStr, setShippingCostStr] = useState("");
  const [paidAmountStr, setPaidAmountStr] = useState("");
  const [newProductQuantityStr, setNewProductQuantityStr] = useState("");
  const [newProductPurchasePriceStr, setNewProductPurchasePriceStr] = useState("");
  const [newProductSalesPriceStr, setNewProductSalesPriceStr] = useState("");

  // Document upload state
  const [containerDocuments, setContainerDocuments] = useState<File[]>([]);
  const [documentPreviews, setDocumentPreviews] = useState<{ name: string; size: number; type: string; previewUrl?: string }[]>([]);

  const [addContainer, { isLoading }] = useAddContainerMutation();
  const { data: inventoryResponse } = useGetInventoryQuery();
  const { data: categoriesResponse } = useGetCategoriesQuery();

  const inventoryData = inventoryResponse?.data || [];
  const categoriesData = categoriesResponse?.data || [];

  // Create a map for quick product name lookup
  const productNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    inventoryData.forEach((prod: any) => {
      if (prod.itemNumber) {
        map[prod.itemNumber] = prod.name || prod.itemNumber;
      }
    });
    return map;
  }, [inventoryData]);

  const filteredProducts = newProduct.category
    ? inventoryData.filter((p: any) => p.categoryId?.name === newProduct.category)
    : inventoryData;

  const cbmMap = useMemo(() => {
    const map: Record<string, number> = {};
    inventoryData.forEach((prod: any) => {
      if (prod.itemNumber && prod.cbm != null) {
        map[prod.itemNumber] = prod.cbm;
      }
    });
    return map;
  }, [inventoryData]);

  const totalcbm = useMemo(() => {
    return container.containerProducts.reduce((sum, prod) => {
      const cbm = cbmMap[prod.itemNumber] || 0;
      return sum + (cbm * prod.quantity);
    }, 0);
  }, [container.containerProducts, cbmMap]);

  const totalQuantity = useMemo(() => {
    return container.containerProducts.reduce((sum, prod) => {
      return sum + prod.quantity;
    }, 0);
  }, [container.containerProducts]);

  const cbmPerContainer = 50;
  const containersEquivalent = totalcbm / cbmPerContainer;

  // Safe Number Converter
  const toNumber = (val: string): number => {
    const num = Number(val);
    return isNaN(num) ? 0 : num;
  };

  // Handle document upload
  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newDocuments = [...containerDocuments, ...files];
      setContainerDocuments(newDocuments);
      
      // Create previews for the new documents
      const newPreviews = files.map(file => {
        const isImage = file.type.startsWith('image/');
        return {
          name: file.name,
          size: file.size,
          type: file.type,
          previewUrl: isImage ? URL.createObjectURL(file) : undefined
        };
      });
      
      setDocumentPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  // Remove document
  const removeDocument = (index: number) => {
    // Revoke object URL if it exists to prevent memory leaks
    if (documentPreviews[index]?.previewUrl) {
      URL.revokeObjectURL(documentPreviews[index].previewUrl!);
    }
    setContainerDocuments(prev => prev.filter((_, i) => i !== index));
    setDocumentPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Unified handler for all numeric inputs
  const handleNumericChange = (field: string, value: string) => {
    if (field === 'shippingCost') {
      setShippingCostStr(value);
      setContainer((prev) => ({ ...prev, shippingCost: toNumber(value) }));
    } else if (field === 'paidAmount') {
      setPaidAmountStr(value);
    } else if (field === 'newProductQuantity') {
      setNewProductQuantityStr(value);
      setNewProduct((prev) => ({ ...prev, quantity: toNumber(value) }));
    } else if (field === 'newProductPurchasePrice') {
      setNewProductPurchasePriceStr(value);
      setNewProduct((prev) => ({ ...prev, purchasePrice: toNumber(value) }));
    } else if (field === 'newProductSalesPrice') {
      setNewProductSalesPriceStr(value);
      setNewProduct((prev) => ({ ...prev, salesPrice: toNumber(value) }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name in newProduct && !['quantity', 'purchasePrice', 'salesPrice'].includes(name)) {
      setNewProduct((prev) => ({ ...prev, [name]: value }));
    } else {
      setContainer((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleCategoryChange = (value: string) => {
    setNewProduct(prev => ({ ...prev, category: value, itemNumber: '', productId: '', productName: '' }));
  };

  const handleProductChange = (value: string) => {
    const selectedProduct = filteredProducts.find((p: any) => `${p.name} (${p.itemNumber})` === value);
    if (selectedProduct) {
      setNewProduct(prev => ({
        ...prev,
        itemNumber: selectedProduct.itemNumber,
        productId: selectedProduct._id,
        productName: selectedProduct.name,
        category: selectedProduct.categoryId?.name || prev.category,
        salesPrice: selectedProduct.salesPrice || 0,
      }));
      setNewProductSalesPriceStr(selectedProduct.salesPrice?.toString() || "");
    }
  };

  const handleAddProduct = () => {
    if (
      newProduct.category &&
      newProduct.itemNumber &&
      newProduct.productId &&
      toNumber(newProductQuantityStr) > 0 &&
      toNumber(newProductPurchasePriceStr) > 0 &&
      newProduct.packetSize.trim()
    ) {
      const itemNumberToCheck = newProduct.itemNumber;
      
      const isProductAlreadyAdded = container.containerProducts.some(
        (product) => product.itemNumber === itemNumberToCheck
      );

      if (isProductAlreadyAdded) {
        toast.error(`Product "${itemNumberToCheck}" already added to this container!`);
        return;
      }

      const quantity = toNumber(newProductQuantityStr);
      const purchasePrice = toNumber(newProductPurchasePriceStr);
      const perCaseCost = quantity > 0 ? purchasePrice / quantity : 0;
      const perCasePurchasePrice = purchasePrice / quantity;

      setContainer((prev) => ({
        ...prev,
        containerProducts: [
          ...prev.containerProducts,
          {
            _id: newProduct.productId!,
            category: newProduct.category,
            itemNumber: itemNumberToCheck,
            productName: newProduct.productName || itemNumberToCheck,
            quantity,
            perCaseCost: Number(perCaseCost.toFixed(3)),
            purchasePrice,
            salesPrice: toNumber(newProductSalesPriceStr),
            packetSize: newProduct.packetSize,
            perCasePurchasePrice: Number(perCasePurchasePrice.toFixed(2)),
          },
        ],
      }));

      // Reset new product
      setNewProduct({
        _id: '',
        category: newProduct.category,
        itemNumber: '',
        quantity: 0,
        perCaseCost: 0,
        packetSize: '',
        purchasePrice: 0,
        salesPrice: 0,
        productId: '',
        productName: '',
      });

      setNewProductQuantityStr("");
      setNewProductPurchasePriceStr("");
      setNewProductSalesPriceStr("");
      toast.success('Product added successfully!');
    } else {
      toast.error('Please fill all required fields: Category, Product, Quantity, Purchase Price, Packet Size.');
    }
  };

  const handleDeleteProduct = (id: string) => {
    setContainer((prev) => ({
      ...prev,
      containerProducts: prev.containerProducts.filter((prod) => prod._id !== id),
    }));
    toast.success('Product removed from container');
  };

  const handleCreateContainer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !container.containerNumber.trim() ||
      !container.containerName.trim() ||
      !container.deliveryDate ||
      toNumber(shippingCostStr) <= 0 ||
      container.containerProducts.length === 0
    ) {
      toast.error('Please fill all container details and add at least one product.');
      return;
    }

    const deliveryDate = new Date(container.deliveryDate);
    if (isNaN(deliveryDate.getTime()) || deliveryDate < new Date()) {
      toast.error('Please select a valid future delivery date.');
      return;
    }

    try {
      const formData = new FormData();
      
      // Add container data as JSON
      const containerData = {
        containerNumber: container.containerNumber,
        containerName: container.containerName,
        containerStatus: container.containerStatus,
        deliveryDate: container.deliveryDate,
        shippingCost: toNumber(shippingCostStr),
        paidAmount: toNumber(paidAmountStr),
        containerProducts: container.containerProducts.map(p => ({
          _id: p._id,
          category: p.category,
          itemNumber: p.itemNumber,
          productName: p.productName,
          quantity: p.quantity,
          purchasePrice: p.purchasePrice,
          salesPrice: p.salesPrice,
          packetSize: p.packetSize,
          perCaseCost: p.perCaseCost,
          perCasePurchasePrice: p.perCasePurchasePrice,
        })),
      };
      
      formData.append('data', JSON.stringify(containerData));
      
      // Add documents
      containerDocuments.forEach((doc) => {
        formData.append('containerDocuments', doc);
      });

      await addContainer(formData).unwrap();

      toast.success('Container created successfully');
      router.push("/containers");
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create container');
    }
  };

  // Helper function to calculate per case purchase price
  const getPerCasePurchasePrice = (prod: any) => {
    if (prod.perCasePurchasePrice) {
      return prod.perCasePurchasePrice;
    }
    if (prod.quantity > 0 && prod.purchasePrice > 0) {
      return prod.purchasePrice / prod.quantity;
    }
    return 0;
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="p-6 bg-white rounded-lg shadow-lg min-h-screen">
        <h1 className="text-2xl font-bold mb-6 text-red-700">Add Container</h1>

        <form onSubmit={handleCreateContainer} className="space-y-8">
          {/* Container Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Truck className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-800">Container Information</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label htmlFor="containerNumber" className="text-sm font-medium block text-gray-700">
                  Container Number <span className="text-red-600">*</span>
                </label>
                <input
                  id="containerNumber"
                  name="containerNumber"
                  type="text"
                  value={container.containerNumber}
                  onChange={handleInputChange}
                  placeholder="Enter container number"
                  className="w-full h-10 px-3 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="containerName" className="text-sm font-medium block text-gray-700">
                  Container Name <span className="text-red-600">*</span>
                </label>
                <input
                  id="containerName"
                  name="containerName"
                  type="text"
                  value={container.containerName}
                  onChange={handleInputChange}
                  placeholder="Enter container name"
                  className="w-full h-10 px-3 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="deliveryDate" className="text-sm font-medium block text-gray-700">
                  Expected Delivery Date <span className="text-red-600">*</span>
                </label>
                <input
                  id="deliveryDate"
                  name="deliveryDate"
                  type="date"
                  value={container.deliveryDate}
                  onChange={handleInputChange}
                  className="w-full h-10 px-3 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="containerStatus" className="text-sm font-medium block text-gray-700">Container Status</label>
                <select
                  id="containerStatus"
                  name="containerStatus"
                  value={container.containerStatus}
                  onChange={handleInputChange}
                  className="w-full h-10 px-3 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="onTheWay">On The Way</option>
                  <option value="arrived">Arrived</option>
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="shippingCost" className="text-sm font-medium block text-gray-700">
                  Shipping Cost <span className="text-red-600">*</span>
                </label>
                <input
                  id="shippingCost"
                  type="number"
                  value={shippingCostStr}
                  onChange={(e) => handleNumericChange('shippingCost', e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  placeholder="Enter total shipping cost"
                  className="w-full h-10 px-3 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="paidAmount" className="text-sm font-medium block text-gray-700">
                  Paid Amount
                </label>
                <input
                  id="paidAmount"
                  type="number"
                  value={paidAmountStr}
                  onChange={(e) => handleNumericChange('paidAmount', e.target.value)}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  placeholder="Enter paid amount (optional)"
                  className="w-full h-10 px-3 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Documents Section */}
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

            {/* Document Previews */}
            {documentPreviews.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Uploaded Documents ({documentPreviews.length})</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {documentPreviews.map((doc, index) => (
                    <div key={index} className="relative group border rounded-lg p-3 bg-gray-50 hover:shadow-md transition-shadow">
                      {doc.previewUrl ? (
                        <div className="w-full h-24 mb-2 flex items-center justify-center overflow-hidden rounded">
                          <img
                            src={doc.previewUrl}
                            alt={doc.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-24 mb-2 flex items-center justify-center bg-gray-100 rounded">
                          <File className="w-10 h-10 text-gray-400" />
                        </div>
                      )}
                      <div className="truncate text-xs font-medium text-gray-700" title={doc.name}>
                        {doc.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatFileSize(doc.size)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Added Products Table */}
          {container.containerProducts.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-semibold text-gray-800">
                  Added Products ({container.containerProducts.length})
                </h2>
              </div>

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
                      <th className="p-3 text-left font-medium">CBM (%)</th>
                      <th className="p-3 text-left font-medium">Total CBM</th>
                      <th className="p-3 text-left font-medium">Sales Price</th>
                      <th className="p-3 text-left font-medium">Packet Size</th>
                      <th className="p-3 text-left font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {container.containerProducts.map((prod) => {
                      const cbm = cbmMap[prod.itemNumber] || 0;
                      const totalcbmForRow = cbm * prod.quantity;
                      const perCasePurchasePrice = getPerCasePurchasePrice(prod);
                      const totalPurchasePrice = prod.purchasePrice;

                      return (
                        <tr key={prod._id} className="border-t hover:bg-gray-50">
                          <td className="p-3 font-medium text-gray-800">
                            {prod.productName || productNameMap[prod.itemNumber] || prod.itemNumber}
                          </td>
                          <td className="p-3 text-gray-700">{prod.category}</td>
                          <td className="p-3 text-gray-600">{prod.itemNumber}</td>
                          <td className="p-3 text-gray-700">{prod.quantity}</td>
                          <td className="p-3 text-purple-600 font-medium">
                            ${perCasePurchasePrice.toFixed(2)}
                          </td>
                          <td className="p-3 text-green-600 font-medium">
                            ${totalPurchasePrice.toFixed(2)}
                          </td>
                          <td className="p-3 text-blue-600">{Number(cbm.toFixed(6)).toString()}</td>
                          <td className="p-3 font-medium text-green-700">{Number(totalcbmForRow.toFixed(6)).toString()}</td>
                          <td className="p-3 text-blue-600 font-medium">${prod.salesPrice.toFixed(2)}</td>
                          <td className="p-3 text-gray-700">{prod.packetSize}</td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(prod._id)}
                              className="text-red-600 hover:text-red-800 transition-colors font-medium"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-gray-100 font-semibold">
                      <td colSpan={3} className="p-3 text-right text-gray-700">Totals:</td>
                      <td className="p-3 text-gray-900">{totalQuantity}</td>
                      <td colSpan={3} className="p-3 text-right text-gray-700">Total CBM:</td>
                      <td className="p-3 text-green-700">{Number(totalcbm.toFixed(6)).toString()}</td>
                      <td colSpan={3} className="p-3 text-gray-600">
                        ({Number(containersEquivalent.toFixed(6)).toString()} containers @ 50 CBM/container)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Product Input Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Box className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-800">Add Product to Container</h2>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium block text-gray-700">Category (Optional)</label>
                  <SearchableSelect
                    options={categoriesData}
                    value={newProduct.category}
                    onChange={handleCategoryChange}
                    placeholder="All Categories"
                    searchPlaceholder="Search categories..."
                    renderOption={(cat) => cat.name}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium block text-gray-700">
                    Product Name <span className="text-red-600">*</span>
                  </label>
                  <SearchableSelect
                    options={filteredProducts}
                    value={newProduct.itemNumber ? `${newProduct.productName} (${newProduct.itemNumber})` : ""}
                    onChange={handleProductChange}
                    placeholder="Select Product"
                    searchPlaceholder="Search products..."
                    renderOption={(prod) => `${prod.name} (${prod.itemNumber})`}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium block text-gray-700">
                    Quantity (cases) <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    value={newProductQuantityStr}
                    onChange={(e) => handleNumericChange('newProductQuantity', e.target.value)}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    placeholder="e.g., 10"
                    className="w-full h-10 px-3 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium block text-gray-700">Sales Price (Optional)</label>
                  <input
                    type="number"
                    value={newProductSalesPriceStr}
                    onChange={(e) => handleNumericChange('newProductSalesPrice', e.target.value)}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    placeholder="Per case"
                    className="w-full h-10 px-3 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium block text-gray-700">
                    Total Purchase Price <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    value={newProductPurchasePriceStr}
                    onChange={(e) => handleNumericChange('newProductPurchasePrice', e.target.value)}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    placeholder="Total cost for all cases"
                    className="w-full h-10 px-3 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium block text-gray-700">
                    Packet Size <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="text"
                    name="packetSize"
                    value={newProduct.packetSize}
                    onChange={handleInputChange}
                    placeholder="e.g., 12x500ml"
                    className="w-full h-10 px-3 border rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="bg-black hover:bg-gray-700 text-white gap-2 px-4 py-2 rounded-md flex items-center transition-colors text-sm"
                >
                  <MdDone className="w-4 h-4" />
                  Add this product
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => router.push("/containers")}
              className="px-6 py-2 border border-gray-300 rounded-md hover:bg-gray-100 text-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-red-700 hover:bg-red-600 text-white px-8 py-2 rounded-md flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Container"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContainerPage;