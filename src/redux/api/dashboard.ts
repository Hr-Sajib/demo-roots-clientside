


import baseApi from "./base";

interface DashboardData {
  totalOrders: number;
  totalCustomers: number;
  totalRevenue: number;
}

interface OrderData {
  _id: string;
  date: string;
  invoiceNumber: string;
  PONumber: string;
  storeId: string;
  paymentDueDate: string;
  orderAmount: number;
  orderStatus: string;
  isDeleted: boolean;
  paymentAmountReceived: number;
  discountGiven: number;
  openBalance: number;
  profitAmount: number;
  profitPercentage: number;
  paymentStatus: string;
  products: {
    productId: any;
    quantity: number;
    discount: number;
    _id: string;
  }[];
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface SalesOverviewResponse {
  success: boolean;
  message: string;
  data: OrderData[];
}

interface ProductData {
  _id: string;
  totalQuantity: number;
  numberOfOrders: number;
  orderScore: number;
  revenuePercentage: number;
  name: string;
  itemNumber: string | null;
}

interface ProductResponse {
  success: boolean;
  message: string;
  data: ProductData[];

 
}



 interface ChartItem {
  year: number;
  month: number;
  count: number;
}

interface ChartDataResponse {
  success: boolean;
  message: string;
  data: {
    orders: ChartItem[];
    customers: ChartItem[];
  };
}

const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardData: builder.query<DashboardData, void>({
      query: () => "/dashboard",
      providesTags: ["Dashboard"],
    }),
    getBestSellingProducts: builder.query<ProductResponse, void>({
      query: () => "/order/best-selling",
      providesTags: ["Products"],
    }),
    getWorstSellingProducts: builder.query<ProductResponse, void>({
      query: () => "/order/worst-selling",
      providesTags: ["Products"],
    }),
    getSalesOverviewData: builder.query<SalesOverviewResponse, void>({
      query: () => "/order",
      providesTags: ["SalesOverview"],
    }),
    getOrderCustomerChart: builder.query<ChartDataResponse, void>({
      query: () => "/order/getChart",
      providesTags: ["Chart"],
    }),
  }),
});

export const {
  useGetDashboardDataQuery,
  useGetBestSellingProductsQuery,
  useGetWorstSellingProductsQuery,
  useGetSalesOverviewDataQuery,
  useGetOrderCustomerChartQuery
} = dashboardApi;
export default dashboardApi;
