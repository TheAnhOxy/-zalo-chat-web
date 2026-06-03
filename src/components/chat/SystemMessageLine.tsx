"use client";

import { IMessage } from "@/src/types/message";
import {
  formatSystemMessageText,
  systemMessageShowsPinnedShortcut,
} from "@/src/lib/system-message";

interface SystemMessageLineProps {
  message: IMessage;
  onViewAllPinned?: () => void;
}

export function SystemMessageLine({ message, onViewAllPinned }: SystemMessageLineProps) {
  const text = formatSystemMessageText(message);
  if (!text) return null;

  const showShortcut = systemMessageShowsPinnedShortcut(message);

  return (
    <div className="flex justify-center px-4 py-2" role="status">
      <div className="flex max-w-[90%] flex-wrap items-center justify-center gap-1 text-center text-xs text-[var(--qc-text-secondary)]">
        <span>{text}</span>
        {showShortcut && onViewAllPinned ? (
          <>
            <span aria-hidden>·</span>
            <button
              type="button"
              className="font-medium text-[var(--qc-primary)] hover:underline"
              onClick={onViewAllPinned}
            >
              Xem tất cả
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
