"use client";

import { AiChatPanel } from "@/src/components/ai/AiChatPanel";

interface AiChatSheetProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

/** Bottom sheet Trợ lý AI — giống mobile _ChatListAiChatSheet (~92% chiều cao) */
export function AiChatSheet({ open, onClose, userId }: AiChatSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex max-h-[92vh] min-h-0 flex-col rounded-t-[20px] bg-white shadow-2xl"
        style={{ height: "92vh" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Trợ lý AI"
      >
        <div className="flex shrink-0 justify-center pt-2.5 pb-1">
          <div className="h-1 w-9 rounded-full bg-[var(--qc-divider)]" />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden rounded-t-2xl">
          <AiChatPanel userId={userId} />
        </div>
      </div>
    </div>
  );
}
