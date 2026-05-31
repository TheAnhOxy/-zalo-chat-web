"use client";

import { useEffect, useRef } from "react";
import { ReactionType } from "@/src/types/message";

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
  align?: "left" | "right";
  onClose: () => void;
  onReact: (type: ReactionType) => void;
}

export function MessageReactionPopover({
  open,
  anchorRef,
  align = "left",
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

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={`absolute top-full z-50 mt-1 flex gap-0.5 rounded-full border border-[var(--qc-divider)] bg-white px-1.5 py-1 shadow-lg ${
        align === "right" ? "right-0" : "left-0"
      }`}
      role="toolbar"
      aria-label="Chọn cảm xúc"
    >
      {REACTIONS.map(({ type, emoji }) => (
        <button
          key={type}
          type="button"
          className="rounded-full p-1 text-xl leading-none transition hover:bg-[var(--qc-bg)]"
          onClick={() => {
            onReact(type);
            onClose();
          }}
          aria-label={type}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
