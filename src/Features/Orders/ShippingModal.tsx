
'use client'; // This component will use client-side hooks like useState

import React, { useState } from 'react';

// Define the props that this modal component will accept
interface ShippingCostModalProps {
  isOpen: boolean; // Controls whether the modal is visible
  onClose: () => void; // Function to call when the modal should close
  onSubmit: (shippingCost: number) => void; // Function to call when the form is submitted
}

const ShippingCostModal: React.FC<ShippingCostModalProps> = ({ isOpen, onClose, onSubmit }) => {
  // State to hold the value of the shipping cost input field
  const [shippingCost, setShippingCost] = useState<string>('');

  // If the modal is not open, don't render anything
  if (!isOpen) return null;

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default browser form submission

    // Convert the input string to a number
    const cost = parseFloat(shippingCost);

    // Basic validation: Check if it's a valid non-negative number
    if (!isNaN(cost) && cost >= 0) {
      onSubmit(cost); // Call the onSubmit prop with the valid cost
      setShippingCost(''); // Clear the input field after submission
    } else {
      alert('Please enter a valid positive number for shipping cost.'); // Inform the user of invalid input
    }
  };

  return (
    // Modal Overlay: Covers the entire screen to block interaction with the background
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
      {/* Modal Content: The actual box with the form */}
      <div className="bg-white p-8 rounded-lg shadow-xl w-11/12 max-w-md relative">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Enter Shipping Cost</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="shippingCost" className="block text-gray-700 text-lg font-semibold mb-2">
              Shipping Cost:
            </label>
            <input
              type="number" // HTML5 number input for better mobile experience and basic validation
              id="shippingCost"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
              placeholder="e.g., 150.00"
              required // Make the field mandatory
              min="0" // Only allow non-negative values
              step="0.01" // Allow two decimal places for currency
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
            />
          </div>
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition duration-200 text-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 text-lg"
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShippingCostModal;