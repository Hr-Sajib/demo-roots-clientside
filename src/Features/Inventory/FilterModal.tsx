"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search } from "lucide-react";

interface ProductFiltersModalProps {
  trigger: React.ReactNode;
  filterData: any[]; // Your product array (payload[])
  onApplyFilters?: (filters: {
    categories?: string[];
    outOfStock?: boolean;
    lowStock?: boolean;
    isB2CProduct?: boolean;
    noLocationSpecified?: boolean;
    mismatchedQuantity?: boolean;
    expiringIn30Days?: boolean;
    expiringIn60Days?: boolean;
    expiringIn90Days?: boolean;
  }) => void;
  currentFilters?: {
    categories?: string[];
    outOfStock?: boolean;
    lowStock?: boolean;
    isB2CProduct?: boolean;
    noLocationSpecified?: boolean;
    mismatchedQuantity?: boolean;
    expiringIn30Days?: boolean;
    expiringIn60Days?: boolean;
    expiringIn90Days?: boolean;
  };
  isSalesUser?: boolean;
}

export default function ProductFiltersModal({
  trigger,
  filterData,
  onApplyFilters,
  currentFilters = {},
  isSalesUser = false,
}: ProductFiltersModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    currentFilters?.categories || []
  );
  const [outOfStock, setOutOfStock] = useState(
    currentFilters?.outOfStock || false
  );
  const [lowStock, setLowStock] = useState(currentFilters?.lowStock || false);
  const [isB2CProduct, setIsB2CProduct] = useState(
    currentFilters?.isB2CProduct || false
  );
  const [noLocationSpecified, setNoLocationSpecified] = useState(
    currentFilters?.noLocationSpecified || false
  );
  const [mismatchedQuantity, setMismatchedQuantity] = useState(
    currentFilters?.mismatchedQuantity || false
  );
  const [expiringIn30Days, setExpiringIn30Days] = useState(
    currentFilters?.expiringIn30Days || false
  );
  const [expiringIn60Days, setExpiringIn60Days] = useState(
    currentFilters?.expiringIn60Days || false
  );
  const [expiringIn90Days, setExpiringIn90Days] = useState(
    currentFilters?.expiringIn90Days || false
  );

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Get all unique categories with counts
  const getCategoryStats = () => {
    const categoryMap = new Map<string, number>();
    
    filterData.forEach((item) => {
      const categoryName = item.categoryId?.name;
      if (categoryName) {
        categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + 1);
      }
    });
    
    return Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  const categories = getCategoryStats();
  
  // Filter categories based on search term
  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleClear = () => {
    setSelectedCategories([]);
    setOutOfStock(false);
    setLowStock(false);
    setIsB2CProduct(false);
    setNoLocationSpecified(false);
    setMismatchedQuantity(false);
    setExpiringIn30Days(false);
    setExpiringIn60Days(false);
    setExpiringIn90Days(false);
    setSearchTerm("");
  };

  const handleApply = () => {
    if (onApplyFilters) {
      onApplyFilters({
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        outOfStock,
        lowStock,
        isB2CProduct,
        noLocationSpecified,
        mismatchedQuantity,
        expiringIn30Days,
        expiringIn60Days,
        expiringIn90Days,
      });
    }
    setIsOpen(false);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const toggleCategory = (categoryName: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryName)
        ? prev.filter(c => c !== categoryName)
        : [...prev, categoryName]
    );
  };

  const selectAllCategories = () => {
    setSelectedCategories(categories.map(cat => cat.name));
  };

  const clearAllCategories = () => {
    setSelectedCategories([]);
  };

  return (
    <>
      <div onClick={() => setIsOpen(true)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div
            className="bg-white rounded-lg w-full max-w-[40%] shadow-xl flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center border-b pb-3 mb-4 px-6 pt-6">
              <h2 className="text-lg font-semibold text-gray-800">
                Product Filters
              </h2>
              <button
                onClick={handleClose}
                className="text-gray-500 hover:text-gray-700 text-2xl font-light"
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-4">
              <div className="space-y-5">
                {/* Categories Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Categories
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllCategories}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={clearAllCategories}
                        className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                  
                  {/* Search Categories */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search categories..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  
                  <div className="border rounded-md p-3 max-h-64 overflow-y-auto">
                    {filteredCategories.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No categories found
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredCategories.map((category) => (
                          <div
                            key={category.name}
                            className="flex items-center justify-between hover:bg-gray-50 p-2 rounded-md transition-colors"
                          >
                            <label className="flex items-center gap-2 cursor-pointer flex-1">
                              <Checkbox
                                checked={selectedCategories.includes(category.name)}
                                onCheckedChange={() => toggleCategory(category.name)}
                                className="border-gray-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                              />
                              <span className="text-sm text-gray-700">
                                {category.name}
                              </span>
                            </label>
                            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                              {category.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {selectedCategories.length} category(s) selected
                  </div>
                </div>

                <div className="flex justify-between">
                {/* Stock Status Section */}
                {!isSalesUser && (
                  <div className="space-y-3 pt-2 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Status
                    </label>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="out-of-stock"
                          checked={outOfStock}
                          onCheckedChange={(checked) =>
                            setOutOfStock(checked as boolean)
                          }
                          className="border-gray-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                        />
                        <label
                          htmlFor="out-of-stock"
                          className="text-sm font-medium text-gray-700 cursor-pointer"
                        >
                          Out of Stock
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="low-stock"
                          checked={lowStock}
                          onCheckedChange={(checked) =>
                            setLowStock(checked as boolean)
                          }
                          className="border-gray-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                        />
                        <label
                          htmlFor="low-stock"
                          className="text-sm font-medium text-gray-700 cursor-pointer"
                        >
                          Low Stock (less than 50)
                        </label>
                      </div>

                      {/* B2C Filter */}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="b2c-product"
                          checked={isB2CProduct}
                          onCheckedChange={(checked) =>
                            setIsB2CProduct(checked as boolean)
                          }
                          className="border-gray-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                        />
                        <label
                          htmlFor="b2c-product"
                          className="text-sm font-medium text-gray-700 cursor-pointer"
                        >
                          B2C Products Only
                        </label>
                      </div>

                      {/* No Location Specified Filter */}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="no-location-specified"
                          checked={noLocationSpecified}
                          onCheckedChange={(checked) =>
                            setNoLocationSpecified(checked as boolean)
                          }
                          className="border-gray-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                        />
                        <label
                          htmlFor="no-location-specified"
                          className="text-sm font-medium text-gray-700 cursor-pointer"
                        >
                          No location specified
                        </label>
                      </div>

                      {/* Mismatched Quantity Filter */}
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="mismatched-quantity"
                          checked={mismatchedQuantity}
                          onCheckedChange={(checked) =>
                            setMismatchedQuantity(checked as boolean)
                          }
                          className="border-gray-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                        />
                        <label
                          htmlFor="mismatched-quantity"
                          className="text-sm font-medium text-gray-700 cursor-pointer"
                        >
                          Mismatched quantity
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Expiry Section - Updated to 30, 60, 90 days */}
                <div className="space-y-3 pt-2 border-t border-gray-200">
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Expiring Products
                  </label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="expiring-30-days"
                      checked={expiringIn30Days}
                      onCheckedChange={(checked) =>
                        setExpiringIn30Days(checked as boolean)
                      }
                      className="border-gray-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                    />
                    <label
                      htmlFor="expiring-30-days"
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      Expiring in 30 days or less
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="expiring-60-days"
                      checked={expiringIn60Days}
                      onCheckedChange={(checked) =>
                        setExpiringIn60Days(checked as boolean)
                      }
                      className="border-gray-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                    />
                    <label
                      htmlFor="expiring-60-days"
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      Expiring in 60 days or less
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="expiring-90-days"
                      checked={expiringIn90Days}
                      onCheckedChange={(checked) =>
                        setExpiringIn90Days(checked as boolean)
                      }
                      className="border-gray-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                    />
                    <label
                      htmlFor="expiring-90-days"
                      className="text-sm font-medium text-gray-700 cursor-pointer"
                    >
                      Expiring in 90 days or less
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Note: Only products with expiry dates will be considered
                  </p>
                </div>

                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-4 pt-4 border-t px-6 pb-6">
              <Button
                variant="ghost"
                onClick={handleClear}
                className="text-gray-600 hover:text-gray-800"
              >
                Clear Filters
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="px-5 border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApply}
                  className="px-5 bg-red-700 hover:bg-red-600 text-white"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}