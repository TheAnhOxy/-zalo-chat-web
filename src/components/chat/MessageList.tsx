"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IMessage, ReactionType } from "@/src/types/message";
import { ICall } from "@/src/types/call";
import {
  estimateMessageListRowHeight,
  groupMessagesForList,
  messageMatchesSearch,
  MessageGroupItem,
} from "@/src/lib/messages";
import { MessageItem } from "@/src/components/chat/MessageItem";
import { t, ChatLocale } from "@/src/lib/i18n/chat";
import { useChatStore } from "@/src/store/chat-store";
import { IConversationParticipant } from "@/src/types/conversation";
import { PinnedMessagesHeader } from "@/src/components/chat/PinnedMessagesHeader";
import { SystemMessageLine } from "@/src/components/chat/SystemMessageLine";
import { formatSystemMessageText } from "@/src/lib/system-message";
import { formatChatTime } from "@/src/lib/date-utils";
import { Phone, PhoneMissed, Video, VideoOff } from "lucide-react";

interface MessageListProps {
  conversationId: string;
  messages: IMessage[];
  calls?: ICall[];
  currentUserId: string;
  participants?: IConversationParticipant[];
  pinnedMessages?: IMessage[];
  locale?: ChatLocale;
  hasMore: boolean;
  loading: boolean;
  isFetchingNextPage?: boolean;
  searchQuery?: string;
  jumpToMessageId?: string | null;
  onLoadOlder: () => void;
  onReply: (message: IMessage) => void;
  onEdit: (message: IMessage) => void;
  onDeleteForMe: (messageId: string) => void;
  onRecall: (messageId: string) => void;
  onForward: (messageIds: string[]) => void;
  /** Chỉ chat 1-1 có Sửa trong menu (mobile) */
  allowEdit?: boolean;
  onReact: (messageId: string, type: ReactionType) => void;
  onRemoveReaction?: (messageId: string) => void;
  onRetry: (message: IMessage) => void;
  onUnpin?: (messageId: string) => void;
  onPin?: (messageId: string) => void;
  onViewAllPinned?: () => void;
}

type ChatItem = 
  | MessageGroupItem
  | ({ kind: "call" } & { call: ICall; key: string; createdAt: Date; showAvatar: boolean; isMine: boolean });

