"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Product name that reveals a small image preview on hover.
 *
 * Replaces the click-to-open full-size modal on the order screens. The point of
 * the change is speed: a sales rep scanning a product list wants to confirm
 * "is this the right item?" without breaking flow, so the preview has to appear
 * at hover time, not after a network round trip.
 *
 * Three things make that possible:
 *
 *  1. It renders small (160px box). Decode and paint cost scale with the
 *     rendered surface, so a 4000px source still paints in roughly the time a
 *     thumbnail would once the bytes are in.
 *  2. Bytes are fetched ahead of the hover, not during it — `preloadProductImage`
 *     is called on `mouseenter` of the *row*, and callers can warm a whole
 *     visible page of products up front via `preloadProductImages`.
 *  3. Results are cached per URL for the life of the page, so any repeat hover
 *     is instant with no network involvement at all.
 *
 * The preview is a portal so the surrounding dialog's overflow can't clip it,
 * and it is `pointer-events: none` so it can never swallow a click meant for
 * the row underneath — the failure mode the old modal had.
 */

type LoadState = "loading" | "ready" | "error";

// Survives component unmounts, so scrolling a list back and forth doesn't
// re-fetch. Keyed by URL; the browser cache does the real work, this just
// avoids re-entering the loading state for something already known good.
const imageCache = new Map<string, LoadState>();

export const preloadProductImage = (url?: string | null): void => {
  if (!url || imageCache.has(url)) return;
  imageCache.set(url, "loading");
  const img = new Image();
  img.decoding = "async";
  // Hint that this is speculative so it can't contend with what's on screen.
  (img as unknown as { fetchPriority?: string }).fetchPriority = "low";
  img.onload = () => imageCache.set(url, "ready");
  img.onerror = () => imageCache.set(url, "error");
  img.src = url;
};

/** Warm the first image of each product in a visible list. */
export const preloadProductImages = (
  urls: (string | null | undefined)[],
  limit = 24,
): void => {
  urls.slice(0, limit).forEach(preloadProductImage);
};

interface ProductNameHoverImageProps {
  name: string;
  images?: string[] | null;
  /** Extra classes for the trigger text, so callers keep their own styling. */
  className?: string;
  children?: React.ReactNode;
}

const PREVIEW_SIZE = 160;
const GAP = 12;

const ProductNameHoverImage: React.FC<ProductNameHoverImageProps> = ({
  name,
  images,
  className = "",
  children,
}) => {
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  const url = images && images.length > 0 ? images[0] : null;

  useEffect(() => setMounted(true), []);

  const show = useCallback(() => {
    if (!url || !triggerRef.current) return;

    const r = triggerRef.current.getBoundingClientRect();

    // Prefer the right of the name; flip left when that would overflow, and
    // clamp vertically so the preview is never half off-screen.
    const spaceRight = window.innerWidth - r.right;
    const left =
      spaceRight > PREVIEW_SIZE + GAP * 2
        ? r.right + GAP
        : Math.max(GAP, r.left - PREVIEW_SIZE - GAP);

    const top = Math.min(
      Math.max(GAP, r.top + r.height / 2 - PREVIEW_SIZE / 2),
      window.innerHeight - PREVIEW_SIZE - GAP,
    );

    setPos({ top, left });
    setState(imageCache.get(url) ?? "loading");
    setOpen(true);

    // Already cached resolves synchronously below; otherwise start now.
    preloadProductImage(url);
  }, [url]);

  const hide = useCallback(() => {
    setOpen(false);
    setPos(null);
  }, []);

  // Hovering off the page (tab switch, scroll away) should not strand a preview.
  useEffect(() => {
    if (!open) return;
    const onScroll = () => hide();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("blur", hide);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("blur", hide);
    };
  }, [open, hide]);

  const label = children ?? name;

  if (!url) {
    return <span className={className}>{label}</span>;
  }

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        tabIndex={0}
        className={`cursor-help underline decoration-dotted underline-offset-2 ${className}`}
        title={`${name} — hover to preview`}
      >
        {label}
      </span>

      {mounted && open && pos
        ? createPortal(
            <div
              // Never intercept pointer events: the row underneath stays fully
              // clickable while the preview is up.
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: PREVIEW_SIZE,
                height: PREVIEW_SIZE,
                pointerEvents: "none",
                zIndex: 9999,
              }}
              className="rounded-lg border border-gray-300 bg-white shadow-xl overflow-hidden"
            >
              {state === "error" ? (
                <div className="w-full h-full flex items-center justify-center text-[11px] text-gray-500 px-2 text-center">
                  Image unavailable
                </div>
              ) : (
                <>
                  {state !== "ready" && (
                    <div className="absolute inset-0 animate-pulse bg-gray-100" />
                  )}
                  <img
                    src={url}
                    alt={name}
                    width={PREVIEW_SIZE}
                    height={PREVIEW_SIZE}
                    decoding="async"
                    onLoad={() => {
                      imageCache.set(url, "ready");
                      setState("ready");
                    }}
                    onError={() => {
                      imageCache.set(url, "error");
                      setState("error");
                    }}
                    className="w-full h-full object-contain"
                  />
                </>
              )}
            </div>,
            document.body,
          )
        : null}
    </>
  );
};

export default ProductNameHoverImage;
