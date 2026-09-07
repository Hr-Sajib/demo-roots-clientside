
import { GetProductResponse, Product } from "@/types";
import baseApi from "./base";

export const productsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProductsByCategory: builder.query<GetProductResponse, string>({
      query: (categoryId) => `/product/by-category/${categoryId}`,
      providesTags: (result, error, categoryId) => [
        { type: "Products", id: categoryId },
        "Products", // Add a general Products tag for broader invalidation
      ],
    }),
    getProducts: builder.query<{ success: boolean; message: string; data: Product[] }, void>({
      query: () => "/product",
      providesTags: ["Products"], // Add Products tag
    }),
  }),
});

export const { useGetProductsByCategoryQuery, useGetProductsQuery } = productsApi;
