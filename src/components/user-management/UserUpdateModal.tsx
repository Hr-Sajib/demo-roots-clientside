// UpdateUserModal.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUpdateUserMutation } from "@/redux/api/admin";
import { toast } from "react-hot-toast";
import Select from "react-select";
import imageUpload from "@/lib/ImageUploader";

interface UpdateUserModalProps {
  user: any;
  onClose: () => void;
  open: boolean;
}

interface UpdateUserRequest {
  email: string;
  password?: string;
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

export default function UpdateUserModal({
  user,
  onClose,
  open,
}: UpdateUserModalProps) {
  const [updateUser, { isLoading }] = useUpdateUserMutation();
  const [formData, setFormData] = useState<UpdateUserRequest>({
    email: user?.email || "",
    password: "",
    role: user?.role || "",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    image: user?.image || "",
    lisenceLink: user?.lisenceLink || "",
    lisenceExpiryDate: user?.lisenceExpiryDate
      ? new Date(user.lisenceExpiryDate)
      : undefined,
    lisenceExpiryReminderEmailSentOrNot:
      user?.lisenceExpiryReminderEmailSentOrNot || false,
    phone: user?.phone || "",
    address: user?.address || "",
    city: user?.city || "",
    state: user?.state || "",
    zipCode: user?.zipCode || undefined,
    allowances: {
      mainDashBorad: user?.allowances?.mainDashBorad || false,
      prospectSee: user?.allowances?.prospectSee || false,
      prospectAdd: user?.allowances?.prospectAdd || false,
      prospectUpdate: user?.allowances?.prospectUpdate || false,
      prospectDelete: user?.allowances?.prospectDelete || false,
      customerSee: user?.allowances?.customerSee || false,
      customerAdd: user?.allowances?.customerAdd || false,
      customerUpdate: user?.allowances?.customerUpdate || false,
      customerDelete: user?.allowances?.customerDelete || false,
      orderSee: user?.allowances?.orderSee || false,
      orderAdd: user?.allowances?.orderAdd || false,
      orderUpdate: user?.allowances?.orderUpdate || false,
      orderDelete: user?.allowances?.orderDelete || false,
      inventorySee: user?.allowances?.inventorySee || false,
      inventoryAdd: user?.allowances?.inventoryAdd || false,
      inventoryUpdate: user?.allowances?.inventoryUpdate || false,
      inventoryDelete: user?.allowances?.inventoryDelete || false,
      containerSee: user?.allowances?.containerSee || false,
      containerAdd: user?.allowances?.containerAdd || false,
      containerUpdate: user?.allowances?.containerUpdate || false,
      containerDelete: user?.allowances?.containerDelete || false,
      canSeePurchasePrices: user?.allowances?.canSeePurchasePrices || false,
      canSeeProfits: user?.allowances?.canSeeProfits || false,
    },
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  // Function to get manager allowances (all true except delete ones)
  const getManagerAllowances = () => ({
    mainDashBorad: true,
    prospectSee: true,
    prospectAdd: true,
    prospectUpdate: true,
    prospectDelete: false,
    customerSee: true,
    customerAdd: true,
    customerUpdate: true,
    customerDelete: false,
    orderSee: true,
    orderAdd: true,
    orderUpdate: true,
    orderDelete: false,
    inventorySee: true,
    inventoryAdd: true,
    inventoryUpdate: true,
    inventoryDelete: false,
    containerSee: true,
    containerAdd: true,
    containerUpdate: true,
    containerDelete: false,
    canSeePurchasePrices: true,
    canSeeProfits: true,
  });

  // Check if role is manager
  const isManager = formData.role === "manager";

  // Update allowances when role changes to manager
  useEffect(() => {
    if (formData.role === "manager") {
      setFormData((prev) => ({
        ...prev,
        allowances: getManagerAllowances(),
      }));
    }
  }, [formData.role]);

  // Update formData when user prop changes (for dynamic updates)
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        email: user.email || "",
        password: "",
        role: user.role || "",
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        image: user.image || "",
        lisenceLink: user.lisenceLink || "",
        lisenceExpiryDate: user.lisenceExpiryDate
          ? new Date(user.lisenceExpiryDate)
          : undefined,
        lisenceExpiryReminderEmailSentOrNot:
          user.lisenceExpiryReminderEmailSentOrNot || false,
        phone: user.phone || "",
        address: user.address || "",
        city: user.city || "",
        state: user.state || "",
        zipCode: user.zipCode || undefined,
        allowances: {
          ...prev.allowances,
          mainDashBorad: user.allowances?.mainDashBorad || false,
          prospectSee: user.allowances?.prospectSee || false,
          prospectAdd: user.allowances?.prospectAdd || false,
          prospectUpdate: user.allowances?.prospectUpdate || false,
          prospectDelete: user.allowances?.prospectDelete || false,
          customerSee: user.allowances?.customerSee || false,
          customerAdd: user.allowances?.customerAdd || false,
          customerUpdate: user.allowances?.customerUpdate || false,
          customerDelete: user.allowances?.customerDelete || false,
          orderSee: user.allowances?.orderSee || false,
          orderAdd: user.allowances?.orderAdd || false,
          orderUpdate: user.allowances?.orderUpdate || false,
          orderDelete: user.allowances?.orderDelete || false,
          inventorySee: user.allowances?.inventorySee || false,
          inventoryAdd: user.allowances?.inventoryAdd || false,
          inventoryUpdate: user.allowances?.inventoryUpdate || false,
          inventoryDelete: user.allowances?.inventoryDelete || false,
          containerSee: user.allowances?.containerSee || false,
          containerAdd: user.allowances?.containerAdd || false,
          containerUpdate: user.allowances?.containerUpdate || false,
          containerDelete: user.allowances?.containerDelete || false,
          canSeePurchasePrices: user.allowances?.canSeePurchasePrices || false,
          canSeeProfits: user.allowances?.canSeeProfits || false,
        },
      }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, value, checked } = e.target;
    
    // If manager is selected, prevent changing allowances
    if (isManager && name !== "role") {
      // For allowance checkboxes, prevent changes
      const allowanceNames = [
        "prospectBundle", "customerBundle", "orderBundle", "inventoryBundle", "containerBundle",
        "mainDashBorad", "prospectSee", "prospectAdd", "prospectUpdate", "prospectDelete",
        "customerSee", "customerAdd", "customerUpdate", "customerDelete",
        "orderSee", "orderAdd", "orderUpdate", "orderDelete",
        "inventorySee", "inventoryAdd", "inventoryUpdate", "inventoryDelete",
        "containerSee", "containerAdd", "containerUpdate", "containerDelete",
        "canSeePurchasePrices", "canSeeProfits"
      ];
      if (allowanceNames.includes(name)) {
        return; // Prevent changes
      }
    }
    
    if (type === "checkbox") {
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
      } else if (name in formData.allowances!) {
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
    } else if (name === "address" || name === "city" || name === "zipCode") {
      const val =
        name === "zipCode"
          ? value
            ? parseInt(value)
            : undefined
          : value;
      setFormData((prev) => ({ ...prev, [name]: val }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value ? new Date(e.target.value) : undefined;
    setFormData((prev) => ({ ...prev, lisenceExpiryDate: value }));
  };
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, field: "image" | "lisenceLink") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field === "image") {
      setImageFile(file);
    } else {
      setDocumentFile(file);
    }
  };

