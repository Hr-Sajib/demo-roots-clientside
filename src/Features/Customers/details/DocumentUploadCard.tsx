// DocumentUploadCard.tsx
import { Customer } from "@/types";
import { useState } from "react";
import { toast } from "react-toastify";
import { useUpdateCustomerMutation } from "@/redux/api/customers";

interface DocumentUploadCardProps {
  customer: Customer;
  onUploadSuccess?: () => void;
}

const DocumentUploadCard: React.FC<DocumentUploadCardProps> = ({
  customer,
  onUploadSuccess,
}) => {
  const [updateCustomer, { isLoading: isUpdating }] = useUpdateCustomerMutation();

  const [uploadingDocument, setUploadingDocument] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<{
    [key: string]: File | null;
  }>({
    creditApplication: null,
    ownerLegalFrontImage: null,
    ownerLegalBackImage: null,
    voidedCheckImage: null,
  });

  const documents = [
    { key: "creditApplication", label: "Credit Application" },
    { key: "ownerLegalFrontImage", label: "Owner Legal ID (Front)" },
    { key: "ownerLegalBackImage", label: "Owner Legal ID (Back)" },
    { key: "voidedCheckImage", label: "Voided Check" },
  ];

  const handleFileSelect = (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFiles((prev) => ({ ...prev, [docType]: file }));
  };

  const handleUpload = async (docType: string) => {
    const file = selectedFiles[docType];
    if (!file) {
      toast.error(`Please select a file for ${docType}`);
      return;
    }

    setUploadingDocument(docType);

    const formData = new FormData();
    formData.append(docType, file);

    try {
      const response = await updateCustomer({
        id: customer._id,
        data: formData as any,   // Fix for FormData type error
      }).unwrap();

      if (response.success) {
        toast.success(`${docType.replace(/([A-Z])/g, " $1")} uploaded successfully!`);
        
        // Reset the selected file after successful upload
        setSelectedFiles((prev) => ({ ...prev, [docType]: null }));

        onUploadSuccess?.();
      }
    } catch (error: any) {
      toast.error(error?.data?.message || `Failed to upload ${docType}`);
      console.error("Upload error:", error);
    } finally {
      setUploadingDocument(null);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md relative">
      <h2 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">
        Documents
      </h2>
      <div className="space-y-1">
        {documents.map(({ key, label }) => (
          <div key={key} className="flex items-center space-x-4">
            <span className="font-medium text-gray-800 w-32">{label}:</span>
            
            {customer[key as keyof Customer] && (customer[key as keyof Customer] as string).length > 5 ? (
              <a
                href={customer[key as keyof Customer] as string}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 hover:underline"
              >
                View
              </a>
            ) : (
              <span className="text-gray-500 w-8.5">N/A</span>
            )}

            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => handleFileSelect(key, e)}
              className="text-sm border w-23 file:mr-4 file:py-1 file:px-2 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />

            <button
              onClick={() => handleUpload(key)}
              disabled={uploadingDocument === key || !selectedFiles[key]}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {uploadingDocument === key ? "Uploading..." : "Update"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentUploadCard;