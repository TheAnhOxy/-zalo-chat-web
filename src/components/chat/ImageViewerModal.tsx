"use client";

import { X } from "lucide-react";

interface ImageViewerModalProps {
  open: boolean;
  src: string;
  alt?: string;
  onClose: () => void;
}

export function ImageViewerModal({ open, src, alt = "Ảnh", onClose }: ImageViewerModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
        onClick={onClose}
        aria-label="Đóng"
      >
        <X className="h-6 w-6" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
