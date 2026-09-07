"use client";

import { useGetBestSellingProductsQuery, useGetWorstSellingProductsQuery } from '@/redux/api/dashboard';
import Loading from '@/redux/Shared/Loading';
import React, { useState } from 'react';

interface Product {
  _id: string;
  totalQuantity: number;
  numberOfOrders: number;
  orderScore: number;
  revenuePercentage: number;
  name: string;
  itemNumber: string | null;
  status?: 'Stock' | 'Stock Out';
}

const BestSellingProducts: React.FC = () => {
  const [selectedOption, setSelectedOption] = useState<'best' | 'worst'>('best');

  const { data: bestSellingData, isLoading: isBestLoading } = useGetBestSellingProductsQuery();
  const { data: worstSellingData, isLoading: isWorstLoading } = useGetWorstSellingProductsQuery();

  const products = selectedOption === 'best' 
    ? (bestSellingData?.data || []) 
    : (worstSellingData?.data || []);

  if (isBestLoading || isWorstLoading) {
    return (
      <div className="p-4 bg-white rounded-lg shadow-md">
        <Loading 
          title="Best/Worst Selling Loading..." 
          message="Fetching top and bottom performing products" 
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md h-67 flex flex-col">
      {/* Header with selector */}
      <div className="flex justify-between items-center px-5 py-4 border-b">
        <h3 className="text-lg font-semibold text-gray-800">
          {selectedOption === 'best' ? 'Best Selling Products' : 'Worst Selling Products'}
        </h3>
        
        <select
          value={selectedOption}
          onChange={(e) => setSelectedOption(e.target.value as 'best' | 'worst')}
          className="px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="best">Best Selling</option>
          <option value="worst">Worst Selling</option>
        </select>
      </div>
                                                                             
      {/* Scrollable table area */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#f2e9e6] text-[#6A717F] z-10 shadow-sm">
              <tr>
                <th className="p-3 font-medium text-sm">PRODUCT</th>
                <th className="p-3 font-medium text-sm text-center">TOTAL ORDERS</th>
                <th className="p-3 font-medium text-sm text-center">REVENUE %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.length > 0 ? (
                products.slice(0, 10).map((product) => (  // increased to 10 – adjust as needed
                  <tr key={product._id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-medium text-gray-800">
                      {product.name || 'Unknown Product'}
                    </td>
                    <td className="p-3 text-center text-gray-700">
                      {product.numberOfOrders}
                    </td>
                    <td className="p-3 text-center text-gray-700">
                      {product.revenuePercentage.toFixed(2)}%
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-500">
                    No data available for this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BestSellingProducts;

// function useGetWorstSellingProductsQuery(): { data: any; isLoading: any; } {
//   throw new Error('Function not implemented.');
// }
