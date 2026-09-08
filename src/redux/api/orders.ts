import baseApi from "./base";

interface Order {
  id: number;
  productId: number;
  quantity: number;
  status: string;
}

export interface ProductSegment {
  combination: string[];
  frequency: number;
}

interface ProductSegmentResponse {
  success: boolean;
  message: string;
  data: ProductSegment[];
}

interface UpdateOrderPayload {
  id: string;
  date?: string;
  invoiceNumber?: string;
  shippingCharge?: number;
  PONumber?: string;
  storeId?: string;
  isReminderPaused?: boolean;
  paymentDueDate?: string;
  paymentAmountReceived?: number;
  payableAdjustment?: number;
  payableAdjustmentNote?: string;
  paymentStatus?: string;
  salesPerson?: string;
  products?: Array<{
    productId: string;
    quantity: number;
    discount: number;
  }>;
}

interface CreditPayload {
  orderId: string;
  creditAmount: number;
  returnedProductInfo: Array<{
    productId: string;
    returnedQuantity: number;
    readdOrNot: boolean;
  }>;
}

interface CreditResponse {
  success: boolean;
  newCreditBalance: number;
  orderCreditInfo: {
    amount: number;
    date: string;
  };
  updatedProductQuantities?: { [key: string]: number };
}

const orderManagementApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOrders: builder.query({
      query: () => "/order",
      providesTags: ["Orders"],
    }),
    addOrder: builder.mutation<any, any>({
      query: (order) => ({
        url: "/order",
        method: "POST",
        body: order,
      }),
      invalidatesTags: [
        "Orders",
        "Dashboard",
        "SalesOverview",
        "Chart",
        "Products",
        "ProductSegments",
        "SoldTo",
        "Logs",
        "SalesReport"
      ],
    }),

    giteSingleOrder: builder.query({
      query: (id) => `/order/${id}`,
      providesTags: (result, error, id) => [{ type: "Orders", id }],
    }),


    uploadDeliveryImages: builder.mutation<
      { success: boolean; data: { urls: string[] } },
      File[]
    >({
      query: (files) => {
        const formData = new FormData();
        files.forEach((file) => formData.append("images", file));
        return {
          url: "/order/upload-delivery-images",
          method: "POST",
          body: formData,
        };
      },
    }),

    updateOrder: builder.mutation<any, UpdateOrderPayload>({
      query: ({ id, ...patch }) => ({
        url: `/order/${id}`,
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Orders", id },
        "Orders", // ← Add this to invalidate the entire orders list
        "Dashboard",
        "SalesOverview",
        "Chart",
        "Products",
        "ProductSegments",
        "SoldTo",
        "Customers", // ← Add this to invalidate all customer caches
        "Logs",
        "SalesReport",
        { type: "Customers", id: "LIST" }, // ← Add this too
      ],
    }),
    deleteOrder: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/order/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        "Orders",
        { type: "Orders", id: "LIST" },
        "Dashboard",
        "SalesOverview",
        "Chart",
        "Products",
        "ProductSegments",
        "SoldTo",
        "Logs",
        "SalesReport"
      ],
    }),

    getProductSegments: builder.query<ProductSegmentResponse, void>({
      query: () => "/order/getProductSegmentation",
      providesTags: ["ProductSegments"],
    }),
    getPaymentHistory: builder.query({
      query: (id) => `/payment/${id}/customersPayments`,
    }),
    insertPayment: builder.mutation<any, any>({
      query: (payload) => ({
        url: "/payment",
        method: "POST",
        body: payload,
      }),
      invalidatesTags: (result, error, payload) => {
        const storeId = payload.storeId; // This is the customer ID
        return [
          "Orders",
          { type: "Orders", id: "LIST" },
          "Dashboard",
          "SalesOverview",
          "Chart",
          "Products",
          "ProductSegments",
          "SoldTo",
          "SalesReport",
          { type: "Customers", id: storeId }, // ← Critical: invalidate specific customer
          { type: "Customers", id: "LIST" }, // ← Also invalidate list
        ];
      },
    }),
    giveCreditToCustomer: builder.mutation<CreditResponse, CreditPayload>({
      query: ({ orderId, creditAmount, returnedProductInfo }) => ({
        url: `/order/giveCredit`,
        method: "POST",
        body: { orderId, creditAmount, returnedProductInfo },
      }),
      invalidatesTags: (result, error, { orderId }) => [
        "Orders",
        { type: "Orders", id: orderId },
        "Dashboard",
        "SalesOverview",
        "Chart",
        "Products",
        "ProductSegments",
        "SoldTo",
        "Logs"
      ],
    }),
  }),
});

export const {
  useGetOrdersQuery,
  useAddOrderMutation,
  useUpdateOrderMutation,
  useUploadDeliveryImagesMutation,
  useDeleteOrderMutation,
  useGetProductSegmentsQuery,
  useGiteSingleOrderQuery,
  useGetPaymentHistoryQuery,
  useInsertPaymentMutation,
  useGiveCreditToCustomerMutation
} = orderManagementApi;

export default orderManagementApi;
