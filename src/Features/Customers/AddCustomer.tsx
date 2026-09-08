"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { useAddCustomerMutation } from "@/redux/api/customers";
import { registerInOtherSystem } from "@/lib/crossSystemRegister";
import toast from "react-hot-toast";
import { FaFileUpload } from "react-icons/fa";
import { X, Plus, Mail } from "lucide-react";

interface SecondaryEmail {
  email: string;
  sendEmails: boolean;
}

interface FormData {
  storeName: string;
  storePersonName: string;
  storePhone: string;
  storePersonPhone: string;
  storePersonEmail: string;
  secondaryEmails: SecondaryEmail[];
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZipcode: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingZipcode: string;
  salesTaxId: string;
  whatsappGroupLink: string;
  termDays: string;
  acceptedDeliveryDays: string[];
  shippingStatus: string;
  note: string;
  sameAsBillingAddress: boolean;
  bankAchInfo: string;
  businessExpirationDate: string;
}

interface FieldErrors {
  [key: string]: string;
}

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

export default function AddCustomer(): React.ReactElement {
  const [formData, setFormData] = useState<FormData>({
    storeName: "",
    storePersonName: "",
    storePhone: "",
    storePersonPhone: "",
    storePersonEmail: "",
    secondaryEmails: [],
    billingAddress: "",
    billingCity: "",
    billingState: "",
    billingZipcode: "",
    shippingAddress: "",
    shippingCity: "",
    shippingState: "",
    shippingZipcode: "",
    salesTaxId: "",
    whatsappGroupLink: "",
    termDays: "30",
    acceptedDeliveryDays: [] as string[],
    shippingStatus: "SILVER",
    note: "",
    sameAsBillingAddress: false,
    bankAchInfo: "",
    businessExpirationDate: "",
  });

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [secondaryEmailInput, setSecondaryEmailInput] = useState("");
  const [sendEmailsToNewEmail, setSendEmailsToNewEmail] = useState(true);
  const [secondaryEmailError, setSecondaryEmailError] = useState("");

  // State for file selections
  const [fileSelections, setFileSelections] = useState({
    creditApplication: null as File | null,
    ownerLegalFrontImage: null as File | null,
    ownerLegalBackImage: null as File | null,
    voidedCheckImage: null as File | null,
  });

  const [addCustomer, { isLoading }] = useAddCustomerMutation();
  const [alsoSaveSupplyPro, setAlsoSaveSupplyPro] = useState(false);
  const router = useRouter();

  // File input refs
  const creditAppRef = useRef<HTMLInputElement>(null);
  const ownerFrontRef = useRef<HTMLInputElement>(null);
  const ownerBackRef = useRef<HTMLInputElement>(null);
  const voidedCheckRef = useRef<HTMLInputElement>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const requiredFields = [
    "storeName",
    "storePersonName",
    "storePhone",
    "storePersonPhone",
    "storePersonEmail",
    "billingAddress",
    "billingCity",
    "billingState",
    "billingZipcode",
    "shippingAddress",
    "shippingCity",
    "shippingState",
    "shippingZipcode",
  ];

  // File change handler
  const handleFileChange = (id: string, ref: React.RefObject<HTMLInputElement>) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      setFileSelections(prev => ({ ...prev, [id]: file }));

      // Also update the ref's files property
      if (ref.current) {
        ref.current.files = e.target.files;
      }
    };
  };

  // Clear file handler
  const handleClearFile = (id: string, ref: React.RefObject<HTMLInputElement>) => {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (ref.current) {
        ref.current.value = "";
        ref.current.files = null;
        setFileSelections(prev => ({ ...prev, [id]: null }));
      }
    };
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
    setFieldErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
  };

  // Validate email format
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Update send email status for a secondary email
  const updateSendEmailStatus = (index: number, sendEmails: boolean) => {
    setFormData(prev => ({
      ...prev,
      secondaryEmails: prev.secondaryEmails.map((item, i) =>
        i === index ? { ...item, sendEmails } : item
      )
    }));
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

    if (formData.secondaryEmails.length >= 3) {
      setSecondaryEmailError("Maximum 3 secondary emails allowed");
      return;
    }

    if (formData.secondaryEmails.some(item => item.email === secondaryEmailInput.trim())) {
      setSecondaryEmailError("This email address has already been added");
      return;
    }

    if (secondaryEmailInput.trim() === formData.storePersonEmail) {
      setSecondaryEmailError("Secondary email cannot be the same as primary email");
      return;
    }

    setFormData(prev => ({
      ...prev,
      secondaryEmails: [...prev.secondaryEmails, {
        email: secondaryEmailInput.trim(),
        sendEmails: sendEmailsToNewEmail
      }]
    }));
    setSecondaryEmailInput("");
    setSendEmailsToNewEmail(true);
    setSecondaryEmailError("");
  };

  // Remove secondary email
  const handleRemoveSecondaryEmail = (index: number) => {
    setFormData(prev => ({
      ...prev,
      secondaryEmails: prev.secondaryEmails.filter((_, i) => i !== index)
    }));
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

  // Update shipping fields when billing fields change (if sameAsBillingAddress is true)
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
    setFieldErrors((prev) => {
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: FieldErrors = {};
    requiredFields.forEach((field) => {
      if (!formData[field as keyof FormData]) {
        newErrors[field] = "This field is required.";
      }
    });

    if (formData.acceptedDeliveryDays.length === 0) {
      newErrors.acceptedDeliveryDays = "Select at least one delivery day";
    }

    // Validate secondary emails format
    for (const secondaryEmail of formData.secondaryEmails) {
      if (!isValidEmail(secondaryEmail.email)) {
        newErrors.secondaryEmails = "Invalid email format in secondary emails";
        break;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }

    // Build FormData for multipart/form-data
    const formDataToSend = new FormData();

    // Append all text / array / boolean fields
    Object.entries(formData).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (key === "acceptedDeliveryDays") {
          value.forEach((day) => formDataToSend.append("acceptedDeliveryDays", day as string));
        } else if (key === "secondaryEmails") {
          // Type assertion to ensure value is SecondaryEmail[]
          const secondaryEmailsArray = value as SecondaryEmail[];
          secondaryEmailsArray.forEach((secondaryEmail, index) => {
            formDataToSend.append(`secondaryEmails[${index}][email]`, secondaryEmail.email);
            formDataToSend.append(`secondaryEmails[${index}][sendEmails]`, secondaryEmail.sendEmails.toString());
          });
        }
      } else if (typeof value === "boolean") {
        formDataToSend.append(key, value.toString());
      } else if (value !== undefined && value !== null && value !== "") {
        formDataToSend.append(key, value as string);
      }
    });

    // Append files only if selected
    if (creditAppRef.current?.files?.[0]) {
      formDataToSend.append("creditApplication", creditAppRef.current.files[0]);
    }
    if (ownerFrontRef.current?.files?.[0]) {
      formDataToSend.append("ownerLegalFrontImage", ownerFrontRef.current.files[0]);
    }
    if (ownerBackRef.current?.files?.[0]) {
      formDataToSend.append("ownerLegalBackImage", ownerBackRef.current.files[0]);
    }
    if (voidedCheckRef.current?.files?.[0]) {
      formDataToSend.append("voidedCheckImage", voidedCheckRef.current.files[0]);
    }

    try {
      await addCustomer(formDataToSend).unwrap();

      if (alsoSaveSupplyPro) {
        const randomPassword = Math.random().toString(36).slice(-10) + "A1!";
        const crossResult = await registerInOtherSystem({
          storeName: formData.storeName,
          storePersonName: formData.storePersonName,
          storePhone: formData.storePhone,
          storePersonPhone: formData.storePersonPhone,
          storePersonEmail: formData.storePersonEmail,
          billingAddress: formData.billingAddress,
          billingCity: formData.billingCity,
          billingState: formData.billingState,
          billingZipcode: formData.billingZipcode,
          shippingAddress: formData.shippingAddress,
          shippingCity: formData.shippingCity,
          shippingState: formData.shippingState,
          shippingZipcode: formData.shippingZipcode,
          password: randomPassword,
        });
        if (crossResult.success) {
          toast.success("Customer added successfully to both Roots Beyond and Supply Pro!");
        } else {
          toast(
            `Customer added to Roots Beyond, but could not also save to Supply Pro: ${crossResult.message}`,
            { icon: "⚠️", duration: 6000 },
          );
        }
      } else {
        toast.success("Customer added successfully!");
      }

      router.push("/customers");
    } catch (err: any) {
      console.error("Failed to add customer:", err);

      if (err?.data?.errorSources && Array.isArray(err.data.errorSources)) {
        const errors = err.data.errorSources.reduce((acc: any, source: any) => {
          acc[source.path] = source.message;
          return acc;
        }, {});
        setFieldErrors(errors);
      }

      if (err?.data?.message?.includes("already exists")) {
        toast.error(err.data.message);
      } else {
        toast.error(err?.data?.message || "Failed to add customer. Please try again.");
      }
    }
  };

  const handleCancel = () => router.push("/customers");

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="p-6 bg-white rounded-lg shadow-lg min-h-screen">
        <h1 className="text-2xl font-bold mb-6 text-orange-700">Add New Customer</h1>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Store Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="storeName">
                Store Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="storeName"
                name="storeName"
                value={formData.storeName}
                onChange={handleInputChange}
                required
                placeholder="Enter store name"
              />
              {fieldErrors.storeName && <p className="text-red-500 text-sm">{fieldErrors.storeName}</p>}
            </div>
          </div>

          {/* Phone Numbers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="storePhone">
                Store Phone Number <span className="text-red-600">*</span>
              </Label>
              <Input
                id="storePhone"
                name="storePhone"
                type="tel"
                value={formData.storePhone}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
                  handleInputChange({ target: { name: "storePhone", value: raw } } as any);
                }}
                required
                placeholder="1234567890"
              />
              {fieldErrors.storePhone && <p className="text-red-500 text-sm">{fieldErrors.storePhone}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="storePersonPhone">
                Cell phone <span className="text-red-600">*</span>
              </Label>
              <Input
                id="storePersonPhone"
                name="storePersonPhone"
                type="tel"
                value={formData.storePersonPhone}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
                  handleInputChange({ target: { name: "storePersonPhone", value: raw } } as any);
                }}
                required
                placeholder="1234567891"
              />
              {fieldErrors.storePersonPhone && <p className="text-red-500 text-sm">{fieldErrors.storePersonPhone}</p>}
            </div>
          </div>

          {/* Authorized Person Name & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="storePersonName">
                Authorized Person Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="storePersonName"
                name="storePersonName"
                value={formData.storePersonName}
                onChange={handleInputChange}
                required
              />
              {fieldErrors.storePersonName && <p className="text-red-500 text-sm">{fieldErrors.storePersonName}</p>}
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
                onChange={handleInputChange}
                required
              />
              {fieldErrors.storePersonEmail && <p className="text-red-500 text-sm">{fieldErrors.storePersonEmail}</p>}
            </div>
          </div>

          {/* Secondary Emails Field */}
          <div className="space-y-3">
            <Label className="text-gray-700 flex items-center gap-2">
              <Mail className="w-4 h-4 text-orange-600" />
              Secondary Emails
              <span className="text-xs text-gray-500 font-normal">(Optional, max 3)</span>
            </Label>

            {/* Display existing secondary emails */}
            {formData.secondaryEmails.length > 0 && (
              <div className="space-y-2 mb-3">
                {formData.secondaryEmails.map((secondaryEmail, index) => (
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
                        <span className="text-sm text-gray-600">Send payment confirmation and reminders</span>
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
            {formData.secondaryEmails.length < 3 && (
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
                  <span className="text-sm text-gray-600">Send payment confirmation and reminders to this address</span>
                </label>
              </div>
            )}

            {fieldErrors.secondaryEmails && (
              <p className="text-red-500 text-sm">{fieldErrors.secondaryEmails}</p>
            )}
            <p className="text-xs text-gray-500">
              Add up to 3 additional email addresses for this customer
            </p>
          </div>

          {/* WhatsApp Group Link */}
          <div className="space-y-2">
            <Label htmlFor="whatsappGroupLink">WhatsApp Group Link</Label>
            <Input
              id="whatsappGroupLink"
              name="whatsappGroupLink"
              value={formData.whatsappGroupLink}
              onChange={handleInputChange}
            />
          </div>

          {/* Billing Address */}
          <div className="space-y-4">
            <div className="space-y-2">
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
              {fieldErrors.billingAddress && <p className="text-red-500 text-sm">{fieldErrors.billingAddress}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                {fieldErrors.billingCity && <p className="text-red-500 text-sm">{fieldErrors.billingCity}</p>}
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
                {fieldErrors.billingState && <p className="text-red-500 text-sm">{fieldErrors.billingState}</p>}
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
                />
                {fieldErrors.billingZipcode && <p className="text-red-500 text-sm">{fieldErrors.billingZipcode}</p>}
              </div>
            </div>
          </div>

          {/* Same as Billing */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sameAsBillingAddress"
              checked={formData.sameAsBillingAddress}
              onCheckedChange={(checked) => handleSameAsBillingAddress(checked as boolean)}
            />
            <Label htmlFor="sameAsBillingAddress">Same as Billing Address</Label>
          </div>

          {/* Shipping Address */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shippingAddress">
                Shipping Address <span className="text-red-600">*</span>
              </Label>
              <textarea
                id="shippingAddress"
                name="shippingAddress"
                value={formData.shippingAddress}
                onChange={handleInputChange}
                required
                disabled={formData.sameAsBillingAddress}
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              {fieldErrors.shippingAddress && <p className="text-red-500 text-sm">{fieldErrors.shippingAddress}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shippingCity">
                  Shipping City <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="shippingCity"
                  name="shippingCity"
                  value={formData.shippingCity}
                  onChange={handleInputChange}
                  required
                  disabled={formData.sameAsBillingAddress}
                />
                {fieldErrors.shippingCity && <p className="text-red-500 text-sm">{fieldErrors.shippingCity}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingState">
                  Shipping State <span className="text-red-600">*</span>
                </Label>
                <select
                  id="shippingState"
                  name="shippingState"
                  value={formData.shippingState}
                  onChange={handleInputChange}
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
                {fieldErrors.shippingState && <p className="text-red-500 text-sm">{fieldErrors.shippingState}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="shippingZipcode">
                  Shipping Zipcode <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="shippingZipcode"
                  name="shippingZipcode"
                  value={formData.shippingZipcode}
                  onChange={handleInputChange}
                  required
                  disabled={formData.sameAsBillingAddress}
                />
                {fieldErrors.shippingZipcode && <p className="text-red-500 text-sm">{fieldErrors.shippingZipcode}</p>}
              </div>
            </div>
          </div>

          {/* Additional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="salesTaxId">Sales Tax ID</Label>
              <Input id="salesTaxId" name="salesTaxId" value={formData.salesTaxId} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="termDays">Term Days</Label>
              <Input id="termDays" name="termDays" type="number" value={formData.termDays} onChange={handleInputChange} onWheel={(e) => (e.target as HTMLInputElement).blur()} />
            </div>
          </div>

          {/* Delivery Days */}
          <div className="space-y-2">
            <Label>Accept Delivery Days <span className="text-red-600">*</span></Label>
            <div className="relative" ref={dropdownRef}>
              <div
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full h-10 rounded-md border border-input bg-transparent px-3 py-2 text-sm cursor-pointer flex items-center"
              >
                {formData.acceptedDeliveryDays.length > 0
                  ? formData.acceptedDeliveryDays
                      .map((d) => d.charAt(0).toUpperCase() + d.slice(1))
                      .join(", ")
                  : "Select days"}
              </div>
              {isDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow-lg p-3">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                    <label key={day} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        value={day}
                        checked={formData.acceptedDeliveryDays.includes(day.toLowerCase())}
                        onChange={handleDeliveryDaysChange}
                        className="h-4 w-4"
            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      />
                      <span>{day}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {fieldErrors.acceptedDeliveryDays && <p className="text-red-500 text-sm">{fieldErrors.acceptedDeliveryDays}</p>}
          </div>

          {/* Business Expiration Date */}
          <Separator className="my-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="businessExpirationDate">
                Business Expiration Date
              </Label>
              <Input
                id="businessExpirationDate"
                name="businessExpirationDate"
                type="datetime-local"
                value={formData.businessExpirationDate}
                onChange={handleInputChange}
                className="w-full"
              />
              {formData.businessExpirationDate && (
                <p className="text-xs text-green-600 mt-1">
                  Will be saved as: {new Date(formData.businessExpirationDate).toISOString()}
                </p>
              )}
            </div>
          </div>

          {/* Document Uploads */}
          <Separator className="my-8" />

          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border">
            <h2 className="text-sm font-medium text-foreground">Document uploads</h2>
            <span className="text-xs text-muted-foreground bg-muted border border-border rounded-full px-2 py-0.5">
              optional
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { id: "creditApplication", ref: creditAppRef, label: "Credit application", hint: "PDF or image", accept: "image/*,application/pdf" },
              { id: "ownerLegalFrontImage", ref: ownerFrontRef, label: "Owner legal — front", hint: "PDF or image", accept: "image/*,application/pdf" },
              { id: "ownerLegalBackImage", ref: ownerBackRef, label: "Owner legal — back", hint: "PDF or image", accept: "image/*,application/pdf" },
              { id: "voidedCheckImage", ref: voidedCheckRef, label: "Voided check", hint: "PDF or image", accept: "image/*,application/pdf" },
            ].map(({ id, ref, label, hint, accept }) => {
              const file = fileSelections[id as keyof typeof fileSelections];
              const hasFile = !!file;

              return (
                <label
                  key={id}
                  htmlFor={id}
                  className={`relative flex flex-col items-center gap-2.5 rounded-xl border-[1.5px] border-dashed p-5 cursor-pointer transition-colors ${
                    hasFile
                      ? "border-red-400 bg-red-50 dark:bg-red-950/20"
                      : "border-border hover:border-muted-foreground/50 hover:bg-muted/30"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    hasFile ? "bg-white dark:bg-background" : "bg-muted"
                  }`}>
                    <FaFileUpload className={`w-5 h-5 ${hasFile ? "text-red-500" : "text-muted-foreground"}`} />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium leading-tight">{label}</p>
                    {hasFile ? (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1 break-all leading-tight">
                        {file.name}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
                    )}
                  </div>
                  {hasFile && (
                    <button
                      type="button"
                      onClick={handleClearFile(id, ref)}
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center hover:bg-muted/80"
                    >
                      <X className="w-2.5 h-2.5 text-muted-foreground" />
                    </button>
                  )}
                  <Input
                    id={id}
                    type="file"
                    accept={accept}
                    ref={ref}
                    className="sr-only"
                    onChange={handleFileChange(id, ref)}
                  />
                </label>
              );
            })}
          </div>

          <Separator className="my-8" />

          {/* Cross-system onboarding */}
          <div className="flex items-center gap-3">
            <Checkbox
              id="alsoSaveSupplyPro"
              checked={alsoSaveSupplyPro}
              onCheckedChange={(checked) => setAlsoSaveSupplyPro(checked as boolean)}
            />
            <Label htmlFor="alsoSaveSupplyPro">Also save for Supply Pro</Label>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-6 pt-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/customers")}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-red-700 hover:bg-red-600 text-white font-semibold px-10"
            >
              {isLoading ? "Saving..." : "Save Customer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
