
"use client";


import { ProductSegment, useGetProductSegmentsQuery } from "@/redux/api/orders";
import Loading from "@/redux/Shared/Loading";
import React from "react";





const ProductSegmentation: React.FC = () => {
  const { data, isLoading, isError } = useGetProductSegmentsQuery();

  if (isLoading) return <div className="p-4 bg-white rounded-lg shadow-md">
    <Loading title="Product segmenttaiton Loading"/>
  </div>;
  if (isError) return <div className="p-4 bg-white rounded-lg shadow-md text-red-500">Error loading segments</div>;

  const segmentsToShow: ProductSegment[]  = data?.data.slice(0, 4) || [];

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h3 className="text-lg text-gray-600 font-bold m">Commonly purchased together</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        {segmentsToShow.map((segment, index) => (
          <div key={index} className="p-4 bg-gray-50 rounded-lg shadow">
            <ul className="mb-2">
              {segment.combination.map((item, i) => (
                <li key={i} className="text-sm text-gray-700">{item}</li>
              ))}
            </ul>
            <p className="text-md font-semibold text-gray-900">Frequency: {segment.frequency}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductSegmentation;
