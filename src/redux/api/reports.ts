// redux/features/report/reportApi.ts

import { baseApi } from '@/redux/api/base';

export const reportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Existing: Get all reports
    getReports: builder.query({
      query: () => ({
        url: "/report",
        method: "GET",
      })
    }),


    approveStoreChanges: builder.mutation({
      query: (reportId: string) => ({
        url: `/report/${reportId}/approve-store`,
        method: "PATCH",

      }),
    }),

    resolveReports: builder.mutation({
      query: (reportId: string) => ({
        url: `/report/${reportId}/resolve`,
        method: "PATCH",

      }),
    }),

  }),
});

export const {
  useGetReportsQuery,
  useApproveStoreChangesMutation,
  useResolveReportsMutation
} = reportApi;