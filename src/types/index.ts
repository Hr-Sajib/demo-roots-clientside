/* ------------------------------------------------------------------
   1. DASHBOARD-SPECIFIC TYPES (exact shape of the API response)
   ------------------------------------------------------------------ */
export interface FollowUpActivity {
  activity: string;
  activityDate: string;
  activityMedium: "call" | "email" | "meeting" | "whatsapp" | string;
}

export interface QuotedListItem {
  itemNumber: string;
  itemName: string;
  price: number;
  packetSize?: string; // optional – API may omit
  quantity?: number;
}

export interface DashboardProspect {
  _id: string;
  storeName?: string;
  storePersonName?: string;
  status?: string; // <-- string from DB
  followUpActivities?: FollowUpActivity[];
  quotedList?: QuotedListItem[];
}

export interface Order {
  _id: string;
  date: string;
  invoiceNumber: string;
  PONumber: string;
  storeId: {
    _id: string;
    storeName: string;
    storePhone: string;
    storePersonEmail: string;
    salesTaxId: string;
    acceptedDeliveryDays: string[];
    bankACHAccountInfo: string;
    storePersonName: string;
    storePersonPhone: string;
    billingAddress: string;
    billingState: string;
    billingZipcode: string;
    billingCity: string;
    shippingAddress: string;
    shippingState: string;
    shippingZipcode: string;
    shippingCity: string;
    shippingCharge: string;
    creditApplication: string;
    ownerLegalFrontImage: string;
    ownerLegalBackImage: string;
    voidedCheckImage: string;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
    __v: number;
  };
  paymentDueDate: string;
  shippingDate: string;
  orderAmount: number;
  orderStatus: string;
  paymentAmountReceived: number;
  discountGiven: number;
  openBalance: number;
  profitAmount: number;
  profitPercentage: number;
  paymentStatus: string;
  products: Array<{
    productId: string | null;
    quantity: number;
    discount: number;
    _id: string;
  }>;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface ReusableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode; // required
  title: string;
  children: React.ReactNode;
}

export interface AddOrderFormValues {
  date: string;
  invoiceNumber: string;
  PONumber: string;
  storeName: string;
  paymentDueDate: string;
  orderAmount: string;
  orderStatus: string;
  paymentAmountReceived: string;
  discountGiven: string;
  openBalance: string;
  profitAmount: string;
  profitPercentage: string;
  paymentStatus: string;
}

export interface AddOrderFormProps {
  onSubmit: (values: AddOrderFormValues) => void;
  onCancel?: () => void;
}

interface CustomerOrder {
  _id: string;
  invoiceNumber: string;
  PONumber: string;
  date: string;
  paymentDueDate: string;
  orderAmount: number;
  shippingCharge: number;
  orderStatus: string;
  paymentAmountReceived: number;
  totalPayable: number;
  discountGiven: number;
  openBalance: number;
  profitAmount: number;
  profitPercentage: number;
  paymentStatus: string;
  storeId: string;
}

export interface Customer {
  _id: string;
  storeName: string;
  storePhone: string;
  storePersonEmail: string;
  secondaryEmails: {
    email: string;
    sendEmails: boolean;
  }[];
  salesTaxId: string;
  acceptedDeliveryDays: string[];
  bankACHAccountInfo: string;
  termDays?: number;
  storePersonName: string;
  storePersonPhone: string;
  billingAddress: string;
  billingState: string;
  isOrderBlocked?: boolean;
  billingZipcode: string;
  billingCity: string;
  shippingAddress: string;
  shippingState: string;
  note: string;
  whatsappGroupLink?: string;
  shippingZipcode: string;
  shippingCity: string;
  creditApplication?: string;
  ownerLegalFrontImage?: string;
  ownerLegalBackImage?: string;
  voidedCheckImage?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;

  creditBalance?: number;
  // Optional fields from fakeData, assuming they might exist
  openBalance?: number;
  totalOrders?: number;
  totalOrderAmount?: number;
  isCustomerSourceProspect?: boolean;
  customerOrders?: CustomerOrder[];

  addedBy: string;

  businessExpirationDate?: string;

  quotedList: {
    itemNumber: string;
    itemName: string;
    packetSize: string;
    price: number;
  }[];

  sentEmailHistory?: {
    date: string;
    textContnt: string;
    quoteList: { productId: string; productName: string; price: number }[];
  }[];

  assignedSalesPerson?: string | { _id: string; email: string; name?: string };
  commissionRate?:number
}

// TypeScript type for API response
export interface GetCustomersResponse {
  success: boolean;
  message: string;
  data: Customer[];
}

// add container type
export interface ContainerProduct {
  _id: string;
  category: string;
  itemNumber: string;
  productName?: string;
  quantity: number;
  perCaseCost: number;
  perCasePurchasePrice?: number;
  packetSize: string;
  purchasePrice: number;
  salesPrice: number;
  cbm?: number;
}

