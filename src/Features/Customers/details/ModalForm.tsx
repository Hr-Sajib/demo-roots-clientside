import { Input } from "@/components/ui/input";

interface Field {
  key: string;
  value: string | number;
  placeholder: string;
  type?: string;      // ← NEW: Allow custom input type
  step?: string;      // ← NEW: Allow step for number inputs
}

interface ModalFormProps {
  isOpen: boolean;
  title: string;
  fields: Field[];
  onChange: (key: string, value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitText?: string;
}

const ModalForm: React.FC<ModalFormProps> = ({
  isOpen,
  title,
  fields,
  onChange,
  onClose,
  onSubmit,
  submitText = "Save",
}) => {
  if (!isOpen) return null;

  // Function to capitalize and format label text
  const formatLabel = (key: string) => {
    return key
      .split(/(?=[A-Z])/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <div className="space-y-4">
          {fields.map(({ key, value, placeholder, type = "text", step }) => (
            <div key={key} className="flex flex-col">
              <label htmlFor={key} className="mb-1 text-sm font-medium text-gray-400">
                {formatLabel(key)}
              </label>
              <Input
                id={key}
                type={type}                    // ← Now supports "number", "email", etc.
                step={step}                    // ← Supports decimal steps
                value={value}
                onChange={(e) => onChange(key, e.target.value)}
                placeholder={placeholder}
                className="w-full p-2 border rounded"
              />
            </div>
          ))}
        </div>
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
            {submitText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalForm;