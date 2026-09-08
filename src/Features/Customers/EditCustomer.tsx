"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useParams, useRouter } from "next/navigation";
import {
  useUpdateCustomerMutation,
  useGetSingleCustomerQuery,
} from "@/redux/api/customers";
import { toast } from "react-hot-toast";
import { Customer } from "@/types";
import Cookies from "js-cookie";
import { Loader2, X, Plus, Mail, User, Percent } from "lucide-react";
import { useGetAllUsersQuery } from "@/redux/api/admin";

type FileField =
  | "creditApplication"
  | "ownerLegalFrontImage"
  | "ownerLegalBackImage"
  | "voidedCheckImage";

// Phone numbers are stored/displayed as plain digits only — no
// parentheses/dashes formatting.
const formatPhoneNumber = (value: string, inputElement: HTMLInputElement | null): string => {
  return value.replace(/\D/g, "").slice(0, 10);
};

// US States array for reuse
const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

// Prevent mouse wheel from changing number input values
const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
  e.currentTarget.blur();
  e.preventDefault();
  e.stopPropagation();
};

// Prevent mouse wheel on number inputs globally
const preventWheelOnNumberInputs = () => {
  // This function can be called in useEffect to add event listeners
  // but using the onWheel prop on each input is more reliable
};

interface SecondaryEmail {
  email: string;
  sendEmails: boolean;
}

