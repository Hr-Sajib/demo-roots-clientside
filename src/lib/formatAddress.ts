/**
 * Joins the parts of a customer's shipping address into one readable line.
 *
 * Field names here match the customer schema exactly: `shippingAddress`,
 * `shippingCity`, `shippingState`, `shippingZipcode`. Call sites previously
 * reached for `shippingPostalCode` and `shippingCountry`, which the schema has
 * never had — those simply rendered as blanks, so the address looked truncated
 * even when the customer record was complete.
 *
 * Empty parts are dropped rather than leaving stray commas behind, so a
 * customer missing (say) a state still reads cleanly.
 */
export interface AddressParts {
  shippingAddress?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingZipcode?: string | null;
}

export const formatFullAddress = (
  store: AddressParts | null | undefined,
): string => {
  if (!store) return "—";

  const street = String(store.shippingAddress ?? "").trim();
  const city = String(store.shippingCity ?? "").trim();
  const state = String(store.shippingState ?? "").trim();
  const zip = String(store.shippingZipcode ?? "").trim();

  // "City, State 75039" reads as one unit, so build it before joining the rest.
  const cityStateZip = [[city, state].filter(Boolean).join(", "), zip]
    .filter(Boolean)
    .join(" ");

  const full = [street, cityStateZip].filter(Boolean).join(", ");

  return full || "—";
};
