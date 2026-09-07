"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCreateUserMutation } from "@/redux/api/admin";
import { toast } from "react-hot-toast";
import Select from "react-select";
import imageUpload from "@/lib/ImageUploader";

interface CreateUserModalProps {
  onClose: () => void;
  open: boolean;
  onSuccess?: () => void;
}

interface CreateUserRequest {
  email: string;
  password: string;
  role: string;
  firstName?: string;
  lastName?: string;
  image?: string;
  lisenceLink?: string;
  lisenceExpiryDate?: Date;
  lisenceExpiryReminderEmailSentOrNot?: boolean;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: number;
  allowances?: {
    mainDashBorad?: boolean;
    prospectSee?: boolean;
    prospectAdd?: boolean;
    prospectUpdate?: boolean;
    prospectDelete?: boolean;
    customerSee?: boolean;
    customerAdd?: boolean;
    customerUpdate?: boolean;
    customerDelete?: boolean;
    orderSee?: boolean;
    orderAdd?: boolean;
    orderUpdate?: boolean;
    orderDelete?: boolean;
    inventorySee?: boolean;
    inventoryAdd?: boolean;
    inventoryUpdate?: boolean;
    inventoryDelete?: boolean;
    containerSee?: boolean;
    containerAdd?: boolean;
    containerUpdate?: boolean;
    containerDelete?: boolean;
    canSeePurchasePrices?: boolean;
    canSeeProfits?: boolean;
  };
}

