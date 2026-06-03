"use client";

import { useEffect, useRef } from "react";
import { ReactionType } from "@/src/types/message";
import { AnchorPortal } from "@/src/components/chat/AnchorPortal";
import { AnchorPlacement } from "@/src/hooks/useAnchorPosition";

const REACTIONS: { type: ReactionType; emoji: string }[] = [
  { type: "LIKE", emoji: "👍" },
  { type: "LOVE", emoji: "❤️" },
  { type: "HAHA", emoji: "😂" },
  { type: "WOW", emoji: "😮" },
  { type: "SAD", emoji: "😢" },
  { type: "ANGRY", emoji: "😠" },
];

interface MessageReactionPopoverProps {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  placement?: AnchorPlacement;
  activeType?: ReactionType | null;
  onClose: () => void;
  onReact: (type: ReactionType) => void;
}

export function MessageReactionPopover({
  open,
  anchorRef,
  placement = "top-center",
  activeType = null,
  onClose,
  onReact,
}: MessageReactionPopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose, anchorRef]);

  return (
    <AnchorPortal open={open} anchorRef={anchorRef} placement={placement} offset={8}>
      <div
        ref={ref}
        className="flex gap-0.5 whitespace-nowrap rounded-full border border-[var(--qc-divider)] bg-white px-1.5 py-1 shadow-lg"
        role="toolbar"
        aria-label="Chọn cảm xúc"
      >
        {REACTIONS.map(({ type, emoji }) => {
          const selected = activeType === type;
          return (
            <button
              key={type}
              type="button"
              className={`rounded-full p-1 text-xl leading-none transition hover:bg-[var(--qc-bg)] ${
                selected ? "bg-[var(--qc-primary-light)] ring-2 ring-[var(--qc-primary)]/50" : ""
              }`}
              onClick={() => {
                onReact(type);
                onClose();
              }}
              aria-label={selected ? `Thu hồi ${type}` : type}
              title={selected ? "Thu hồi cảm xúc" : undefined}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </AnchorPortal>
  );
}
