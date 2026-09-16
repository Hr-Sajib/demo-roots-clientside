"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, Plus, Minus } from "lucide-react";

interface ProductImageModalProps {
  images: string[];
  productName: string;
  initialIndex?: number;
  onClose: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;

export default function ProductImageModal({
  images,
  productName,
  initialIndex = 0,
  onClose,
}: ProductImageModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  const hasMultipleImages = images.length > 1;

  useEffect(() => setMounted(true), []);

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const goToPrevious = () => {
    resetView();
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    resetView();
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const zoomIn = () => setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  const zoomOut = () =>
    setZoom((z) => {
      const next = Math.max(z - ZOOM_STEP, MIN_ZOOM);
      if (next === MIN_ZOOM) setPan({ x: 0, y: 0 });
      return next;
    });

  const toggleZoom = () => {
    if (zoom > 1) {
      resetView();
    } else {
      setZoom(2);
    }
  };

  // Keyboard navigation: Escape to close, arrows to switch images.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasMultipleImages) goToPrevious();
      if (e.key === "ArrowRight" && hasMultipleImages) goToNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMultipleImages, images.length]);

  // Lock background scroll while the modal is open.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = pan;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({ x: panStart.current.x + dx, y: panStart.current.y + dy });
  };

  const stopDragging = () => {
    isDragging.current = false;
  };

  // Touch equivalents for mobile pan.
  const handleTouchStart = (e: React.TouchEvent) => {
    if (zoom <= 1 || e.touches.length !== 1) return;
    isDragging.current = true;
    dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    panStart.current = pan;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStart.current.x;
    const dy = e.touches[0].clientY - dragStart.current.y;
    setPan({ x: panStart.current.x + dx, y: panStart.current.y + dy });
  };

  if (!mounted) return null;

  return createPortal(
    // `pointer-events-auto` is load-bearing, not decoration. This portals to
    // document.body, and when it is opened from inside a Radix modal Dialog
    // (the add/update order modals) Radix sets `pointer-events: none` on
    // everything outside the dialog's own content. Without this the viewer
    // renders perfectly and ignores every click — including its close button.
    <div
      className="pointer-events-auto fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 md:p-12"
      onClick={onClose}
    >
      {/* Shrink-wrapped to the image's own rendered size — no panel */}
      <div
        className="relative inline-block"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button — small gap above the top-right corner */}
        <button
          onClick={onClose}
          className="absolute -top-[40px] -right-[40px] z-20 p-2 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md transition-colors border border-black"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Zoom controls — small gap above the top-left corner */}
        <div className="absolute -top-[40px] -left-[40px] z-20 flex items-center gap-1.5">
          <button
            onClick={zoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="p-2 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-black"
            aria-label="Zoom out"
          >
            <Minus className="w-5 h-5" />
          </button>
          <button
            onClick={zoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="p-2 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-black"
            aria-label="Zoom in"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Previous / Next arrows — small gap beside the image */}
        {hasMultipleImages && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute -left-[40px] top-1/2 -translate-x-full -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={goToNext}
              className="absolute -right-[40px] top-1/2 translate-x-full -translate-y-1/2 z-20 p-2.5 rounded-full bg-white/90 hover:bg-white text-neutral-800 shadow-md transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        <div
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={stopDragging}
          onMouseLeave={stopDragging}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={stopDragging}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[currentIndex]}
            alt={`${productName} - view ${currentIndex + 1}`}
            onDoubleClick={toggleZoom}
            draggable={false}
            className="block max-w-[85vw] max-h-[80vh] object-contain rounded-lg select-none transition-transform duration-150"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              cursor: zoom > 1 ? "grab" : "zoom-in",
            }}
          />
        </div>

        {/* Dot indicators — small gap below the image */}
        {hasMultipleImages && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 translate-y-full z-20 flex gap-2 p-1.5 bg-white/90 rounded-full shadow-md">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  resetView();
                  setCurrentIndex(idx);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? "bg-neutral-800 w-6"
                    : "bg-neutral-400 hover:bg-neutral-600 w-2"
                }`}
                aria-label={`View image ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
