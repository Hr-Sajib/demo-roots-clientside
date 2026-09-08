"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { FollowUpActivity, QuotedListItem } from "@/types";
import { useGetInventoryQuery } from "@/redux/api/inventory";
import { useGetAllUsersQuery } from "@/redux/api/admin";
import { useAddProspectMutation } from "@/redux/api/prospects";
// Define enums
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
  _id: string;
  itemNumber: string;
  name: string;
  packetSize: string;
  salesPrice: number;
  cbm?: number;
}

interface FormData {
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
  status: Status;
  assignedSalesPerson: string;
  followUpActivities: FollowUpActivity[];
  quotedList: QuotedListItem[];
  competitorStatement: string;
}

export default function AddProspact(): React.ReactElement {
  const [isAdmin, setIsAdmin] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    storeName: "",
    storePhone: "",
    storePersonEmail: "",
    storePersonName: "",
    storePersonPhone: "",
    salesTaxId: "",
    shippingAddress: "",
    shippingState: "",
    shippingZipcode: "",
    shippingCity: "",
    miscellaneousDocImage: "",
    leadSource: "",
    note: "",
    status: "contacted",
    assignedSalesPerson: "",
    followUpActivities: [],
    quotedList: [],
    competitorStatement: "",
  });

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

  const [addProspect, { isLoading: isSaving }] = useAddProspectMutation();
  const router = useRouter();

  const [productSearch, setProductSearch] = useState("");

  // File handling
  const [miscellaneousDocFile, setMiscellaneousDocFile] = useState<File | null>(null);

  useEffect(() => {
    if (isInventoryError) {
      console.error("Error fetching inventory:", isInventoryError);
      toast.error("Failed to load inventory.");
    }
  }, [isInventoryError]);

  useEffect(() => {
    if (salesError) {
      console.error("Error fetching sales users:", salesError);
      toast.error("Failed to load sales users.");
    }
  }, [salesError]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMiscellaneousDocFile(file);
      // Optional: show preview if image
      if (file.type.startsWith("image/")) {
        const previewUrl = URL.createObjectURL(file);
        setFormData((prev) => ({ ...prev, miscellaneousDocImage: previewUrl }));
      } else {
        setFormData((prev) => ({ ...prev, miscellaneousDocImage: "PDF Selected" }));
      }
    }
  };

  const handleQuotePriceChange = (index: number, newPrice: string) => {
    const updatedQuotedList = [...formData.quotedList];
    updatedQuotedList[index] = {
      ...updatedQuotedList[index],
      price: parseFloat(newPrice) || 0,
    };
    setFormData((prev) => ({
      ...prev,
      quotedList: updatedQuotedList,
    }));
  };

  const handleQuoteInputChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>,
  ) => {
    const { name, value } = e.target;
    if (name === "productObjId" && inventoryData?.data) {
      const selectedProduct = inventoryData.data.find(
        (p: Product) => p._id === value,
      );
      if (selectedProduct) {
        setNewQuote({
          productObjId: selectedProduct._id,
          itemNumber: selectedProduct.itemNumber,
          itemName: selectedProduct.name,
          price: selectedProduct.salesPrice,
          packetSize: selectedProduct.packetSize || "",
        });
        setProductSearch("");
      }
    } else if (name === "price") {
      setNewQuote((prev) => ({
        ...prev,
        price: parseFloat(value) || 0,
      }));
    }
  };

  const handleFollowUpInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setNewFollowUp((prev) => ({ ...prev, [name]: value }));
  };

  const addQuote = () => {
    if (
      !newQuote.productObjId ||
      !newQuote.itemNumber ||
      !newQuote.itemName ||
      !newQuote.price
    ) {
      toast.error("All required quote fields must be filled.");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      quotedList: [
        ...prev.quotedList,
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
      ...prev,
      followUpActivities: [...prev.followUpActivities, { ...newFollowUp }],
    }));
    setNewFollowUp({ activity: "", activityDate: "", activityMedium: "call" });
    setIsFollowUpModalOpen(false);
  };

  const handleDeleteQuote = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      quotedList: prev.quotedList.filter((_, i) => i !== index),
    }));
  };

  const handleDeleteFollowUp = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      followUpActivities: prev.followUpActivities.filter((_, i) => i !== index),
    }));
  };

  const validatePhoneNumber = (value: string): string => {
    if (!value.trim()) return "Phone number is required.";
    if (value.replace(/\D/g, "").length !== 10) {
      return "Phone number must be 10 digits.";
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const storePhoneError = validatePhoneNumber(formData.storePhone);
    const storePersonPhoneError = validatePhoneNumber(formData.storePersonPhone);

    if (storePhoneError || storePersonPhoneError) {
      toast.error("Please correct the phone number format.");
      return;
    }

    const formDataToSend = new FormData();

    // Append all text fields
    Object.entries(formData).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;

      if (key === "followUpActivities" || key === "quotedList") {
        formDataToSend.append(key, JSON.stringify(value));
      } else {
        formDataToSend.append(key, String(value));
      }
    });

    // Append file if selected
    if (miscellaneousDocFile) {
      formDataToSend.append("miscellaneousDocImage", miscellaneousDocFile);
    }

    try {
      const addData = await addProspect(formDataToSend as any).unwrap();
      console.log("adddata", addData);
      toast.success("Prospect Added successfully");
      router.push("/prospects");
    } catch (err: any) {
      console.error("Failed to add prospect:", err);
      toast.error(err?.data?.message || "An unexpected error occurred.");
    }
  };

  const handleCancel = () => router.push("/prospects");

  const filteredProducts =
    inventoryData?.data?.filter((product: Product) =>
      product.name.toLowerCase().includes(productSearch.toLowerCase()),
    ) || [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="p-4 bg-white rounded-lg shadow-md min-h-screen">
        <h1 className="text-2xl font-bold mb-6 ">
          Add New Prospect
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Store Information */}
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
                placeholder="Enter store name"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="storePersonName">
                Customer Full Name <span className="text-red-600">*</span>
              </Label>
              <Input
                id="storePersonName"
                name="storePersonName"
                value={formData.storePersonName}
                onChange={handleInputChange}
                placeholder="Enter customer full name"
                required
              />
            </div>
            {/* Store Phone */}
            <div className="space-y-2">
              <Label htmlFor="storePhone">
                Store Phone Number <span className="text-red-600">*</span>
              </Label>
              <Input
                id="storePhone"
                name="storePhone"
                type="tel"
                value={formData.storePhone || ""}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
                  handleInputChange({ target: { name: "storePhone", value: raw } } as any);
                }}
                placeholder="1234567890"
                required
              />

            </div>
          </div>

         {/* Authorized Person Phone */}
            <div className="space-y-2">
              <Label htmlFor="storePersonPhone">
                Authorized Person Number (For Order) <span className="text-red-600">*</span>
              </Label>
              <Input
                id="storePersonPhone"
                name="storePersonPhone"
                type="tel"
                value={formData.storePersonPhone || ""}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "").slice(0, 10);
                  handleInputChange({ target: { name: "storePersonPhone", value: raw } } as any);
                }}
                placeholder="1234567890"
                required
              />

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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="salesTaxId">Sales Tax ID</Label>
            <Input
              id="salesTaxId"
              name="salesTaxId"
              value={formData.salesTaxId}
              onChange={handleInputChange}
              placeholder="Enter sales tax ID"
            />
          </div>

          {/* Shipping Information */}
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
                placeholder="Enter shipping address"
                rows={3}
                required
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
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
                  placeholder="Enter shipping city"
                  required
                />
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
                <Label htmlFor="shippingZipcode">
                  Shipping Zipcode <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="shippingZipcode"
                  name="shippingZipcode"
                  value={formData.shippingZipcode}
                  onChange={handleInputChange}
                  placeholder="Enter shipping zipcode"
                  required
                  maxLength={5}
                />
              </div>
            </div>
          </div>

          {/* Miscellaneous Document */}
          <div className="space-y-2">
            <Label htmlFor="miscellaneousDocImage">Miscellaneous Document Image</Label>
            <input
              type="file"
              id="miscellaneousDocImage"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="w-full border rounded-lg p-2"
            />
            {formData.miscellaneousDocImage && (
              <p className="text-sm text-green-600">File selected</p>
            )}
          </div>

          {/* Lead Source & Note */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="leadSource">Lead Source</Label>
              <Input
                id="leadSource"
                name="leadSource"
                value={formData.leadSource}
                onChange={handleInputChange}
                placeholder="Enter lead source"
              />
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
          </div>

          <div className="flex space-x-4">
            <Button
              type="button"
              onClick={() => setIsQuoteModalOpen(true)}
              className="bg-gray-700 text-white"
            >
              Add Quote Product
            </Button>
            <Button
              type="button"
              onClick={() => setIsFollowUpModalOpen(true)}
              className="bg-gray-700 text-white"
            >
              Follow Up
            </Button>
          </div>

          {/* Quoted List Table */}
          {formData.quotedList.length > 0 && (
            <div className="overflow-x-auto">
              <Label>Quoted Items</Label>
              <table className="w-full text-sm text-left text-gray-500 mt-2">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-2">Product ID</th>
                    <th className="px-4 py-2">Item #</th>
                    <th className="px-4 py-2">Item Name</th>
                    <th className="px-4 py-2">Price ($)</th>
                    <th className="px-4 py-2">Packet Size</th>
                    <th className="px-4 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {formData.quotedList.map((item, index) => (
                    <tr key={index} className="bg-white border-b">
                      <td className="px-4 py-2">{item.productObjId}</td>
                      <td className="px-4 py-2">{item.itemNumber}</td>
                      <td className="px-4 py-2">{item.itemName}</td>
                      <td className="px-4 py-2">
                        {isAdmin ? (
                          <Input
                            type="number"
                            value={item.price}
                            onChange={(e) =>
                              handleQuotePriceChange(index, e.target.value)
                            }
                            className="w-24 px-2 py-1 border rounded-md"
                            step="0.01"
                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          />
                        ) : (
                          `$${item.price.toFixed(2)}`
                        )}
                      </td>
                      <td className="px-4 py-2">{item.packetSize || "N/A"}</td>
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
            </div>
          )}

          {/* Follow Up Activities Table */}
          {formData.followUpActivities.length > 0 && (
            <div className="overflow-x-auto">
              <Label>Follow Up Activities</Label>
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
            </div>
          )}

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
              className="px-10 py-2 bg-red-700 hover:bg-red-600 cursor-pointer text-white font-bold"
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Prospect"}
            </Button>
          </div>
        </form>

        {/* Quote Modal */}
        {isQuoteModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Add Quote Product</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Input
                    id="productSearch"
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products..."
                    className="w-full"
                  />
                </div>

                {productSearch && (
                  <div className="max-h-60 overflow-y-auto border rounded-md bg-gray-50">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((product: Product) => (
                        <div
                          key={product._id}
                          className="px-4 py-2 hover:bg-gray-200 cursor-pointer transition-colors"
                          onClick={() => {
                            setNewQuote({
                              productObjId: product._id,
                              itemNumber: product.itemNumber,
                              itemName: product.name,
                              price: product.salesPrice,
                              packetSize: product.packetSize || "",
                            });
                            setProductSearch("");
                          }}
                        >
                          <div className="font-medium">{product.name}</div>
                          <div className="text-sm text-gray-600">
                            Item: {product.itemNumber} • ${product.salesPrice.toFixed(2)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500">No products found</div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="itemNumber">Item Number</Label>
                  <Input
                    id="itemNumber"
                    value={newQuote.itemNumber}
                    disabled
                    className="w-full bg-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="itemName">Item Name</Label>
                  <Input
                    id="itemName"
                    value={newQuote.itemName}
                    disabled
                    className="w-full bg-gray-100"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={newQuote.price}
                    onChange={(e) =>
                      setNewQuote((prev) => ({
                        ...prev,
                        price: parseFloat(e.target.value) || 0,
                      }))
                    }
                    placeholder="Price"
                    className="w-full"
                    disabled={!isAdmin}
                    step="0.01"
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-4 mt-6">
                <Button
                  type="button"
                  onClick={() => {
                    setIsQuoteModalOpen(false);
                    setProductSearch("");
                    setNewQuote({
                      productObjId: "",
                      itemNumber: "",
                      itemName: "",
                      price: 0,
                      packetSize: "",
                    });
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={addQuote}
                  className="bg-red-700 text-white"
                  disabled={!newQuote.productObjId}
                >
                  Add Quote
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Follow Up Modal */}
        {isFollowUpModalOpen && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
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
                  className="bg-red-700 text-white"
                >
                  Add Follow Up
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
