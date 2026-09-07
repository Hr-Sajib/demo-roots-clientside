// ConfirmationDialog.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";

interface ConfirmationDialogProps {
  deleteId: string | null;
  onClose: () => void;
  onConfirm: (id: string) => void;
}

export default function ConfirmationDialog({
  deleteId,
  onClose,
  onConfirm,
}: ConfirmationDialogProps) {
  if (!deleteId) return null;

  const handleConfirm = () => {
    onConfirm(deleteId);
  };

  return (
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">
          Confirm Delete
        </h3>
        <p className="mb-4 text-gray-600">
          Are you sure you want to delete this user?
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </Button>
          <Button
            className="bg-red-600 text-white hover:bg-red-700"
            onClick={handleConfirm}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}