"use client";
import { useGetExpiringBusinessCustomersQuery } from "@/redux/api/customers";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Building2, MapPin, Calendar, Mail, User } from "lucide-react";
import Link from "next/link";


export default function ExpiringBusinessCustomers() {
  const { data, isLoading, isError } = useGetExpiringBusinessCustomersQuery();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            <span className="ml-3 text-gray-600">Loading expiring businesses...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="border border-red-200 bg-red-50 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-700 mt-1">
                Failed to load expiring business customers. Please try again later.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const expiringCustomers = data?.data || [];

  // Helper function to get urgency color
  const getUrgencyColor = (days: number) => {
    if (days <= 7) return "text-red-700 bg-red-50";
    if (days <= 15) return "text-orange-700 bg-orange-50";
    return "text-yellow-700 bg-yellow-50";
  };

  return (
    <div className=" bg-gray-50">
      <div className="space-y-6">


        {/* Main Card with Table */}
        <Card className="border-0">
        <h2 className=" font-bold text-gray-900 ml-5">Expiring Store List</h2>
          <CardContent className="p-0">
            {expiringCustomers.length === 0 ? (
              <div className="p-2 text-center">
                <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 font-medium">
                  No businesses expiring in the next 30 days
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  All business licenses are up to date
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider w-12"></th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Store Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Contact Person</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Expiration Date</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase tracking-wider">Days Remaining</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {expiringCustomers.map((customer) => (
                    
                      <tr key={customer._id}>
                        {/* Warning Icon */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <AlertTriangle
                            className={`h-5 w-5 ${
                              customer.daysUntilExpiry <= 7
                                ? "text-red-600"
                                : customer.daysUntilExpiry <= 15
                                ? "text-orange-600"
                                : "text-yellow-600"
                            }`}
                          />
                        </td>

                        {/* Store Name */}
                        <td className="px-4 py-4">
                        <Link
                            href={`/customers/${customer._id}`}
                            className="flex items-center gap-2 hover:underline"
                        >
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900">{customer.storeName}</span>
                        </Link>
                        </td>

                        {/* Contact Person */}
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-gray-900">
                              <User className="h-3 w-3 text-gray-400" />
                              <span>{customer.storePersonName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <Mail className="h-3 w-3 text-gray-400" />
                              <a
                                href={`mailto:${customer.storePersonEmail}`}
                                className="text-blue-600 hover:underline"
                              >
                                {customer.storePersonEmail}
                              </a>
                            </div>
                          </div>
                        </td>

                        {/* Location */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <div>
                              <div>{customer.billingAddress}</div>
                              <div className="text-xs text-gray-500">
                                {customer.billingCity}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Expiration Date */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {new Date(customer.businessExpirationDate).toLocaleDateString(
                                "en-US",
                                {
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                }
                              )}
                            </span>
                          </div>
                        </td>

                        {/* Days Remaining */}
                        <td className="px-4 py-4 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${getUrgencyColor(
                              customer.daysUntilExpiry
                            )}`}
                          >
                            {customer.daysUntilExpiry}
                          </span>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}