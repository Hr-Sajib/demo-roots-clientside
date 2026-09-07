"use client";

import { useGetInventoryQuery } from "@/redux/api/inventory";
import Loading from "@/redux/Shared/Loading";
import Link from "next/link";
import { useState, useEffect } from "react";
import { DollarSign, TrendingDown, Package, AlertCircle, Calendar, ShoppingBag, Box, Truck, Clock } from "lucide-react";
import { TbTrendingDown, TbTrendingUp } from "react-icons/tb";
import { useGetSalesOverviewDataQuery } from "@/redux/api/dashboard";
import Cookies from "js-cookie";

const SalesOverview = () => {
  const role = Cookies.get("role");
  const {
    data: salesData,
    isLoading,
    isError,
  } = useGetSalesOverviewDataQuery();
  const { data: inventoryData } = useGetInventoryQuery();
  const [overviewData, setOverviewData] = useState({
    totalSales: 0,
    ordersLast7Days: 0,
    ordersLast30Days: 0,
    dueAmount: 0,
    totalProducts: 0,
    lowStockProducts: 0,
    trends: { totalSales: 0, ordersLast7Days: 0 },
  });

  useEffect(() => {
    if (salesData?.data && inventoryData) {
      const today = new Date();
      const last7Days = new Date(today.setDate(today.getDate() - 7))
        .toISOString()
        .split("T")[0];
      const last30Days = new Date(today.setDate(today.getDate() - 23))
        .toISOString()
        .split("T")[0];

      const recentOrders = salesData.data.filter((order) => {
        const orderCreatedAt = new Date(order.createdAt).toISOString().split("T")[0];
        return orderCreatedAt >= last7Days;
      });

      const recent30DaysOrders = salesData.data.filter((order) => {
        const orderCreatedAt = new Date(order.createdAt).toISOString().split("T")[0];
        return orderCreatedAt >= last30Days;
      });

      const validOrders = salesData.data.filter((order) => order.orderStatus === "completed" || order.orderStatus === "verified");

      const totalSales = validOrders.reduce(
        (sum, order) => sum + (order.orderAmount || 0),
        0
      );
      const ordersLast7DaysCount = recentOrders.length;
      const ordersLast30DaysCount = recent30DaysOrders.length;

      const dueAmount = validOrders.reduce(
        (sum, order) => sum + (order.openBalance || 0),
        0
      );

      const allOrders = salesData.data;
      const previous7Days = allOrders.filter((order) => {
        const orderCreatedAt = new Date(order.createdAt).toISOString().split("T")[0];
        const prevStart = new Date(today.setDate(today.getDate() - 14))
          .toISOString()
          .split("T")[0];
        const prevEnd = new Date(today.setDate(today.getDate() - 7))
          .toISOString()
          .split("T")[0];
        return orderCreatedAt >= prevStart && orderCreatedAt < prevEnd;
      });
      const prevTotalSales = previous7Days.reduce(
        (sum, order) => sum + (order.orderAmount || 0),
        0
      );
      const prevOrderCount = previous7Days.length;
      const totalSalesTrend =
        prevTotalSales > 0
          ? ((totalSales - prevTotalSales) / prevTotalSales) * 100
          : 0;
      const ordersLast7DaysTrend =
        prevOrderCount > 0
          ? ((ordersLast7DaysCount - prevOrderCount) / prevOrderCount) * 100
          : 0;

      const totalProducts = inventoryData.data.length;
      const lowStockProducts = inventoryData.data.filter(
        (product) => product.quantity < product.reorderPointOfQuantity
      ).length;

      setOverviewData({
        totalSales: Number(totalSales.toFixed(2)),
        ordersLast7Days: ordersLast7DaysCount,
        ordersLast30Days: ordersLast30DaysCount,
        dueAmount: Number(dueAmount.toFixed(2)),
        totalProducts,
        lowStockProducts,
        trends: {
          totalSales: Number(totalSalesTrend.toFixed(2)),
          ordersLast7Days: Number(ordersLast7DaysTrend.toFixed(2)),
        },
      });
    }
  }, [salesData, inventoryData]);

  if (isLoading)
    return (
      <div>
        <Loading title="Overview card Loading" />
      </div>
    );
  if (isError) return <div>Error loading sales data</div>;

  const TrendIndicator = ({ value }: { value: number }) => {
    const isPositive = value > 0;
    const isNegative = value < 0;
    return (
      <span className={`inline-flex items-center gap-1 text-sm font-semibold ${isPositive ? 'text-green-300' : isNegative ? 'text-red-300' : 'text-gray-400'}`}>
        {isPositive && <TbTrendingUp className="w-4 h-4" />}
        {isNegative && <TbTrendingDown className="w-4 h-4" />}
        {value !== 0 && `${Math.abs(value)}%`}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Sales Card */}
      <div className="bg-gradient-to-br h-44 from-black to-red-800 rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="w-7 h-7 text-white border-2 border-white rounded-full p-1 font-bold" />
                <h3 className="text-white/90 font-semibold tracking-wide">Total Sales</h3>
              </div>
              <p className="text-white text-5xl font-bold mb-3 tracking-tight">
                ${overviewData.totalSales.toLocaleString()}
              </p>
              <p className="text-white/60 text-sm font-bold">Excluding shipping charges</p>
            </div>
            <TrendIndicator value={overviewData.trends.totalSales} />
          </div>
        </div>
      </div>

      {/* Due Amount Card */}
      <Link href="/order-management" className="block">
        <div className="bg-gradient-to-br h-44 from-red-800 to-black rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <AlertCircle className="w-7 h-7 text-white" />
                  <h3 className="text-white/90 font-semibold tracking-wide">Due Amount</h3>
                </div>
                <p className="text-white text-5xl font-bold mb-3 tracking-tight">
                  ${overviewData.dueAmount.toLocaleString()}
                </p>
                <p className="text-white/60 text-sm font-bold">Total open balances</p>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Orders Card */}
      <Link href="/order-management" className="block">
        <div className="bg-gradient-to-br  h-44 from-black to-red-900 rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer">
          <div className="p-6">

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/15 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Last 7 Days</p>
                  <Truck className="w-5 h-5 text-white/40" />
                </div>
                <p className="text-white text-4xl font-bold tracking-tight mb-2">
                  {overviewData.ordersLast7Days.toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <TrendIndicator value={overviewData.trends.ordersLast7Days} />
                  <span className="text-white/40 text-xs">vs previous period</span>
                </div>
              </div>

              <div className="bg-red-300/15 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Last 30 Days</p>
                  <Clock className="w-5 h-5 text-white/40" />
                </div>
                <p className="text-white text-4xl font-bold tracking-tight">
                  {overviewData.ordersLast30Days.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Products/Inventory Card - Same layout as Orders Card */}
      <Link href="/inventory" className="block">
        <div className="bg-gradient-to-br h-44 from-red-900 to-red-950 rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer">
          <div className="p-5">


            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-xl  p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white/90 text-xs font-bold uppercase tracking-wider">Total Products</p>
                  <Box className="w-4 h-4 text-white/40" />
                </div>
                <p className="text-white text-3xl font-bold tracking-tight mb-2">
                  {overviewData.totalProducts.toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-white/50 text-xs">Active inventory</span>
                </div>
              </div>

              {(role === "admin" || role === "manager") && (
                <div className="bg-white/5  rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-orange-200 text-xs font-extrabold uppercase tracking-wider">Low Stock</p>
                    <AlertCircle className="w-4 h-4 text-orange-400" />
                  </div>
                  <p className="text-orange-300 text-5xl font-bold tracking-tight mb-2">
                    {overviewData.lowStockProducts.toLocaleString()}
                  </p>
                  {overviewData.lowStockProducts > 0 ? (
                    <div className="flex items-center gap-2">
                      <span className="text-orange-300/80 font-bold text-xs">⚠️ Needs reorder</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-200 font-bold text-xs">✓ All stock healthy</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default SalesOverview;
