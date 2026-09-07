"use client";

import { useParams } from "next/navigation";
import OrderDetails from "@/Features/Orders/OrderDetails";
import AccessGate from "@/components/shared/AccessDenied";

/**
 * Thin route wrapper for /orders/[id].
 *
 * The actual order-details component lives in
 * @/Features/Orders/OrderDetails and already has field-level
 * isAdminOrManager gates for profit / purchase price. This file exists
 * only so Next.js's App Router can resolve the [id] segment to a page.
 *
 * The /orders/[id]/[paymentId] subroute has its own page and is
 * unaffected.
 */
const OrderDetailsPage = () => {
  const params = useParams<{ id: string }>();
  const orderId = params?.id;

  if (!orderId) {
    return null;
  }

  return (
    <AccessGate allowance="orderSee" label="order details">
      <OrderDetails id={orderId} />
    </AccessGate>
  );
};

export default OrderDetailsPage;