export default function EditCustomerPage() {
  const { id } = useParams();
  const router = useRouter();
  const [role, setRole] = useState("");

  const { data: customerData, isLoading, error } = useGetSingleCustomerQuery(id as string, {
    skip: !id,
  });

  const { data: salesUsersResponse } = useGetAllUsersQuery();

  const [updateCustomer, { isLoading: isUpdating }] = useUpdateCustomerMutation();

  // Get role from cookie
  useEffect(() => {
    const roleCookie = document.cookie.split("; ").find((c) => c.startsWith("role="));
    if (roleCookie) setRole(roleCookie.split("=")[1]);
  }, []);

  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const canAssignSalesPersonOrCommission = isAdmin || isManager;

  // State for secondary emails (object array)
  const [secondaryEmails, setSecondaryEmails] = useState<SecondaryEmail[]>([]);
  const [secondaryEmailInput, setSecondaryEmailInput] = useState("");
  const [sendEmailsToNewEmail, setSendEmailsToNewEmail] = useState(true);
  const [secondaryEmailError, setSecondaryEmailError] = useState("");

  // Typed formData state — all fields included
  const [formData, setFormData] = useState<{
    _id: string;
    storeName: string;
    storePhone: string;
    storePersonEmail: string;
    salesTaxId: string;
    acceptedDeliveryDays: string[];
    isCustomerSourceProspect: boolean;
    bankACHAccountInfo: string;
    storePersonName: string;
    storePersonPhone: string;
    billingAddress: string;
    billingCity: string;
    billingState: string;
    billingZipcode: string;
    shippingAddress: string;
    shippingCity: string;
    shippingState: string;
    shippingZipcode: string;
    creditApplication: string;
    ownerLegalFrontImage: string;
    ownerLegalBackImage: string;
    voidedCheckImage: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
    note: string;
    whatsappGroupLink: string;
    termDays: string;
    assignedSalesPerson: string | null;
    commissionRate: number | null;
    sameAsBillingAddress: boolean;
  }>({
    _id: "",
    storeName: "",
    storePhone: "",
    storePersonEmail: "",
    salesTaxId: "",
    whatsappGroupLink: "",
    acceptedDeliveryDays: [],
    isCustomerSourceProspect: false,
    bankACHAccountInfo: "",
    storePersonName: "",
    storePersonPhone: "",
    billingAddress: "",
    billingCity: "",
    billingState: "",
    billingZipcode: "",
    shippingAddress: "",
    shippingCity: "",
    shippingState: "",
    shippingZipcode: "",
    creditApplication: "",
    ownerLegalFrontImage: "",
    ownerLegalBackImage: "",
    voidedCheckImage: "",
    isDeleted: false,
    createdAt: "",
    updatedAt: "",
    note: "",
    termDays: "",
    assignedSalesPerson: null,
    commissionRate: null,
    sameAsBillingAddress: false,
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const storePhoneRef = useRef<HTMLInputElement>(null);
  const storePersonPhoneRef = useRef<HTMLInputElement>(null);

  // File handling
  const [selectedFiles, setSelectedFiles] = useState<{
    [key in FileField]?: File | null;
  }>({
    creditApplication: null,
    ownerLegalFrontImage: null,
    ownerLegalBackImage: null,
    voidedCheckImage: null,
  });

  const [uploadingDocument, setUploadingDocument] = useState<FileField | null>(null);

  // Validate email format
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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

    if (secondaryEmailInput.trim() === formData.storePersonEmail) {
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

  const handleSameAsBillingAddress = (checked: boolean) => {
    if (checked) {
      setFormData((prev) => ({
        ...prev,
        sameAsBillingAddress: true,
        shippingAddress: prev.billingAddress,
        shippingCity: prev.billingCity,
        shippingState: prev.billingState,
        shippingZipcode: prev.billingZipcode,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        sameAsBillingAddress: false,
        shippingAddress: "",
        shippingCity: "",
        shippingState: "",
        shippingZipcode: "",
      }));
    }
  };

  // Populate form from customer data
  useEffect(() => {
    if (customerData?.data) {
      const c = customerData.data;

      setFormData({
        _id: c._id || "",
        storeName: c.storeName || "",
        storePhone: c.storePhone || "",
        storePersonEmail: c.storePersonEmail || "",
        salesTaxId: c.salesTaxId || "",
        whatsappGroupLink: c.whatsappGroupLink || "",
        acceptedDeliveryDays: c.acceptedDeliveryDays || [],
        isCustomerSourceProspect: c.isCustomerSourceProspect ?? false,
        bankACHAccountInfo: c.bankACHAccountInfo || "",
        storePersonName: c.storePersonName || "",
        storePersonPhone: c.storePersonPhone || "",
        billingAddress: c.billingAddress || "",
        billingCity: c.billingCity || "",
        billingState: c.billingState || "",
        billingZipcode: c.billingZipcode || "",
        shippingAddress: c.shippingAddress || "",
        shippingCity: c.shippingCity || "",
        shippingState: c.shippingState || "",
        shippingZipcode: c.shippingZipcode || "",
        creditApplication: c.creditApplication || "",
        ownerLegalFrontImage: c.ownerLegalFrontImage || "",
        ownerLegalBackImage: c.ownerLegalBackImage || "",
        voidedCheckImage: c.voidedCheckImage || "",
        isDeleted: c.isDeleted ?? false,
        createdAt: c.createdAt || "",
        updatedAt: c.updatedAt || "",
        note: c.note || "",
        termDays: c.termDays?.toString() || "",
        assignedSalesPerson: typeof c.assignedSalesPerson === "object"
          ? c.assignedSalesPerson?._id || null
          : c.assignedSalesPerson || null,
        commissionRate: c.commissionRate || null,
        sameAsBillingAddress: c.sameAsBillingAddress ?? false,
      });

      // Set secondary emails from customer data (handle both old and new format)
      if (c.secondaryEmails && Array.isArray(c.secondaryEmails)) {
        // Check if it's the old format (string array) or new format (object array)
        if (c.secondaryEmails.length > 0 && typeof c.secondaryEmails[0] === "string") {
          // Convert old format to new format
          setSecondaryEmails(c.secondaryEmails.map(email => ({ email, sendEmails: true })));
        } else {
          // New format
          setSecondaryEmails(c.secondaryEmails);
        }
      } else {
        setSecondaryEmails([]);
      }
    }
  }, [customerData]);

  if (isLoading) return <div className="p-4 text-center">Loading...</div>;
  if (error || !customerData?.data) return <div className="p-4 text-center text-red-500">Customer not found</div>;

  const customer = customerData.data;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let formattedValue: string = value;

    if (name === "storePhone" || name === "storePersonPhone") {
      formattedValue = formatPhoneNumber(value, null);
    }

    if (name === "commissionRate") {
      // Allow empty string or valid number
      if (value === "" || value === null) {
        setFormData((prev) => ({ ...prev, commissionRate: null }));
        setValidationErrors((prev) => ({ ...prev, commissionRate: "" }));
        return;
      }
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0) {
        setFormData((prev) => ({ ...prev, commissionRate: numValue }));
        setValidationErrors((prev) => ({ ...prev, commissionRate: "" }));
      }
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: formattedValue }));
    setValidationErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleBillingChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...(prev.sameAsBillingAddress && {
        shippingAddress: field === "billingAddress" ? value : prev.shippingAddress,
        shippingCity: field === "billingCity" ? value : prev.shippingCity,
        shippingState: field === "billingState" ? value : prev.shippingState,
        shippingZipcode: field === "billingZipcode" ? value : prev.shippingZipcode,
      }),
    }));
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const handleDeliveryDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const day = e.target.value.toLowerCase();
    const isChecked = e.target.checked;

    setFormData((prev) => ({
      ...prev,
      acceptedDeliveryDays: isChecked
        ? [...prev.acceptedDeliveryDays, day]
        : prev.acceptedDeliveryDays.filter((d) => d !== day),
    }));
  };

  const handleFileSelect = (docType: FileField, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFiles((prev) => ({ ...prev, [docType]: file }));
  };

  const handleUpload = async (docType: FileField) => {
    const file = selectedFiles[docType];
    if (!file) {
      toast.error(`Please select a file for ${docType}`);
      return;
    }

    setUploadingDocument(docType);

    const formDataToSend = new FormData();
    formDataToSend.append(docType, file);

    try {
      await updateCustomer({
        id: formData._id,
        data: formDataToSend as any,
      }).unwrap();

      toast.success(`${docType.replace(/([A-Z])/g, " $1")} uploaded successfully!`);

      // Reset selected file after successful upload
      setSelectedFiles((prev) => ({ ...prev, [docType]: null }));

    } catch (err: any) {
      toast.error(err?.data?.message || `Failed to upload ${docType}`);
      console.error("Upload error:", err);
    } finally {
      setUploadingDocument(null);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.storeName.trim()) errors.storeName = "Store name is required.";
    if (formData.storePhone.replace(/\D/g, "").length !== 10) {
      errors.storePhone = "Store phone must be 10 digits.";
    }
    if (!formData.storePersonName.trim()) errors.storePersonName = "Authorized person name is required.";
    if (formData.storePersonPhone.replace(/\D/g, "").length !== 10) {
      errors.storePersonPhone = "Cell phone must be 10 digits.";
    }
    if (!formData.storePersonEmail.match(/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/)) {
      errors.storePersonEmail = "Invalid email format.";
    }

    // Validate secondary emails format
    for (const secondaryEmail of secondaryEmails) {
      if (!isValidEmail(secondaryEmail.email)) {
        errors.secondaryEmails = "Invalid email format in secondary emails";
        break;
      }
    }

    // Billing validation
    if (!formData.billingAddress.trim()) errors.billingAddress = "Billing address is required.";
    if (!formData.billingCity.trim()) errors.billingCity = "Billing city is required.";
    if (!formData.billingState.trim()) errors.billingState = "Billing state is required.";
    if (!formData.billingZipcode.match(/^\d{5}$/)) errors.billingZipcode = "Billing zipcode must be 5 digits.";

    // Shipping validation
    if (!formData.sameAsBillingAddress) {
      if (!formData.shippingAddress.trim()) errors.shippingAddress = "Shipping address is required.";
      if (!formData.shippingCity.trim()) errors.shippingCity = "Shipping city is required.";
      if (!formData.shippingState.trim()) errors.shippingState = "Shipping state is required.";
      if (!formData.shippingZipcode.match(/^\d{5}$/)) errors.shippingZipcode = "Shipping zipcode must be 5 digits.";
    }

    // Validate commission rate
    if (formData.commissionRate !== null && formData.commissionRate !== undefined) {
      if (formData.commissionRate < 0 || formData.commissionRate > 100) {
        errors.commissionRate = "Commission rate must be between 0 and 100";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix validation errors.");
      return;
    }

    try {
      const formDataToSend = new FormData();

      // Append normal fields - convert everything to string
      Object.entries(formData).forEach(([key, value]) => {
        if (value === undefined || value === null) return;

        if (key === "acceptedDeliveryDays") {
          const daysString = Array.isArray(value) ? value.join(",") : String(value);
          formDataToSend.append(key, daysString);
        }
        else if (key === "commissionRate") {
          if (value !== null && value !== undefined) {
            formDataToSend.append(key, String(value));
          }
        }
        else if (typeof value === "boolean") {
          formDataToSend.append(key, value ? "true" : "false");
        }
        else if (key === "termDays") {
          formDataToSend.append(key, String(Number(value)));
        }
        else {
          formDataToSend.append(key, String(value));
        }
      });

      // Append secondary emails as array of objects
      secondaryEmails.forEach((secondaryEmail, index) => {
        formDataToSend.append(`secondaryEmails[${index}][email]`, secondaryEmail.email);
        formDataToSend.append(`secondaryEmails[${index}][sendEmails]`, secondaryEmail.sendEmails.toString());
      });

      // Append selected files
      if (selectedFiles.creditApplication) {
        formDataToSend.append("creditApplication", selectedFiles.creditApplication);
      }
      if (selectedFiles.ownerLegalFrontImage) {
        formDataToSend.append("ownerLegalFrontImage", selectedFiles.ownerLegalFrontImage);
      }
      if (selectedFiles.ownerLegalBackImage) {
        formDataToSend.append("ownerLegalBackImage", selectedFiles.ownerLegalBackImage);
      }
      if (selectedFiles.voidedCheckImage) {
        formDataToSend.append("voidedCheckImage", selectedFiles.voidedCheckImage);
      }

      await updateCustomer({
        id: formData._id,
        data: formDataToSend as any,
      }).unwrap();

      toast.success("Customer updated successfully");
      router.push("/customers");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update customer");
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto bg-white rounded-xl shadow-md mb-6">
      <h2 className="text-2xl font-bold mb-8 text-red-700">Edit Customer</h2>

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Basic Information */}
        <section className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-700 border-b border-orange-200 pb-2">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="storeName">
                Store Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="storeName"
                name="storeName"
                value={formData.storeName}
                onChange={handleChange}
                required
              />
              {validationErrors.storeName && <p className="text-red-500 text-sm">{validationErrors.storeName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="storePersonName">
                Authorized Person Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="storePersonName"
                name="storePersonName"
                value={formData.storePersonName}
                onChange={handleChange}
                required
              />
              {validationErrors.storePersonName && <p className="text-red-500 text-sm">{validationErrors.storePersonName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="storePhone">
                Store Phone <span className="text-red-600">*</span>
              </Label>
              <Input
                id="storePhone"
                name="storePhone"
                type="tel"
                value={formData.storePhone}
                onChange={handleChange}
                placeholder="1234567890"
                maxLength={10}
                ref={storePhoneRef}
                required
              />
              {validationErrors.storePhone && <p className="text-red-500 text-sm">{validationErrors.storePhone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="storePersonPhone">
                Cell Phone <span className="text-red-600">*</span>
              </Label>
              <Input
                id="storePersonPhone"
                name="storePersonPhone"
                type="tel"
                value={formData.storePersonPhone}
                onChange={handleChange}
                placeholder="1234567890"
                maxLength={10}
                ref={storePersonPhoneRef}
                required
              />
              {validationErrors.storePersonPhone && <p className="text-red-500 text-sm">{validationErrors.storePersonPhone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="storePersonEmail">
                Email Address <span className="text-red-600">*</span>
              </Label>
              <Input
                id="storePersonEmail"
                name="storePersonEmail"
                type="email"
                value={formData.storePersonEmail}
                onChange={handleChange}
                required
              />
              {validationErrors.storePersonEmail && <p className="text-red-500 text-sm">{validationErrors.storePersonEmail}</p>}
            </div>

            {/* Secondary Emails Field */}
            <div className="col-span-1 md:col-span-2">
              <div className="space-y-3">
                <Label className="text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-orange-600" />
                  Secondary Emails
                  <span className="text-xs text-gray-500 font-normal">(Optional, max 3)</span>
                </Label>

                {/* Display existing secondary emails */}
                {secondaryEmails.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {secondaryEmails.map((secondaryEmail, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-3 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <Mail className="w-4 h-4 text-orange-600" />
                          <span className="text-gray-700">{secondaryEmail.email}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={secondaryEmail.sendEmails}
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
                        <Input
                          type="email"
                          placeholder="Enter secondary email address"
                          value={secondaryEmailInput}
                          onChange={(e) => {
                            setSecondaryEmailInput(e.target.value);
                            setSecondaryEmailError("");
                          }}
                        />
                        {secondaryEmailError && (
                          <p className="text-red-500 text-xs mt-1">{secondaryEmailError}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        onClick={handleAddSecondaryEmail}
                        variant="outline"
                        className="border-orange-600 text-orange-600 hover:bg-orange-50"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
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

                {validationErrors.secondaryEmails && (
                  <p className="text-red-500 text-sm">{validationErrors.secondaryEmails}</p>
                )}
                <p className="text-xs text-gray-500">
                  Add up to 3 additional email addresses for this customer. You can choose whether to send emails to each address.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsappGroupLink">WhatsApp Group Link</Label>
              <Input
                id="whatsappGroupLink"
                name="whatsappGroupLink"
                value={formData.whatsappGroupLink}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="termDays">Term Days</Label>
              <Input
                id="termDays"
                name="termDays"
                type="number"
                min="0"
                step="1"
                value={formData.termDays}
                onChange={handleChange}
                placeholder="e.g., 30"
                onWheel={handleWheel}
              />
              <p className="text-xs text-gray-500">Net days for payment (e.g., Net 30 = 30 days)</p>
            </div>

            {/* Assigned Sales Person & Commission Rate - Bundled together */}
            {canAssignSalesPersonOrCommission && (
              <div className="col-span-1 md:col-span-2 border border-orange-700/50 p-4 rounded-xl bg-orange-50/30">
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-5 h-5 text-orange-600" />
                  <h4 className="font-semibold text-gray-700">Sales Assignment</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assignedSalesPerson">Assigned Sales Person</Label>
                    <select
                      id="assignedSalesPerson"
                      name="assignedSalesPerson"
                      value={formData.assignedSalesPerson || ""}
                      onChange={handleChange}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select Sales Person</option>
                      {salesUsersResponse?.data
                        ?.filter((user: any) => user.role === "salesUser")
                        .map((user: any) => (
                          <option key={user._id} value={user._id}>
                            {user.email}
                          </option>
                        ))}
                    </select>
                    {validationErrors.assignedSalesPerson && (
                      <p className="text-red-500 text-sm">{validationErrors.assignedSalesPerson}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="commissionRate" className="flex items-center gap-2">
                      <Percent className="w-4 h-4 text-orange-600" />
                      Commission Rate (%)
                      <span className="text-xs text-gray-500 font-normal">(Optional)</span>
                    </Label>
                    <Input
                      id="commissionRate"
                      name="commissionRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.commissionRate !== null ? formData.commissionRate : ""}
                      onChange={handleChange}
                      placeholder="e.g., 10"
                      className="w-full"
                      onWheel={handleWheel}
                    />
                    {validationErrors.commissionRate && (
                      <p className="text-red-500 text-sm">{validationErrors.commissionRate}</p>
                    )}
                    <p className="text-xs text-gray-500">Enter commission rate as percentage (0-100)</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Billing Information */}
        <section className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-700 border-b border-orange-200 pb-2">Billing Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="billingAddress">
                Billing Address <span className="text-red-600">*</span>
              </Label>
              <textarea
                id="billingAddress"
                name="billingAddress"
                value={formData.billingAddress}
                onChange={(e) => handleBillingChange("billingAddress", e.target.value)}
                required
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              {validationErrors.billingAddress && <p className="text-red-500 text-sm">{validationErrors.billingAddress}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingCity">
                Billing City <span className="text-red-600">*</span>
              </Label>
              <Input
                id="billingCity"
                name="billingCity"
                value={formData.billingCity}
                onChange={(e) => handleBillingChange("billingCity", e.target.value)}
                required
              />
              {validationErrors.billingCity && <p className="text-red-500 text-sm">{validationErrors.billingCity}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingState">
                Billing State <span className="text-red-600">*</span>
              </Label>
              <select
                id="billingState"
                name="billingState"
                value={formData.billingState}
                onChange={(e) => handleBillingChange("billingState", e.target.value)}
                required
                className="w-full h-10 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              >
                <option value="">Select State</option>
                {US_STATES.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
              {validationErrors.billingState && <p className="text-red-500 text-sm">{validationErrors.billingState}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="billingZipcode">
                Billing Zipcode <span className="text-red-600">*</span>
              </Label>
              <Input
                id="billingZipcode"
                name="billingZipcode"
                value={formData.billingZipcode}
                onChange={(e) => handleBillingChange("billingZipcode", e.target.value)}
                required
                onWheel={handleWheel}
              />
              {validationErrors.billingZipcode && <p className="text-red-500 text-sm">{validationErrors.billingZipcode}</p>}
            </div>
          </div>
        </section>

        {/* Same as Billing */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="sameAsBillingAddress"
            checked={formData.sameAsBillingAddress}
            onChange={(e) => handleSameAsBillingAddress(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
          />
          <Label htmlFor="sameAsBillingAddress" className="text-gray-700">Same as Billing Address</Label>
        </div>

        {/* Shipping Information */}
        <section className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-700 border-b border-orange-200 pb-2">Shipping Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="shippingAddress">
                Shipping Address <span className="text-red-600">*</span>
              </Label>
              <textarea
                id="shippingAddress"
                name="shippingAddress"
                value={formData.shippingAddress}
                onChange={handleChange}
                required
                disabled={formData.sameAsBillingAddress}
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              {validationErrors.shippingAddress && <p className="text-red-500 text-sm">{validationErrors.shippingAddress}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="shippingCity">
                Shipping City <span className="text-red-600">*</span>
              </Label>
              <Input
                id="shippingCity"
                name="shippingCity"
                value={formData.shippingCity}
                onChange={handleChange}
                required
                disabled={formData.sameAsBillingAddress}
              />
              {validationErrors.shippingCity && <p className="text-red-500 text-sm">{validationErrors.shippingCity}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="shippingState">
                Shipping State <span className="text-red-600">*</span>
              </Label>
              <select
                id="shippingState"
                name="shippingState"
                value={formData.shippingState}
                onChange={handleChange}
                required
                disabled={formData.sameAsBillingAddress}
                className="w-full h-10 rounded-md border border-input bg-transparent px-3 py-1 text-sm disabled:opacity-50"
              >
                <option value="">Select State</option>
                {US_STATES.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
              {validationErrors.shippingState && <p className="text-red-500 text-sm">{validationErrors.shippingState}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="shippingZipcode">
                Shipping Zipcode <span className="text-red-600">*</span>
              </Label>
              <Input
                id="shippingZipcode"
                name="shippingZipcode"
                value={formData.shippingZipcode}
                onChange={handleChange}
                required
                disabled={formData.sameAsBillingAddress}
                onWheel={handleWheel}
              />
              {validationErrors.shippingZipcode && <p className="text-red-500 text-sm">{validationErrors.shippingZipcode}</p>}
            </div>
          </div>
        </section>

        {/* Additional Information */}
        <section className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-700 border-b border-orange-200 pb-2">Additional Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="salesTaxId">Sales Tax ID</Label>
              <Input
                id="salesTaxId"
                name="salesTaxId"
                value={formData.salesTaxId}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-gray-700">Accept Delivery Days <span className="text-red-600">*</span></Label>
              <div className="flex flex-wrap gap-4 mt-2">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                  <label key={day} className="flex items-center gap-2 text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      value={day.toLowerCase()}
                      checked={formData.acceptedDeliveryDays.includes(day.toLowerCase())}
                      onChange={handleDeliveryDaysChange}
                      className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                    {day}
                  </label>
                ))}
              </div>
              {validationErrors.acceptedDeliveryDays && (
                <p className="text-red-500 text-sm">{validationErrors.acceptedDeliveryDays}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankACHAccountInfo">Bank ACH Account Info</Label>
              <Textarea
                id="bankACHAccountInfo"
                name="bankACHAccountInfo"
                value={formData.bankACHAccountInfo}
                onChange={handleChange}
                rows={3}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                name="note"
                value={formData.note}
                onChange={handleChange}
                rows={4}
              />
            </div>
          </div>
        </section>

        {/* Documents Section */}
        <section className="space-y-6">
          <h3 className="text-xl font-semibold text-gray-700 border-b border-orange-200 pb-2">Documents</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { field: "creditApplication" as FileField, label: "Credit Application" },
              { field: "ownerLegalFrontImage" as FileField, label: "Owner Legal — Front" },
              { field: "ownerLegalBackImage" as FileField, label: "Owner Legal — Back" },
              { field: "voidedCheckImage" as FileField, label: "Voided Check" },
            ].map(({ field, label }) => (
              <div key={field} className="space-y-3">
                <Label htmlFor={field} className="text-gray-700">{label}</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-orange-500 transition-colors">
                  {customer[field] ? (
                    <a
                      href={customer[field] as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-600 hover:underline block mb-3"
                    >
                      View Current Document
                    </a>
                  ) : (
                    <p className="text-gray-500 mb-3">No document uploaded</p>
                  )}

                  <Input
                    id={field}
                    name={field}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileSelect(field, e)}
                    className="hidden"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById(field)?.click()}
                    className="mb-2 w-full"
                  >
                    Select File
                  </Button>

                  <Button
                    type="button"
                    onClick={() => handleUpload(field)}
                    disabled={!selectedFiles[field] || uploadingDocument === field}
                    className="w-full bg-orange-700 hover:bg-orange-600 text-white"
                  >
                    {uploadingDocument === field ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                        Uploading...
                      </>
                    ) : (
                      "Upload"
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4 pt-8 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/customers")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isUpdating}
            className="bg-red-700 hover:bg-red-600 text-white"
          >
            {isUpdating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                Updating...
              </>
            ) : (
              "Update Customer"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
