import React from "react";
import { Input } from "@/components/ui/input";

interface AdditionalForm {
  acceptedDeliveryDays: string[];
  bankACHAccountInfo: string;
  note: string;
  businessExpirationDate: string;
  termDays: number;
}

interface AdditionalInfoModalProps {
  isOpen: boolean;
  additionalForm: AdditionalForm;
  onChange: (form: AdditionalForm) => void;
  onClose: () => void;
  onSubmit: () => void;
}

const deliveryDays = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
];

const AdditionalInfoModal: React.FC<AdditionalInfoModalProps> = ({
  isOpen,
  additionalForm,
  onChange,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null;

  const handleDeliveryDayChange = (day: string) => {
    const updatedDays = additionalForm.acceptedDeliveryDays.includes(day)
      ? additionalForm.acceptedDeliveryDays.filter((d) => d !== day)
      : [...additionalForm.acceptedDeliveryDays, day];
    onChange({ ...additionalForm, acceptedDeliveryDays: updatedDays });
  };

  const handleInputChange = (key: keyof AdditionalForm, value: string) => {
    onChange({ ...additionalForm, [key]: value });
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Update Additional Info</h2>
        <div className="space-y-4">

          {/* Bank ACH Account Info */}
          <div className="flex flex-col">
            <label htmlFor="bankACHAccountInfo" className="mb-1 text-sm font-medium text-gray-700">
              Bank ACH Account Info
            </label>
            <Input
              id="bankACHAccountInfo"
              type="text"
              value={additionalForm.bankACHAccountInfo}
              onChange={(e) => handleInputChange("bankACHAccountInfo", e.target.value)}
              placeholder="Bank Info"
              className="w-full p-2 border rounded"
            />
          </div>

          {/* Note */}
          <div className="flex flex-col">
            <label htmlFor="note" className="mb-1 text-sm font-medium text-gray-700">
              Note
            </label>
            <Input
              id="note"
              type="text"
              value={additionalForm.note}
              onChange={(e) => handleInputChange("note", e.target.value)}
              placeholder="Note"
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="flex flex-col">
            <label htmlFor="termDays" className="mb-1 text-sm font-medium text-gray-700">
              Term Days
            </label>
            <Input
              id="termDays"
              type="number"
              value={additionalForm.termDays}
              onChange={(e) => handleInputChange("termDays", e.target.value)}
              placeholder="Term Days"
              className="w-full p-2 border rounded"
              onWheel={(e) => (e.target as HTMLInputElement).blur()}
            />
          </div>

          {/* NEW FIELD: Business Expiration Date */}
          <div className="flex flex-col">
            <label htmlFor="businessExpirationDate" className="mb-1 text-sm font-medium text-gray-700">
              Business Expiration Date <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <Input
              id="businessExpirationDate"
              type="datetime-local"
              value={additionalForm.businessExpirationDate}
              onChange={(e) => handleInputChange("businessExpirationDate", e.target.value)}
              className="w-full p-2 border rounded"
            />
          </div>

          {/* Accepted Delivery Days */}
          <div className="flex flex-col">
            <label className="mb-1 text-sm font-medium text-gray-700">Accepted Delivery Days</label>
            <div className="grid grid-cols-2 gap-2">
              {deliveryDays.map((day) => (
                <label key={day} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={additionalForm.acceptedDeliveryDays.includes(day)}
                    onChange={() => handleDeliveryDayChange(day)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-sm capitalize">{day}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Buttons — EXACT SAME AS BEFORE */}
        <div className="mt-4 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="border rounded-full px-4 py-2 text-red-700 hover:font-bold"
          >
            X
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 bg-red-800 text-white rounded-md hover:bg-red-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdditionalInfoModal;