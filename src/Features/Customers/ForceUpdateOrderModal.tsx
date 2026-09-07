"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateOrderMutation } from "@/redux/api/orders";
import toast from "react-hot-toast";

interface ForceUpdateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    _id: string;
    PONumber: string;
    totalPayable: number;
    openBalance: number;
  } | null;
}

export default function ForceUpdateOrderModal({
  isOpen,
  onClose,
  order,
}: ForceUpdateOrderModalProps) {
  const [payableAdjustment, setPayableAdjustment] = useState("");
  const [adjustmentNote, setAdjustmentNote] = useState("");

  const [updateOrder, { isLoading }] = useUpdateOrderMutation();

  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Reset form when modal opens/closes or order changes
  useEffect(() => {
    if (isOpen && order) {
      setPayableAdjustment("");
      setAdjustmentNote("");
    }
  }, [isOpen, order]);

  const handleSave = async () => {
    if (!order) return;

    const adjustmentValue = parseFloat(payableAdjustment);

    // Validate adjustment amount
    if (isNaN(adjustmentValue)) {
      toast.error("Please enter a valid number for adjustment");
      return;
    }

    // If adjustment is not zero, require a note
    if (adjustmentValue !== 0 && !adjustmentNote.trim()) {
      toast.error("Adjustment note is required when applying an adjustment");
      return;
    }

    const updatedData = {
      id: order._id,
      payableAdjustment: adjustmentValue,
      payableAdjustmentNote: adjustmentNote.trim() ? adjustmentNote.trim() : undefined,
    };

    try {
      const result = await updateOrder(updatedData).unwrap();
      if (result.success) {
        toast.success("Payable adjustment applied successfully!");
        onClose();
      }
    } catch (error: any) {
      console.log(error)
      toast.error(error?.data?.message || "Failed to apply adjustment");
    }
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50 rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Adjust Payable Amount
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Order: {order.PONumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Payable Adjustment */}
          <div className="space-y-2">
            <Label htmlFor="payableAdjustment" className="text-sm font-medium">
              Payable Adjustment (±)
            </Label>
            <Input
              id="payableAdjustment"
              type="number"
              step="0.01"
              value={payableAdjustment}
              onChange={(e) => setPayableAdjustment(e.target.value)}
              placeholder="e.g. 50.00 or -25.00"
              className="text-lg"
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
            />
            <p className="text-xs text-gray-500">
              Enter positive to increase payable, negative to reduce
            </p>
          </div>

          {/* Adjustment Note */}
          <div className="space-y-2">
            <Label htmlFor="adjustmentNote" className="text-sm font-medium">
              Adjustment Note{" "}
              {payableAdjustment && parseFloat(payableAdjustment) !== 0 && (
                <span className="text-red-600">*</span>
              )}
            </Label>
            <Textarea
              id="adjustmentNote"
              value={adjustmentNote}
              required
              onChange={(e) => setAdjustmentNote(e.target.value)}
              placeholder="Reason for adjustment (e.g. damage discount, goodwill gesture, etc.)"
              rows={4}
              className="resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 rounded-b-xl">
          <Button
            onClick={onClose}
            variant="outline"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-red-700 hover:bg-red-600 text-white"
            disabled={isLoading}
          >
            {isLoading ? "Applying..." : "Apply Adjustment"}
          </Button>
        </div>
      </div>
    </div>
  );
}