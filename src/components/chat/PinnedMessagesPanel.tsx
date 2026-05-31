"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MoreHorizontal, PinOff } from "lucide-react";
import { IMessage } from "@/src/types/message";
import { IConversationParticipant } from "@/src/types/conversation";
import { AvatarWidget } from "@/src/components/common/AvatarWidget";
import { SubPanelShell } from "@/src/components/chat/SubPanelShell";
import { conversationsApi } from "@/src/services/api/conversations";
import {
  resolveMemberDisplay,
  useGroupMemberProfiles,
} from "@/src/hooks/useGroupMemberProfiles";
import { useToast } from "@/src/components/providers/toast-provider";

function contentPreview(msg: IMessage): string {
  const t = msg.content?.trim();
  if (t) return t;
  switch (msg.type) {
    case "IMAGE":
      return "[Hình ảnh]";
    case "VIDEO":
      return "[Video]";
    case "FILE":
      return "[Tệp đính kèm]";
    case "VOICE":
      return "[Tin nhắn thoại]";
    default:
      return "[Tin nhắn]";
  }
}

function canShowMediaPreview(msg: IMessage): boolean {
  return msg.type === "IMAGE" || msg.type === "VIDEO";
}

function previewImageUrl(msg: IMessage): string {
  if (msg.type === "VIDEO") {
    return (
      msg.metadata?.thumbnailUrl?.trim() ||
      msg.metadata?.thumbnail?.trim() ||
      ""
    );
  }
  return msg.content?.trim() || "";
}

interface PinnedMessagesPanelProps {
  conversationId: string;
  userId: string;
  participants: IConversationParticipant[];
  chatAvatar?: string;
  initialMessages?: IMessage[];
  onBack: () => void;
  onOpenMessage: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
}

export function PinnedMessagesPanel({
  conversationId,
  userId,
  participants,
  chatAvatar,
  initialMessages = [],
  onBack,
  onOpenMessage,
  onUnpin,
}: PinnedMessagesPanelProps) {
  const { showToast } = useToast();
  const memberIds = participants.map((p) => p.userId);
  const { profiles } = useGroupMemberProfiles(memberIds);

  const [items, setItems] = useState<IMessage[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [menuMsg, setMenuMsg] = useState<IMessage | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await conversationsApi.getPinnedMessages(conversationId, userId);
      setItems(list);
    } catch {
      showToast("Không tải được tin ghim", "error");
    } finally {
      setLoading(false);
    }
  }, [conversationId, userId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const senderName = (msg: IMessage) => {
    const p = participants.find((x) => x.userId === msg.senderId);
    if (p) return resolveMemberDisplay(p, profiles).name;
    return profiles[msg.senderId]?.fullName || "Người dùng";
  };

  const senderAvatar = (msg: IMessage) => {
    const p = participants.find((x) => x.userId === msg.senderId);
    if (p) return resolveMemberDisplay(p, profiles).avatar;
    return profiles[msg.senderId]?.avatar ?? chatAvatar;
  };

  const handleUnpin = async (msg: IMessage) => {
    setActionBusy(true);
    setMenuMsg(null);
    try {
      onUnpin(msg._id);
      await load();
      showToast("Đã bỏ ghim tin nhắn");
    } catch {
      showToast("Bỏ ghim thất bại", "error");
    } finally {
      setActionBusy(false);
    }
  };

  return (
    <SubPanelShell title="Tin nhắn đã ghim" onBack={onBack}>
      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--qc-card)]">
        {loading && items.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--qc-primary)]" />
          </div>
        ) : items.length === 0 ? (
          <p className="px-6 py-16 text-center text-sm text-[var(--qc-text-secondary)]">
            Chưa có tin nhắn nào được ghim.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--qc-divider)]">
            {items.map((msg) => {
              const previewUrl = previewImageUrl(msg);
              const showPreview = canShowMediaPreview(msg) && previewUrl.length > 0;
              return (
                <li key={msg._id}>
                  <div className="flex gap-2.5 px-3 py-3">
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => {
                        onOpenMessage(msg._id);
                        onBack();
                      }}
                    >
                      <div className="flex gap-2.5">
                        <AvatarWidget
                          url={senderAvatar(msg)}
                          name={senderName(msg)}
                          size={42}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-[13px] font-semibold text-[var(--qc-text-primary)]">
                              {senderName(msg)}
                            </span>
                            <span className="shrink-0 text-xs text-[var(--qc-text-secondary)]">
                              {new Date(msg.createdAt).toLocaleString("vi-VN", {
                                hour: "2-digit",
                                minute: "2-digit",
                                day: "2-digit",
                                month: "2-digit",
                              })}
                            </span>
                          </div>
                          {showPreview ? (
                            <div className="mt-2 overflow-hidden rounded-xl bg-[var(--qc-bg)]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={previewUrl}
                                alt=""
                                className="h-[140px] w-full object-cover"
                              />
                            </div>
                          ) : (
                            <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-[var(--qc-text-primary)]">
                              {contentPreview(msg)}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="shrink-0 self-start rounded-full p-2 hover:bg-[var(--qc-bg)]"
                      aria-label="Tùy chọn"
                      disabled={actionBusy}
                      onClick={() => setMenuMsg(msg)}
                    >
                      <MoreHorizontal className="h-5 w-5 text-[var(--qc-text-secondary)]" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {menuMsg ? (
        <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/30 p-4 sm:items-center">
          <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl">
            <p className="border-b border-[var(--qc-divider)] px-4 py-3.5 text-base font-bold text-[var(--qc-text-primary)]">
              Tin nhắn của {senderName(menuMsg)}
            </p>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-4 py-3.5 text-left text-[15px] hover:bg-[var(--qc-bg)]"
              disabled={actionBusy}
              onClick={() => void handleUnpin(menuMsg)}
            >
              <PinOff className="h-5 w-5" />
              Xóa khỏi bảng tin nhắn ghim
            </button>
            <button
              type="button"
              className="w-full border-t border-[var(--qc-divider)] px-4 py-3 text-sm text-[var(--qc-text-secondary)] hover:bg-[var(--qc-bg)]"
              onClick={() => setMenuMsg(null)}
            >
              Đóng
            </button>
          </div>
        </div>
      ) : null}
    </SubPanelShell>
  );
}
