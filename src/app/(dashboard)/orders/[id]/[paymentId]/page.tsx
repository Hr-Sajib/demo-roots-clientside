import Payment from '@/Features/payments/Payment'
import AccessGate from "@/components/shared/AccessDenied";
import React from 'react'

// URL shape: /orders/{orderId}/{paymentId}. The order-details page
// lives at /orders/{orderId}, this nested segment opens a specific
// payment for that order. We read the URL slug `id` and forward it
// to the Payment component as `productId` (the legacy prop name — the
// Payment component has its own internal naming).
const PaymentManagement = async ({ params }: { params: any }) => {
  const { id, paymentId } = await params;
  return (
    <AccessGate allowance="orderSee" label="order payments">
      <Payment productId={id} paymentId={paymentId} />
    </AccessGate>
  );
};

export default PaymentManagement;