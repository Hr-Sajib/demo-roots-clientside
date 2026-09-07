import baseApi from "./base";

// ──────────────── Types ────────────────
export interface SupplierCreditMemoItem {
  productId: string;
  quantity: number;
  note?: string;
}

export interface SupplierCreditMemo {
  _id: string;
  supplierCreditMemoId: string;
  supplierName: string;
  items: SupplierCreditMemoItem[];
  creditGiven?: number;
  isStatusOpen: boolean;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupplierCreditMemoApiResponse {
  success: boolean;
  message: string;
  data: SupplierCreditMemo;
}

export interface SupplierCreditMemoListResponse {
  success: boolean;
  message: string;
  data: SupplierCreditMemo[];
}

export interface CreateSupplierCreditMemoPayload {
  supplierCreditMemoId?: string;
  supplierName: string;
  items: SupplierCreditMemoItem[];
  creditGiven?: number;
  isStatusOpen?: boolean;
}

export interface UpdateSupplierCreditMemoPayload {
  supplierCreditMemoId?: string;
  supplierName?: string;
  items?: SupplierCreditMemoItem[];
  creditGiven?: number;
  isStatusOpen?: boolean;
}

// ──────────────── API ────────────────
const supplierCreditMemoApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET all
    getAllSupplierCreditMemos: builder.query<SupplierCreditMemoListResponse, void>({
      query: () => "/supplier-credit-memo",
      providesTags: ["SupplierCreditMemos"],
    }),

    // GET one
    getSupplierCreditMemoById: builder.query<SupplierCreditMemoApiResponse, string>({
      query: (id) => `/supplier-credit-memo/${id}`,
      providesTags: (_r, _e, id) => [{ type: "SupplierCreditMemos", id }],
    }),

    // CREATE
    createSupplierCreditMemo: builder.mutation<
      SupplierCreditMemoApiResponse,
      CreateSupplierCreditMemoPayload
    >({
      query: (body) => ({
        url: "/supplier-credit-memo",
        method: "POST",
        body,
      }),
      invalidatesTags: ["SupplierCreditMemos"],
    }),

    // UPDATE
    updateSupplierCreditMemo: builder.mutation<
      SupplierCreditMemoApiResponse,
      { id: string; data: UpdateSupplierCreditMemoPayload }
    >({
      query: ({ id, data }) => ({
        url: `/supplier-credit-memo/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["SupplierCreditMemos"],
    }),

    // DELETE
    deleteSupplierCreditMemo: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/supplier-credit-memo/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["SupplierCreditMemos"],
    }),

    // PDF — returns raw blob; caller decides what to do with it.
    generateSupplierCreditMemoPdf: builder.query<Blob, string>({
      query: (id) => ({
        url: `/supplier-credit-memo/${id}/pdf`,
        method: "GET",
        responseHandler: async (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useGetAllSupplierCreditMemosQuery,
  useGetSupplierCreditMemoByIdQuery,
  useCreateSupplierCreditMemoMutation,
  useUpdateSupplierCreditMemoMutation,
  useDeleteSupplierCreditMemoMutation,
  useGenerateSupplierCreditMemoPdfQuery,
  useLazyGenerateSupplierCreditMemoPdfQuery,
} = supplierCreditMemoApi;

export default supplierCreditMemoApi;
