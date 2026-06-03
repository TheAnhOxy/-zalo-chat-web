"use client";

import { AiChatPanel } from "@/src/components/ai/AiChatPanel";

interface AiChatSheetProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  /** Khi mở từ màn chat — tóm tắt/ngữ cảnh hội thoại hiện tại */
  targetConversationId?: string | null;
  autoSummarizeOnOpen?: boolean;
}

/** Bottom sheet Trợ lý AI — giống mobile _ChatListAiChatSheet (~92% chiều cao) */
export function AiChatSheet({
  open,
  onClose,
  userId,
  targetConversationId,
  autoSummarizeOnOpen,
}: AiChatSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="flex h-[min(92dvh,100%)] max-h-[92dvh] min-h-0 flex-col rounded-t-[20px] bg-white shadow-2xl pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Trợ lý AI"
      >
        <div className="flex shrink-0 justify-center pb-1 pt-2.5">
          <div className="h-1 w-9 rounded-full bg-[var(--qc-divider)]" />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden rounded-t-2xl">
          <AiChatPanel
            layout="sheet"
            userId={userId}
            targetConversationId={targetConversationId}
            autoSummarizeOnOpen={autoSummarizeOnOpen}
          />
        </div>
      </div>
    </div>
  );
}