export interface Container {
  _id: string;
  containerNumber: string;
  containerName: string;
  containerDocuments?: string[]
  paidAmount?: number;
  isDeleted: boolean;
  containerStatus: "onTheWay" | "delivered" | "pending" | string;
  deliveryDate: string;
  shippingCost: number;
  // perCaseShippingCost lives at the root (NOT per product). Calculated
  // server-side as (shippingCost / totalQtyAcrossAllFinalProducts).
  perCaseShippingCost: number;
  containerProducts: ContainerProduct[];
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface ContainerApiResponse {
  success: boolean;
  message: string;
  data: Container[];
}

export interface InventoryProduct {
  _id: string;
  name: string;
  category: string;
  packetSize: string;
  perCaseCost: number;
  purchasePrice: number;
  salesPrice: number;
}

export interface InventoryApiResponse {
  success: boolean;
  message: string;
  data: InventoryProduct[];
}

export interface Category {
  _id: string;
  name: string;
}

export interface CategoryApiResponse {
  success: boolean;
  message: string;
  data: Category[];
}

// Dimensions for package size
export interface PackageDimensions {
  length: number;
  width: number;
  height: number;
  unit: string;
}

// Nested category information
export interface CategoryId {
  _id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

// Main product type for products by category
export interface Product {
  packageDimensions: PackageDimensions;
  _id: string;
  name: string;
  isDeleted: boolean;
  competitorPrice: number;
  packetSize: string;
  weight: number;
  weightUnit: string;
  expiryDate: string;
  categoryId: CategoryId;
  reorderPointOfQuantity: number;
  salesPrice: number;
  purchasePrice: number;
  priceForCustomersRecords?: Map<
    string,
    {
      lastPurchasePrice: number;
      purchaseCount: number;
    }
  >;
  barcodeString: string;
  itemNumber: string;
  quantity: number;
  quantityInWarehouseLocation: Map<string, number>;
  createdAt: string;
  updatedAt: string;
  __v: number;
  incomingQuantity: number;

  isB2BProduct?: boolean;
  isB2CProduct?: boolean;
}
export interface GetProductResponse {
  success: boolean;
  message: string;
  data: Product[];
}

export interface Prospect {
  _id: string;
  storeName: string;
  storePhone: string;
  storePersonEmail: string;
  storePersonName: string;
  storePersonPhone: string;
  salesTaxId: string;
  shippingAddress: string;
  shippingState: string;
  shippingCity: string;
  addedBy?: string;
  shippingZipcode: string;
  miscellaneousDocImage: string;
  followUpActivities?: {
    activity: string;
    activityDate: string;
    activityMedium: "call" | "email" | "meeting" | "whatsapp" | string;
  }[];
  leadSource: string;
  note: string;
  status: string;
  assignedSalesPerson: {
    _id: string;
    email: string;
    role: string;
    createdAt: string;
    updatedAt: string;
    __v: number;
  };

  quotedList: {
    productObjId?: {
      _id: string;
      name: string;
      isDeleted: boolean;
      competitorPrice: number;
      packetSize: string;
      weight: number;
      weightUnit: string;
      categoryId: string;
      reorderPointOfQuantity: number;
      salesPrice: number;
      purchasePrice: number;
      barcodeString: string;
      itemNumber: string;
      quantity: number;
      warehouseLocation: string;
      createdAt: string;
      updatedAt: string;
      __v: number;
      incomingQuantity: number;
      packageDimensions: {
        length: number;
        width: number;
        height: number;
        unit: string;
      };
    };
    itemNumber: string;
    itemName: string;
    price: number;
    packetSize: string;
  }[];
  competitorStatement: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface ProspectsResponse {
  success: boolean;
  message: string;
  data: Prospect[];
}

// types.ts or within the component file

// QuotedListItem type (includes packetSize from the sample data)
export interface QuotedListItem {
  productObjId: string;
  itemNumber: string;
  itemName: string;
  packetSize?: string;
  price: number;
}

// FollowUpActivity type (includes call as a valid activityMedium)
export interface FollowUpActivity {
  activity: string;
  activityDate: string; // ISO date string (e.g., "2025-07-10")
  activityMedium: string; // Updated to include "call"
  // Optional, 24-char ObjectId if required by API
}

// AddProspectRequest type (full form data structure)
export interface AddProspectRequest {
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
  miscellaneousDocImage?: string;
  leadSource: string;
  note?: string;
  status: "new" | "contacted" | "qualified" | "rejected" | "converted";
  competitorStatement?: string;
  quotedList: QuotedListItem[];
  followUpActivities: FollowUpActivity[]; // ✅ Update this line
  assignedSalesPerson: string;
  isDeleted?: boolean;
}

// @/types/index.ts (or wherever your types are defined)
export interface FilterFormValues {
  startDate?: string;
  endDate?: string;
  paymentDueStartDate?: string;
  paymentDueEndDate?: string;
  orderStatus?: string[];
  paymentStatus?: string[];
  storeIds?: string[];
  minOrderAmount?: number;
  maxOrderAmount?: number;
  hasOpenBalance?: boolean;
}

export interface OrderFilterFormProps {
  onSubmit: (values: FilterFormValues) => void;
  onClear?: () => void;
  initialValues?: FilterFormValues | null;
}

export interface ExpiringCustomer {
  _id: string;
  storeName: string;
  billingAddress: string;
  billingCity: string;
  businessExpirationDate: string;
  storePersonEmail: string;
  storePersonName: string;
  daysUntilExpiry: number;
}
