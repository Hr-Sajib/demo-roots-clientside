// // OrderTable.tsx
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
// import { ArrowUpDown, Edit, Eye } from "lucide-react";
// import Link from "next/link";
// import Switch from "react-switch";
// import DeleteConfirmModal from "@/components/orders/DeleteConfirmModal";

// export default function OrderTable({
//   filteredOrders,
//   isAdminOrManager,
//   sortConfig,
//   setSortConfig,
//   showUpdateOrder,
//   setSelectedOrder,
//   setIsUpdateModalOpen,
//   handleDeleteClick,
//   showDeleteOrder,
//   isDeleting,
//   orderToDelete,
//   onDeleteConfirm,
//   onDeleteCancel,
//   handleReminderToggle,           // ← new prop: parent handles dispatch
// }) {
//   return (
//     <div className="overflow-x-auto border rounded-lg">
//       <Table className="w-full min-w-max">
//         <TableHeader className="bg-gray-200">
//           <TableRow>
//             {[
//               { label: "Order Date", sortable: true },
//               { label: "Invoice", sortable: false },
//               { label: "PO No.", sortable: false },
//               { label: "Store Name", sortable: false },
//               { label: "Payment Due", sortable: true },
//               { label: "Order Amount", sortable: true },
//               { label: "Shipping Charge", sortable: true },
//               { label: "Total Payable", sortable: false },
//               { label: "Order Status", sortable: false },
//               { label: "Payment Received", sortable: false },
//               { label: "Discount", sortable: true },
//               { label: "Open Balance", sortable: true },
//               ...(isAdminOrManager
//                 ? [
//                     { label: "Profit", sortable: true },
//                     { label: "Profit %", sortable: true },
//                   ]
//                 : []),
//               { label: "Payment Status", sortable: true },
//               { label: "Reminder", sortable: false },
//               { label: "Reminder Number", sortable: false },
//               { label: "Action", sortable: false },
//             ].map((h, i) => (
//               <TableHead key={i} className="min-w-[90px]">
//                 <div className="flex items-center gap-1">
//                   {h.label}
//                   {h.sortable && (
//                     <ArrowUpDown
//                       className="w-3 h-3 cursor-pointer"
//                       onClick={() =>
//                         setSortConfig((prev) => ({
//                           key: h.label,
//                           direction:
//                             prev.key === h.label
//                               ? prev.direction === "desc"
//                                 ? "asc"
//                                 : prev.direction === "asc"
//                                   ? null
//                                   : "desc"
//                               : "desc",
//                         }))
//                       }
//                     />
//                   )}
//                 </div>
//               </TableHead>
//             ))}
//           </TableRow>
//         </TableHeader>
//         <TableBody>
//           {filteredOrders.length === 0 ? (
//             <TableRow>
//               <TableCell
//                 colSpan={isAdminOrManager ? 18 : 16}
//                 className="text-center py-8 text-gray-500"
//               >
//                 No matching orders
//               </TableCell>
//             </TableRow>
//           ) : (
//             filteredOrders.map((order) => {
//               const isDue =
//                 order.paymentDueDate &&
//                 new Date(order.paymentDueDate) < new Date();
//               const reminder = order.reminderNumber ?? 0;
//               const remindersActive = !(order.isReminderPaused || false);

//               return (
//                 <TableRow key={order._id} className="hover:bg-gray-50">
//                   <TableCell>
//                     {new Date(order.date).toLocaleDateString("en-US", {
//                       day: "2-digit",
//                       month: "2-digit",
//                       year: "numeric",
//                     })}
//                   </TableCell>
//                   <TableCell className="font-medium">
//                     {order.invoiceNumber}
//                   </TableCell>
//                   <TableCell>
//                     <Link
//                       href={`/orders/${order._id}`}
//                       className="text-blue-600 hover:underline"
//                     >
//                       {order.PONumber}
//                     </Link>
//                   </TableCell>
//                   <TableCell>{order.storeId?.storeName}</TableCell>
//                   <TableCell
//                     className={
//                       isDue &&
//                       order.paymentStatus !== "paid" &&
//                       order.paymentStatus !== "overPaid"
//                         ? "text-red-700 font-bold"
//                         : ""
//                     }
//                   >
//                     {order.paymentDueDate
//                       ? new Date(order.paymentDueDate).toLocaleDateString(
//                           "en-US",
//                           {
//                             day: "2-digit",
//                             month: "2-digit",
//                             year: "numeric",
//                           }
//                         )
//                       : "N/A"}
//                   </TableCell>
//                   <TableCell>${order.orderAmount.toFixed(2)}</TableCell>
//                   <TableCell>${order.shippingCharge || "0.00"}</TableCell>
//                   <TableCell>
//                     ${(Math.ceil(order.totalPayable * 100) / 100).toFixed(2)}
//                   </TableCell>
//                   <TableCell>
//                     <span
//                       className={`
//                         px-2 py-1 rounded-full text-xs uppercase font-medium
//                         ${
//                           order.orderStatus === "pending"
//                             ? "bg-yellow-100 text-yellow-800"
//                             : order.orderStatus === "verified"
//                             ? "bg-blue-100 text-blue-800"
//                             : order.orderStatus === "completed"
//                             ? "bg-green-100 text-green-800"
//                             : order.orderStatus === "cancelled"
//                             ? "bg-red-100 text-red-800"
//                             : "bg-gray-100 text-gray-800"
//                         }
//                       `}
//                     >
//                       {order.orderStatus}
//                     </span>
//                   </TableCell>
//                   <TableCell>
//                     ${order.paymentAmountReceived.toFixed(2)}
//                   </TableCell>
//                   <TableCell>${order.discountGiven.toFixed(2)}</TableCell>
//                   <TableCell
//                     className={
//                       order.openBalance > 0
//                         ? "text-red-700"
//                         : "text-green-600"
//                     }
//                   >
//                     ${order.openBalance.toFixed(2)}
//                   </TableCell>
//                   {isAdminOrManager && (
//                     <>
//                       <TableCell className="text-green-700">
//                         ${order.profitAmount.toFixed(2)}
//                       </TableCell>
//                       <TableCell>
//                         {order.profitPercentage.toFixed(2)}%
//                       </TableCell>
//                     </>
//                   )}
//                   <TableCell>
//                     <span
//                       className={`px-2 py-1 rounded-full text-xs ${
//                         order.paymentStatus === "paid"
//                           ? "bg-green-100 text-green-800"
//                           : "bg-red-100 text-red-800"
//                       }`}
//                     >
//                       {order.paymentStatus}
//                     </span>
//                   </TableCell>
//                   <TableCell>
//                     <Switch
//                       checked={remindersActive}
//                       onChange={() => handleReminderToggle(order)}
//                       onColor="#86d3a2"
//                       offColor="#d3d3d3"
//                       height={24}
//                       width={48}
//                     />
//                   </TableCell>
//                   <TableCell
//                     className={
//                       reminder > 0
//                         ? "text-red-700 font-bold text-center"
//                         : "text-center"
//                     }
//                   >
//                     {reminder}
//                   </TableCell>
//                   <TableCell className="sticky right-0 bg-gray-50">
//                     <div className="flex gap-5">
//                       <Link href={`/orders/${order._id}`}>
//                         <Eye className="w-4 h-4 mt-2 cursor-pointer hover:text-gray-700" />
//                       </Link>
//                       {showUpdateOrder && (
//                         <Edit
//                           className="w-4 h-4 mt-2 cursor-pointer hover:text-gray-700"
//                           onClick={() => {
//                             setSelectedOrder(order);
//                             setIsUpdateModalOpen(true);
//                           }}
//                         />
//                       )}
//                       <DeleteConfirmModal
//                         orderToDelete={order}
//                         showDeleteOrder={showDeleteOrder}
//                         isDeleting={isDeleting}
//                         onDeleteClick={handleDeleteClick}
//                         onDeleteConfirm={onDeleteConfirm}
//                         onDeleteCancel={onDeleteCancel}
//                       />
//                     </div>
//                   </TableCell>
//                 </TableRow>
//               );
//             })
//           )}
//         </TableBody>
//       </Table>
//     </div>
//   );
// }