// components/ProspectDetailsModal.tsx
"use client";

import { X } from "lucide-react";
import { Prospect } from "@/types";
import { format } from "date-fns";

interface ProspectDetailsModalProps {
  prospect: Prospect;
  onClose: () => void;
}

export default function ProspectDetailsModal({
  prospect,
  onClose,
}: ProspectDetailsModalProps) {
  const formatPhone = (phone: string) => {
    if (!phone) return "—";
    return phone.replace(/\D/g, "");
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">
            {prospect.storeName}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-8">
          {/* Status */}
          <div className="flex items-center gap-3">
            <span className="font-medium text-gray-700 w-32">Status:</span>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                prospect.status === "converted"
                  ? "bg-green-100 text-green-800"
                  : prospect.status === "rejected"
                  ? "bg-red-100 text-red-800"
                  : "bg-blue-100 text-blue-800"
              }`}
            >
              {prospect.status}
            </span>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Contact</h3>
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="font-medium text-gray-600 w-32">Name:</span>
                  <span>{prospect.storePersonName || "—"}</span>
                </div>
                <div className="flex">
                  <span className="font-medium text-gray-600 w-32">Email:</span>
                  <span>{prospect.storePersonEmail || "—"}</span>
                </div>
                <div className="flex">
                  <span className="font-medium text-gray-600 w-32">Phone:</span>
                  <span>{formatPhone(prospect.storePersonPhone)}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Store</h3>
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="font-medium text-gray-600 w-32">Store Phone:</span>
                  <span>{formatPhone(prospect.storePhone)}</span>
                </div>
                <div className="flex">
                  <span className="font-medium text-gray-600 w-32">Tax ID:</span>
                  <span>{prospect.salesTaxId || "—"}</span>
                </div>
                <div className="flex">
                  <span className="font-medium text-gray-600 w-32">Lead Source:</span>
                  <span>{prospect.leadSource || "—"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">Shipping Address</h3>
            <div className="text-sm text-gray-700">
              {prospect.shippingAddress && (
                <p>{prospect.shippingAddress}</p>
              )}
              <p>
                {[
                  prospect.shippingCity,
                  prospect.shippingState,
                  prospect.shippingZipcode,
                ]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </div>
          </div>

          {/* Quoted Items */}
          {prospect.quotedList.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Quoted Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border rounded-lg">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Item #</th>
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Size</th>
                      <th className="px-4 py-2 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prospect.quotedList.map((item, i) => (
                      <tr key={i} className="border-t">
                        <td className="px-4 py-2">{item.itemNumber}</td>
                        <td className="px-4 py-2">{item.itemName}</td>
                        <td className="px-4 py-2">{item.packetSize || "—"}</td>
                        <td className="px-4 py-2 text-right font-medium">
                          ${item.price.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Follow-Up Activities */}
          {prospect.followUpActivities!.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Follow-Up Activities</h3>
              <div className="space-y-3">
                {prospect.followUpActivities!.map((act, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{act.activity}</p>
                      <p className="text-sm text-gray-600">
                        {format(new Date(act.activityDate), "MMM dd, yyyy")} via{" "}
                        {act.activityMedium}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes & Competitor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {prospect.note && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Notes</h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                  {prospect.note}
                </p>
              </div>
            )}
            {prospect.competitorStatement && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">
                  Competitor Statement
                </h3>
                <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                  {prospect.competitorStatement}
                </p>
              </div>
            )}
          </div>

          {/* Document */}
          {prospect.miscellaneousDocImage && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">
                Miscellaneous Document
              </h3>
              <a
                href={prospect.miscellaneousDocImage}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 hover:underline"
              >
                View Document
              </a>
            </div>
          )}

          {/* Assigned Salesperson */}
          {prospect.assignedSalesPerson && (
            <div className="flex items-center gap-3">
              <span className="font-medium text-gray-700 w-32">Sales Rep:</span>
              <span>
                {(prospect.assignedSalesPerson as any)?.email || "—"}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t">
          <button
            onClick={onClose}
            className="px-6 py-2 hover:bg-red-600 bg-red-700 text-white rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
