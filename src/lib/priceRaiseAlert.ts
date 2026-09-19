import { createElement } from "react";
import { toast } from "react-toastify";
import { X } from "lucide-react";

/**
 * Alert shown when a rep quotes a product above what this customer last paid.
 *
 * Deliberately obtrusive: it's large, styled red, pinned to the top of the
 * screen with only a minimal gap so every part of it stays on screen, and it
 * will not auto-dismiss. Quoting above the last agreed price is the kind of
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

// react-toastify's built-in close icon renders at ~14px, easy to miss on a
// toast this size and fiddly to hit precisely. A larger, purpose-built button
// replaces it — same top-right convention as the default, just sized to
// actually be seen and clicked without hunting for it.
const BigCloseButton = ({ closeToast }: { closeToast: () => void }) =>
  createElement(
    "button",
    {
      type: "button",
      onClick: closeToast,
      "aria-label": "Dismiss",
      style: {
        position: "absolute",
        top: "10px",
        right: "10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "32px",
        height: "32px",
        padding: 0,
        background: "transparent",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        color: "inherit",
      },
    },
    createElement(X, { size: 22, strokeWidth: 2.5 }),
  );

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
    )} — $${(newPrice - lastSold).toFixed(2)} higher.`,
    {
      // One alert at a time — typing "1", "12", "125" should not stack three.
      toastId: PRICE_RAISE_TOAST_ID,
      position: "top-center",
      autoClose: false,
      closeOnClick: false,
      draggable: false,
      closeButton: BigCloseButton,
      style: {
        // Deliberately NOT `position: fixed` + `top: 50%` + a translate here.
        // react-toastify's own toast-container carries a `transform` (it uses
        // one to center itself horizontally), and per the CSS spec a transform
        // on an ancestor becomes the containing block for any descendant's
        // `position: fixed`. So a "fixed, centered in the viewport" toast
        // nested inside that container was never actually centering against
        // the viewport — it was centering against the container's own small
        // box near the top of the page, which pushed most of the toast above
        // the visible area. Reaching for `position: fixed` again to center a
        // toast will reintroduce exactly that bug.
        //
        // Letting the toast sit in normal flow avoids the problem entirely:
        // the container already pins itself to the top center with a 16px
        // gap (`--toastify-toast-offset`), which is also exactly the "minimal
        // gap, fully visible" placement that's wanted here.
        width: "min(560px, 92vw)",
        minHeight: "140px",
        // Tailwind's own red-100 / red-700, read straight from the installed
        // `tailwindcss/colors` package rather than retyped by hand, so this
        // matches exactly whatever `bg-red-100`/`text-red-700` render as
        // elsewhere in the app — including if the palette ever changes.
        background: "oklch(93.6% 0.032 17.717)", // red-100
        color: "oklch(50.5% 0.213 27.518)", // red-700
        fontSize: "16px",
        lineHeight: "1.55",
        fontWeight: 600,
        whiteSpace: "pre-line",
        padding: "22px 40px 22px 24px", // extra right padding clears the close button
        borderRadius: "12px",
        boxShadow: "0 18px 50px rgba(0,0,0,0.18)",
        position: "relative",
      },
    },
  );
};
