import baseApi from "./base";

const logApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLogs: builder.query({
      query: () => "/log",
      providesTags: ["Logs"],
    }),
})
});

export const {
  useGetLogsQuery
} = logApi;

export default logApi;
