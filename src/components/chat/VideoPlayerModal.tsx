"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface VideoPlayerModalProps {
  open: boolean;
  src: string;
  onClose: () => void;
}

export function VideoPlayerModal({ open, src, onClose }: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!open) return;
    const v = videoRef.current;
    if (!v) return;
    void v.play().catch(() => undefined);
    return () => {
      v.pause();
    };
  }, [open, src]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Xem video"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
        onClick={onClose}
        aria-label="Đóng"
      >
        <X className="h-6 w-6" />
      </button>
      <video
        ref={videoRef}
        src={src}
        controls
        playsInline
        className="max-h-[85vh] max-w-full rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
