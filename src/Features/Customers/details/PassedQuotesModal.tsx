import React from "react";
import { Button } from "@/components/ui/button";
import { Customer } from "@/types";

interface PassedQuotesModalProps {
  isOpen: boolean;
  quotedList: Customer["quotedList"];
  onClose: () => void;
}

const PassedQuotesModal: React.FC<PassedQuotesModalProps> = ({
  isOpen,
  quotedList,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-3xl">
        <h2 className="text-xl font-bold mb-4">Passed Quotes from prospect</h2>
        {quotedList.length === 0 ? (
          <p className="text-gray-500">No quoted items available.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 border-b text-left">Item Number</th>
                  <th className="py-2 px-4 border-b text-left">Item Name</th>
                  <th className="py-2 px-4 border-b text-left">Packet Size</th>
                  <th className="py-2 px-4 border-b text-left">Price</th>
                </tr>
              </thead>
              <tbody>
                {quotedList.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="py-2 px-4 border-b">{item.itemNumber}</td>
                    <td className="py-2 px-4 border-b">{item.itemName}</td>
                    <td className="py-2 px-4 border-b">{item.packetSize}</td>
                    <td className="py-2 px-4 border-b">${item.price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PassedQuotesModal;