import { Customer } from "@/types";
import { format } from "date-fns";
import Link from "next/link";
import Cookies from "js-cookie";
interface OrderHistoryTableProps {
  orders: Customer["customerOrders"];
}

const OrderHistoryTable: React.FC<OrderHistoryTableProps> = ({ orders }) => {
  if (!orders?.length) {
    return (
      <p className="text-gray-600 text-center py-4">No orders available</p>
    );
  }

  const loggedInUserRole = Cookies.get("role");
  const isAdminOrManager =
    loggedInUserRole === "admin" || loggedInUserRole == "manager";

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-sm min-w-[800px]">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="p-3 whitespace-nowrap">PO #</th>
            <th className="p-3 whitespace-nowrap">Invoice #</th>
            <th className="p-3 whitespace-nowrap">Order Status</th>
            <th className="p-3 whitespace-nowrap">Date</th>
            <th className="p-3 whitespace-nowrap">Due Date</th>
            <th className="p-3 whitespace-nowrap">Order Amount</th>
            <th className="p-3 whitespace-nowrap">Shipping</th>
            <th className="p-3 whitespace-nowrap">Total Payable</th>
            <th className="p-3 whitespace-nowrap">Paid</th>
            <th className="p-3 whitespace-nowrap">Open Balance</th>
            {isAdminOrManager && (
              <th className="p-3 whitespace-nowrap">Profit</th>
            )}
            {isAdminOrManager && (
              <th className="p-3 whitespace-nowrap">Profit %</th>
            )}
            <th className="p-3 whitespace-nowrap">Payment Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order._id} className="border-t hover:bg-gray-50">
              <td className="p-3 whitespace-nowrap text-gray-700">
                <Link
                  href={`/orders/${order._id}`}
                  className="text-blue-600 hover:underline"
                >
                  {order.PONumber}
                </Link>
              </td>
              <td className="p-3 whitespace-nowrap text-gray-700">
                {order.invoiceNumber || "—"}
              </td>
              <td className="p-3 whitespace-nowrap">
                {/* Every order appears here regardless of status, so the status
                    has to be visible — otherwise a row that is not yet counted
                    toward the open balance looks identical to one that is. */}
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                    order.orderStatus === "completed"
                      ? "bg-green-100 text-green-800"
                      : order.orderStatus === "verified"
                        ? "bg-blue-100 text-blue-800"
                        : order.orderStatus === "cancelled"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {order.orderStatus || "—"}
                </span>
              </td>
              <td className="p-3 whitespace-nowrap text-gray-700">
                {format(new Date(order.date), "yyyy-MM-dd")}
              </td>
              <td className="p-3 whitespace-nowrap text-gray-700">
                {order.paymentDueDate
                  ? format(new Date(order.paymentDueDate), "yyyy-MM-dd")
                  : "N/A"}
              </td>
              <td className="p-3 whitespace-nowrap text-gray-700">
                ${order.orderAmount.toFixed(2)}
              </td>
              <td className="p-3 whitespace-nowrap text-gray-700">
                ${order.shippingCharge.toFixed(2)}
              </td>
              <td className="p-3 whitespace-nowrap text-gray-700 font-semibold">
                ${order?.totalPayable.toFixed(2)}
              </td>
              <td className="p-3 whitespace-nowrap text-gray-700">
                ${order.paymentAmountReceived.toFixed(2)}
              </td>
              <td className="p-3 whitespace-nowrap text-gray-700">
                ${order.openBalance.toFixed(2)}
              </td>
              {isAdminOrManager && (
                <td className="p-3 whitespace-nowrap text-gray-700">
                  ${order.profitAmount.toFixed(2)}
                </td>
              )}
              {isAdminOrManager && (
                <td className="p-3 whitespace-nowrap text-gray-700">
                  {order.profitPercentage.toFixed(2)}%
                </td>
              )}

              <td className="p-3 whitespace-nowrap">
                <span
                  className={`px-2 py-1 rounded-full text-xs ${
                    order.paymentStatus === "paid"
                      ? "bg-green-100 text-green-800"
                      : order.paymentStatus === "partiallyPaid"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {order.paymentStatus}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default OrderHistoryTable;
