// src/redux/api/auth/admin/adminApi.ts

import Cookies from "js-cookie";
import baseApi from "./base";

interface LoginRequest {
  email: string;
  password: string;
}

interface CreateUserRequest extends LoginRequest {
  role: string;
  firstName?: string;
  lastName?: string;
  image?: string;
  documentLink?: string;
  documentExpiryDate?: Date;
  documentExpiryReminderEmailSentOrNot?: boolean;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: number;
  allowances?: {
    mainDashBorad?: boolean;
    prospectSee?: boolean;
    prospectAdd?: boolean;
    prospectUpdate?: boolean;
    prospectDelete?: boolean;
    customerSee?: boolean;
    customerAdd?: boolean;
    customerUpdate?: boolean;
    customerDelete?: boolean;
    orderSee?: boolean;
    orderAdd?: boolean;
    orderUpdate?: boolean;
    orderDelete?: boolean;
    inventorySee?: boolean;
    inventoryAdd?: boolean;
    inventoryUpdate?: boolean;
    inventoryDelete?: boolean;
    containerSee?: boolean;
    containerAdd?: boolean;
    containerUpdate?: boolean;
    containerDelete?: boolean;
  };
}

interface UpdateUserRequest {
  id: string;
  firstName?: string;
  lastName?: string;
  image?: string;
  documentLink?: string;
  documentExpiryDate?: Date;
  documentExpiryReminderEmailSentOrNot?: boolean;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: number;
  allowances?: {
    mainDashBorad?: boolean;
    prospectSee?: boolean;
    prospectAdd?: boolean;
    prospectUpdate?: boolean;
    prospectDelete?: boolean;
    customerSee?: boolean;
    customerAdd?: boolean;
    customerUpdate?: boolean;
    customerDelete?: boolean;
    orderSee?: boolean;
    orderAdd?: boolean;
    orderUpdate?: boolean;
    orderDelete?: boolean;
    inventorySee?: boolean;
    inventoryAdd?: boolean;
    inventoryUpdate?: boolean;
    inventoryDelete?: boolean;
    containerSee?: boolean;
    containerAdd?: boolean;
    containerUpdate?: boolean;
    containerDelete?: boolean;
  };
}

interface LoginResponseData {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    userData: {
      _id: string;
      email: string;
      role: string;
      firstName?: string;
      lastName?: string;
      image?: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: number;
      documentLink?: string;
      documentExpiryDate?: Date;
      documentExpiryReminderEmailSentOrNot?: boolean;
      allowances?: {
        mainDashBorad?: boolean;
        prospectSee?: boolean;
        prospectAdd?: boolean;
        prospectUpdate?: boolean;
        prospectDelete?: boolean;
        customerSee?: boolean;
        customerAdd?: boolean;
        customerUpdate?: boolean;
        customerDelete?: boolean;
        orderSee?: boolean;
        orderAdd?: boolean;
        orderUpdate?: boolean;
        orderDelete?: boolean;
        inventorySee?: boolean;
        inventoryAdd?: boolean;
        inventoryUpdate?: boolean;
        inventoryDelete?: boolean;
        containerSee?: boolean;
        containerAdd?: boolean;
        containerUpdate?: boolean;
        containerDelete?: boolean;
      };
      createdAt?: string;
      updatedAt?: string;
    };
  };
}

interface AdminProfile {
  id: number;
  email: string;
  role: string;
}

interface SalesUser {
  _id: string;
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  image?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: number;
  documentLink?: string;
  documentExpiryDate?: Date;
  documentExpiryReminderEmailSentOrNot?: boolean;
  allowances?: {
    mainDashBorad?: boolean;
    prospectSee?: boolean;
    prospectAdd?: boolean;
    prospectUpdate?: boolean;
    prospectDelete?: boolean;
    customerSee?: boolean;
    customerAdd?: boolean;
    customerUpdate?: boolean;
    customerDelete?: boolean;
    orderSee?: boolean;
    orderAdd?: boolean;
    orderUpdate?: boolean;
    orderDelete?: boolean;
    inventorySee?: boolean;
    inventoryAdd?: boolean;
    inventoryUpdate?: boolean;
    inventoryDelete?: boolean;
    containerSee?: boolean;
    containerAdd?: boolean;
    containerUpdate?: boolean;
    containerDelete?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

interface SalesUsersResponse {
  success: boolean;
  message?: string;
  data: SalesUser[];
}

const getToken = () => process.env.ADMIN_TOKEN || Cookies.get("token");

const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<LoginResponseData, LoginRequest>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
    }),
    createUser: builder.mutation<LoginResponseData, CreateUserRequest>({
      query: (credentials) => {
        const token = getToken();
        if (!token) {
          throw new Error("No authorization token available. Please configure a valid admin token.");
        }
        return {
          url: "/user/",
          method: "POST",
          body: credentials,
          headers: { Authorization: `Bearer ${token}` },
        };
      },
      invalidatesTags: ["SalesUsers"], // ← ADDED: Auto-refetch users after create
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
      }),
      invalidatesTags: ["Admin"],
    }),
    getAdminProfile: builder.query<AdminProfile, void>({
      query: () => ({
        url: "/admin/profile",
        headers: { Authorization: `Bearer ${getToken()}` },
      }),
      providesTags: ["Admin"],
    }),
    getAllUsers: builder.query<SalesUsersResponse, void>({
      query: () => ({
        url: "/user/",
        headers: { Authorization: `Bearer ${getToken()}` },
      }),
      providesTags: ["SalesUsers"],
    }),
    // updateUser: builder.mutation<SalesUser, UpdateUserRequest>({
    //   query: ({ id, ...payload }) => ({
    //     url: `/user/${id}`,
    //     method: "PATCH",
    //     body: payload,
    //     headers: { Authorization: `Bearer ${getToken()}` },
    //   }),
    //   invalidatesTags: ["SalesUsers"],
    // }),
    updateUser: builder.mutation({
  query: ({ id, body }) => ({
    url: `/user/${id}`,
    method: "PATCH",
    body,
    // ❌ DO NOT set Content-Type manually
  }),
  invalidatesTags: ["SalesUsers"],
}),
    deleteUser: builder.mutation<void, string>({
      query: (userId) => ({
        url: `/user/${userId}`,
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      }),
      invalidatesTags: ["SalesUsers"],
    }),
    forgetPasswordSendEmail: builder.mutation({
      query: (credentials) => ({
        url: "/user/forgot-password",
        method: "POST",
        body: credentials,
      }),
    }),
    setNewPassword: builder.mutation({
      query: (credentials) => ({
        url: "/user/reset-password",
        method: "POST",
        body: credentials,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useCreateUserMutation,
  useLogoutMutation,
  useGetAdminProfileQuery,
  useGetAllUsersQuery,
  useForgetPasswordSendEmailMutation,
  useSetNewPasswordMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = adminApi;

export default adminApi;