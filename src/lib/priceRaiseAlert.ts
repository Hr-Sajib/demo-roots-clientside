import { toast } from "react-toastify";

/**
 * Alert shown when a rep quotes a product above what this customer last paid.
 *
 * Deliberately obtrusive: it sits in the middle of the screen, is styled red,
 * and will not auto-dismiss. Quoting above the last agreed price is the kind of
 * mistake that is cheap to correct here and expensive to correct after the
 * customer has the invoice, so it is worth interrupting for.
 *
 * `resolveLastSoldPrice` exists because the previous implementation froze the
 * last-sold price onto the order line at the moment the product was added. If
 * the customer was picked *after* the products — which is the normal order of
 * operations on the Add Order screen — the price was never resolved and the
 * alert could never fire. Resolving it live from the product record at the
 * moment the price is typed removes that ordering dependency entirely.
 */

export const PRICE_RAISE_TOAST_ID = "price-raise-alert";

/**
 * The price this customer last actually paid for this product, or undefined.
 *
 * `priceForCustomersRecords` is a Mongoose Map serialised to a plain object,
 * keyed by customer id. Older records stored a bare number rather than
 * `{ lastPurchasePrice, purchaseCount }`, so both shapes are handled.
 */
export const resolveLastSoldPrice = (
  product: unknown,
  customerId: string | null | undefined,
): number | undefined => {
  if (!customerId || !product) return undefined;

  const records = (product as Record<string, unknown>)
    .priceForCustomersRecords as Record<string, unknown> | undefined;
  if (!records) return undefined;

  const entry = records[customerId];
  if (entry === undefined || entry === null) return undefined;

  const raw =
    typeof entry === "object"
      ? (entry as Record<string, unknown>).lastPurchasePrice
      : entry;

  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
};

export const showPriceRaiseAlert = (
  productName: string,
  lastSold: number,
  newPrice: number,
): void => {
  toast.error(
    `"${productName}" was last sold to this customer at $${lastSold.toFixed(
      2,
    )}. You have entered $${newPrice.toFixed(
      2,
    )} — $${(newPrice - lastSold).toFixed(2)} higher.\n\nConfirm this is intended before placing the order.`,
    {
      // One alert at a time — typing "1", "12", "125" should not stack three.
      toastId: PRICE_RAISE_TOAST_ID,
      position: "top-center",
      autoClose: false,
      closeOnClick: false,
      draggable: false,
      closeButton: true,
      style: {
        // Centred in the viewport rather than tucked into a corner, and wide
        // enough that the numbers are readable at a glance.
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "min(560px, 92vw)",
        minHeight: "140px",
        background: "#B3261E",
        color: "#FFFFFF",
        fontSize: "16px",
        lineHeight: "1.55",
        fontWeight: 600,
        whiteSpace: "pre-line",
        padding: "22px 24px",
        borderRadius: "12px",
        boxShadow: "0 18px 50px rgba(0,0,0,0.35)",
        zIndex: 99999,
      },
    },
  );
};
