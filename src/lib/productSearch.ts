/**
 * Shared product search matching.
 *
 * Every product picker in the app used to test the raw query as one substring:
 *
 *   product.name.toLowerCase().includes(query.toLowerCase())
 *
 * That requires the words to appear contiguously and in the typed order, which
 * almost never holds here — 58% of product names are pipe-structured, like
 * `Reshmi Plain Naan - Horeca 11" | 150gms x 3 PKTS | 12PKTS X 450GMS`. Against
 * the real catalogue, ordinary queries returned nothing at all:
 *
 *   "naan 450gms"     0 matches      "masala tea"      0 matches
 *   "paneer paratha"  0 matches      "samosa punjabi"  0 matches
 *
 * Here the query is split into tokens and every token must appear somewhere in
 * the product's searchable text, in any order. All four queries above now find
 * what the person meant.
 */

/**
 * Reduces text to lowercase alphanumeric words.
 *
 * Two deliberate steps beyond lowercasing:
 *
 *  - Digit/letter boundaries become word breaks, so `450GMS` and `450 gms` are
 *    the same thing. Pack sizes are written both ways throughout the catalogue.
 *  - Every non-alphanumeric character becomes a space, so `|`, `-`, `"` and `/`
 *    stop hiding words behind them — and `pro 349` finds `PRO-349`.
 */
export const normaliseForSearch = (text: unknown): string =>
  String(text ?? "")
    .toLowerCase()
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** The query split into tokens. Empty query yields no tokens. */
export const searchTokens = (query: unknown): string[] => {
  const normalised = normaliseForSearch(query);
  return normalised ? normalised.split(" ") : [];
};

/**
 * Whether a product matches the query.
 *
 * Pass whatever identifies the product — name, item number, barcode, category,
 * packet size. Nullish fields are ignored, so callers need no guards.
 *
 * Tokens match as substrings rather than whole words, so partial typing still
 * narrows: `sam` finds `Samosa` while the word is still being typed. An empty
 * query matches everything, which keeps the "no filter" case natural.
 */
export const matchesProductSearch = (
  query: unknown,
  ...fields: unknown[]
): boolean => {
  const tokens = searchTokens(query);
  if (tokens.length === 0) return true;

  const words = normaliseForSearch(fields.filter(Boolean).join(" ")).split(" ");

  return tokens.every((token) =>
    // A purely numeric token must match a whole word. Without this, searching
    // item number `PRO-349` also returns `PRO-1349` and anything with `349`
    // inside a barcode — the one case where loose matching actively hurts,
    // because an identifier is looked up to find exactly one thing.
    /^\d+$/.test(token)
      ? words.includes(token)
      : words.some((word) => word.includes(token)),
  );
};
