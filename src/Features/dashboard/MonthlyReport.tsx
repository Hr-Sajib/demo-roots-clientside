"use client";

import React, { useState, useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  ChartData,
  TooltipItem,
  Scale,
} from "chart.js";
import Loading from "@/redux/Shared/Loading";
import { useGetOrderCustomerChartQuery } from "@/redux/api/dashboard";


ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MonthlyReport: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"Order" | "Customer">("Order");
  const { data, isLoading, isError } = useGetOrderCustomerChartQuery();

  // Format chart data: fill all 12 months with 0 if missing
  const formatChartData = useMemo(() => {
    if (!data?.data) return Array(12).fill(0);

    const raw = activeTab === "Order" ? data.data.orders : data.data.customers;
    const countsByMonth: Record<number, number> = {};

    raw.forEach((item: { month: number; count: number }) => {
      countsByMonth[item.month] = item.count;
    });

    return monthLabels.map((_, i) => countsByMonth[i + 1] || 0);
  }, [data, activeTab]);

  const chartData: ChartData<"line"> = {
    labels: monthLabels,
    datasets: [
      {
        label: `${activeTab} Count`,
        data: formatChartData,
        borderColor: "#000000",
        backgroundColor: "#fae5e3",
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 5,
      },
    ],
  };

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: TooltipItem<"line">) =>
            `${context.dataset.label}: ${Math.round(context.parsed.y)}`,
        },
      },
    },
    scales: {
      x: {
        title: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: {
          // Force whole numbers only
          callback: function (value: number | string) {
            return Number.isInteger(Number(value)) ? value : "";
          },
          stepSize: 1, // Optional: forces integer steps
        },
        // Optional: hide partial ticks
        grid: {
          drawTicks: false,
        },
      },
    },
  };

  if (isLoading) return <Loading title="Monthly chart loading..." />;
  if (isError) return <div className="text-red-500">Failed to load chart data</div>;

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Monthly Report (Full Year)</h2>
        <div className="flex p-1 bg-[#fadddc] rounded-md space-x-2">
          <button
            onClick={() => setActiveTab("Order")}
            className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${
              activeTab === "Order"
                ? "bg-white text-red-700 shadow-sm"
                : "text-gray-800 hover:text-red-700"
            }`}
          >
            Order
          </button>
          <button
            onClick={() => setActiveTab("Customer")}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
              activeTab === "Customer"
                ? "bg-white text-red-700 shadow-sm"
                : "text-gray-800 hover:text-red-700"
            }`}
          >
            Customer
          </button>
        </div>
      </div>

      <div className="h-64 md:h-72 lg:h-60">
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

export default MonthlyReport;