  const handleRoleChange = (selectedOption: any) => {
    setFormData((prev) => ({ ...prev, role: selectedOption.value }));
  };

  const handleStateChange = (selectedOption: any) => {
    setFormData((prev) => ({ ...prev, state: selectedOption.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password && formData.password !== confirmPassword) {
      setError("Password and Confirm Password do not match.");
      return;
    }
    setError("");

    try {
      const formDataToSend = new FormData();

      // Append all text fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          if (key === "allowances") {
            formDataToSend.append(key, JSON.stringify(value));
          } else if (key === "lisenceExpiryDate" && value instanceof Date) {
            formDataToSend.append(key, value.toISOString());
          } else {
            formDataToSend.append(key, String(value));
          }
        }
      });

      // Append files with correct field names
      if (imageFile) {
        formDataToSend.append("image", imageFile);
      }
      if (documentFile) {
        formDataToSend.append("document", documentFile);
      }

      const res = await updateUser({
        id: user?._id,
        body: formDataToSend as any,
      }).unwrap();

      toast.success("User updated successfully");
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to update user");
    }
  };

  if (!open) return null;

  const roleOptions = [
    { value: "salesUser", label: "Sales User" },
    { value: "warehouseUser", label: "Warehouse User" },
    { value: "manager", label: "Manager" },
    { value: "driver", label: "Driver" },
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
    <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-3xl overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-bold text-gray-700 mb-4 text-center">
          Update User
        </h2>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl"
        >
          ×
        </button>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
          <Input
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
          />
          <div className="flex gap-3">
            <Input
              name="password"
              type="text"
              placeholder="New Password (leave blank to keep unchanged)"
              value={formData.password}
              onChange={handleChange}
              className="w-1/2"
            />
            <Input
              name="confirmPassword"
              type="text"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-1/2"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Select
            options={roleOptions}
            value={roleOptions.find((option) => option.value === formData.role)}
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
          <Input
            name="firstName"
            placeholder="First Name"
            value={formData.firstName || ""}
            onChange={handleChange}
          />
          <Input
            name="lastName"
            placeholder="Last Name"
            value={formData.lastName || ""}
            onChange={handleChange}
          />
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
          <Input
            name="phone"
            placeholder="Phone"
            value={formData.phone || ""}
            onChange={handleChange}
          />
          <Input
            name="address"
            placeholder="Address"
            value={formData.address || ""}
            onChange={handleChange}
          />
          <Input
            name="city"
            placeholder="City"
            value={formData.city || ""}
            onChange={handleChange}
          />
          <Select
            options={stateOptions}
            value={stateOptions.find(
              (option) => option.value === formData.state,
            )}
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
          <div className="border p-2 rounded-xl ">
            <p className="text-sm ml-2 my-2">License and license expiry date</p>
            <div className="flex">
              <div className="w-full">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageChange(e, "lisenceLink")}
                  className="w-full border rounded-lg p-2"
                />
              </div>
              <Input
                name="lisenceExpiryDate"
                className="w-[30%] ml-1.5 h-10"
                type="date"
                value={
                  formData.lisenceExpiryDate
                    ? formData.lisenceExpiryDate.toISOString().split("T")[0]
                    : ""
                }
                onChange={handleDateChange}
              />
            </div>
          </div>

          <div className="border p-3 rounded-xl">
            <h3 className="text-gray-400 mb-4">Set access allowances</h3>
            {isManager && (
              <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200 text-blue-700 text-sm">
                Manager role has all allowances enabled (except delete permissions). These cannot be changed.
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
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
                    disabled={isManager}
                  />{" "}
                  Prospect
                </label>
                <label className="flex items-center gap-1.25">
                  <input
                    type="checkbox"
                    name="prospectSee"
                    checked={formData.allowances?.prospectSee || false}
                    onChange={handleChange}
                    disabled={isManager}
                  />{" "}
                  See
                </label>
                <label className="flex items-center gap-1.25">
                  <input
                    type="checkbox"
                    name="prospectAdd"
                    checked={formData.allowances?.prospectAdd || false}
                    onChange={handleChange}
                    disabled={isManager}
                  />{" "}
                  Add
                </label>
                <label className="flex items-center gap-1.25">
                  <input
                    type="checkbox"
                    name="prospectUpdate"
                    checked={formData.allowances?.prospectUpdate || false}
                    onChange={handleChange}
                    disabled={isManager}
                  />{" "}
                  Update
                </label>
                <label className="flex items-center gap-1.25">
                  <input
                    type="checkbox"
                    name="prospectDelete"
                    checked={formData.allowances?.prospectDelete || false}
                    onChange={handleChange}
                    disabled={isManager}
                  />{" "}
                  Delete
                </label>
              </div>
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
                    disabled={isManager}
                  />{" "}
                  Customer
                </label>
                <label className="flex items-center gap-1.25">
                  <input
                    type="checkbox"
                    name="customerSee"
                    checked={formData.allowances?.customerSee || false}
                    onChange={handleChange}
                    disabled={isManager}
                  />{" "}
                  See
                </label>
                <label className="flex items-center gap-1.25">
                  <input
                    type="checkbox"
                    name="customerAdd"
                    checked={formData.allowances?.customerAdd || false}
                    onChange={handleChange}
                    disabled={isManager}
                  />{" "}
                  Add
                </label>
                <label className="flex items-center gap-1.25">
                  <input
                    type="checkbox"
                    name="customerUpdate"
                    checked={formData.allowances?.customerUpdate || false}
                    onChange={handleChange}
                    disabled={isManager}
                  />{" "}
                  Update
                </label>
                <label className="flex items-center gap-1.25">
                  <input
                    type="checkbox"
                    name="customerDelete"
                    checked={formData.allowances?.customerDelete || false}
                    onChange={handleChange}
                    disabled={isManager}
                  />{" "}
                  Delete
                </label>
              </div>
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
                    disabled={isManager}
                  />{" "}
                  Order
                </label>
                <label className="flex items-center gap-1.25">
                  <input
                    type="checkbox"
                    name="orderSee"
                    checked={formData.allowances?.orderSee || false}
                    onChange={handleChange}
                    disabled={isManager}
                  />{" "}
                  See
                </label>
                <label className="flex items-center gap-1.25">
                  <input
                    type="checkbox"
                    name="orderAdd"
                    checked={formData.allowances?.orderAdd || false}
                    onChange={handleChange}
                    disabled={isManager}
                  />{" "}
                  Add
                </label>
                <label className="flex items-center gap-1.25">
                  <input
                    type="checkbox"
                    name="orderUpdate"
                    checked={formData.allowances?.orderUpdate || false}
                    onChange={handleChange}
                    disabled={isManager}
                  />{" "}
                  Update
                </label>
                <label className="flex items-center gap-1.25">
                  <input
                    type="checkbox"
                    name="orderDelete"
                    checked={formData.allowances?.orderDelete || false}
                    onChange={handleChange}
                    disabled={isManager}
                  />{" "}
                  Delete
                </label>
              </div>
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
                    disabled={isManager}
                  />{" "}
                  Inventory
                </label>
                <label className="flex items-center gap-1.25">
                  <input
                    type="checkbox"
                    name="inventorySee"
                    checked={formData.allowances?.inventorySee || false}
                    onChange={handleChange}
                    disabled={isManager}
                  />{" "}
                  See
                </label>
                <label className="flex items-center gap-1.25">
                  <input
                    type="checkbox"
                    name="inventoryAdd"
                    checked={formData.allowances?.inventoryAdd || false}
                    onChange={handleChange}
                    disabled={isManager}
                  />{" "}
                  Add
                </label>
                <label className="flex items-center gap-1.25">
                  <input
                    type="checkbox"
                    name="inventoryUpdate"
                    checked={formData.allowances?.inventoryUpdate || false}
                    onChange={handleChange}
                    disabled={isManager}
                  />{" "}
                  Update
                </label>
                <label className="flex items-center gap-1.25">
                  <input
                    type="checkbox"
                    name="inventoryDelete"
                    checked={formData.allowances?.inventoryDelete || false}
                    onChange={handleChange}
                    disabled={isManager}
                  />{" "}
                  Delete
                </label>
              </div>
              <div className=" pb-2">
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
                    disabled={isManager}
                  />{" "}
                  Container
                </label>
                <label className="flex items-center gap-1.25">
                  <input
                    type="checkbox"
                    name="containerSee"
                    checked={formData.allowances?.containerSee || false}
                    onChange={handleChange}
                    disabled={isManager}
                  />{" "}
                  See
                </label>
                <label className="flex items-center gap-1.25">
                  <input
                    type="checkbox"
                    name="containerAdd"
                    checked={formData.allowances?.containerAdd || false}
                    onChange={handleChange}
                    disabled={isManager}
                  />{" "}
                  Add
                </label>
                <label className="flex items-center gap-1.25">
                  <input
                    type="checkbox"
                    name="containerUpdate"
                    checked={formData.allowances?.containerUpdate || false}
                    onChange={handleChange}
                    disabled={isManager}
                  />{" "}
                  Update
                </label>
                <label className="flex items-center gap-1.25">
                  <input
                    type="checkbox"
                    name="containerDelete"
                    checked={formData.allowances?.containerDelete || false}
                    onChange={handleChange}
                    disabled={isManager}
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
                      disabled={isManager}
                    />{" "}
                    Can See Purchase Prices
                  </label>
                  <label className="flex items-center gap-1.25">
                    <input
                      type="checkbox"
                      name="canSeeProfits"
                      checked={formData.allowances?.canSeeProfits || false}
                      onChange={handleChange}
                      disabled={isManager}
                    />{" "}
                    Can See Profits
                  </label>
                </div>
              </div>

              <div className=" pb-2">
                <label className="flex items-center gap-1.25">
                  <input
                    type="checkbox"
                    name="mainDashBorad"
                    checked={formData.allowances?.mainDashBorad || false}
                    onChange={handleChange}
                    disabled={isManager}
                  />{" "}
                  Main Dashboard
                </label>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
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
              disabled={isLoading}
              className={`bg-red-700 text-white ${
                isLoading
                  ? "opacity-70 cursor-not-allowed"
                  : "hover:bg-red-600"
              }`}
            >
              {isLoading ? "Updating..." : "Update"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}