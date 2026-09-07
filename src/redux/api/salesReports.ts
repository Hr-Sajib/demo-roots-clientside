// redux/api/report/salesReportApi.ts

import { baseApi } from '@/redux/api/base';

// Type definitions
export type TimelineOption = 'monthly' | 'yearly' | 'weekly' | 'daily' | { startDate: string; endDate: string };

// Common OrderDetail interface with paidAmount
export interface OrderDetail {
  orderId: string;
  invoiceNumber: string;
  customerName: string;
  orderAmount: number;
  paidAmount: number;
  shipping: number;
  paymentStatus: string;
  commissionEarned?: number | null; // Optional for sales person performance
  profitAmount?: number;
}

// Top Selling Products Report Types
export interface TopSellingProduct {
  rank: number;
  productId: string;
  productName: string;
  barcodeString: string;
  purchasePrice: number;
  salesPrice: number;
  totalSoldQuantity: number;
  totalOrders: number;
  totalRevenue: number;
  totalDiscountGiven: number;
  revenueContributionPercentage: string;
  orderDetails: OrderDetail[];
}

export interface TopSellingProductsResponse {
  success: boolean;
  message: string;
  data: TopSellingProduct[];
}

// Overall Sales Report Types
export interface OverallSalesDataPoint {
  label: string;
  totalOrders: number;
  orderDetails: OrderDetail[];
  totalRevenue: number;
  totalCustomersCovered: number;
  averageOrderValue: number;
}

export interface OverallSalesResponse {
  success: boolean;
  message: string;
  data: OverallSalesDataPoint[];
}

// Customer Sales Report Types
export interface CustomerSalesDataPoint {
  label: string;
  totalOrders: number;
  totalRevenue: number;
  totalPaidAmount: number;
  totalProfitAmount: number;
  profitPercentage: string;
  totalCustomersCovered: number;
  averageOrderValue: number;
  orderDetails: OrderDetail[];
}

export interface SalesPerson {
  _id?: string;
  email: string;
  name: string;
}

export interface CustomerSalesReport {
  customerStoreId: string;
  salesPerson: SalesPerson | null;
  customerStoreName: string;
  ordersData: CustomerSalesDataPoint[];
  summary: {
    totalOrders: number;
    totalRevenue: number;
    totalPaidAmount: number;
    totalProfitAmount: number;
    averageOrderValue: number;
    collectionRate: string;
    profitPercentage: string;
  };
}

export interface CustomerSalesResponse {
  success: boolean;
  message: string;
  data: CustomerSalesReport[];
}

// Sales Person Performance Report Types
export interface CoreCustomer {
  customerStoreId: string;
  customerStoreName: string;
  salesPercentage: string;
  totalSales: number;
  totalOrders: number;
  commissionRate: number | null;
  totalCommissionEarned: number | null;
}

export interface SalesPersonTimeDataPoint {
  label: string;
  totalOrders: number;
  totalSales: number;
  totalPaidOrderAmount: number;
  averageOrderValue: number;
  paidPercentage: string;
  totalCommissionEarned: number | null;
  orderDetails: OrderDetail[];
}

export interface SalesPersonPerformance {
  salesPersonName: string;
  salesPersonEmail: string;
  timeData: SalesPersonTimeDataPoint[];
  summary: {
    totalSales: number;
    totalOrders: number;
    totalPaidOrderAmount: number;
    averageOrderValue: number;
    paidPercentage: string;
    totalCommissionEarned: number | null;
  };
  coreCustomers: CoreCustomer[];
}

export interface SalesPersonPerformanceResponse {
  success: boolean;
  message: string;
  data: SalesPersonPerformance[];
  metadata?: {
    totalSalesPersons: number;
    timeline: string;
    topCustomersCount: number;
  };
}

// Query parameter types
export interface DateRangeParams {
  startDate: string;
  endDate: string;
}

export interface SalesReportParams {
  timeline?: TimelineOption;
  startDate?: string;
  endDate?: string;
  topCustomers?: number;
  includeStatusBreakdown?: boolean;
}

// Excel Download Request Types
export interface ExcelExportParams {
  data: any[];
  includeOrderDetails?: boolean;
  title?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}

export interface PaymentDetail {
  paymentId: string;
  storeName: string;
  storeId: string;
  amount: number;
  method: string;
  date: string;
  checkNumber?: string;
  checkImage?: string;
  transactionId?: string;
  forOrders: string[];
  createdAt: string;
}