export default function CreateUserModal({
  onClose,
  open,
  onSuccess,
}: CreateUserModalProps) {
  const [createUser] = useCreateUserMutation();
  const [formData, setFormData] = useState<CreateUserRequest>({
    email: "",
    password: "",
    role: "",
    firstName: "",
    lastName: "",
    image: "",
    lisenceLink: "",
    lisenceExpiryDate: undefined,
    lisenceExpiryReminderEmailSentOrNot: false,
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: undefined,
    allowances: {
      mainDashBorad: false,
      prospectSee: false,
      prospectAdd: false,
      prospectUpdate: false,
      prospectDelete: false,
      customerSee: false,
      customerAdd: false,
      customerUpdate: false,
      customerDelete: false,
      orderSee: false,
      orderAdd: false,
      orderUpdate: false,
      orderDelete: false,
      inventorySee: false,
      inventoryAdd: false,
      inventoryUpdate: false,
      inventoryDelete: false,
      containerSee: false,
      containerAdd: false,
      containerUpdate: false,
      containerDelete: false,
      canSeePurchasePrices: false,
      canSeeProfits: false,
    },
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const isManager = formData.role === "manager";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, value, checked } = e.target;

    if (type === "checkbox" && !isManager) {
      if (name === "prospectBundle") {
        setFormData((prev) => ({
          ...prev,
          allowances: {
            ...prev.allowances!,
            prospectSee: checked,
            prospectAdd: checked,
            prospectUpdate: checked,
            prospectDelete: checked,
          },
        }));
      } else if (name === "customerBundle") {
        setFormData((prev) => ({
          ...prev,
          allowances: {
            ...prev.allowances!,
            customerSee: checked,
            customerAdd: checked,
            customerUpdate: checked,
            customerDelete: checked,
          },
        }));
      } else if (name === "orderBundle") {
        setFormData((prev) => ({
          ...prev,
          allowances: {
            ...prev.allowances!,
            orderSee: checked,
            orderAdd: checked,
            orderUpdate: checked,
            orderDelete: checked,
          },
        }));
      } else if (name === "inventoryBundle") {
        setFormData((prev) => ({
          ...prev,
          allowances: {
            ...prev.allowances!,
            inventorySee: checked,
            inventoryAdd: checked,
            inventoryUpdate: checked,
            inventoryDelete: checked,
          },
        }));
      } else if (name === "containerBundle") {
        setFormData((prev) => ({
          ...prev,
          allowances: {
            ...prev.allowances!,
            containerSee: checked,
            containerAdd: checked,
            containerUpdate: checked,
            containerDelete: checked,
          },
        }));
      } else if (name in (formData.allowances || {})) {
        setFormData((prev) => ({
          ...prev,
          allowances: {
            ...prev.allowances!,
            [name]: checked,
          },
        }));
      }
    } else if (name === "phone") {
      const digitsOnly = value.replace(/\D/g, "");
      let formattedPhone = "";
      if (digitsOnly.length > 0) formattedPhone = `(${digitsOnly.slice(0, 3)}`;
      if (digitsOnly.length > 3)
        formattedPhone += `) ${digitsOnly.slice(3, 6)}`;
      if (digitsOnly.length > 6)
        formattedPhone += `-${digitsOnly.slice(6, 10)}`;
      if (digitsOnly.length <= 10) {
        setFormData((prev) => ({ ...prev, phone: formattedPhone }));
      }
    } else if (name === "zipCode") {
      setFormData((prev) => ({
        ...prev,
        zipCode: value ? parseInt(value) : undefined,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? new Date(e.target.value) : undefined;
    setFormData((prev) => ({ ...prev, lisenceExpiryDate: value }));
  };

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "image" | "lisenceLink"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = await imageUpload(file);
      if (imageUrl) {
        setFormData((prev) => ({ ...prev, [field]: imageUrl }));
      } else {
        toast.error(
          `${field === "image" ? "Image" : "License"} upload failed.`
        );
      }
    }
  };

  const handleRoleChange = (selectedOption: any) => {
    const role = selectedOption.value;
    setFormData((prev) => ({
      ...prev,
      role,
      allowances: role === "manager" ? undefined : prev.allowances,
    }));
  };

  const handleStateChange = (selectedOption: any) => {
    setFormData((prev) => ({ ...prev, state: selectedOption.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Required field validation
    if (!formData.firstName?.trim())
      return toast.error("First Name is required");
    if (!formData.lastName?.trim()) return toast.error("Last Name is required");
    if (!formData.email?.trim()) return toast.error("Email is required");
    if (!formData.phone?.trim()) return toast.error("Phone is required");
    if (!formData.address?.trim()) return toast.error("Address is required");
    if (!formData.role) return toast.error("Role is required");
    if (!formData.password) return toast.error("Password is required");
    if (formData.password !== confirmPassword)
      return setError("Passwords do not match");

    setError("");

    const payload: any = { ...formData };
    if (isManager) {
      delete payload.allowances;
    }

    try {
      await createUser(payload).unwrap();
      toast.success("User created successfully");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create user");
    }
  };

  if (!open) return null;

  const roleOptions = [
    { value: "salesUser", label: "Sales User" },
    { value: "warehouseUser", label: "Warehouse User" },
    { value: "driver", label: "Driver" },
    { value: "manager", label: "Manager" },
  ];

  const stateOptions = [
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-100 p-6 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-red-700 mb-4 text-center">
          Create User
        </h2>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
        >
          ×
        </button>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <div className=" p-4 rounded-md bg-white flex flex-col gap-3 ">
            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <Input
                name="firstName"
                placeholder="First Name"
                value={formData.firstName || ""}
                onChange={handleChange}
              />
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <Input
                name="lastName"
                placeholder="Last Name"
                value={formData.lastName || ""}
                onChange={handleChange}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <Input
                name="email"
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <Input
                name="phone"
                placeholder="Phone"
                value={formData.phone || ""}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Password */}
          <div className="p-4 rounded-md bg-white">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3">
              <Input
                name="password"
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                className="w-1/2"
              />
              <Input
                name="confirmPassword"
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-1/2"
              />
            </div>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>

          {/* Role */}
          <div className="p-4 rounded-md bg-white border border-green-700">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role <span className="text-red-500">*</span>
            </label>
            <Select
              options={roleOptions}
              onChange={handleRoleChange}
              placeholder="Select Role"
              className="w-full"
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: "#d1d5db",
                  borderRadius: "0.375rem",
                  padding: "0.25rem",
                }),
              }}
            />
            {isManager && (
              <p className="text-sm text-amber-700 mt-1 ml-1">
                Manager will have all access instead of delete operations
              </p>
            )}
          </div>

          {/* Address */}

          <div className="p-4 rounded-md bg-white flex flex-col gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address <span className="text-red-500">*</span>
              </label>
              <Input
                name="address"
                placeholder="Address"
                value={formData.address || ""}
                onChange={handleChange}
              />
            </div>

            {/* Optional Fields */}
            <Input
              name="city"
              placeholder="City"
              value={formData.city || ""}
              onChange={handleChange}
            />

            <Select
              options={stateOptions}
              onChange={handleStateChange}
              placeholder="Select State"
              className="w-full"
              styles={{
                control: (base) => ({
                  ...base,
                  borderColor: "#d1d5db",
                  borderRadius: "0.375rem",
                  padding: "0.25rem",
                }),
              }}
            />

            <Input
              name="zipCode"
              placeholder="ZIP Code"
              value={formData.zipCode || ""}
              onChange={handleChange}
            />
          </div>

          <div className="p-4 rounded-md bg-white flex flex-col gap-4">
            {/* Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageChange(e, "image")}
                className="w-full border rounded-lg p-2"
              />
            </div>

            {/* License Document */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Misc Document Upload
              </label>
              <div className="border p-2 rounded-xl">
                <p className="text-sm ml-2 my-2">Document and expiry date</p>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageChange(e, "lisenceLink")}
                    className="flex-1 border rounded-lg p-2"
                  />
                  <Input
                    name="lisenceExpiryDate"
                    type="date"
                    value={
                      formData.lisenceExpiryDate
                        ? formData.lisenceExpiryDate.toISOString().split("T")[0]
                        : ""
                    }
                    onChange={handleDateChange}
                    className="w-40"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Allowances — Hidden for Manager */}
          {!isManager && (
            <div className=" p-3 rounded-md bg-white">
              <h3 className="text-gray-400 mb-4">Set access allowances</h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Prospect Section */}
                <div className="border-b pb-2">
                  <label className="flex items-center gap-1.25 mb-2 font-bold text-blue-700">
                    <input
                      type="checkbox"
                      name="prospectBundle"
                      checked={
                        formData.allowances?.prospectSee &&
                        formData.allowances?.prospectAdd &&
                        formData.allowances?.prospectUpdate &&
                        formData.allowances?.prospectDelete
                      }
                      onChange={handleChange}
                    />{" "}
                    Prospect
                  </label>
                  <label className="flex items-center gap-1.25">
                    <input
                      type="checkbox"
                      name="prospectSee"
                      checked={formData.allowances?.prospectSee || false}
                      onChange={handleChange}
                    />{" "}
                    See
                  </label>
                  <label className="flex items-center gap-1.25">
                    <input
                      type="checkbox"
                      name="prospectAdd"
                      checked={formData.allowances?.prospectAdd || false}
                      onChange={handleChange}
                    />{" "}
                    Add
                  </label>
                  <label className="flex items-center gap-1.25">
                    <input
                      type="checkbox"
                      name="prospectUpdate"
                      checked={formData.allowances?.prospectUpdate || false}
                      onChange={handleChange}
                    />{" "}
                    Update
                  </label>
                  <label className="flex items-center gap-1.25">
                    <input
                      type="checkbox"
                      name="prospectDelete"
                      checked={formData.allowances?.prospectDelete || false}
                      onChange={handleChange}
                    />{" "}
                    Delete
                  </label>
                </div>

                {/* Customer Section */}
                <div className="border-b pb-2">
                  <label className="flex items-center gap-1.25 mb-2 font-bold text-blue-700">
                    <input
                      type="checkbox"
                      name="customerBundle"
                      checked={
                        formData.allowances?.customerSee &&
                        formData.allowances?.customerAdd &&
                        formData.allowances?.customerUpdate &&
                        formData.allowances?.customerDelete
                      }
                      onChange={handleChange}
                    />{" "}
                    Customer
                  </label>
                  <label className="flex items-center gap-1.25">
                    <input
                      type="checkbox"
                      name="customerSee"
                      checked={formData.allowances?.customerSee || false}
                      onChange={handleChange}
                    />{" "}
                    See
                  </label>
                  <label className="flex items-center gap-1.25">
                    <input
                      type="checkbox"
                      name="customerAdd"
                      checked={formData.allowances?.customerAdd || false}
                      onChange={handleChange}
                    />{" "}
                    Add
                  </label>
                  <label className="flex items-center gap-1.25">
                    <input
                      type="checkbox"
                      name="customerUpdate"
                      checked={formData.allowances?.customerUpdate || false}
                      onChange={handleChange}
                    />{" "}
                    Update
                  </label>
                  <label className="flex items-center gap-1.25">
                    <input
                      type="checkbox"
                      name="customerDelete"
                      checked={formData.allowances?.customerDelete || false}
                      onChange={handleChange}
                    />{" "}
                    Delete
                  </label>
                </div>

                {/* Order Section */}
                <div className="border-b pb-2">
                  <label className="flex items-center gap-1.25 mb-2 font-bold text-blue-700">
                    <input
                      type="checkbox"
                      name="orderBundle"
                      checked={
                        formData.allowances?.orderSee &&
                        formData.allowances?.orderAdd &&
                        formData.allowances?.orderUpdate &&
                        formData.allowances?.orderDelete
                      }
                      onChange={handleChange}
                    />{" "}
                    Order
                  </label>
                  <label className="flex items-center gap-1.25">
                    <input
                      type="checkbox"
                      name="orderSee"
                      checked={formData.allowances?.orderSee || false}
                      onChange={handleChange}
                    />{" "}
                    See
                  </label>
                  <label className="flex items-center gap-1.25">
                    <input
                      type="checkbox"
                      name="orderAdd"
                      checked={formData.allowances?.orderAdd || false}
                      onChange={handleChange}
                    />{" "}
                    Add
                  </label>
                  <label className="flex items-center gap-1.25">
                    <input
                      type="checkbox"
                      name="orderUpdate"
                      checked={formData.allowances?.orderUpdate || false}
                      onChange={handleChange}
                    />{" "}
                    Update
                  </label>
                  <label className="flex items-center gap-1.25">
                    <input
                      type="checkbox"
                      name="orderDelete"
                      checked={formData.allowances?.orderDelete || false}
                      onChange={handleChange}
                    />{" "}
                    Delete
                  </label>
                </div>

                {/* Inventory Section */}
                <div className="border-b pb-2">
                  <label className="flex items-center gap-1.25 mb-2 font-bold text-blue-700">
                    <input
                      type="checkbox"
                      name="inventoryBundle"
                      checked={
                        formData.allowances?.inventorySee &&
                        formData.allowances?.inventoryAdd &&
                        formData.allowances?.inventoryUpdate &&
                        formData.allowances?.inventoryDelete
                      }
                      onChange={handleChange}
                    />{" "}
                    Inventory
                  </label>
                  <label className="flex items-center gap-1.25">
                    <input
                      type="checkbox"
                      name="inventorySee"
                      checked={formData.allowances?.inventorySee || false}
                      onChange={handleChange}
                    />{" "}
                    See
                  </label>
                  <label className="flex items-center gap-1.25">
                    <input
                      type="checkbox"
                      name="inventoryAdd"
                      checked={formData.allowances?.inventoryAdd || false}
                      onChange={handleChange}
                    />{" "}
                    Add
                  </label>
                  <label className="flex items-center gap-1.25">
                    <input
                      type="checkbox"
                      name="inventoryUpdate"
                      checked={formData.allowances?.inventoryUpdate || false}
                      onChange={handleChange}
                    />{" "}
                    Update
                  </label>
                  <label className="flex items-center gap-1.25">
                    <input
                      type="checkbox"
                      name="inventoryDelete"
                      checked={formData.allowances?.inventoryDelete || false}
                      onChange={handleChange}
                    />{" "}
                    Delete
                  </label>
                </div>

                {/* Container Section */}
                <div className="border-b pb-2">
                  <label className="flex items-center gap-1.25 mb-2 font-bold text-blue-700">
                    <input
                      type="checkbox"
                      name="containerBundle"
                      checked={
                        formData.allowances?.containerSee &&
                        formData.allowances?.containerAdd &&
                        formData.allowances?.containerUpdate &&
                        formData.allowances?.containerDelete
                      }
                      onChange={handleChange}
                    />{" "}
                    Container
                  </label>
                  <label className="flex items-center gap-1.25">
                    <input
                      type="checkbox"
                      name="containerSee"
                      checked={formData.allowances?.containerSee || false}
                      onChange={handleChange}
                    />{" "}
                    See
                  </label>
                  <label className="flex items-center gap-1.25">
                    <input
                      type="checkbox"
                      name="containerAdd"
                      checked={formData.allowances?.containerAdd || false}
                      onChange={handleChange}
                    />{" "}
                    Add
                  </label>
                  <label className="flex items-center gap-1.25">
                    <input
                      type="checkbox"
                      name="containerUpdate"
                      checked={formData.allowances?.containerUpdate || false}
                      onChange={handleChange}
                    />{" "}
                    Update
                  </label>
                  <label className="flex items-center gap-1.25">
                    <input
                      type="checkbox"
                      name="containerDelete"
                      checked={formData.allowances?.containerDelete || false}
                      onChange={handleChange}
                    />{" "}
                    Delete
                  </label>
                </div>

                {/* Additional Allowances Section */}
                <div className="col-span-2 border-t pt-4 mt-2">
                  <h4 className="text-sm font-semibold text-gray-600 mb-3">
                    Additional Permissions
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex items-center gap-1.25">
                      <input
                        type="checkbox"
                        name="canSeePurchasePrices"
                        checked={formData.allowances?.canSeePurchasePrices || false}
                        onChange={handleChange}
                      />{" "}
                      Can See Purchase Prices
                    </label>
                    <label className="flex items-center gap-1.25">
                      <input
                        type="checkbox"
                        name="canSeeProfits"
                        checked={formData.allowances?.canSeeProfits || false}
                        onChange={handleChange}
                      />{" "}
                      Can See Profits
                    </label>
                  </div>
                </div>

                {/* Main Dashboard */}
                <div className="pb-2 col-span-2">
                  <label className="flex items-center gap-1.25">
                    <input
                      type="checkbox"
                      name="mainDashBorad"
                      checked={formData.allowances?.mainDashBorad || false}
                      onChange={handleChange}
                    />{" "}
                    Main Dashboard
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-red-700 text-white px-10 hover:bg-red-600"
            >
              Create User
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}