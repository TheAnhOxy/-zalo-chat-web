"use client";

import { MoreVertical, Reply, Smile } from "lucide-react";

interface MessageHoverToolbarProps {
  visible: boolean;
  /** true = ⋮ ở ngoài cùng bên phải (tin người khác); false = ⋮ ở ngoài cùng bên trái (tin của mình) */
  dotsOnEnd?: boolean;
  moreActive?: boolean;
  onMore: () => void;
  onReply: () => void;
  onReaction: () => void;
}

const iconBtn =
  "flex h-8 w-8 items-center justify-center rounded-full border border-[var(--qc-divider)]/80 bg-white text-[var(--qc-text-primary)] shadow-sm transition hover:bg-[var(--qc-bg)]";

export function MessageHoverToolbar({
  visible,
  dotsOnEnd = false,
  moreActive,
  onMore,
  onReply,
  onReaction,
}: MessageHoverToolbarProps) {
  return (
    <div
      className={`flex shrink-0 items-center gap-1 transition-opacity duration-150 ${
        dotsOnEnd ? "flex-row-reverse" : "flex-row"
      } ${visible || moreActive ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <button
        type="button"
        className={`${iconBtn} ${moreActive ? "bg-[var(--qc-bg)] ring-1 ring-[var(--qc-divider)]" : ""}`}
        aria-label="Thêm tùy chọn"
        aria-expanded={moreActive}
        onClick={(e) => {
          e.stopPropagation();
          onMore();
        }}
      >
        <MoreVertical className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>
      <button
        type="button"
        className={iconBtn}
        aria-label="Trả lời"
        onClick={(e) => {
          e.stopPropagation();
          onReply();
        }}
      >
        <Reply className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>
      <button
        type="button"
        className={iconBtn}
        aria-label="Cảm xúc"
        onClick={(e) => {
          e.stopPropagation();
          onReaction();
        }}
      >
        <Smile className="h-[18px] w-[18px]" strokeWidth={2} />
      </button>
    </div>
  );
}
