// components/AddProductModal.tsx
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ChevronDown, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { useUpdateContainerProductsMutation } from "@/redux/api/containerApi";

interface Product {
  _id: string;
  itemNumber: string;
  name: string;
  barcodeString?: string;
  categoryId: { _id: string; name: string };
  purchasePrice?: number;
  salesPrice?: number;
  packetSize?: string;
  cbm?: number;
}

interface Category {
  _id: string;
  name: string;
}

interface AddProductModalProps {
  open: boolean;
  onClose: () => void;
  /**
   * Container ID - used to call the partial updateContainerProducts API directly
   * so the user does not have to wait for a full save.
   */
  containerId: string;
  /**
   * Optional callback fired AFTER the product has been successfully added to the
   * container via the API. The parent can use this to refresh local state.
   */
  onProductAdded?: (updatedContainer: any) => void;
  /**
   * @deprecated Kept for backwards compatibility - the modal no longer relies on
   * parent-side state. It calls the API directly. The parent may still pass this
   * for legacy flows but it will not be invoked in the new incremental flow.
   */
  onAdd?: (product: any) => void;
  categories: Category[];
  products: Product[];
}

const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  disabled,
  renderOption,
  getValue,
  autoOpen = false,
}: {
  options: any[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder: string;
  disabled?: boolean;
  renderOption: (opt: any) => string;
  getValue: (opt: any) => string;
  autoOpen?: boolean;
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = options.filter((opt) =>
    renderOption(opt).toLowerCase().includes(search.toLowerCase())
  );

  const selectedLabel = options.find((opt) => getValue(opt) === value)
    ? renderOption(options.find((opt) => getValue(opt) === value)!)
    : "";

  // Auto-open when autoOpen is true and there are options
  useEffect(() => {
    if (autoOpen && options.length > 0 && !value) {
      setOpen(true);
    }
  }, [autoOpen, options.length, value]);

  useEffect(() => {
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
        className={`w-full p-2 border rounded flex justify-between items-center bg-white text-left ${
          disabled ? "opacity-50 cursor-not-allowed" : "hover:border-gray-400"
        }`}
      >
        <span className={value ? "text-black" : "text-gray-500"}>
          {value ? selectedLabel : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-auto">
          <div className="p-2 border-b">
            <Input
              ref={inputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="max-h-48 overflow-auto">
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-gray-500">No options found</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt._id}
                  type="button"
                  onClick={() => {
                    onChange(getValue(opt));
                    setOpen(false);
                    setSearch("");
                  }}
                  className="w-full text-left p-2 hover:bg-gray-100"
                >
                  {renderOption(opt)}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default function AddProductModal({
  open,
  onClose,
  onAdd,
  onProductAdded,
  containerId,
  categories,
  products,
}: AddProductModalProps) {
  const [updateContainerProducts, { isLoading: isAddingProduct }] =
    useUpdateContainerProductsMutation();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [salesPrice, setSalesPrice] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const productSelectRef = useRef<HTMLDivElement>(null);

  // Filter products based on search term (name or barcode) and selected category
  const getFilteredProducts = () => {
    let filtered = products;
    
    // Filter by search term (name or barcode)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.barcodeString && p.barcodeString.toLowerCase().includes(term))
      );
    }
    
    // Filter by selected category (if any)
    if (selectedCategory) {
      filtered = filtered.filter((p) => p.categoryId.name === selectedCategory);
    }
    
    return filtered;
  };

  const filteredProducts = getFilteredProducts();

  // Auto-open product dropdown when search term changes and there are results
  useEffect(() => {
    if (searchTerm.trim() && filteredProducts.length > 0 && !selectedProduct) {
      setProductDropdownOpen(true);
    }
  }, [searchTerm, filteredProducts.length, selectedProduct]);

  // Auto-fill when product selected (including CBM)
  useEffect(() => {
    if (selectedProduct) {
      setPurchasePrice(selectedProduct.purchasePrice?.toString() || "");
      setSalesPrice(selectedProduct.salesPrice?.toString() || "");
      // Auto-fill category when product is selected
      if (selectedProduct.categoryId?.name) {
        setSelectedCategory(selectedProduct.categoryId.name);
      }
      // Close dropdown when product is selected
      setProductDropdownOpen(false);
    }
  }, [selectedProduct]);

  // Clear form when modal opens
  useEffect(() => {
    if (open) {
      setSearchTerm("");
      setSelectedCategory("");
      setSelectedProduct(null);
      setQuantity("1");
      setPurchasePrice("");
      setSalesPrice("");
      setProductDropdownOpen(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedProduct || !quantity || !purchasePrice) {
      toast.error("Please select a product and fill all required fields");
      return;
    }

    if (!containerId) {
      toast.error("Container context missing - cannot add product");
      return;
    }

    const qty = Number(quantity);
    const purchase = Number(purchasePrice);
    const sales = salesPrice ? Number(salesPrice) : (selectedProduct.salesPrice || 0);
    const cbm = selectedProduct.cbm || 0;

    const productPayload = {
      category: selectedProduct.categoryId.name,
      itemNumber: selectedProduct.itemNumber,
      itemName: selectedProduct.name,
      packetSize: selectedProduct.packetSize || "",
      orderQuantityCase: qty,
      quantity: qty,
      purchasePrice: purchase,
      salesPrice: sales,
      perCaseCost: qty > 0 ? purchase / qty : 0,
      cbm: cbm,
    };

    // Legacy callback (kept for any flows that still rely on parent-side state)
    if (onAdd) {
      onAdd(productPayload);
    }

    try {
      const result = await updateContainerProducts({
        id: containerId,
        action: "add",
        productData: productPayload,
      }).unwrap();

      toast.success("Product added to container successfully!");
      if (onProductAdded) {
        onProductAdded(result?.data?.updatedContainer ?? result?.data ?? result);
      }
      onClose();
    } catch (err: any) {
      console.error("[AddProductModal] Add product failed:", err);
      toast.error(err?.data?.message || "Failed to add product to container");
    }
  };

  // Get the product search placeholder with count
  const getProductPlaceholder = () => {
    if (filteredProducts.length === 0 && searchTerm) {
      return "No products found";
    }
    if (filteredProducts.length > 0 && searchTerm) {
      return `${filteredProducts.length} product(s) found`;
    }
    return "Select Product";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>Add Product to Container</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Search Input - Always visible and usable */}
          <div>
            {/* <Label className="mb-2">Search Product</Label> */}
            <Input
              type="text"
              placeholder="Search by product name or barcode..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
              autoFocus
            />
            {/* <p className="text-xs text-gray-500 mt-1">
              Search across all products by name or barcode
            </p> */}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-2">Category (Optional)</Label>
              <SearchableSelect
                options={categories}
                value={selectedCategory}
                onChange={(value) => {
                  setSelectedCategory(value);
                  setSelectedProduct(null); // Clear selected product when category changes
                  setSearchTerm(""); // Optionally clear search term
                }}
                placeholder="All Categories"
                searchPlaceholder="Search categories..."
                renderOption={(cat) => cat.name}
                getValue={(cat) => cat.name}
              />
            </div>
            <div ref={productSelectRef}>
              <Label className="mb-2">Product</Label>
              <SearchableSelect
                options={filteredProducts}
                value={selectedProduct?.itemNumber || ""}
                onChange={(itemNumber) => {
                  const prod = filteredProducts.find(p => p.itemNumber === itemNumber);
                  setSelectedProduct(prod || null);
                }}
                placeholder={getProductPlaceholder()}
                searchPlaceholder="Search products..."
                disabled={false}
                renderOption={(prod) => {
                  const barcodeInfo = prod.barcodeString ? ` [${prod.barcodeString}]` : '';
                  return `${prod.name} (${prod.itemNumber})${barcodeInfo}`;
                }}
                getValue={(prod) => prod.itemNumber}
                autoOpen={productDropdownOpen}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="mb-2">Quantity (cases)</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="1"
                placeholder="e.g. 10"
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
              />
            </div>
            <div>
              <Label className="mb-2">Purchase Price (total)</Label>
              <Input
                type="number"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                min="0"
                step="0.01"
                placeholder="Total cost"
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
              />
            </div>
            <div>
              <Label className="mb-2">Sales Price (optional)</Label>
              <Input
                type="number"
                value={salesPrice}
                onChange={(e) => setSalesPrice(e.target.value)}
                min="0"
                step="0.01"
                placeholder="Per case"
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-2">Packet Size</Label>
              <Input
                type="text"
                value={selectedProduct?.packetSize || ""}
                disabled
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label className="mb-2">CBM per Case</Label>
              <Input
                type="text"
                value={selectedProduct?.cbm ? selectedProduct.cbm.toFixed(4) : ""}
                disabled
                className="bg-gray-50"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isAddingProduct}>
            Cancel
          </Button>
          <Button
            className="bg-black hover:bg-gray-700"
            onClick={handleSubmit}
            disabled={isAddingProduct}
          >
            {isAddingProduct ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              "Add this product"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}