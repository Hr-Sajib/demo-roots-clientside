import baseApi from "./base";

// Product inside a container
export interface ContainerProduct {
  _id: string;
  category: string;
  itemNumber: string;
  quantity: number;
  perCaseCost: number;
  purchasePrice: number;
  salesPrice: number;
  packetSize: string;
  cbm?: number
}

// Full container object
export interface Container {
  _id: string;
  containerNumber: string;
  containerDocuments? : string[]
  paidAmount?: number
  containerName: string;
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

// Wrapper around API response for a single container
export interface ContainerResponse {
  success: boolean;
  message: string;
  data: Container;
}

// Wrapper around API response for multiple containers
export interface ContainerApiResponse {
  success: boolean;
  message: string;
  data: Container[];
}

// API integration
const containerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ✅ GET all containers (returns object with "data" as array)
    getContainers: builder.query<ContainerApiResponse, void>({
      query: () => "/container",
      providesTags: ["Containers"],
    }),

    // ✅ GET a single container by ID
    getContainer: builder.query<ContainerResponse, string>({
      query: (id) => `/container/${id}`,
      providesTags: ["Containers"],
    }),

    // ✅ POST create container
    addContainer: builder.mutation<Container, Partial<Omit<Container, "_id" | "createdAt" | "updatedAt" | "__v">>>({
      query: (container) => ({
        url: "/container",
        method: "POST",
        body: container,
      }),
      invalidatesTags: ["Containers", "Products", "Inventory"], // Invalidate Products and Inventory
    }),

    // ✅ PATCH update container basic info only (basic fields + documents)
    updateContainerBasicInfo: builder.mutation<
      Container,
      { id: string; data: FormData | Partial<Container> }
    >({
      query: ({ id, data }) => ({
        url: `/container/${id}/basic-info`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Containers"],
    }),

    // ✅ PATCH update container products (add/remove/update a single product)
    updateContainerProducts: builder.mutation<
      Container,
      {
        id: string;
        action: "add" | "remove" | "update";
        productData: Partial<ContainerProduct> & { itemNumber: string };
      }
    >({
      query: ({ id, action, productData }) => ({
        url: `/container/${id}/products`,
        method: "PATCH",
        body: { action, productData },
      }),
      invalidatesTags: ["Containers", "Products", "Inventory"], // Invalidate Products and Inventory because inventory qty changes
    }),

    // ✅ DELETE container
    deleteContainer: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/container/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Containers"],
    }),

    // ✅ POST import container from Excel
    importContainerExcel: builder.mutation<ContainerApiResponse, FormData>({
      query: (formData) => ({
        url: "/container/xl",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Containers", "Products", "Inventory"], // Invalidate Products and Inventory
    }),
  }),
});

export const {
  useGetContainersQuery,
  useGetContainerQuery,
  useAddContainerMutation,
  useUpdateContainerBasicInfoMutation,
  useUpdateContainerProductsMutation,
  useDeleteContainerMutation,
  useImportContainerExcelMutation,
} = containerApi;

export default containerApi;
