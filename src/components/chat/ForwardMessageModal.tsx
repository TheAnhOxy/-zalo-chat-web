"use client";

import { useMemo, useState } from "react";
import { X, Search } from "lucide-react";
import { IConversation } from "@/src/types/conversation";
import { IMessage } from "@/src/types/message";
import { AvatarWidget } from "@/src/components/common/AvatarWidget";
import { getConversationAvatarUrl, getConversationDisplayName } from "@/src/lib/conversation-display";
import { forwardPreviewLabel } from "@/src/lib/forward-message";

interface ForwardMessageModalProps {
  open: boolean;
  onClose: () => void;
  conversations: IConversation[];
  currentUserId: string;
  currentConversationId: string;
  messageIds: string[];
  messages: IMessage[];
  onForward: (targetConversationId: string, msgs: IMessage[]) => void | Promise<void>;
}

export function ForwardMessageModal({
  open,
  onClose,
  conversations,
  currentUserId,
  currentConversationId,
  messageIds,
  messages,
  onForward,
}: ForwardMessageModalProps) {
  const [query, setQuery] = useState("");
  const [sending, setSending] = useState(false);

  const selectedMessages = useMemo(
    () => messageIds.map((id) => messages.find((m) => m._id === id)).filter(Boolean) as IMessage[],
    [messageIds, messages]
  );

  const targets = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations
      .filter((c) => c._id !== currentConversationId)
      .filter((c) => {
        if (!q) return true;
        const name = getConversationDisplayName(c, currentUserId).toLowerCase();
        return name.includes(q);
      });
  }, [conversations, currentConversationId, currentUserId, query]);

  if (!open) return null;

  const handleSelect = async (conversationId: string) => {
    if (!selectedMessages.length || sending) return;
    setSending(true);
    try {
      await onForward(conversationId, selectedMessages);
      onClose();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[70] flex flex-col bg-black/40">
      <div className="mx-auto mt-8 flex max-h-[85%] w-full max-w-md flex-col rounded-t-2xl bg-[var(--qc-card)] shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--qc-divider)] px-4 py-3">
          <h2 className="text-base font-bold text-[var(--qc-text-primary)]">
            Chuyển tiếp {selectedMessages.length > 1 ? `${selectedMessages.length} tin` : "tin nhắn"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-[var(--qc-bg)]" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        {selectedMessages.length > 0 ? (
          <div className="mx-4 mt-3 rounded-xl border border-[var(--qc-divider)] bg-[var(--qc-bg)] px-3 py-2.5">
            <p className="text-xs font-semibold text-[var(--qc-primary)]">Đang chuyển tiếp</p>
            {selectedMessages.slice(0, 3).map((m) => (
              <p key={m._id} className="mt-1 line-clamp-2 text-sm text-[var(--qc-text-secondary)]">
                {forwardPreviewLabel(m)}
              </p>
            ))}
            {selectedMessages.length > 3 ? (
              <p className="mt-1 text-xs text-[var(--qc-text-secondary)]">
                +{selectedMessages.length - 3} tin khác
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="border-b border-[var(--qc-divider)] px-3 py-2">
          <div className="flex items-center gap-2 rounded-lg bg-[var(--qc-bg)] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-[var(--qc-text-secondary)]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm hội thoại"
              className="w-full bg-transparent text-sm outline-none"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {targets.length === 0 ? (
            <p className="p-8 text-center text-sm text-[var(--qc-text-secondary)]">Không có hội thoại phù hợp</p>
          ) : (
            targets.map((c) => {
              const name = getConversationDisplayName(c, currentUserId);
              const avatar = getConversationAvatarUrl(c, currentUserId);
              return (
                <button
                  key={c._id}
                  type="button"
                  disabled={sending}
                  className="flex w-full items-center gap-3 border-b border-[var(--qc-divider)] px-4 py-3 text-left hover:bg-[var(--qc-bg)] disabled:opacity-50"
                  onClick={() => void handleSelect(c._id)}
                >
                  <AvatarWidget url={avatar} name={name} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--qc-text-primary)]">{name}</p>
                    <p className="text-xs text-[var(--qc-text-secondary)]">
                      {c.type === "GROUP" ? `${c.participants.length} thành viên` : "Trò chuyện"}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
