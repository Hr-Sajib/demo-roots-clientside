
import baseApi from "./base"

export interface Category {
  _id: string;
  name: string;
  description: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

interface CategoryResponse {
  success: boolean;
  message: string;
  data: Category[];
}

const categoriesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCategories: builder.query<CategoryResponse, void>({
      query: () => "/category",
      providesTags: ["Categories"],
    }),
    addCategory: builder.mutation<Category, Partial<Category>>({
      query: (category) => ({
        url: "/category",
        method: "POST",
        body: category,
      }),
      invalidatesTags: ["Categories"],
    }),
    updateCategory: builder.mutation<Category, Partial<Category> & { _id: string }>({
      query: ({ _id, ...patch }) => ({
        url: `/category/${_id}`,
        method: "PATCH",
        body: patch,
      }),
      invalidatesTags: ["Categories"],
    }),
    deleteCategory: builder.mutation<{ success: boolean }, string>({
      query: (_id) => ({
        url: `/category/${_id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Categories"],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useAddCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoriesApi;

export default categoriesApi;
