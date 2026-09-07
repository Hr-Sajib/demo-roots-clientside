"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  useGetProspectByIdQuery,
  useUpdateProspectMutation,
} from "@/redux/api/prospects";
import { QuotedListItem } from "@/types";
import { useGetAllUsersQuery } from "@/redux/api/admin";
import { useGetInventoryQuery } from "@/redux/api/inventory";
import Cookies from "js-cookie";

const STATUS_OPTIONS = [
  "new",
  "contacted",
  "qualified",
  "rejected",
  "converted",
] as const;
type Status = (typeof STATUS_OPTIONS)[number];

const ACTIVITY_MEDIUM_OPTIONS = [
  "call",
  "email",
  "meeting",
  "whatsapp",
] as const;
type ActivityMedium = (typeof ACTIVITY_MEDIUM_OPTIONS)[number];

interface Product {
  _id?: string;
  itemNumber: string;
  name: string;
  packetSize: string;
  salesPrice: number;
}
interface AssignedSalesPerson {
  _id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  password?: string;
}
export interface FollowUpActivity {
  activity: string;
  activityDate: string;
  activityMedium: string;
}

interface FormData {
  _id?: string;
  storeName: string;
  storePhone: string;
  storePersonEmail: string;
  storePersonName: string;
  storePersonPhone: string;
  salesTaxId: string;
  shippingAddress: string;
  shippingState: string;
  shippingZipcode: string;
  shippingCity: string;
  miscellaneousDocImage: string;
  leadSource: string;
  note: string;
  status: string;
  assignedSalesPerson: AssignedSalesPerson | string | null;
  followUpActivities: FollowUpActivity[];
  quotedList: QuotedListItem[];
  competitorStatement: string;
}

// Utility function to format phone numbers
const formatPhoneNumber = (value: string): string => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  
  // If less than 10 digits, return as is (partial input)
  if (digits.length < 10) {
    return digits;
  }
  
  // Format to (XXX)XXX-XXXX
  if (digits.length >= 10) {
    const areaCode = digits.slice(0, 3);
    const prefix = digits.slice(3, 6);
    const lineNumber = digits.slice(6, 10);
    return `(${areaCode})${prefix}-${lineNumber}`;
  }
  
  return digits;
};

