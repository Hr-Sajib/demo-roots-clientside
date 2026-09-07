import baseApi from "./base";

// ──────────────── Types ────────────────
export interface ContainerPoProduct {
  itemNumber: string;
  itemName: string;
  askingQuantity?: number;
  barcode?: string;
}

export interface ContainerPo {
  _id: string;
  containerPOId: string;
  purchaseOrderFor: string;
  productList: ContainerPoProduct[];
  isDeleted: boolean;
  convertedToContainer: boolean;
  convertedContainerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContainerPoApiResponse {
  success: boolean;
  message: string;
  data: ContainerPo;
}

export interface ContainerPoListResponse {
  success: boolean;
  message: string;
  data: ContainerPo[];
}

export interface CreateContainerPoPayload {
  containerPOId?: string;
  purchaseOrderFor: string;
  productList: ContainerPoProduct[];
}

export interface UpdateContainerPoPayload {
  containerPOId?: string;
  purchaseOrderFor?: string;
  productList?: ContainerPoProduct[];
  convertedToContainer?: boolean;
  convertedContainerId?: string | null;
}

// ──────────────── API ────────────────
const containerPoApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // GET all
    getAllContainerPos: builder.query<ContainerPoListResponse, void>({
      query: () => "/containerPo",
      providesTags: ["ContainerPos"],
    }),

    // GET one
    getContainerPoById: builder.query<ContainerPoApiResponse, string>({
      query: (id) => `/containerPo/${id}`,
      providesTags: (_r, _e, id) => [{ type: "ContainerPos", id }],
    }),

    // CREATE
    createContainerPo: builder.mutation<
      ContainerPoApiResponse,
      CreateContainerPoPayload
    >({
      query: (body) => ({
        url: "/containerPo",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ContainerPos"],
    }),

    // UPDATE
    updateContainerPo: builder.mutation<
      ContainerPoApiResponse,
      { id: string; data: UpdateContainerPoPayload }
    >({
      query: ({ id, data }) => ({
        url: `/containerPo/${id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["ContainerPos"],
    }),

    // DELETE
    deleteContainerPo: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/containerPo/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ContainerPos"],
    }),

    // PDF — returns raw blob; caller decides what to do with it.
    generateContainerPoPdf: builder.query<Blob, string>({
      query: (id) => ({
        url: `/containerPo/${id}/pdf`,
        method: "GET",
        responseHandler: async (response) => response.blob(),
      }),
    }),
  }),
});

export const {
  useGetAllContainerPosQuery,
  useGetContainerPoByIdQuery,
  useCreateContainerPoMutation,
  useUpdateContainerPoMutation,
  useDeleteContainerPoMutation,
  useGenerateContainerPoPdfQuery,
  useLazyGenerateContainerPoPdfQuery,
} = containerPoApi;

export default containerPoApi;