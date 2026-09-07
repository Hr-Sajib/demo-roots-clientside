// src/redux/api/b2cOrder/b2cOrderApi.ts

import baseApi from "./base";

// You can keep this interface minimal or expand it later
interface B2COrder {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderStatus: string;
  paymentStatus: string;
  totalPayable: number;
  // ... add other fields you actually use in the frontend
}

// Minimal payload shapes (adjust according to your backend expectations)
interface CreateB2COrderPayload {
  date: string;
  invoiceNumber: string;
  PONumber?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  pickUpAtStore: boolean;
  products: Array<{
    productId: string;
    quantity: number;
    price: number;
    discount?: number;
  }>;
  shippingCharge?: number;
  payableAdjustment?: number;
  payableAdjustmentNote?: string;
  shippingDate?: string;
  paymentDueDate: string;
  note?: string;
}

interface UpdateB2COrderPayload {
  id: string;
  date?: string;
  invoiceNumber?: string;
  PONumber?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  pickUpAtStore?: boolean;
  products?: Array<{
    productId: string;
    quantity: number;
    price: number;
    discount?: number;
  }>;
  shippingCharge?: number;
  payableAdjustment?: number;
  payableAdjustmentNote?: string;
  shippingDate?: string;
  paymentDueDate?: string;
  orderStatus?: string;
  paymentStatus?: string;
  note?: string;
}

const b2cOrderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // 1. Get all B2C orders
    getb2cOrders: builder.query({
      query: () => "/b2cOrder",
    }),

    // 2. Get single B2C order by ID
    getB2CSingleOrder: builder.query({
      query: (id) => `/b2cOrder/${id}`,
    }),

    // 3. Create new B2C order
    createB2COrder: builder.mutation<B2COrder, CreateB2COrderPayload>({
      query: (order) => ({
        url: "/b2cOrder",
        method: "POST",
        body: order,
      }),

    }),

    // 4. Update existing B2C order
    updateB2COrder: builder.mutation<B2COrder, UpdateB2COrderPayload>({
      query: ({ id, ...patch }) => ({
        url: `/b2cOrder/${id}`,
        method: "PATCH",
        body: patch,
      }),

    }),

    // 5. Delete B2C order
    deleteB2COrder: builder.mutation<{ success: boolean; message?: string }, string>({
      query: (id) => ({
        url: `/b2cOrder/${id}`,
        method: "DELETE",
      }),

    }),
  }),
});

export const {
  useGetb2cOrdersQuery,
  useGetB2CSingleOrderQuery,
  useCreateB2COrderMutation,
  useUpdateB2COrderMutation,
  useDeleteB2COrderMutation,
} = b2cOrderApi;

export default b2cOrderApi;