export function MessageList({
  conversationId,
  messages,
  calls = [],
  currentUserId,
  participants,
  pinnedMessages,
  locale = "vi",
  hasMore,
  loading,
  isFetchingNextPage = false,
  searchQuery = "",
  jumpToMessageId = null,
  onLoadOlder,
  onReply,
  onEdit,
  onDeleteForMe,
  onRecall,
  onForward,
  allowEdit = true,
  onReact,
  onRemoveReaction,
  onRetry,
  onUnpin,
  onPin,
  onViewAllPinned,
}: MessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const setUi = useChatStore((s) => s.setUi);
  const isAtBottom = useChatStore((s) => s.ui.isAtBottom);

  const replyMap = useMemo(() => {
    const map: Record<string, IMessage> = {};
    for (const m of messages) map[m._id] = m;
    return map;
  }, [messages]);

  const participantMap = useMemo(() => {
    const map: Record<string, { avatar?: string; name: string }> = {};
    
    // Build from participants prop
    if (participants) {
      for (const p of participants) {
        map[p.userId] = { 
          avatar: p.avatar, 
          name: p.fullName?.trim() || `User ${p.userId.slice(-4).toUpperCase()}` 
        };
      }
    }
    
    // Ensure all message senders are in map with fallback names
    for (const msg of messages) {
      const senderId = msg.senderId;
      if (!map[senderId]) {
        map[senderId] = {
          avatar: undefined,
          name: `User ${senderId.slice(-4).toUpperCase()}`,
        };
      }
    }
    
    return map;
  }, [participants, messages]);

  const pinnedIdSet = useMemo(
    () => new Set((pinnedMessages ?? []).map((m) => m._id)),
    [pinnedMessages]
  );

  // Group messages using existing function
  const messageGroups = useMemo(() => {
    return groupMessagesForList(messages, currentUserId, replyMap);
  }, [messages, currentUserId, replyMap]);

  // Filter based on search
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return messageGroups;
    return messageGroups.filter((item) => {
      if (item.kind === "message") {
        return messageMatchesSearch(item.message, searchQuery);
      }
      if (item.kind === "system") {
        return formatSystemMessageText(item.message)
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      }
      return true; // Keep date separators
    });
  }, [messageGroups, searchQuery]);

  // Combine filtered groups with calls in chronological order,
  // then compute showAvatar grouping across all item types (including calls)
  const groups = useMemo(() => {
    const result: ChatItem[] = [...filteredGroups];
    
    // Add calls to the list (showAvatar will be computed in second pass below)
    for (const call of calls) {
      result.push({
        kind: "call",
        call,
        key: `call-${call._id}`,
        createdAt: new Date(call.createdAt),
        showAvatar: true,  // placeholder — overwritten in second pass
        isMine: call.callerId === currentUserId,
      });
    }

    const itemTime = (item: (typeof result)[number]): number => {
      if (item.kind === "call") return item.createdAt.getTime();
      if (item.kind === "system") return new Date(item.message.createdAt).getTime();
      if (item.kind === "message") return new Date(item.message.createdAt).getTime();
      if (item.kind === "date") return 0;
      return 0;
    };

    result.sort((a, b) => itemTime(a) - itemTime(b));

    /** Ngưỡng 30 phút để gộp nhóm (dùng cho call bubbles) */
    const GROUP_MS = 30 * 60 * 1000;

    // Second pass: tính showAvatar cho call items dựa vào item liền trước
    let lastSenderId = "";
    let lastTime = 0;
    for (const item of result) {
      if (item.kind === "date") {
        // Ngày mới → reset group
        lastSenderId = "";
        lastTime = 0;
        continue;
      }
      if (item.kind === "system") {
        // System message ngắt group
        lastSenderId = "";
        lastTime = 0;
        continue;
      }

      const t = itemTime(item);
      const senderId =
        item.kind === "call"
          ? item.call.callerId
          : item.kind === "message"
            ? item.message.senderId
            : "";

      if (item.kind === "call") {
        const isMine = item.call.callerId === currentUserId;
        const sameGroup = senderId === lastSenderId && t - lastTime <= GROUP_MS;
        // Ghi đè showAvatar đã placeholder
        (item as { showAvatar: boolean }).showAvatar = !isMine && !sameGroup;
      }

      if (senderId) {
        lastSenderId = senderId;
        lastTime = t;
      }
    }

    return result;
  }, [filteredGroups, calls, currentUserId]);

  // For jumpToMessage - use unfiltered groups
  const allGroups = useMemo(() => {
    return groupMessagesForList(messages, currentUserId, replyMap);
  }, [messages, currentUserId, replyMap]);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const reversedGroups = useMemo(() => {
    return [...groups].reverse();
  }, [groups]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (!parentRef.current) return;
    // With column-reverse, scrollTop = 0 is the bottom!
    parentRef.current.scrollTo({ top: 0, behavior });
  }, []);

  const remeasureRows = useCallback(() => {
    // Không còn virtualizer, chỉ cần cuộn đáy nếu đang ở đáy
    if (useChatStore.getState().ui.isAtBottom) {
      scrollToBottom("auto");
    }
  }, [scrollToBottom]);

  const handleJumpToMessage = useCallback(
    (messageId: string) => {
      // Tìm element trong DOM và cuộn tới đó
      const el = parentRef.current?.querySelector(`[data-message-id="${messageId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedId(messageId);
        setTimeout(() => setHighlightedId(null), 2000);
      }
    },
    []
  );

  useEffect(() => {
    if (jumpToMessageId) handleJumpToMessage(jumpToMessageId);
  }, [jumpToMessageId, handleJumpToMessage]);

  useEffect(() => {
    setUi({ isAtBottom: true });
  }, [conversationId, setUi]);

  useEffect(() => {
    if (isAtBottom) scrollToBottom("auto");
  }, [messages.length, isAtBottom, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    // Trong column-reverse, scrollTop = 0 là ở đáy (mới nhất).
    // Scroll lên để xem tin cũ (tức scrollTop tăng lên).
    // Ở một số trình duyệt scrollTop có thể âm, dùng Math.abs cho an toàn.
    const top = Math.abs(el.scrollTop);
    const atBottom = top < 80;
    setUi({ isAtBottom: atBottom });
    
    // Khi cuộn gần tới "đỉnh" nội dung (nghĩa là xem tin cũ)
    const atTop = el.scrollHeight - top - el.clientHeight < 150;
    if (atTop && hasMore && !isFetchingNextPage) {
      onLoadOlder();
    }
  }, [hasMore, isFetchingNextPage, onLoadOlder, setUi]);

  if (!groups.length && !loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-gray-400" role="status">
        {t("noMessages", locale)}
      </div>
    );
  }

  return (
    <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-transparent">
      {pinnedMessages && pinnedMessages.length > 0 && (
        <PinnedMessagesHeader
          messages={pinnedMessages}
          locale={locale}
          onJumpToMessage={handleJumpToMessage}
          onUnpin={onUnpin}
        />
      )}

      {hasMore && (
        <button
          type="button"
          className="absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-xs shadow"
          onClick={onLoadOlder}
          disabled={loading}
          aria-label={t("loadOlder", locale)}
        >
          {loading ? "..." : t("loadOlder", locale)}
        </button>
      )}

      <div
        ref={parentRef}
        className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-1 py-2"
        style={{ display: "flex", flexDirection: "column-reverse" }}
        onScroll={handleScroll}
        role="log"
        aria-label="Danh sách tin nhắn"
        aria-live="polite"
        tabIndex={0}
      >
        {reversedGroups.map((item, index) => {
          const prevItem = index < reversedGroups.length - 1 ? reversedGroups[index + 1] : null;
          const isStackedMedia =
            item.kind === "message" &&
            prevItem?.kind === "message" &&
            prevItem.message.senderId === item.message.senderId &&
            (prevItem.message.type === "IMAGE" || prevItem.message.type === "VIDEO") &&
            (item.message.type === "IMAGE" || item.message.type === "VIDEO");

          return (
            <div
              key={item.key}
              data-message-id={item.kind === "message" ? item.message._id : undefined}
              className="max-w-full overflow-x-hidden pb-1 shrink-0"
            >
              {item.kind === "date" ? (
                <div className="my-3 text-center text-xs text-gray-500" role="separator">
                  {item.label}
                </div>
              ) : item.kind === "system" ? (
                <SystemMessageLine
                  message={item.message}
                  onViewAllPinned={onViewAllPinned}
                />
              ) : item.kind === "message" ? (
                <MessageItem
                  onMediaLoad={remeasureRows}
                  stackedMedia={isStackedMedia}
                  message={item.message}
                  isMine={item.isMine}
                  showAvatar={item.showAvatar}
                  avatar={participantMap[item.message.senderId]?.avatar}
                  senderName={participantMap[item.message.senderId]?.name}
                  replyMessage={
                    item.message.replyTo ? replyMap[item.message.replyTo] ?? null : null
                  }
                  locale={locale}
                  isHighlighted={highlightedId === item.message._id}
                  onJumpToReply={item.message.replyTo ? () => handleJumpToMessage(item.message.replyTo!) : undefined}
                  onReply={() => onReply(item.message)}
                  onEdit={
                    allowEdit && item.isMine ? () => onEdit(item.message) : undefined
                  }
                  onDeleteForMe={() => onDeleteForMe(item.message._id)}
                  onRecall={() => onRecall(item.message._id)}
                  onForward={() => onForward([item.message._id])}
                  currentUserId={currentUserId}
                  onReact={(type) => onReact(item.message._id, type)}
                  onRemoveReaction={
                    onRemoveReaction
                      ? () => onRemoveReaction(item.message._id)
                      : undefined
                  }
                  onRetry={() => onRetry(item.message)}
                  isPinned={pinnedIdSet.has(item.message._id)}
                  onPin={
                    onPin && !pinnedIdSet.has(item.message._id)
                      ? () => onPin(item.message._id)
                      : undefined
                  }
                  onUnpin={
                    onUnpin && pinnedIdSet.has(item.message._id)
                      ? () => onUnpin(item.message._id)
                      : undefined
                  }
                />
              ) : (
                (() => {
                  const call = item.call;
                  const isMine = call.callerId === currentUserId;
                  const isMissedForReceiver = !isMine && (call.status === "MISSED" || call.status === "REJECTED");
                  const isVideo = call.type === "VIDEO";
                  
                  const durationLabel =
                    call.duration > 0
                      ? (() => {
                          const minutes = Math.floor(call.duration / 60);
                          const seconds = call.duration % 60;
                          if (minutes > 0) {
                            return `${minutes} phút ${seconds} giây`;
                          }
                          return `${seconds} giây`;
                        })()
                      : "";

                  const statusLabel = (() => {
                    if (isMine) {
                      return call.status === "MISSED" || call.status === "REJECTED"
                        ? `Cuộc gọi ${isVideo ? "video" : "thoại"} không được trả lời`
                        : `Cuộc gọi ${isVideo ? "video" : "thoại"}`;
                    }
                    if (call.status === "MISSED" || call.status === "REJECTED") {
                      return "Cuộc gọi nhỡ";
                    }
                    return `Cuộc gọi ${isVideo ? "video" : "thoại"}`;
                  })();

                  return (
                    <div className={`flex gap-2 px-3 py-0.5 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                      {!isMine && item.showAvatar && (
                        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gray-300">
                          {participantMap[call.callerId]?.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={participantMap[call.callerId]?.avatar} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white">
                              {participantMap[call.callerId]?.name?.charAt(0).toUpperCase() || "?"}
                            </div>
                          )}
                        </div>
                      )}
                      {(!isMine && !item.showAvatar) && <div className="w-8 shrink-0" aria-hidden />}
                      {isMine && <div className="w-8 shrink-0" aria-hidden />}
                      
                      <div className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                        {!isMine && item.showAvatar && participantMap[call.callerId]?.name && (
                          <p className="mb-1 max-w-full truncate pl-1 text-[11px] text-[var(--qc-text-secondary)]">
                            {participantMap[call.callerId].name}
                          </p>
                        )}
                        <div
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 max-w-xs ${
                            isMissedForReceiver
                              ? "bg-red-100 text-red-700"
                              : isMine
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              {isVideo ? (
                                isMissedForReceiver ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />
                              ) : isMissedForReceiver ? (
                                <PhoneMissed className="h-4 w-4" />
                              ) : (
                                <Phone className="h-4 w-4" />
                              )}
                              <span className="text-sm font-medium">{statusLabel}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span>{durationLabel || "Không có nội dung"}</span>
                              <span className="shrink-0 opacity-70">
                                {formatChatTime(call.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
