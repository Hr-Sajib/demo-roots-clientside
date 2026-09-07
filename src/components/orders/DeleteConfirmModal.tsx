"use client";

import { IB2COrder, IOrder } from "@/app/(dashboard)/orders/page";
import { CloudCog } from "lucide-react";

interface OrderDeleteConfirmationModalProps {
  orderToDeleteB2B: IOrder | null;
  orderToDeleteB2C: IB2COrder | null;
  isDeletingB2B: boolean;
  isDeletingB2C: boolean;
  onCancel: () => void;
  onConfirmB2B: () => void;
  onConfirmB2C: () => void;
}

const OrderDeleteConfirmationModal: React.FC<OrderDeleteConfirmationModalProps> = ({
  orderToDeleteB2B,
  orderToDeleteB2C,
  isDeletingB2B,
  isDeletingB2C,
  onCancel,
  onConfirmB2B,
  onConfirmB2C,
}) => {
  if (!orderToDeleteB2B && !orderToDeleteB2C) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-red-600 px-6 py-4 text-white">
          <h3 className="text-xl font-bold">Confirm Deletion</h3>
          <p className="text-red-100 mt-1 text-sm">
            This action cannot be undone.
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          {orderToDeleteB2B && (
            <div className="space-y-3">
              <p className="text-gray-700">
                Are you sure you want to delete this <strong>B2B</strong> order?
              </p>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="font-medium text-gray-900">
                  Invoice: {orderToDeleteB2B.invoiceNumber}
                </p>
                <p className="text-gray-600 mt-1">
                  Store: {orderToDeleteB2B.storeId?.storeName || "N/A"}
                </p>
              </div>
            </div>
          )}

          {orderToDeleteB2C && (
            <div className="space-y-3">
              <p className="text-gray-700">
                Are you sure you want to delete this <strong>B2C</strong> order?
              </p>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="font-medium text-gray-900">
                  Invoice: {orderToDeleteB2C.invoiceNumber}
                </p>
                <p className="text-gray-600 mt-1">
                  Customer: {orderToDeleteB2C.customerName}
                </p>
                <p className="text-gray-600 mt-1">
                  Email: {orderToDeleteB2C.customerEmail}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              if (orderToDeleteB2B) onConfirmB2B();
              if (orderToDeleteB2C) onConfirmB2C();
            }}
            disabled={isDeletingB2B || isDeletingB2C}
            className={`
              px-5 py-2.5 rounded-lg font-medium text-white flex items-center gap-2 transition-colors min-w-[140px] justify-center
              ${(isDeletingB2B || isDeletingB2C)
                ? "bg-red-400 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700"}
            `}
          >
            {(isDeletingB2B || isDeletingB2C) ? (
              <>
                <CloudCog className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              "Yes, Delete Order"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDeleteConfirmationModal;