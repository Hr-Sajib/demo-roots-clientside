// // components/order/UpdateOrderModal.tsx
// "use client";

// import { useState, useEffect } from "react";
// import { ReusableModal } from "@/components/shared/ReusableModal";
// import UpdateOrderPage from "../../components/UpdateOrderForm";

// interface UpdateOrderModalProps {
//   selectedOrder: any;
//   refetch: () => void;
//   onClose?: () => void;
// }
// export default function UpdateOrderModal({
//   selectedOrder,
//   refetch,
//   onClose,
// }: UpdateOrderModalProps) {
//   const [open, setOpen] = useState(false);

//   useEffect(() => {
//     if (selectedOrder) setOpen(true);
//   }, [selectedOrder]);

//   // Close handler that calls onClose and resets internal state
//   const handleClose = () => {
//     setOpen(false);
//     onClose?.(); // This clears selectedOrder in parent
//   };

//   // Handle modal open change (backdrop click, ESC, etc.)
//   const handleOpenChange = (isOpen: boolean) => {
//     setOpen(isOpen);
//     if (!isOpen) {
//       onClose?.();
//     }
//   };

//   return (
//     <ReusableModal
//       open={open}
//       onOpenChange={handleOpenChange} // <-- Use custom handler
//       title={`Update Order #${selectedOrder?.invoiceNumber || ""}`}
//       trigger={null}
//     >
//       {selectedOrder && (
//         <UpdateOrderPage
//           order={selectedOrder}
//           isModal={true}
//           onUpdateSuccess={() => {
//             refetch();
//             handleClose(); // This now calls onClose
//           }}
//           onCancel={() => {
//             handleClose();
//           }}
//         />
//       )}
//     </ReusableModal>
//   );
// }