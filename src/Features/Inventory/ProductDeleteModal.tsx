"use client";
import { Button } from "@/components/ui/button";
import { payload } from "@/redux/api/inventory";
import { useState } from "react";

interface ProductDeleteModalProps {
  product: payload | null;
  onDelete: (_id: string) => void;
  trigger: React.ReactNode; // Button or element to trigger the modal
}

export default function ProductDeleteModal({ product, onDelete, trigger }: ProductDeleteModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasDeletePermission = true;

  const handleDelete = () => {
    if (product?._id) onDelete(product._id);
    setIsOpen(false);
  };

  if (!product) return null;

  return (
    <>
      <div onClick={() => setIsOpen(true)}>{trigger}</div>

      {isOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50" onClick={(e) => {
          if (e.target === e.currentTarget) setIsOpen(false); // Close on backdrop click
        }}>
          <div className="bg-white p-6 rounded-lg w-full max-w-md mx-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h2 className="text-lg font-medium">Confirm Delete</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">&times;</button>
            </div>
            <div className="space-y-4 mt-4">
              <p>Are you sure you want to delete <strong>{product.name}</strong>?</p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={handleDelete} disabled={!hasDeletePermission}>Delete</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}