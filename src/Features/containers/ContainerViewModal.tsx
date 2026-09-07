'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Container } from "@/redux/api/containerApi";
import { useGetInventoryQuery } from "@/redux/api/inventory";
import Loading from "@/redux/Shared/Loading";
import { FileText, Download, Eye } from 'lucide-react';
import Cookies from "js-cookie";

interface ContainerViewModalProps {
  container: Container;
  onClose: () => void;
}

interface ProductInfo {
  name: string;
  itemNumber: string;
  cbm: number;
}

export default function ContainerViewModal({ container, onClose }: ContainerViewModalProps) {
  const { data: inventoryData, isLoading: isInventoryLoading } = useGetInventoryQuery();

  // Defense-in-depth: hide cost-sensitive columns from non-admin/manager.
  // Even though the parent route is admin/manager only, PrivateRoute's
  // gate runs in useEffect — we'd render for a frame before redirect
  // without this. The cookie lookup is synchronous, so we can decide
  // before any sensitive cell renders.
  const role = Cookies.get("role");
  const isAdminOrManager = role === "admin" || role === "manager";
  
  // Create a lookup map: itemNumber → product info (name, cbm)
  const productInfoMap = useMemo(() => {
    const map: Record<string, ProductInfo> = {};
    const products = inventoryData?.data || [];

    products.forEach((product: any) => {
      if (product.itemNumber) {
        map[product.itemNumber] = {
          name: product.name || "⚠️ Product not found",
          itemNumber: product.itemNumber,
          cbm: product.cbm || 0,
        };
      }
    });
    return map;
  }, [inventoryData]);

  // Calculate total CBM across all products in container
  const totalCBM = useMemo(() => {
    return container.containerProducts.reduce((sum, prod) => {
      // Use cbm from productInfoMap first, fallback to prod.cbm
      const cbm = productInfoMap[prod.itemNumber]?.cbm || prod.cbm || 0;
      return sum + (cbm * prod.quantity);
    }, 0);
  }, [container.containerProducts, productInfoMap]);

  // Calculate total quantity across all products
  const totalQuantity = useMemo(() => {
    return container.containerProducts.reduce((sum, prod) => sum + prod.quantity, 0);
  }, [container.containerProducts]);

  // Calculate total purchase price across all products
  const totalPurchasePrice = useMemo(() => {
    return container.containerProducts.reduce((sum, prod) => sum + (prod.purchasePrice || 0), 0);
  }, [container.containerProducts]);

  // Containers equivalent (using your example divisor of 50 CBM per container)
  const cbmPerContainer = 50;
  const containersEquivalent = totalCBM / cbmPerContainer;

  // Helper function to remove trailing zeros after decimal
  const formatCBM = (num: number): string => {
    return parseFloat(num.toFixed(10)).toString(); // removes trailing zeros
  };

  // Helper function to calculate per case purchase price
  const getPerCasePurchasePrice = (prod: any): number => {
    // If perCasePurchasePrice is already stored, use it
    if (prod.perCasePurchasePrice) {
      return prod.perCasePurchasePrice;
    }
    // Otherwise calculate from purchase price and quantity
    if (prod.quantity > 0 && prod.purchasePrice > 0) {
      return prod.purchasePrice / prod.quantity;
    }
    return 0;
  };

  // Helper function to get file extension from URL
  const getFileExtension = (url: string): string => {
    const lastDot = url.lastIndexOf('.');
    if (lastDot === -1) return '';
    return url.substring(lastDot + 1).toLowerCase();
  };

  // Helper function to get file icon color based on type
  const getFileIconColor = (url: string): string => {
    const ext = getFileExtension(url);
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      return 'text-blue-500';
    }
    if (['pdf'].includes(ext)) {
      return 'text-red-500';
    }
    if (['doc', 'docx'].includes(ext)) {
      return 'text-blue-600';
    }
    if (['xls', 'xlsx'].includes(ext)) {
      return 'text-green-600';
    }
    return 'text-gray-500';
  };

  // Open document in new tab
  const openDocument = (url: string) => {
    window.open(url, '_blank');
  };

  if (isInventoryLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-7xl">
          <div className="flex justify-center items-center h-64">
            <Loading title="Loading product data..." message="Fetching product information" />
          </div>
        </div>
      </div>
    );
  }

  const hasDocuments = container.containerDocuments && container.containerDocuments.length > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-7xl max-h-[85vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Container Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm mb-6 p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-semibold text-gray-600">Container Number</p>
            <p className="text-gray-900">{container.containerNumber}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-600">Container Name</p>
            <p className="text-gray-900">{container.containerName}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-600">Status</p>
            <p className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
              container.containerStatus === "arrived" 
                ? "bg-green-100 text-green-700" 
                : "bg-amber-100 text-amber-700"
            }`}>
              {container.containerStatus === "arrived" ? "Arrived" : "On The Way"}
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-600">Delivery Date</p>
            <p className="text-gray-900">{container.deliveryDate ? new Date(container.deliveryDate).toLocaleDateString() : "N/A"}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-600">Shipping Cost</p>
            <p className="text-gray-900">${container.shippingCost?.toFixed(2) || "0.00"}</p>
          </div>
          <div>
            <p className="font-semibold text-gray-600">Paid Amount</p>
            <p className="text-gray-900">${container.paidAmount?.toFixed(2) || "0.00"}</p>
          </div>
        </div>

        <h3 className="text-lg font-semibold mt-6 mb-3">Products in Container</h3>
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Product Name</th>
                <th className="border p-2 text-left">Category</th>
                <th className="border p-2 text-left">Item Number</th>
                <th className="border p-2 text-center">Quantity</th>
                {isAdminOrManager && (
                  <>
                    <th className="border p-2 text-center">Per Case Purchase Price</th>
                    <th className="border p-2 text-right">Total Purchase Price</th>
                  </>
                )}
                <th className="border p-2 text-center">CBM (%)</th>
                <th className="border p-2 text-center">Total CBM</th>
                {isAdminOrManager && (
                  <>
                    <th className="border p-2 text-right">Per Case Cost</th>
                    <th className="border p-2 text-right">Per Case Shipping</th>
                  </>
                )}
                <th className="border p-2 text-right">Sales Price</th>
                <th className="border p-2 text-left">Packet Size</th>
              </tr>
            </thead>
            <tbody>
              {container.containerProducts.map((prod: any, idx: number) => {
                const productInfo = productInfoMap[prod.itemNumber];
                const productName = productInfo?.name || prod.productName || "⚠️ Product not found";
                const cbm = productInfo?.cbm || prod.cbm || 0;
                const totalCbmForRow = cbm * prod.quantity;
                const perCasePurchasePrice = getPerCasePurchasePrice(prod);
                const totalPurchasePrice = prod.purchasePrice || 0;

                return (
                  <tr key={prod._id || idx} className="border-t hover:bg-gray-50">
                    <td className="border p-2 font-medium text-red-600">
                      {productName}
                    </td>
                    <td className="border p-2">{prod.category || "N/A"}</td>
                    <td className="border p-2 font-mono text-xs">{prod.itemNumber}</td>
                    <td className="border p-2 text-center font-medium">{prod.quantity}</td>
                    {isAdminOrManager && (
                      <>
                        <td className="border p-2 text-center text-purple-600 font-medium">
                          ${perCasePurchasePrice.toFixed(2)}
                        </td>
                        <td className="border p-2 text-right text-green-600 font-medium">
                          ${totalPurchasePrice.toFixed(2)}
                        </td>
                      </>
                    )}
                    <td className="border p-2 text-center">{formatCBM(cbm)}</td>
                    <td className="border p-2 text-center font-medium text-green-600">{formatCBM(totalCbmForRow)}</td>
                    {isAdminOrManager && (
                      <>
                        <td className="border p-2 text-right">
                          {prod.perCaseCost != null ? `$${parseFloat(String(prod.perCaseCost)).toFixed(3)}` : "-"}
                        </td>
                        <td className="border p-2 text-right">
                          {/* perCaseShippingCost is now stored at the container root level */}
                          {container.perCaseShippingCost != null
                            ? `$${parseFloat(String(container.perCaseShippingCost)).toFixed(3)}`
                            : "-"}
                        </td>
                      </>
                    )}
                    <td className="border p-2 text-right text-green-600 font-medium">
                      ${prod.salesPrice?.toFixed(2) || "0.00"}
                    </td>
                    <td className="border p-2">{prod.packetSize || "N/A"}</td>
                  </tr>
                );
              })}

              {/* Summary Footer Row */}
              <tr className="bg-gray-100 font-semibold">
                <td className="border p-2 text-right" colSpan={3}>
                  Totals:
                </td>
                <td className="border p-2 text-center text-gray-900">
                  {totalQuantity}
                </td>
                {isAdminOrManager ? (
                  <td className="border p-2" colSpan={2}>
                    {/* Empty cells for Per Case Purchase Price and Total Purchase Price */}
                  </td>
                ) : null}
                <td className="border p-2 text-right">
                  Total CBM:
                </td>
                <td className="border p-2 text-center text-green-700">
                  {formatCBM(totalCBM)}
                </td>
                <td
                  className="border p-2"
                  colSpan={isAdminOrManager ? 4 : 2}
                >
                  <span className="text-gray-600">
                    ({formatCBM(containersEquivalent)} containers @ 50 CBM/container)
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Container Documents Section */}
        {hasDocuments && (
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-4">
              <FileText className="w-5 h-5 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-800">Container Documents</h3>
              <span className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                {container?.containerDocuments?.length} file(s)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {container?.containerDocuments?.map((docUrl: string, idx: number) => {
                const fileName = docUrl.split('/').pop() || `Document ${idx + 1}`;
                const fileExt = getFileExtension(docUrl);
                const fileIconColor = getFileIconColor(docUrl);
                
                return (
                  <div 
                    key={idx}
                    className="border rounded-lg p-3 bg-gray-50 hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => openDocument(docUrl)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 bg-white rounded-lg border ${fileIconColor}`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate" title={fileName}>
                          {fileName}
                        </p>
                        <p className="text-xs text-gray-500 uppercase mt-1">
                          {fileExt || 'file'}
                        </p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Eye className="w-4 h-4 text-gray-500 hover:text-red-600" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-6 p-4 bg-red-50 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Products</p>
            <p className="text-xl font-bold text-gray-900">{container.containerProducts.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Quantity</p>
            <p className="text-xl font-bold text-gray-900">{totalQuantity}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total CBM</p>
            <p className="text-xl font-bold text-green-600">{formatCBM(totalCBM)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Container Equivalent</p>
            <p className="text-xl font-bold text-red-600">{formatCBM(containersEquivalent)}</p>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button 
            onClick={onClose}
            className="bg-gray-500 hover:bg-gray-600 text-white"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}