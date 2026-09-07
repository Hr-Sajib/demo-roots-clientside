"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Trash2, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGetProductsQuery } from "@/redux/api/product";
import { Product } from "@/types";
import {
  useCreateSupplierCreditMemoMutation,
  useUpdateSupplierCreditMemoMutation,
  SupplierCreditMemo,
} from "@/redux/api/supplierCreditMemoApi";

interface CreditMemoLineItem {
  productId: string;
  barcodeString: string;
  name: string;
  purchasePrice: number;
  quantity: number;
  note: string;
}

interface SupplierCreditMemoFormProps {
  mode: "create" | "edit";
  initialData?: SupplierCreditMemo;
}

export default function SupplierCreditMemoForm({
  mode,
  initialData,
}: SupplierCreditMemoFormProps) {
  const router = useRouter();
  const { data: productsData, isLoading } = useGetProductsQuery();
  const products = productsData?.data ?? [];

  const [createSupplierCreditMemo, { isLoading: isCreating }] =
    useCreateSupplierCreditMemoMutation();
  const [updateSupplierCreditMemo, { isLoading: isUpdating }] =
    useUpdateSupplierCreditMemoMutation();
  const isSaving = isCreating || isUpdating;

  const [supplierCreditMemoId, setSupplierCreditMemoId] = useState(
    initialData?.supplierCreditMemoId ?? "",
  );
  const [supplierName, setSupplierName] = useState(initialData?.supplierName ?? "");
  const [creditGiven, setCreditGiven] = useState(
    initialData?.creditGiven !== undefined ? String(initialData.creditGiven) : "",
  );
  const [isStatusOpen, setIsStatusOpen] = useState(
    initialData?.isStatusOpen !== undefined ? initialData.isStatusOpen : true,
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [lineItems, setLineItems] = useState<CreditMemoLineItem[]>(() => {
    if (!initialData) return [];
    return initialData.items.map((item) => {
      const product = products.find((p: Product) => p._id === item.productId);
      return {
        productId: item.productId,
        barcodeString: product?.barcodeString || "—",
        name: product?.name || "Unknown Product",
        purchasePrice: product?.purchasePrice || 0,
        quantity: item.quantity,
        note: item.note || "",
      };
    });
  });

  const filteredProducts =
    searchTerm.trim() === ""
      ? []
      : products.filter((product: Product) => {
          const search = searchTerm.toLowerCase();
          return (
            product.name.toLowerCase().includes(search) ||
            product.itemNumber.toLowerCase().includes(search) ||
            (product.barcodeString &&
              product.barcodeString.toLowerCase().includes(search))
          );
        });

  const addProduct = (product: Product) => {
    if (lineItems.some((item) => item.productId === product._id)) {
      toast("Product already added to the credit memo.");
      return;
    }
    setLineItems((prev) => [
      ...prev,
      {
        productId: product._id,
        barcodeString: product.barcodeString || "—",
        name: product.name,
        purchasePrice: product.purchasePrice || 0,
        quantity: 1,
        note: "",
      },
    ]);
    setSearchTerm("");
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setLineItems((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity: quantity < 1 ? 1 : quantity }
          : item,
      ),
    );
  };

  const updateNote = (productId: string, note: string) => {
    setLineItems((prev) =>
      prev.map((item) => (item.productId === productId ? { ...item, note } : item)),
    );
  };

  const removeProduct = (productId: string) => {
    setLineItems((prev) => prev.filter((item) => item.productId !== productId));
  };

  const grandTotal = lineItems.reduce(
    (sum, item) => sum + item.purchasePrice * item.quantity,
    0,
  );

  const handleSubmit = async () => {
    if (!supplierName.trim()) {
      toast.error("Supplier name is required.");
      return;
    }
    if (lineItems.length === 0) {
      toast.error("Add at least one product before saving.");
      return;
    }

    const payload = {
      supplierCreditMemoId: supplierCreditMemoId.trim() || undefined,
      supplierName: supplierName.trim(),
      items: lineItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        note: item.note || undefined,
      })),
      creditGiven: creditGiven.trim() !== "" ? Number(creditGiven) : undefined,
      isStatusOpen,
    };

    try {
      if (mode === "create") {
        await createSupplierCreditMemo(payload).unwrap();
        toast.success("Supplier credit memo created", { duration: 3000 });
      } else if (initialData) {
        await updateSupplierCreditMemo({ id: initialData._id, data: payload }).unwrap();
        toast.success("Supplier credit memo updated", { duration: 3000 });
      }
      router.push("/containers/supplier-credit-memo");
    } catch (err: any) {
      toast.error(
        err?.data?.message || err?.message || "Failed to save",
        { duration: 4000 },
      );
    }
  };

  return (
    // <div className="w-full">
      <div className="p-10 max-w-7xl mx-auto bg-white rounded-2xl">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6">
        {mode === "create" ? "Create Supplier Credit Memo" : "Edit Supplier Credit Memo"}
      </h2>

      <div className="space-y-4 max-w-5xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Supplier Credit Memo ID
            </label>
            <Input
              placeholder="Leave blank to auto-generate (e.g. SCM-0001)"
              value={supplierCreditMemoId}
              onChange={(e) => setSupplierCreditMemoId(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Supplier Name <span className="text-red-700">*</span>
            </label>
            <Input
              placeholder="Enter supplier name"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Credit Given
            </label>
            <Input
              type="number"
              min="0"
              placeholder="0.00"
              value={creditGiven}
              onChange={(e) => setCreditGiven(e.target.value)}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Status
            </label>
            <Select
              value={isStatusOpen ? "open" : "closed"}
              onValueChange={(value) => setIsStatusOpen(value === "open")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by name, barcode or item number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {searchTerm.trim() !== "" && (
            <div className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg">
              {isLoading ? (
                <div className="p-3 text-sm text-gray-500">Loading products...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-3 text-sm text-gray-500">No matching products</div>
              ) : (
                filteredProducts.slice(0, 20).map((product: Product) => (
                  <button
                    key={product._id}
                    onClick={() => addProduct(product)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <span className="font-medium">{product.name}</span>{" "}
                    <span className="text-gray-500">
                      ({product.barcodeString || product.itemNumber})
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Barcode</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Purchase Price</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Subtotal</TableHead>
                <TableHead>Note</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                    No products added yet
                  </TableCell>
                </TableRow>
              ) : (
                lineItems.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell>{item.barcodeString}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>${item.purchasePrice.toFixed(2)}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(item.productId, parseInt(e.target.value) || 1)
                        }
                        className="w-20 h-8 text-sm"
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      ${(item.purchasePrice * item.quantity).toFixed(2)}
                    </TableCell>
                    <TableCell className="min-w-[280px]">
                      <Textarea
                        placeholder="Optional note"
                        value={item.note}
                        onChange={(e) => updateNote(item.productId, e.target.value)}
                        rows={1}
                        className="w-full min-h-8 py-1.5 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => removeProduct(item.productId)}
                        className="text-gray-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {lineItems.length > 0 && (
          <div className="flex justify-end text-sm font-semibold text-gray-800">
            Total Credit Requested: ${grandTotal.toFixed(2)}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => router.push("/containers/supplier-credit-memo")}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSaving}
            className="bg-gray-900 hover:bg-gray-800 text-white gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {mode === "create" ? "Create" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
    // </div>
  );
}
