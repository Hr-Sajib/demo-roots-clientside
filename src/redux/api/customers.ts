import baseApi from "./base";
import { Customer, ExpiringCustomer } from "@/types";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

const customersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCustomers: builder.query<ApiResponse<Customer[]>, void>({
      query: () => "/customer",
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ _id }) => ({
                type: "Customers" as const,
                id: _id,
              })),
              { type: "Customers", id: "LIST" },
            ]
          : [{ type: "Customers", id: "LIST" }],
    }),

    getAllPendingCustomers: builder.query<ApiResponse<Customer[]>, void>({
      query: () => "/customer/pending",
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ _id }) => ({
                type: "Customers" as const,
                id: _id,
              })),
              { type: "Customers", id: "LIST" },
            ]
          : [{ type: "Customers", id: "LIST" }],
    }),

    getSingleCustomer: builder.query<ApiResponse<Customer>, string>({
      query: (id) => `/customer/${id}`,
      providesTags: (result, error, id) => [{ type: "Customers", id }],
    }),

    getExpiringBusinessCustomers: builder.query<
      ApiResponse<ExpiringCustomer[]>,
      void
    >({
      query: () => "/customer/expiring-businesses",
      providesTags: ["Customers"],
    }),

    addCustomer: builder.mutation({
      query: (customer) => ({
        url: "/customer",
        method: "POST",
        body: customer,
      }),
      invalidatesTags: [{ type: "Customers", id: "LIST" },"SalesReport"],
    }),

    updateCustomer: builder.mutation<
      ApiResponse<Customer>,
      { id: string; data: Partial<Customer> | FormData }
    >({
      query: ({ id, data }) => ({
        url: `/customer/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Customers", id },
        { type: "Customers", id: "LIST" },"SalesReport"
      ],
    }),

    deleteCustomer: builder.mutation<ApiResponse<{ success: boolean }>, string>(
      {
        query: (id) => ({
          url: `/customer/${id}`,
          method: "DELETE",
        }),
        invalidatesTags: (result, error, id) => [
          { type: "Customers", id },
          { type: "Customers", id: "LIST" },"SalesReport"
        ],
      },
    ),

    sendEmailForNotPaidOrders: builder.mutation<
      ApiResponse<{ success: boolean }>,
      {
        id: string;
        quoteList: { productName: string; quotePrice: number }[];
        noteText: string;
      }
    >({
      query: ({ id, quoteList, noteText }) => ({
        url: `/customer/${id}/send-special-email`,
        method: "POST",
        body: { quoteList, noteText },
      }),
      // Optionally invalidate the specific customer if email affects visible state
      invalidatesTags: (result, error, { id }) => [{ type: "Customers", id }],
    }),
  }),
});

export const {
  useGetCustomersQuery,
  useGetSingleCustomerQuery,
  useAddCustomerMutation,
  useUpdateCustomerMutation,
  useDeleteCustomerMutation,
  useSendEmailForNotPaidOrdersMutation,
  useGetExpiringBusinessCustomersQuery,
  useGetAllPendingCustomersQuery,
} = customersApi;

export default customersApi;
