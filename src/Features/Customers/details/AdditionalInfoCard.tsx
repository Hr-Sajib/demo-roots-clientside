import { Customer } from "@/types";
import { PencilIcon } from "lucide-react";

interface AdditionalInfoCardProps {
  customer: Customer;
  additionalForm: {
    acceptedDeliveryDays: string[];
    bankACHAccountInfo: string;
    note: string;
  };
  onEdit: () => void;
  handleDeliveryDayChange: (day: string) => void;
}

const AdditionalInfoCard: React.FC<AdditionalInfoCardProps> = ({
  customer,
  additionalForm,
  onEdit,
  handleDeliveryDayChange,
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md relative w-100">
      <h2 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">
        Additional Info
      </h2>
      <div className="space-y-2">
        <p className="text-gray-600">
          <span className="font-medium text-gray-800">Delivery Days:</span>{" "}
          {customer.acceptedDeliveryDays.join(", ") || "N/A"}
        </p>
        <p className="text-gray-600">
          <span className="font-medium text-gray-800">Bank Info:</span>{" "}
          {customer.bankACHAccountInfo || "N/A"}
        </p>
        <p className="text-gray-600">
          <span className="font-medium text-gray-800">Term days:</span>{" "}
          {customer.termDays || "N/A"}
        </p>
        <p className="text-gray-600">
          <span className="font-medium text-gray-800">Note:</span>{" "}
          {customer.note || "N/A"}
        </p>

        <div>
          <p className="text-gray-400">Assigned to : {customer?.assignedSalesPerson?.email || "N/A"}</p>
          <p className="text-gray-400">Commission : {customer.commissionRate || "N/A"}%</p>

        </div>
      </div>
      <button
        onClick={onEdit}
        className="mt-4 p-2 bg-gray-200 rounded-full border transition duration-300 absolute top-4 right-4 flex items-center justify-center"
        aria-label="Edit Additional Info"
      >
        <PencilIcon className="h-5 w-5 text-red-700" />
      </button>
    </div>
  );
};

export default AdditionalInfoCard;