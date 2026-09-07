import { Input } from "@/components/ui/input";

interface QuoteModalProps {
  isOpen: boolean;
  quoteItems: { product: any; quotePrice: string; productSearch?: string }[];
  selectedProduct: any;
  note: string;
  isSending: boolean;
  productsLoading: boolean;
  productsData: any;
  onClose: () => void;
  onSendEmail: () => void;
  setQuoteItems: (items: { product: any; quotePrice: string; productSearch?: string }[]) => void;
  setSelectedProduct: (product: any) => void;
  setNote: (note: string) => void;
}

const QuoteModal: React.FC<QuoteModalProps> = ({
  isOpen,
  quoteItems,
  selectedProduct,
  note,
  isSending,
  productsLoading,
  productsData,
  onClose,
  onSendEmail,
  setQuoteItems,
  setSelectedProduct,
  setNote,
}) => {
  if (!isOpen) return null;

  const handleProductSearchChange = (index: number, value: string) => {
    const newQuoteItems = [...quoteItems];
    newQuoteItems[index] = { ...newQuoteItems[index], productSearch: value };
    setQuoteItems(newQuoteItems);
  };

  const handleSelectProduct = (index: number, product: any) => {
    const newQuoteItems = [...quoteItems];
    newQuoteItems[index] = {
      ...newQuoteItems[index],
      product,
      quotePrice: product.salesPrice.toString(),
      productSearch: product.name,
    };
    setQuoteItems(newQuoteItems);
    setSelectedProduct(product);
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Send Quote Email</h2>
        <div className="space-y-4">
          {quoteItems.map((item, index) => (
            <div key={index} className="space-y-2">
              {item.product ? (
                <div className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                  <span className="text-sm text-gray-700">{item.product.name}</span>
                  <div className="flex items-center space-x-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.quotePrice}
                      onChange={(e) => {
                        const newQuoteItems = [...quoteItems];
                        newQuoteItems[index] = { ...newQuoteItems[index], quotePrice: e.target.value };
                        setQuoteItems(newQuoteItems);
                      }}
                      className="w-24 p-1 text-sm"
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                    />
                    <button
                      onClick={() => {
                        const newQuoteItems = [...quoteItems];
                        newQuoteItems.splice(index, 1);
                        setQuoteItems(newQuoteItems.length ? newQuoteItems : [{ product: null, quotePrice: "", productSearch: "" }]);
                      }}
                      className="text-red-700 hover:text-red-600 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-4 relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search Product {index + 1}
                  </label>
                  <Input
                    type="text"
                    value={item.productSearch || ""}
                    onChange={(e) => handleProductSearchChange(index, e.target.value)}
                    placeholder="Search by product name..."
                    className="w-full mb-2"
                  />
                  {item.productSearch && !productsLoading && (
                    <div className="absolute z-10 w-full max-h-40 overflow-y-auto bg-white border rounded-md shadow-lg mt-1">
                      {productsData?.data
                        ?.filter((product: any) =>
                          product.name.toLowerCase().includes((item.productSearch || "").toLowerCase())
                        )
                        .map((product: any) => (
                          <div
                            key={product._id}
                            onClick={() => handleSelectProduct(index, product)}
                            className="p-2 hover:bg-gray-100 cursor-pointer"
                          >
                            {product.name} (Price: ${product.salesPrice})
                          </div>
                        ))}
                      {productsData?.data?.filter((product: any) =>
                        product.name.toLowerCase().includes((item.productSearch || "").toLowerCase())
                      ).length === 0 && <div className="p-2 text-gray-500">No products found</div>}
                    </div>
                  )}
                </div>
              )}
              {index === quoteItems.length - 1 && (
                <button
                  onClick={() => setQuoteItems([...quoteItems, { product: null, quotePrice: "", productSearch: "" }])}
                  className="mt-2 px-4 py-1 bg-black text-white rounded-md hover:bg-gray-700 text-sm"
                >
                  Add More
                </button>
              )}
            </div>
          ))}
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note"
            className="w-full p-2 border rounded h-30"
          />
        </div>
        <div className="mt-4 flex justify-end space-x-4">
          <button
            onClick={() => {
              onClose();
              setQuoteItems([{ product: null, quotePrice: "", productSearch: "" }]);
              setSelectedProduct(null);
              setNote("");
            }}
            className="border rounded-full px-4 py-2 text-red-700 hover:font-bold"
          >
            X
          </button>
          <button
            onClick={onSendEmail}
            className="px-4 py-2 bg-red-800 text-white rounded-md hover:bg-red-700"
            disabled={isSending || quoteItems.some((item) => !item.product || !item.quotePrice)}
          >
            {isSending ? "Sending..." : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuoteModal;