export interface PaymentReportDataPoint {
  label: string;
  totalPayments: number;
  totalAmount: number;
  paymentMethods: {
    check: number;
    cash: number;
    cc: number;
    donation: number;
  };
  totalCustomersCovered: number;
  payments: PaymentDetail[];
}

export interface PaymentsReportResponse {
  payments: PaymentDetail[];
  summary: {
    totalPayments: number;
    totalAmount: number;
    totalCustomers: number;
    paymentMethods: {
      check: number;
      cash: number;
      cc: number;
      donation: number;
    };
  };
}


export const salesReportApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({

    // 1. Get Top Selling Products Report
    getTopSellingProductsReport: builder.query<TopSellingProductsResponse, DateRangeParams>({
      query: ({ startDate, endDate }) => ({
        url: '/salesReport/get-top-selling-products',
        method: 'GET',
        params: { startDate, endDate },
      }),
      providesTags: ['SalesReport'],
    }),

    // 2. Get Overall Sales Report (Orders Sales Report)
    getOverallSalesReport: builder.query<OverallSalesResponse, SalesReportParams>({
      query: (params) => {
        const queryParams: any = {};

        if (params.timeline && typeof params.timeline === 'string') {
          queryParams.timeline = params.timeline;
        } else if (params.startDate && params.endDate) {
          queryParams.startDate = params.startDate;
          queryParams.endDate = params.endDate;
        } else {
          queryParams.timeline = 'monthly'; // default
        }

        return {
          url: '/salesReport/get-orders-sales-report',
          method: 'GET',
          params: queryParams,
        };
      },
      providesTags: ['SalesReport'],
    }),

    // 3. Get Sales by Customer Report
    getSalesByCustomerReport: builder.query<CustomerSalesResponse, SalesReportParams>({
      query: (params) => {
        const queryParams: any = {};

        if (params.timeline && typeof params.timeline === 'string') {
          queryParams.timeline = params.timeline;
        } else if (params.startDate && params.endDate) {
          queryParams.startDate = params.startDate;
          queryParams.endDate = params.endDate;
        } else {
          queryParams.timeline = 'monthly'; // default
        }

        return {
          url: '/salesReport/get-customer-sales-report',
          method: 'GET',
          params: queryParams,
        };
      },
      providesTags: ['SalesReport'],
    }),

    // 4. Get Sales Person Performance Report
    getSalesPersonPerformanceReport: builder.query<SalesPersonPerformanceResponse, SalesReportParams>({
      query: (params) => {
        const queryParams: any = {};

        if (params.timeline && typeof params.timeline === 'string') {
          queryParams.timeline = params.timeline;
        } else if (params.startDate && params.endDate) {
          queryParams.startDate = params.startDate;
          queryParams.endDate = params.endDate;
        } else {
          queryParams.timeline = 'monthly'; // default
        }

        if (params.topCustomers) {
          queryParams.topCustomers = params.topCustomers;
        }

        if (params.includeStatusBreakdown !== undefined) {
          queryParams.includeStatusBreakdown = params.includeStatusBreakdown;
        }

        return {
          url: '/salesReport/get-sales-person-performance-report',
          method: 'GET',
          params: queryParams,
        };
      },
      providesTags: ['SalesReport'],
    }),

    // 5. Export Top Selling Products to Excel
    exportTopSellingProductsExcel: builder.mutation<Blob, ExcelExportParams>({
      query: (params) => ({
        url: '/salesReport/generate-top-selling-products-excel',
        method: 'POST',
        body: params,
      }),
      // Transform the response to handle blob
      transformResponse: (response: Response) => {
        return response as any; // The response will be handled as blob
      },
    }),

    // 6. Get Payments Report
    getPaymentsReport: builder.query<PaymentsReportResponse, void>({
      query: () => ({
        url: "/salesReport/get-payments-report",
        method: "GET",
      }),
      providesTags: ["SalesReport"],
      transformResponse: (response: { success: boolean; message: string; data: PaymentsReportResponse }) => {
        return response.data;
      },
    }),


  }),
});

// Export hooks for use in components
export const {
  useGetTopSellingProductsReportQuery,
  useGetOverallSalesReportQuery,
  useGetSalesByCustomerReportQuery,
  useGetSalesPersonPerformanceReportQuery,
  useExportTopSellingProductsExcelMutation,
  useGetPaymentsReportQuery,
} = salesReportApi;
