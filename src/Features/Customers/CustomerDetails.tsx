"use client";

import {
  useGetSingleCustomerQuery,
  useUpdateCustomerMutation,
} from "@/redux/api/customers";
import Switch from "react-switch";
import { useParams } from "next/navigation";
import Loading from "@/redux/Shared/Loading";
import { toast } from "react-toastify";
import { useState, useEffect } from "react";
import { Customer } from "@/types";
import imageUpload from "@/lib/ImageUploader";
import CustomerInfoCard from "./details/CustomerInfoCard";
import AdditionalInfoCard from "./details/AdditionalInfoCard";
import OrderHistoryTable from "./details/OrderHistoryTable";
import ModalForm from "./details/ModalForm";
import DocumentUploadCard from "./details/DocumentUploadCard";
import PassedQuotesModal from "./details/PassedQuotesModal";
import AdditionalInfoModal from "./details/AdditionalInfoModal";
import { Mail, Plus, X, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { registerInOtherSystem } from "@/lib/crossSystemRegister";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface SecondaryEmail {
  email: string;
  sendEmails: boolean;
}

const CustomerDetailsPage: React.FC = () => {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading, isError, refetch } = useGetSingleCustomerQuery(id, {
    refetchOnMountOrArgChange: true,
  });
  const [updateCustomer, { isLoading: isUpdatingCustomer }] =
    useUpdateCustomerMutation();

  const [isCreatingInOtherSystem, setIsCreatingInOtherSystem] = useState(false);

  // Modal States
  const [isBasicModalOpen, setIsBasicModalOpen] = useState(false);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [isFinancialModalOpen, setIsFinancialModalOpen] = useState(false);
  const [isAdditionalModalOpen, setIsAdditionalModalOpen] = useState(false);
  const [isPassedQuotesModalOpen, setIsPassedQuotesModalOpen] = useState(false);

  // Block Order State
  const [isOrderBlocked, setIsOrderBlocked] = useState(false);

  // Secondary Emails State for editing
  const [secondaryEmails, setSecondaryEmails] = useState<SecondaryEmail[]>([]);
  const [secondaryEmailInput, setSecondaryEmailInput] = useState("");
  const [sendEmailsToNewEmail, setSendEmailsToNewEmail] = useState(true);
  const [secondaryEmailError, setSecondaryEmailError] = useState("");

  // Form States
  const [basicForm, setBasicForm] = useState({
    storePersonName: "",
    storePersonPhone: "",
    storePersonEmail: "",
    storePhone: "",
    whatsappGroupLink: "",
    secondaryEmails: [] as SecondaryEmail[],
  });
  const [billingForm, setBillingForm] = useState({
    billingAddress: "",
    billingCity: "",
    billingState: "",
    billingZipcode: "",
  });
  const [shippingForm, setShippingForm] = useState({
    shippingAddress: "",
    shippingCity: "",
    shippingState: "",
    shippingZipcode: "",
  });
  const [financialForm, setFinancialForm] = useState({
    openBalance: 0,
    totalOrders: 0,
    totalOrderAmount: 0,
    salesTaxId: "",
    creditBalance: 0,
  });
  const [additionalForm, setAdditionalForm] = useState({
    acceptedDeliveryDays: [] as string[],
    bankACHAccountInfo: "",
    note: "",
    businessExpirationDate: "",
    termDays: 0,
  });

  // File Upload States
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(
    null,
  );
  const [selectedFiles, setSelectedFiles] = useState<{
    [key: string]: File | null;
  }>({
    creditApplication: null,
    ownerLegalFrontImage: null,
    ownerLegalBackImage: null,
    voidedCheckImage: null,
  });

  // Validate email format
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Truncate a display value to maxLength characters, appending "..." if cut off
  const truncate = (value: string | undefined, maxLength: number) => {
    if (!value) return "—";
    return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
  };

  // Update send email status for a secondary email
  const updateSendEmailStatus = (index: number, sendEmails: boolean) => {
    setSecondaryEmails(prev => prev.map((item, i) =>
      i === index ? { ...item, sendEmails } : item
    ));
  };

  // Add secondary email
  const handleAddSecondaryEmail = () => {
    if (!secondaryEmailInput.trim()) {
      setSecondaryEmailError("Email address is required");
      return;
    }

    if (!isValidEmail(secondaryEmailInput.trim())) {
      setSecondaryEmailError("Please enter a valid email address");
      return;
    }

    if (secondaryEmails.length >= 3) {
      setSecondaryEmailError("Maximum 3 secondary emails allowed");
      return;
    }

    if (secondaryEmails.some(item => item.email === secondaryEmailInput.trim())) {
      setSecondaryEmailError("This email address has already been added");
      return;
    }

    if (secondaryEmailInput.trim() === basicForm.storePersonEmail) {
      setSecondaryEmailError("Secondary email cannot be the same as primary email");
      return;
    }

    setSecondaryEmails(prev => [...prev, {
      email: secondaryEmailInput.trim(),
      sendEmails: sendEmailsToNewEmail
    }]);
    setSecondaryEmailInput("");
    setSendEmailsToNewEmail(true);
    setSecondaryEmailError("");
  };

  // Remove secondary email
  const handleRemoveSecondaryEmail = (index: number) => {
    setSecondaryEmails(prev => prev.filter((_, i) => i !== index));
  };

  // Populate forms & block state when customer data loads
  useEffect(() => {
    if (data?.data) {
      const customer = data.data;
      setBasicForm({
        storePersonName: customer.storePersonName || "",
        storePersonPhone: customer.storePersonPhone || "",
        storePersonEmail: customer.storePersonEmail || "",
        storePhone: customer.storePhone || "",
        whatsappGroupLink: customer.whatsappGroupLink || "",
        secondaryEmails: customer.secondaryEmails || [],
      });
      setBillingForm({
        billingAddress: customer.billingAddress || "",
        billingCity: customer.billingCity || "",
        billingState: customer.billingState || "",
        billingZipcode: customer.billingZipcode || "",
      });
      setShippingForm({
        shippingAddress: customer.shippingAddress || "",
        shippingCity: customer.shippingCity || "",
        shippingState: customer.shippingState || "",
        shippingZipcode: customer.shippingZipcode || "",
      });
      setFinancialForm({
        openBalance: customer.openBalance || 0,
        totalOrders: customer.totalOrders || 0,
        totalOrderAmount: customer.totalOrderAmount || 0,
        salesTaxId: customer.salesTaxId || "",
        creditBalance: customer.creditBalance || 0,
      });
      setAdditionalForm({
        acceptedDeliveryDays: customer.acceptedDeliveryDays || [],
        bankACHAccountInfo: customer.bankACHAccountInfo || "",
        note: customer.note || "",
        businessExpirationDate: customer.businessExpirationDate
          ? new Date(customer.businessExpirationDate).toISOString().slice(0, 16)
          : "",
        termDays: customer.termDays || 0,
      });

      // Set secondary emails for the modal
      setSecondaryEmails(customer.secondaryEmails || []);

      // Set initial block state from backend (if the field exists)
      setIsOrderBlocked(customer.isOrderBlocked || false);
    }
  }, [data]);

  // Handle Block Toggle with API
  const handleToggleBlock = async () => {
    const newBlockedState = !isOrderBlocked;

    // Optimistic update
    setIsOrderBlocked(newBlockedState);

    try {
      const payload = { isOrderBlocked: newBlockedState };
      await updateCustomer({ id, data: payload }).unwrap();

      toast.success(
        `Orders ${newBlockedState ? "blocked" : "unblocked"} for this customer`,
      );
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update block status");
      // Rollback on error
      setIsOrderBlocked(!newBlockedState);
    }
  };



  // Handle Update (existing function)
  const handleUpdateCustomer = async (
    sectionData: any,
    sectionName: string,
  ) => {
    try {
      const payload = {
        ...sectionData,
        ...(sectionData.businessExpirationDate && {
          businessExpirationDate: new Date(
            sectionData.businessExpirationDate,
          ).toISOString(),
        }),
        termDays: sectionData.termDays
          ? Number(sectionData.termDays)
          : undefined,
      };

      const response = await updateCustomer({ id, data: payload }).unwrap();
      if (response.success) {
        toast.success(`${sectionName} updated successfully!`);
        refetch(); // Refresh customer data after update
        setIsFinancialModalOpen(false);
        setIsAdditionalModalOpen(false);
        setIsBasicModalOpen(false);
        setIsBillingModalOpen(false);
        setIsShippingModalOpen(false);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || `Failed to update ${sectionName}`);
    }
  };

  // Handle Update Basic Info with Secondary Emails
  const handleUpdateBasicInfo = async () => {
    try {
      const payload = {
        storePersonName: basicForm.storePersonName,
        storePersonPhone: basicForm.storePersonPhone,
        storePersonEmail: basicForm.storePersonEmail,
        storePhone: basicForm.storePhone,
        whatsappGroupLink: basicForm.whatsappGroupLink,
        secondaryEmails: secondaryEmails,
      };

      const response = await updateCustomer({ id, data: payload }).unwrap();
      if (response.success) {
        toast.success("Basic Info updated successfully!");
        setBasicForm(prev => ({ ...prev, secondaryEmails: secondaryEmails }));
        refetch();
        setIsBasicModalOpen(false);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to update Basic Info");
    }
  };

  // Document Upload (existing)
  const handleDocumentUpload = async (docType: string, file: File) => {
    setUploadingDocument(docType);
    try {
      const imageUrl = await imageUpload(file);
      if (imageUrl) {
        await updateCustomer({ id, data: { [docType]: imageUrl } }).unwrap();
        toast.success(`${docType.replace(/([A-Z])/g, " $1")} updated!`);
        setSelectedFiles((prev) => ({ ...prev, [docType]: null }));
        refetch();
      }
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploadingDocument(null);
    }
  };

  const handleFileSelect = (
    docType: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFiles((prev) => ({ ...prev, [docType]: file }));
  };

  const triggerUpload = (docType: string) => {
    const file = selectedFiles[docType];
    if (file) handleDocumentUpload(docType, file);
    else toast.error("Select a file first");
  };

  if (isLoading)
    return <Loading title="Loading Customer..." message="Please wait" />;
  if (isError || !data?.data)
    return <div className="text-center text-red-700">Customer not found</div>;

  const customer = data.data;

  console.log("Customer Data:", customer); // Debugging log

  // Format business expiration date for display
  const formattedExpiration = customer.businessExpirationDate
    ? new Date(customer.businessExpirationDate).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Not Set";

  // Creates a fresh copy of this customer in the SupplyPro (Arbora-Pack)
  // system, reusing the same public /customer/register endpoint and field
  // shape as the "Also save for Supply Pro" checkbox on the Add Customer
  // page. A new random password is generated since this customer's real
  // (hashed) password can't be read or reused.
  const handleCreateInOtherSystem = async () => {
    setIsCreatingInOtherSystem(true);
    try {
      const randomPassword = Math.random().toString(36).slice(-10) + "A1!";
      const result = await registerInOtherSystem({
        storeName: customer.storeName,
        storePersonName: customer.storePersonName,
        storePhone: customer.storePhone,
        storePersonPhone: customer.storePersonPhone,
        storePersonEmail: customer.storePersonEmail,
        billingAddress: customer.billingAddress,
        billingCity: customer.billingCity,
        billingState: customer.billingState,
        billingZipcode: customer.billingZipcode,
        shippingAddress: customer.shippingAddress,
        shippingCity: customer.shippingCity,
        shippingState: customer.shippingState,
        shippingZipcode: customer.shippingZipcode,
        password: randomPassword,
      });

      if (result.success) {
        toast.success(`${customer.storeName} was created in SupplyPro successfully!`);
      } else {
        toast.error(`Could not create ${customer.storeName} in SupplyPro: ${result.message}`);
      }
    } finally {
      setIsCreatingInOtherSystem(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-gray-800 border-b-4 border-red-800 pb-3 inline-block">
            Customer Details —{" "}
            <span className="text-red-800">{customer.storeName}</span>
          </h1>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={isCreatingInOtherSystem}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition disabled:opacity-50"
                title="More actions"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleCreateInOtherSystem}
                disabled={isCreatingInOtherSystem}
              >
                {isCreatingInOtherSystem
                  ? "Creating..."
                  : "Create this customer for SupplyPro"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8 mb-8">
          {/* Basic Info - Now with Secondary Emails */}
          <CustomerInfoCard
            title="Basic Info"
            data={{
              Name: customer.storePersonName || "—",
              "Store phone": customer.storePhone || "—",
              Email: customer.storePersonEmail || "—",
              "Cell phone": customer.storePersonPhone || "—",
              "WhatsApp Group": truncate(customer.whatsappGroupLink, 35),
            }}
            secondaryEmails={customer.secondaryEmails}
            onEdit={() => setIsBasicModalOpen(true)}
          />

          {/* Billing Info */}
          <CustomerInfoCard
            title="Billing Info"
            data={{
              Address: customer.billingAddress || "—",
              City: customer.billingCity || "—",
              State: customer.billingState || "—",
              Zipcode: customer.billingZipcode || "—",
            }}
            onEdit={() => setIsBillingModalOpen(true)}
          />

          {/* Shipping Info */}
          <CustomerInfoCard
            title="Shipping Info"
            data={{
              Address: customer.shippingAddress || "—",
              City: customer.shippingCity || "—",
              State: customer.shippingState || "—",
              Zipcode: customer.shippingZipcode || "—",
            }}
            onEdit={() => setIsShippingModalOpen(true)}
          />

          {/* Financial Info — Now includes Credit Balance */}
          <CustomerInfoCard
            title="Financial Info"
            data={{
              "Open Balance": `$${customer.openBalance?.toFixed(2) || "0.00"}`,
              "Total Orders": customer.totalOrders || "0",
              "Total Amount": `$${
                customer.totalOrderAmount?.toFixed(2) || "0.00"
              }`,
              "Tax ID": customer.salesTaxId || "—",
              "Credit Balance": `$${customer.creditBalance?.toFixed(2) || "0.00"}`,
              "Business Expiration": formattedExpiration,
            }}
            onEdit={() => setIsFinancialModalOpen(true)}
          />

          {/* Document Uploads */}
          <DocumentUploadCard
            customer={customer}
            onUploadSuccess={() => refetch()}
          />

          <AdditionalInfoCard
            customer={customer}
            additionalForm={additionalForm}
            onEdit={() => setIsAdditionalModalOpen(true)}
            handleDeliveryDayChange={(day) =>
              setAdditionalForm((prev) => ({
                ...prev,
                acceptedDeliveryDays: prev.acceptedDeliveryDays.includes(day)
                  ? prev.acceptedDeliveryDays.filter((d) => d !== day)
                  : [...prev.acceptedDeliveryDays, day],
              }))
            }
          />
        </div>

        {/* Email & Quotes Section */}
        <div className="bg-white rounded-xl shadow-xl p-3 border border-gray-200 mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-bold text-gray-800">Actions</h2>

            <div className="flex flex-wrap items-center gap-6">
              {/* Block Order Switch using react-switch */}
              <div
                className={`
                  flex items-center gap-4 bg-gray-50 px-5 py-2 rounded-md border
                  ${
                    isUpdatingCustomer
                      ? "border-2 border-indigo-500 animate-border-pulse"
                      : "border border-gray-200"
                  }
                `}
              >
                <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  Block Orders
                </span>

                <Switch
                  onChange={handleToggleBlock}
                  checked={isOrderBlocked}
                  disabled={isUpdatingCustomer}
                  onColor="#ef4444"
                  offColor="#10b981"
                  onHandleColor="#f87171"
                  offHandleColor="#34d399"
                  handleDiameter={24}
                  uncheckedIcon={false}
                  checkedIcon={false}
                  boxShadow="0px 1px 5px rgba(0, 0, 0, 0.2)"
                  activeBoxShadow="0px 0px 1px 10px rgba(0, 0, 0, 0.1)"
                  height={28}
                  width={56}
                  className="react-switch"
                  id="block-order-switch"
                />

                <span
                  className={`text-sm font-semibold ${isOrderBlocked ? "text-red-800" : "text-green-700"}`}
                >
                  {isOrderBlocked ? "Blocked" : "Allowed"}
                </span>
              </div>

              <style jsx>{`
                @keyframes borderPulse {
                  0% {
                    border-color: rgba(99, 102, 241, 0.4);
                  }
                  50% {
                    border-color: rgba(99, 102, 241, 0.8);
                  }
                  100% {
                    border-color: rgba(99, 102, 241, 0.4);
                  }
                }
                .animate-border-pulse {
                  animation: borderPulse 1.5s infinite ease-in-out;
                }
              `}</style>

              {customer.quotedList?.length > 0 && (
                <button
                  onClick={() => setIsPassedQuotesModalOpen(true)}
                  className="px-5 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition"
                >
                  View Past Quotes
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Order History */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Order History
          </h2>
          <OrderHistoryTable orders={customer.customerOrders || []} />
        </div>

        {/* Basic Info Modal with Secondary Emails */}
        <ModalForm
          isOpen={isBasicModalOpen}
          title="Update Basic Info"
          fields={[
            {
              key: "storePersonName",
              value: basicForm.storePersonName,
              placeholder: "Name",
            },
            {
              key: "storePhone",
              value: basicForm.storePhone,
              placeholder: "Store Phone",
            },
            // {
            //   key: "storePersonEmail",
            //   value: basicForm.storePersonEmail,
            //   placeholder: "Email",
            // },
            {
              key: "cellPhone",
              value: basicForm.storePersonPhone,
              placeholder: "Phone",
            },
            {
              key: "whatsappGroupLink",
              value: basicForm.whatsappGroupLink,
              placeholder: "WhatsApp Group Link",
            },
          ]}
          onChange={(k, v) => {
            const value = (k === "storePhone" || k === "cellPhone") ? v.replace(/\D/g, "").slice(0, 10) : v;
            setBasicForm((p) => ({ ...p, [k]: value }));
          }}
          onClose={() => setIsBasicModalOpen(false)}
          onSubmit={handleUpdateBasicInfo}
          extraContent={
            <div className="mt-4 pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Secondary Emails
                <span className="text-xs text-gray-500">(Optional, max 3)</span>
              </label>

              {/* Display existing secondary emails */}
              {secondaryEmails.length > 0 && (
                <div className="space-y-2 mb-3">
                  {secondaryEmails.map((secEmail, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between gap-3 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <Mail className="w-4 h-4 text-orange-600" />
                        <span className="text-gray-700">{secEmail.email}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={secEmail.sendEmails}
                            onChange={(e) => updateSendEmailStatus(index, e.target.checked)}
                            className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                          />
                          <span className="text-sm text-gray-600">Send emails</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => handleRemoveSecondaryEmail(index)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Input to add new secondary email */}
              {secondaryEmails.length < 3 && (
                <div className="space-y-2 border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="email"
                        placeholder="Enter secondary email address"
                        value={secondaryEmailInput}
                        onChange={(e) => {
                          setSecondaryEmailInput(e.target.value);
                          setSecondaryEmailError("");
                        }}
                        className="focus:ring-orange-500 focus:border-orange-500"
                      />
                      {secondaryEmailError && (
                        <p className="text-red-500 text-xs mt-1">{secondaryEmailError}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleAddSecondaryEmail}
                      className="border-orange-600 text-orange-600 hover:bg-orange-50"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add
                    </button>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendEmailsToNewEmail}
                      onChange={(e) => setSendEmailsToNewEmail(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-600">Send emails to this address</span>
                  </label>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Add up to 3 additional email addresses. You can choose whether to send emails to each address.
              </p>
            </div>
          }
        />

        <ModalForm
          isOpen={isBillingModalOpen}
          title="Update Billing Info"
          fields={[
            {
              key: "billingAddress",
              value: billingForm.billingAddress,
              placeholder: "Address",
            },
            {
              key: "billingCity",
              value: billingForm.billingCity,
              placeholder: "City",
            },
            {
              key: "billingState",
              value: billingForm.billingState,
              placeholder: "State",
            },
            {
              key: "billingZipcode",
              value: billingForm.billingZipcode,
              placeholder: "Zipcode",
            },
          ]}
          onChange={(k, v) => setBillingForm((p) => ({ ...p, [k]: v }))}
          onClose={() => setIsBillingModalOpen(false)}
          onSubmit={() => handleUpdateCustomer(billingForm, "Billing Info")}
        />

        <ModalForm
          isOpen={isShippingModalOpen}
          title="Update Shipping Info"
          fields={[
            {
              key: "shippingAddress",
              value: shippingForm.shippingAddress,
              placeholder: "Address",
            },
            {
              key: "shippingCity",
              value: shippingForm.shippingCity,
              placeholder: "City",
            },
            {
              key: "shippingState",
              value: shippingForm.shippingState,
              placeholder: "State",
            },
            {
              key: "shippingZipcode",
              value: shippingForm.shippingZipcode,
              placeholder: "Zipcode",
            },
          ]}
          onChange={(k, v) => setShippingForm((p) => ({ ...p, [k]: v }))}
          onClose={() => setIsShippingModalOpen(false)}
          onSubmit={() => handleUpdateCustomer(shippingForm, "Shipping Info")}
        />

        {/* Financial Info Modal — Now includes Credit Balance */}
        <ModalForm
          isOpen={isFinancialModalOpen}
          title="Update Financial Info"
          fields={[
            {
              key: "salesTaxId",
              value: financialForm.salesTaxId,
              placeholder: "Tax ID",
            },
            {
              key: "creditBalance",
              value: financialForm.creditBalance.toString(),
              placeholder: "Credit Balance",
              type: "number",
              step: "0.01",
            },
          ]}
          onChange={(k, v) => {
            if (k === "creditBalance") {
              setFinancialForm((p) => ({
                ...p,
                creditBalance: parseFloat(v) || 0,
              }));
            } else {
              setFinancialForm((p) => ({ ...p, [k]: v }));
            }
          }}
          onClose={() => setIsFinancialModalOpen(false)}
          onSubmit={() => handleUpdateCustomer(financialForm, "Financial Info")}
        />

        <AdditionalInfoModal
          isOpen={isAdditionalModalOpen}
          additionalForm={additionalForm}
          onChange={setAdditionalForm}
          onClose={() => setIsAdditionalModalOpen(false)}
          onSubmit={() =>
            handleUpdateCustomer(additionalForm, "Additional Info")
          }
        />

        <PassedQuotesModal
          isOpen={isPassedQuotesModalOpen}
          quotedList={customer.quotedList || []}
          onClose={() => setIsPassedQuotesModalOpen(false)}
        />

        {/* Back Button */}
        <div className="text-center mt-12">
          <button
            onClick={() => window.history.back()}
            className="px-8 py-4 bg-gray-200 text-black text-lg font-semibold rounded-xl hover:bg-gray-300 transition shadow-lg"
          >
            ←
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetailsPage;