export default function UpdateProspectPage({
  prospectId,
}: {
  prospectId: string;
}): React.ReactElement {
  const {
    data: prospectResponse,
    isLoading,
    error,
  } = useGetProspectByIdQuery(prospectId);
  const {
    data: inventoryData,
    isLoading: isInventoryLoading,
    isError: isInventoryError,
  } = useGetInventoryQuery();
  const {
    data: salesUsersResponse,
    error: salesError,
    isLoading: isUsersLoading,
  } = useGetAllUsersQuery();
  const [updateProspect, { isLoading: isSaving }] = useUpdateProspectMutation();
  const router = useRouter();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>(
    {}
  );
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [newQuote, setNewQuote] = useState<QuotedListItem>({
    productObjId: "",
    itemNumber: "",
    itemName: "",
    price: 0,
    packetSize: "",
  });
  const [newFollowUp, setNewFollowUp] = useState<FollowUpActivity>({
    activity: "",
    activityDate: "",
    activityMedium: "call",
  });
  const [productSearch, setProductSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [role, setRole] = useState("");
  const skipSalesUsersRef = useRef(role !== "admin");

  useEffect(() => {
    const cookies = document.cookie.split("; ");
    const tokenCookie = cookies.find((cookie) => cookie.startsWith("role="));
    const role = tokenCookie ? tokenCookie.split("=")[1] : "";
    setRole(role);
  }, []);

  useEffect(() => {
    skipSalesUsersRef.current = role !== "admin";
  }, [role]);

  useEffect(() => {
    if (prospectResponse?.data && !formData) {
      const processedQuotedList = prospectResponse.data.quotedList.map(
        (item) => ({
          ...item,
          productObjId:
            typeof item.productObjId === "object" && item.productObjId !== null
              ? (item.productObjId as any)._id
              : item.productObjId,
        })
      );

      setFormData({
        ...prospectResponse.data,
        quotedList: processedQuotedList,
        assignedSalesPerson: prospectResponse.data.assignedSalesPerson?._id || null,
      });
    }
  }, [prospectResponse, formData]);

  useEffect(() => {
    if (isInventoryError) {
      toast.error("Failed to load inventory.");
    }
  }, [isInventoryError]);

  useEffect(() => {
    if (salesError && !skipSalesUsersRef.current) {
      toast.error("Failed to load sales users.");
    }
  }, [salesError]);

  useEffect(() => {
    if (productSearch) {
      setIsDropdownOpen(true);
    } else {
      setIsDropdownOpen(false);
    }
  }, [productSearch]);

  if (isLoading || !formData) {
    return <div className="min-h-screen p-4 text-center">Loading...</div>;
  }
  if (error || !prospectResponse?.data) {
    const errorMessage = error ? (error as any).message : "Unknown error";
    return (
      <div className="min-h-screen p-4 text-center">
        Error loading prospect: {errorMessage}
      </div>
    );
  }

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Apply phone number formatting for storePhone and storePersonPhone
    if (name === "storePhone" || name === "storePersonPhone") {
      formattedValue = formatPhoneNumber(value);
    }

    if (name === "assignedSalesPerson") {
      setFormData((prev) => ({ ...prev!, [name]: value || null }));
    } else {
      setFormData((prev) => ({ ...prev!, [name]: formattedValue }));
    }
    setValidationErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append("image", file);
    formDataUpload.append(
      "key",
      process.env.NEXT_PUBLIC_IMGBB_API_KEY || "YOUR_IMGBB_API_KEY"
    );

    fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formDataUpload,
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          setFormData((prev) => ({
            ...prev!,
            miscellaneousDocImage: result.data.url,
          }));
          setValidationErrors((prev) => ({
            ...prev,
            miscellaneousDocImage: "",
          }));
        }
      })
      .catch((uploadError) => {
        toast.error("Image upload failed.");
      });
  };

  const handleQuoteInputChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    if (name === "productObjId" && inventoryData?.data) {
      const selectedProduct = inventoryData.data.find(
        (p: Product) => p._id === value
      );
      if (selectedProduct) {
        setNewQuote({
          productObjId: selectedProduct._id || "",
          itemNumber: selectedProduct.itemNumber,
          itemName: selectedProduct.name,
          price: selectedProduct.salesPrice,
          packetSize: selectedProduct.packetSize || "",
        });
      } else {
        setNewQuote({
          productObjId: "",
          itemNumber: "",
          itemName: "",
          price: 0,
          packetSize: "",
        });
      }
    } else {
      setNewQuote((prev) => ({
        ...prev,
        [name]: name === "price" ? Number(value) : value,
      }));
    }
  };

  const handleProductSelect = (product: Product) => {
    setNewQuote({
      productObjId: product._id || "",
      itemNumber: product.itemNumber,
      itemName: product.name,
      price: product.salesPrice,
      packetSize: product.packetSize || "",
    });
    setProductSearch(product.name);
    setIsDropdownOpen(false);
  };

  const filteredAvailableProducts = inventoryData?.data?.filter((product: Product) =>
    product.name.toLowerCase().includes(productSearch.toLowerCase())
  ) || [];

  const handleFollowUpInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNewFollowUp((prev) => ({ ...prev, [name]: value }));
  };

  const addQuote = () => {
    if (
      !newQuote.productObjId ||
      !newQuote.itemNumber ||
      !newQuote.itemName ||
      newQuote.price === 0
    ) {
      toast.error("All required quote fields must be filled.");
      return;
    }
    setFormData((prev) => ({
      ...prev!,
      quotedList: [
        ...prev!.quotedList,
        { ...newQuote, packetSize: newQuote.packetSize || "" },
      ],
    }));
    setNewQuote({
      productObjId: "",
      itemNumber: "",
      itemName: "",
      price: 0,
      packetSize: "",
    });
    setProductSearch("");
    setIsDropdownOpen(false);
    setIsQuoteModalOpen(false);
  };

  const addFollowUp = () => {
    if (
      !newFollowUp.activity ||
      !newFollowUp.activityDate ||
      !newFollowUp.activityMedium
    ) {
      toast.error("All required follow-up fields must be filled.");
      return;
    }
    setFormData((prev) => ({
      ...prev!,
      followUpActivities: [...prev!.followUpActivities, { ...newFollowUp }],
    }));
    setNewFollowUp({ activity: "", activityDate: "", activityMedium: "call" });
    setIsFollowUpModalOpen(false);
  };

  const handleDeleteQuote = (index: number) => {
    setFormData((prev) => ({
      ...prev!,
      quotedList: prev!.quotedList.filter((_, i) => i !== index),
    }));
  };

  const handleDeleteFollowUp = (index: number) => {
    setFormData((prev) => ({
      ...prev!,
      followUpActivities: prev!.followUpActivities.filter(
        (_, i) => i !== index
      ),
    }));
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData) {
      errors.general = "Form data not loaded.";
      setValidationErrors(errors);
      return false;
    }

    if (!formData.storeName.trim())
      errors.storeName = "Store name is required.";
    if (!formData.storePhone.match(/^\(\d{3}\)\d{3}-\d{4}$/)) {
      errors.storePhone = "Phone number must be in format (XXX)XXX-XXXX.";
    }
    if (!formData.storePersonName.trim())
      errors.storePersonName = "Customer name is required.";
    if (!formData.storePersonPhone.match(/^\(\d{3}\)\d{3}-\d{4}$/))
      errors.storePersonPhone = "Phone number must be in format (XXX)XXX-XXXX.";
    if (!formData.shippingAddress.trim())
      errors.shippingAddress = "Shipping address is required.";
    if (!formData.shippingCity.trim())
      errors.shippingCity = "Shipping city is required.";
    if (!formData.shippingState.trim())
      errors.shippingState = "Shipping state is required.";
    if (!formData.shippingZipcode.match(/^\d{5}$/))
      errors.shippingZipcode = "Zipcode must be 5 digits.";


    if (formData.quotedList.length > 0) {
      formData.quotedList.forEach((item, index) => {
        if (
          !item.productObjId ||
          !item.itemNumber ||
          !item.itemName ||
          item.price === 0
        ) {
          errors[`quotedList[${index}]`] = `Quoted item ${
            index + 1
          } has missing required fields.`;
        }
      });
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData) {
      toast.error("Form data is not loaded. Please try again.");
      return;
    }

    if (!validateForm()) {
      toast.error("Please fix the validation errors.");
      return;
    }

    const token = Cookies.get("token");
    if (!token) {
      toast.error("Authentication token missing. Please log in.");
      router.push("/login");
      return;
    }

    const validQuotedList = formData.quotedList.filter(
      (item) => item.productObjId
    );

    const payload: Partial<FormData> = {
      _id: formData._id!,
      storeName: formData.storeName,
      storePhone: formData.storePhone,
      storePersonEmail: formData.storePersonEmail,
      storePersonName: formData.storePersonName,
      storePersonPhone: formData.storePersonPhone,
      salesTaxId: formData.salesTaxId || undefined,
      shippingAddress: formData.shippingAddress,
      shippingState: formData.shippingState,
      shippingZipcode: formData.shippingZipcode,
      shippingCity: formData.shippingCity,
      miscellaneousDocImage: formData.miscellaneousDocImage || undefined,
      leadSource: formData.leadSource,
      note: formData.note || undefined,
      status: formData.status,
      assignedSalesPerson: formData.assignedSalesPerson || undefined,
      followUpActivities: formData.followUpActivities,
      quotedList: validQuotedList,
      competitorStatement: formData.competitorStatement,
    };

    try {
      await updateProspect(payload as { _id: string } & Partial<FormData>).unwrap();
      toast.success("Prospect updated successfully");
     router.push("/prospects");
    } catch (err: any) {
      const errorMessage =
        err?.data?.message || err?.message || "Unknown error";
      toast.error(`Update failed: ${errorMessage}`);
    }
  };

  const handleCancel = () => {
    router.push("/prospects");
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md min-h-screen mx-46">
      <h1 className="text-2xl font-bold mb-6">Update Prospect Details</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {validationErrors.status && (
            <span className="text-red-500 text-sm">
              {validationErrors.status}
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="storeName">Store Name</Label>
            <Input
              id="storeName"
              name="storeName"
              value={formData.storeName}
              onChange={handleInputChange}
              placeholder="Enter store name"
              className="w-full"
              required
            />
            {validationErrors.storeName && (
              <span className="text-red-500 text-sm">
                {validationErrors.storeName}
              </span>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="storePhone">Store Phone Number</Label>
            <Input
              id="storePhone"
              name="storePhone"
              type="tel"
              value={formData.storePhone}
              onChange={handleInputChange}
              placeholder="(XXX)XXX-XXXX"
              className="w-full"
            />
            {validationErrors.storePhone && (
              <span className="text-red-500 text-sm">
                {validationErrors.storePhone}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="storePersonName">Customer Full Name</Label>
            <Input
              id="storePersonName"
              name="storePersonName"
              value={formData.storePersonName}
              onChange={handleInputChange}
              placeholder="Enter customer full name"
              className="w-full"
            />
            {validationErrors.storePersonName && (
              <span className="text-red-500 text-sm">
                {validationErrors.storePersonName}
              </span>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="storePersonPhone">Cell Phone Number</Label>
            <Input
              id="storePersonPhone"
              name="storePersonPhone"
              type="tel"
              value={formData.storePersonPhone}
              onChange={handleInputChange}
              placeholder="(XXX)XXX-XXXX"
              className="w-full"
            />
            {validationErrors.storePersonPhone && (
              <span className="text-red-500 text-sm">
                {validationErrors.storePersonPhone}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="storePersonEmail">Email Address</Label>
          <Input
            id="storePersonEmail"
            name="storePersonEmail"
            type="email"
            value={formData.storePersonEmail}
            onChange={handleInputChange}
            placeholder="Enter email address"
            className="w-full"
          />
          {validationErrors.storePersonEmail && (
            <span className="text-red-500 text-sm">
              {validationErrors.storePersonEmail}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="salesTaxId">Sales Tax ID</Label>
          <Input
            id="salesTaxId"
            name="salesTaxId"
            value={formData.salesTaxId}
            onChange={handleInputChange}
            placeholder="Enter sales tax ID"
            className="w-full"
          />
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shippingAddress">Shipping Address</Label>
            <textarea
              id="shippingAddress"
              name="shippingAddress"
              value={formData.shippingAddress}
              onChange={handleInputChange}
              placeholder="Enter shipping address"
              rows={3}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            {validationErrors.shippingAddress && (
              <span className="text-red-500 text-sm">
                {validationErrors.shippingAddress}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shippingCity">Shipping City</Label>
              <Input
                id="shippingCity"
                name="shippingCity"
                value={formData.shippingCity}
                onChange={handleInputChange}
                placeholder="Enter shipping city"
                className="w-full"
              />
              {validationErrors.shippingCity && (
                <span className="text-red-500 text-sm">
                  {validationErrors.shippingCity}
                </span>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="shippingState">Shipping State *</Label>
              <select
                id="shippingState"
                name="shippingState"
                value={formData.shippingState}
                onChange={handleInputChange}
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select State</option>
                <option value="AL">Alabama</option>
                <option value="AK">Alaska</option>
                <option value="AZ">Arizona</option>
                <option value="AR">Arkansas</option>
                <option value="CA">California</option>
                <option value="CO">Colorado</option>
                <option value="CT">Connecticut</option>
                <option value="DE">Delaware</option>
                <option value="FL">Florida</option>
                <option value="GA">Georgia</option>
                <option value="HI">Hawaii</option>
                <option value="ID">Idaho</option>
                <option value="IL">Illinois</option>
                <option value="IN">Indiana</option>
                <option value="IA">Iowa</option>
                <option value="KS">Kansas</option>
                <option value="KY">Kentucky</option>
                <option value="LA">Louisiana</option>
                <option value="ME">Maine</option>
                <option value="MD">Maryland</option>
                <option value="MA">Massachusetts</option>
                <option value="MI">Michigan</option>
                <option value="MN">Minnesota</option>
                <option value="MS">Mississippi</option>
                <option value="MO">Missouri</option>
                <option value="MT">Montana</option>
                <option value="NE">Nebraska</option>
                <option value="NV">Nevada</option>
                <option value="NH">New Hampshire</option>
                <option value="NJ">New Jersey</option>
                <option value="NM">New Mexico</option>
                <option value="NY">New York</option>
                <option value="NC">North Carolina</option>
                <option value="ND">North Dakota</option>
                <option value="OH">Ohio</option>
                <option value="OK">Oklahoma</option>
                <option value="OR">Oregon</option>
                <option value="PA">Pennsylvania</option>
                <option value="RI">Rhode Island</option>
                <option value="SC">South Carolina</option>
                <option value="SD">South Dakota</option>
                <option value="TN">Tennessee</option>
                <option value="TX">Texas</option>
                <option value="UT">Utah</option>
                <option value="VT">Vermont</option>
                <option value="VA">Virginia</option>
                <option value="WA">Washington</option>
                <option value="WV">West Virginia</option>
                <option value="WI">Wisconsin</option>
                <option value="WY">Wyoming</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="shippingZipcode">Shipping Zipcode</Label>
              <Input
                id="shippingZipcode"
                name="shippingZipcode"
                value={formData.shippingZipcode}
                onChange={handleInputChange}
                placeholder="Enter shipping zipcode"
                className="w-full"
              />
              {validationErrors.shippingZipcode && (
                <span className="text-red-500 text-sm">
                  {validationErrors.shippingZipcode}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="miscellaneousDocImage">
              Miscellaneous Doc Image
            </Label>
            <label
              htmlFor="miscellaneousDocImage"
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors cursor-pointer flex flex-col items-center justify-center space-y-2 w-full"
            >
              {formData.miscellaneousDocImage ? (
                <img
                  src={formData.miscellaneousDocImage}
                  alt="Doc Preview"
                  className="w-32 h-32 object-cover rounded"
                />
              ) : (
                <>
                  <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-500">Click to upload</span>
                </>
              )}
              <input
                type="file"
                id="miscellaneousDocImage"
                name="miscellaneousDocImage"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            {validationErrors.miscellaneousDocImage && (
              <span className="text-red-500 text-sm">
                {validationErrors.miscellaneousDocImage}
              </span>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="leadSource">Lead Source</Label>
            <Input
              id="leadSource"
              name="leadSource"
              value={formData.leadSource}
              onChange={handleInputChange}
              placeholder="Enter lead source"
              className="w-full"
            />
            {validationErrors.leadSource && (
              <span className="text-red-500 text-sm">
                {validationErrors.leadSource}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="note">Note</Label>
          <textarea
            id="note"
            name="note"
            value={formData.note}
            onChange={handleInputChange}
            placeholder="Enter note"
            rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="competitorStatement">Competitor Statement</Label>
          <textarea
            id="competitorStatement"
            name="competitorStatement"
            value={formData.competitorStatement}
            onChange={handleInputChange}
            placeholder="Enter competitor statement"
            rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
          {validationErrors.competitorStatement && (
            <span className="text-red-500 text-sm">
              {validationErrors.competitorStatement}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="assignedSalesPerson">Assigned Sales Person</Label>
          <select
            id="assignedSalesPerson"
            name="assignedSalesPerson"
            value={
              typeof formData.assignedSalesPerson === "object" &&
              formData.assignedSalesPerson !== null
                ? formData.assignedSalesPerson._id
                : formData.assignedSalesPerson || ""
            }
            onChange={handleInputChange}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            disabled={role !== "admin"}
          >
            <option value="">Select Sales Person</option>
            {salesUsersResponse?.data
              ?.filter((user) => user.role === "salesUser")
              .map((user) => (
                <option key={user._id} value={user._id}>
                  {user.email}
                </option>
              )) || <option disabled>No sales users available</option>}
          </select>
          {validationErrors.assignedSalesPerson && (
            <span className="text-red-500 text-sm">
              {validationErrors.assignedSalesPerson}
            </span>
          )}
        </div>

        <div className="my-10 p-10 border rounded-2xl border-green-600 border-2">
          {formData.quotedList.length > 0 && (
            <div className="overflow-x-auto">
              <Label className="block my-2">Quoted Items</Label>
              <table className="w-full text-sm text-left text-gray-500 mt-2">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-2">Item #</th>
                    <th className="px-4 py-2">Item Name</th>
                    <th className="px-4 py-2">Packet Size</th>
                    <th className="px-4 py-2">Price ($)</th>
                    <th className="px-4 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.quotedList.map((item, index) => (
                    <tr key={index} className="bg-white border-b">
                      <td className="px-4 py-2">{item.itemNumber}</td>
                      <td className="px-4 py-2">{item.itemName}</td>
                      <td className="px-4 py-2">{item.packetSize || "N/A"}</td>
                      <td className="px-4 py-2 font-bold">${item.price}</td>
                      <td className="px-4 py-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteQuote(index)}
                          className="text-white"
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {Object.keys(validationErrors)
                .filter((key) => key.startsWith("quotedList["))
                .map((key) => (
                  <span key={key} className="text-red-500 text-sm block mt-1">
                    {validationErrors[key]}
                  </span>
                ))}
            </div>
          )}

          <div className="flex space-x-4 mt-5 justify-end">
            <Button
              type="button"
              onClick={() => setIsQuoteModalOpen(true)}
              className="bg-green-600 text-white"
            >
              Add product to quote
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto border-2 p-10 rounded-2xl border-blue-500">
          <Label className="block my-2">Follow Up Activities</Label>
          <table className="w-full text-sm text-left text-gray-500 mt-2">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-2">Activity</th>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Medium</th>
                <th className="px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {formData.followUpActivities.map((activity, index) => (
                <tr key={index} className="bg-white border-b">
                  <td className="px-4 py-2">{activity.activity}</td>
                  <td className="px-4 py-2">{activity.activityDate}</td>
                  <td className="px-4 py-2">{activity.activityMedium}</td>
                  <td className="px-4 py-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteFollowUp(index)}
                      className="text-white"
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mt-5">
            <Button
              type="button"
              onClick={() => setIsFollowUpModalOpen(true)}
              className="bg-blue-600 text-white"
            >
              Add Follow Up Activity
            </Button>
          </div>
        </div>

        <div className="flex justify-end space-x-4 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            className="px-6 py-2 cursor-pointer text-white hover:text-white bg-gray-500 hover:bg-gray-600"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="px-6 py-2 bg-red-600 hover:bg-red-700 cursor-pointer text-white"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Update"}
          </Button>
        </div>
      </form>

      {isQuoteModalOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Quote Product</h2>
            <div className="space-y-4">
              <div className="space-y-2 relative">
                <Label htmlFor="productSearch">Product Name</Label>
                <Input
                  id="productSearch"
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  placeholder="Search by product name..."
                  className="w-full mb-2"
                />
                {isDropdownOpen && productSearch && filteredAvailableProducts.length > 0 && (
                  <div className="absolute z-10 w-full max-h-40 overflow-y-auto bg-white border rounded-md shadow-lg mt-1">
                    {filteredAvailableProducts.map((product: Product) => (
                      <div
                        key={product._id}
                        onClick={() => {
                          handleProductSelect(product);
                          setIsDropdownOpen(false);
                        }}
                        className="p-2 hover:bg-gray-100 cursor-pointer"
                      >
                        {product.name} (Item #: {product.itemNumber})
                      </div>
                    ))}
                  </div>
                )}
                {isDropdownOpen && productSearch && filteredAvailableProducts.length === 0 && (
                  <div className="p-2 text-gray-500">No products found</div>
                )}
              </div>

              {
                newQuote.itemName ? 
                <p className="w-full border-2 p-2 border-green-500 rounded-lg ">{newQuote.itemName}</p>
                : null
              }
              <div className="space-y-2">
                <Label htmlFor="itemNumber">Item Number</Label>
                <Input
                  id="itemNumber"
                  name="itemNumber"
                  value={newQuote.itemNumber}
                  placeholder="Item Number"
                  className="w-full"
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemName">Item Name</Label>
                <Input
                  id="itemName"
                  name="itemName"
                  value={newQuote.itemName}
                  placeholder="Item Name"
                  className="w-full"
                  disabled
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  name="price"
                  type="number"
                  value={newQuote.price}
                  onChange={handleQuoteInputChange}
                  placeholder="Enter price"
                  className="w-full"
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="packetSize">Packet Size (from Product)</Label>
                <Input
                  id="packetSize"
                  name="packetSize"
                  value={newQuote.packetSize}
                  placeholder="Packet Size"
                  className="w-full"
                  disabled
                />
              </div>
            </div>
            <div className="flex justify-end space-x-4 mt-4">
              <Button
                type="button"
                onClick={() => setIsQuoteModalOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={addQuote}
                className="bg-blue-600 text-white"
              >
                Add Quote
              </Button>
            </div>
          </div>
        </div>
      )}

      {isFollowUpModalOpen && (
        <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Follow Up</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="activity">Activity</Label>
                <Input
                  id="activity"
                  name="activity"
                  value={newFollowUp.activity}
                  onChange={handleFollowUpInputChange}
                  placeholder="Enter activity"
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activityDate">Date</Label>
                <Input
                  id="activityDate"
                  name="activityDate"
                  type="date"
                  value={newFollowUp.activityDate}
                  onChange={handleFollowUpInputChange}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="activityMedium">Medium</Label>
                <select
                  id="activityMedium"
                  name="activityMedium"
                  value={newFollowUp.activityMedium}
                  onChange={handleFollowUpInputChange}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {ACTIVITY_MEDIUM_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end space-x-4 mt-4">
              <Button
                type="button"
                onClick={() => setIsFollowUpModalOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={addFollowUp}
                className="bg-green-600 text-white"
              >
                Add Follow Up
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}