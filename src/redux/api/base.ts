

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import Cookies from "js-cookie";
console.log("backend api, ", `${process.env.NEXT_PUBLIC_URL}`);

export const baseApi = createApi({
  reducerPath: "baseApi", // Define a base reducerPath
  baseQuery: fetchBaseQuery({
    baseUrl: `${process.env.NEXT_PUBLIC_URL}`,
    credentials: "include",
    prepareHeaders: (headers) => {
      const token = Cookies?.get("token");
      // console.log("token", token);
      if (token) {
        headers.set("Authorization", `${token}`);
      }
      return headers;
    },
  }),
  endpoints: () => ({}),
  tagTypes: [
    "Admin",
    "Dashboard",
    "SalesOverview",
    "Orders",
    "Customers",
    "Categories",
    "Inventory",
    "Containers",
    "ContainerPos",
    "SupplierCreditMemos",
    "Products",
    "ProductSegments",
    "Chart",
    "SalesUsers",
    "SoldTo",
    "Conversation",
    "Conversations",
    "Logs",
    "SalesReport",
    "Emails",
    "EmailThread"
  ],
});

// Export hooks for usage in functional components
export default baseApi;
