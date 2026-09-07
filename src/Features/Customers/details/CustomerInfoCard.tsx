// CustomerInfoCard.tsx
import { PencilIcon, Mail, Bell } from "lucide-react";

interface SecondaryEmail {
  email: string;
  sendEmails: boolean;
}

interface CustomerInfoCardProps {
  title: string;
  data: { [key: string]: string | number | undefined };
  onEdit: () => void;
  extraContent?: React.ReactNode;
  secondaryEmails?: SecondaryEmail[];
}

const CustomerInfoCard: React.FC<CustomerInfoCardProps> = ({ 
  title, 
  data, 
  onEdit, 
  extraContent,
  secondaryEmails 
}) => {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md relative">
      <h2 className="text-lg font-bold text-gray-900 mb-3 border-b border-gray-200 pb-2">
        {title}
      </h2>
      <div className="space-y-2">
        {Object.entries(data).map(([key, value]) => (
          <p key={key} className="text-gray-600">
            <span className="font-medium text-gray-800">
              {key.includes("Name") && <span className="text-sm mr-1">👤</span>}
              {key.includes("phone") && <span className="text-sm mr-1">📞</span>}
              {key.includes("Email") && <span className="text-sm mr-1">🌐</span>}
              {key}:{" "}
            </span>
            {value || "N/A"}
          </p>
        ))}
        
        {/* Display Secondary Emails if provided */}
        {secondaryEmails && secondaryEmails.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-100">
            <p className=" text-gray-800 mb-2 flex items-center gap-1">
              <Mail className="w-4 h-4" />
              Secondary Emails
            </p>
            <div className="space-y-1.5 pl-1">
              {secondaryEmails.map((secEmail, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{secEmail.email}</span>
                  <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                    secEmail.sendEmails 
                      ? "bg-green-100 text-green-700" 
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    <Bell className="w-3 h-3" />
                    {secEmail.sendEmails ? "Emails ON" : "Emails OFF"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {extraContent && (
        <div className="mt-3 pt-2 border-t border-gray-100">
          {extraContent}
        </div>
      )}
      
      <button
        onClick={onEdit}
        className="mt-4 p-2 bg-gray-200 rounded-full border transition duration-300 absolute top-4 right-4 flex items-center justify-center"
        aria-label={`Edit ${title}`}
      >
        <PencilIcon className="h-5 w-5 text-red-700" />
      </button>
    </div>
  );
};

export default CustomerInfoCard;