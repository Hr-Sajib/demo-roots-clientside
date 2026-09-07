/**
 * Centralized fetch helper for binary downloads (PDF, Excel, images).
 *
 * Why this exists:
 *   - RTK Query is designed for JSON responses that get cached and tagged.
 *     It has no first-class support for response.blob() downloads.
 *   - Before this helper, every download site re-read `Cookies.get("token")`
 *     and hand-rolled the Authorization header. Easy to forget on a new
 *     endpoint, and easy to drift from the baseApi header style.
 *
 * Usage:
 *   const blob = await apiFetch("/order/allOrdersPdf");
 *   triggerDownload(blob, "orders.pdf");
 *
 *   // POST with JSON body:
 *   const blob = await apiFetch("/salesReport/.../pdf", { json: payload });
 *
 * The helper returns a Blob. Callers are responsible for creating an
 * object URL and triggering the download.
 */

import Cookies from "js-cookie";

export interface ApiFetchOptions {
  method?: "GET" | "POST";
  /** When provided, sent as JSON body and Content-Type: application/json. */
  json?: unknown;
  /** Extra headers to merge on top of the defaults. */
  headers?: Record<string, string>;
  /** Request signal for cancellation. */
  signal?: AbortSignal;
}

export class ApiFetchError extends Error {
  constructor(public status: number, public body: string, message: string) {
    super(message);
    this.name = "ApiFetchError";
  }
}

export async function apiFetch(path: string, opts: ApiFetchOptions = {}): Promise<Blob> {
  const { blob } = await apiFetchWithHeaders(path, opts);
  return blob;
}

/**
 * Same as apiFetch but also returns the response headers. Use this when
 * you need to read Content-Disposition for filename hints, ETag, etc.
 */
export async function apiFetchWithHeaders(
  path: string,
  opts: ApiFetchOptions = {},
): Promise<{ blob: Blob; headers: Headers }> {
  const base = process.env.NEXT_PUBLIC_URL ?? "";
  const token = Cookies.get("token");

  const headers: Record<string, string> = {
    ...(token ? { Authorization: token } : {}),
    ...(opts.headers ?? {}),
  };

  const init: RequestInit = {
    method: opts.method ?? "GET",
    headers,
    credentials: "include",
  };

  if (opts.signal) init.signal = opts.signal;
  if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(opts.json);
  }

  const res = await fetch(`${base}${path}`, init);

  if (!res.ok) {
    // Try to surface a meaningful message from a JSON error, fall back to
    // the raw text body (e.g. HTML error page from a reverse proxy).
    let body = "";
    try {
      body = await res.text();
    } catch {
      /* ignore */
    }
    let message = `Request failed: ${res.status}`;
    try {
      const parsed = JSON.parse(body);
      if (parsed?.message) message = parsed.message;
    } catch {
      /* not JSON, use default */
    }
    throw new ApiFetchError(res.status, body, message);
  }

  return { blob: await res.blob(), headers: res.headers };
}

/**
 * Trigger a browser download from a Blob. No-op outside the browser.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after a tick so the browser has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}