"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { IMessage, ReactionType } from "@/src/types/message";
import { ICall } from "@/src/types/call";
import { groupMessagesForList, messageMatchesSearch, MessageGroupItem } from "@/src/lib/messages";
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
  messages: IMessage[];
  calls?: ICall[];
  currentUserId: string;
  participants?: IConversationParticipant[];
  pinnedMessages?: IMessage[];
  locale?: ChatLocale;
  hasMore: boolean;
  loading: boolean;
  searchQuery?: string;
  jumpToMessageId?: string | null;
  onLoadOlder: () => void;
  onReply: (message: IMessage) => void;
  onEdit: (message: IMessage) => void;
  onDeleteForMe: (messageId: string) => void;
  onRecall: (messageId: string) => void;
  onForward: (messageId: string) => void;
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
  | ({ kind: "call" } & { call: ICall; key: string; createdAt: Date });

export function MessageList({
  messages,
  calls = [],
  currentUserId,
  participants,
  pinnedMessages,
  locale = "vi",
  hasMore,
  loading,
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
      if (item.kind === "mediaGroup") {
        return item.messages.some((m) => messageMatchesSearch(m, searchQuery));
      }
      if (item.kind === "system") {
        return formatSystemMessageText(item.message)
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      }
      return true; // Keep date separators
    });
  }, [messageGroups, searchQuery]);

  // Combine filtered groups with calls in chronological order
  const groups = useMemo(() => {
    const result: ChatItem[] = [...filteredGroups];
    
    // Add calls to the list
    for (const call of calls) {
      result.push({
        kind: "call",
        call,
        key: `call-${call._id}`,
        createdAt: new Date(call.createdAt),
      });
    }

    const itemTime = (item: (typeof result)[number]) => {
      if ("createdAt" in item && item.createdAt) return item.createdAt.getTime();
      if (item.kind === "system") return new Date(item.message.createdAt).getTime();
      if (item.kind === "message") return new Date(item.message.createdAt).getTime();
      if (item.kind === "mediaGroup") {
        return new Date(item.messages[item.messages.length - 1].createdAt).getTime();
      }
      return 0;
    };

    return result.sort((a, b) => itemTime(a) - itemTime(b));
  }, [filteredGroups, calls]);

  // For jumpToMessage - use unfiltered groups
  const allGroups = useMemo(() => {
    return groupMessagesForList(messages, currentUserId, replyMap);
  }, [messages, currentUserId, replyMap]);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const rowVirtualizer = useVirtualizer({
    count: groups.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 8,
  });

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (!groups.length) return;
    rowVirtualizer.scrollToIndex(groups.length - 1, { align: "end", behavior });
  }, [groups.length, rowVirtualizer]);

  const handleJumpToMessage = useCallback(
    (messageId: string) => {
      const index = allGroups.findIndex(
        (item) =>
          (item.kind === "message" && item.message._id === messageId) ||
          (item.kind === "mediaGroup" && item.messages.some((m) => m._id === messageId))
      );
      if (index === -1) return;
      if (searchQuery) {
        setUi({ searchQuery: "" });
      }
      requestAnimationFrame(() => {
        rowVirtualizer.scrollToIndex(index, { align: "center", behavior: "smooth" });
        setHighlightedId(messageId);
        setTimeout(() => setHighlightedId(null), 2000);
      });
    },
    [allGroups, rowVirtualizer, searchQuery, setUi]
  );

  useEffect(() => {
    if (jumpToMessageId) handleJumpToMessage(jumpToMessageId);
  }, [jumpToMessageId, handleJumpToMessage]);

  useEffect(() => {
    if (isAtBottom) scrollToBottom("auto");
  }, [messages.length, isAtBottom, scrollToBottom]);

  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setUi({ isAtBottom: atBottom });
    if (el.scrollTop < 100 && hasMore && !loading) {
      onLoadOlder();
    }
  }, [hasMore, loading, onLoadOlder, setUi]);

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
        onScroll={handleScroll}
        role="log"
        aria-label="Danh sách tin nhắn"
        aria-live="polite"
        tabIndex={0}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = groups[virtualRow.index];
            return (
              <div
                key={item.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  maxWidth: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="max-w-full overflow-x-hidden"
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
                ) : item.kind === "mediaGroup" ? (
                  <div className={`flex max-w-full min-w-0 gap-2 overflow-hidden px-3 py-0.5 ${item.isMine ? "flex-row-reverse" : "flex-row"}`}>
                    {!item.isMine && item.showAvatar && (
                      <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-zalo-light">
                        {participantMap[item.messages[0].senderId]?.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={participantMap[item.messages[0].senderId]?.avatar} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white" aria-hidden>
                            {participantMap[item.messages[0].senderId]?.name?.charAt(0).toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                    )}
                    {!item.isMine && !item.showAvatar && <div className="w-8 shrink-0" aria-hidden />}
                    
                    <div className={`grid gap-1 max-w-[75%] sm:max-w-[65%] ${item.messages.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                      {item.messages.map((m) => (
                        <div key={m._id} className="relative">
                          <MessageItem
                            message={m}
                            isMine={item.isMine}
                            showAvatar={false}
                            hideAvatarSpace={true}
                            fullWidth={true}
                            avatar={participantMap[m.senderId]?.avatar}
                            senderName={participantMap[m.senderId]?.name}
                            locale={locale}
                            isHighlighted={highlightedId === m._id}
                            onJumpToReply={m.replyTo ? () => handleJumpToMessage(m.replyTo!) : undefined}
                            onReply={() => onReply(m)}
                            onEdit={
                              allowEdit && item.isMine ? () => onEdit(m) : undefined
                            }
                            onDeleteForMe={() => onDeleteForMe(m._id)}
                            onRecall={() => onRecall(m._id)}
                            onForward={() => onForward(m._id)}
                            currentUserId={currentUserId}
                            onReact={(type) => onReact(m._id, type)}
                            onRemoveReaction={
                              onRemoveReaction ? () => onRemoveReaction(m._id) : undefined
                            }
                            onRetry={() => onRetry(m)}
                            isPinned={pinnedIdSet.has(m._id)}
                            onPin={onPin && !pinnedIdSet.has(m._id) ? () => onPin(m._id) : undefined}
                            onUnpin={onUnpin && pinnedIdSet.has(m._id) ? () => onUnpin(m._id) : undefined}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : item.kind === "message" ? (
                  <MessageItem
                    message={item.message}
                    isMine={item.isMine}
                    showAvatar={item.showAvatar}
                    avatar={participantMap[item.message.senderId]?.avatar}
                    senderName={participantMap[item.message.senderId]?.name}
                    replyPreview={
                      item.message.replyTo
                        ? replyMap[item.message.replyTo]?.content?.slice(0, 80)
                        : undefined
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
                    onForward={() => onForward(item.message._id)}
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
                    const isMissed = call.status === "MISSED" || call.status === "REJECTED";
                    const isVideo = call.type === "VIDEO";
                    
                    // Format duration
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
                        return call.status === "MISSED" ? "Cuộc gọi không được trả lời" : `Cuộc gọi ${isVideo ? "video" : "thoại"}`;
                      }
                      if (isMissed) {
                        return "Cuộc gọi nhỡ";
                      }
                      return `Cuộc gọi ${isVideo ? "video" : "thoại"}`;
                    })();

                    return (
                      <div className={`flex gap-2 px-3 py-0.5 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                        {!isMine && (
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
                        {isMine && <div className="w-8 shrink-0" aria-hidden />}
                        
                        <div
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 max-w-xs ${
                            isMissed
                              ? "bg-red-100 text-red-700"
                              : isMine
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              {isVideo ? (
                                isMissed ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />
                              ) : isMissed ? (
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
                    );
                  })()
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
