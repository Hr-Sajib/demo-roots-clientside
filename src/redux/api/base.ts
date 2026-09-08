

import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import Cookies from "js-cookie";
console.log("backend api, ", `${process.env.NEXT_PUBLIC_URL}`);

const rawBaseQuery = fetchBaseQuery({
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
});

// The access token now lives 15 minutes (down from 7 days). On a 401, try
// a silent refresh via the httpOnly refreshToken cookie (already sent
// automatically — credentials: "include") and retry the original request
// once. If the refresh itself fails (expired/revoked/logged out), clear
// client state and bounce to /login rather than leaving the app stuck
// silently re-401ing forever.
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  const url = typeof args === "string" ? args : args.url;
  const isAuthEndpoint = /\/auth\/(login|customerLogin|refresh|logout)/.test(url);

  if (result.error?.status === 401 && !isAuthEndpoint) {
    const refreshResult = await rawBaseQuery(
      { url: "/auth/refresh", method: "POST" },
      api,
      extraOptions,
    );

    const newAccessToken = (refreshResult.data as any)?.data?.accessToken;

    if (newAccessToken) {
      Cookies.set("token", newAccessToken, { expires: 7 });
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      Cookies.remove("token");
      Cookies.remove("role");
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "baseApi", // Define a base reducerPath
  baseQuery: baseQueryWithReauth,
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
