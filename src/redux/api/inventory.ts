import baseApi from "./base";


export interface payload {
  _id: string;
  name: string;
  description?: string;
  itemNumber: string;
  barcodeString: string;
  expiryDate: string;
  categoryId?: { _id: string; name: string };
  packetSize: string;
  weight: number;
  weightUnit: string;
  isB2CProduct?: boolean;
  isB2BProduct?: boolean;
  incomingQuantity: number;
  profitPercentage: number;
  packageDimensions: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  caseDimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  cbm: number;
  quantity: number;
  reorderPointOfQuantity: number;
  quantityInWarehouseLocation: Map<string, number>;
  purchasePrice: number;
  salesPrice: number;
  b2cSalesPrice: number;
  competitorPrice: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  __v?: number;
  images: string[];
}

export type PacketSizeResponse = {
  success: boolean;
  message: string;
  data: string[];
};

export type UpdateInventoryPayload = {
  _id: string;
  name?: string;
  description?: string;
  packetSize?: string;
  weight?: number;
  weightUnit?: string;
  categoryId?: string;
  reorderPointOfQuantity?: number;
  quantity?: number;
  warehouseLocation?: string;
  purchasePrice?: number;
  salesPrice?: number;
  competitorPrice?: number;
  barcodeString?: string;
  packageDimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  caseDimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  images?: string[];
};

export interface CreateInventoryPayload {
  name: string;
  itemNumber: string;
  quantity: number;
  reorderPointOfQuantity: number;
  weight: number;
  weightUnit: string;
  purchasePrice: number;
  salesPrice: number;
  competitorPrice: number;
  barcodeString: string;
  warehouseLocation: string;
  packetSize: string;
  categoryId: string;
  packageDimensions: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  caseDimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  images?: string[];
}

interface InventoryResponse {
  success: boolean;
  message: string;
  data: payload[];
}

interface ISoldToCustomer {
  _id: string;
  storeName: string;
}

interface SoldToResponse {
  success: boolean;
  message: string;
  data: ISoldToCustomer[];
}

const inventoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getInventory: builder.query<InventoryResponse, void>({
      query: () => "/product",
      providesTags: ["Inventory", "Products"],
    }),

    addInventory: builder.mutation<payload, FormData>({
      query: (formData) => ({
        url: "/product",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Inventory", "Products", "Logs","SalesReport"],   // ← Added "Logs"
    }),

    updateInventory: builder.mutation<payload, { _id: string; data: FormData }>({
      query: ({ _id, data }) => ({
        url: `/product/${_id}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Inventory", "Products", "Logs","SalesReport"],   // ← Added "Logs"
    }),

    deleteInventory: builder.mutation<{ success: boolean }, string>({
      query: (_id) => ({
        url: `/product/${_id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Inventory", "Products", "Logs","SalesReport"],   // ← Added "Logs"
    }),

    getPackSize: builder.query<PacketSizeResponse, void>({
      query: () => "/product/packet-sizes",
      providesTags: ["Inventory"],
    }),

    getSoldTo: builder.query<SoldToResponse, string>({
      query: (productId) => `/product/productSoldTo/${productId}`,
      providesTags: ["SoldTo"],
    }),

    importProductExcel: builder.mutation({
      query: (formData) => ({
        url: "/product/importXl",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Inventory", "Products", "Logs","SalesReport"],
    }),
  }),
});

export const {
  useGetInventoryQuery,
  useAddInventoryMutation,
  useUpdateInventoryMutation,
  useDeleteInventoryMutation,
  useGetPackSizeQuery,
  useGetSoldToQuery,
  useImportProductExcelMutation,
} = inventoryApi;

export default inventoryApi;