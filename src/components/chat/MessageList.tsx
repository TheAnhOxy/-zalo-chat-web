"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { IMessage, ReactionType } from "@/src/types/message";
import { groupMessagesForList, messageMatchesSearch } from "@/src/lib/messages";
import { MessageItem } from "@/src/components/chat/MessageItem";
import { t, ChatLocale } from "@/src/lib/i18n/chat";
import { useChatStore } from "@/src/store/chat-store";
import { IConversationParticipant } from "@/src/types/conversation";
import { PinnedMessagesHeader } from "@/src/components/chat/PinnedMessagesHeader";

interface MessageListProps {
  messages: IMessage[];
  currentUserId: string;
  participants?: IConversationParticipant[];
  pinnedMessages?: IMessage[];
  locale?: ChatLocale;
  hasMore: boolean;
  loading: boolean;
  searchQuery?: string;
  onLoadOlder: () => void;
  onReply: (message: IMessage) => void;
  onEdit: (message: IMessage) => void;
  onDelete: (messageId: string) => void;
  onForward: (messageId: string) => void;
  onReact: (messageId: string, type: ReactionType) => void;
  onRetry: (message: IMessage) => void;
  onUnpin?: (messageId: string) => void;
  onPin?: (messageId: string) => void;
}

export function MessageList({
  messages,
  currentUserId,
  participants,
  pinnedMessages,
  locale = "vi",
  hasMore,
  loading,
  searchQuery = "",
  onLoadOlder,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onReact,
  onRetry,
  onUnpin,
  onPin,
}: MessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const setUi = useChatStore((s) => s.setUi);
  const selectionMode = useChatStore((s) => s.ui.selectionMode);
  const selectedIds = useChatStore((s) => s.ui.selectedIds);
  const toggleSelection = useChatStore((s) => s.toggleSelection);
  const isAtBottom = useChatStore((s) => s.ui.isAtBottom);

  const filtered = useMemo(
    () => (searchQuery ? messages.filter((m) => messageMatchesSearch(m, searchQuery)) : messages),
    [messages, searchQuery]
  );

  const replyMap = useMemo(() => {
    const map: Record<string, IMessage> = {};
    for (const m of messages) map[m._id] = m;
    return map;
  }, [messages]);

  const participantMap = useMemo(() => {
    const map: Record<string, { avatar?: string; name: string }> = {};
    if (participants) {
      for (const p of participants) map[p.userId] = { avatar: p.avatar, name: p.fullName };
    }
    return map;
  }, [participants]);

  const groups = useMemo(
    () => groupMessagesForList(filtered, currentUserId, replyMap),
    [filtered, currentUserId, replyMap]
  );

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

  const handleJumpToMessage = useCallback((messageId: string) => {
    const index = groups.findIndex(
      (g) =>
        (g.kind === "message" && g.message._id === messageId) ||
        (g.kind === "mediaGroup" && g.messages.some((m) => m._id === messageId))
    );
    if (index !== -1) {
      rowVirtualizer.scrollToIndex(index, { align: "center", behavior: "smooth" });
      setHighlightedId(messageId);
      setTimeout(() => setHighlightedId(null), 2000);
    }
  }, [groups, rowVirtualizer]);

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
    <div className="relative flex flex-1 flex-col overflow-hidden bg-transparent">
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
        className="flex-1 overflow-y-auto px-1 py-2"
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
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {item.kind === "date" ? (
                  <div className="my-3 text-center text-xs text-gray-500" role="separator">
                    {item.label}
                  </div>
                ) : item.kind === "mediaGroup" ? (
                  <div className={`flex gap-2 px-3 py-0.5 ${item.isMine ? "flex-row-reverse" : "flex-row"}`}>
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
                            selectionMode={selectionMode}
                            selected={selectedIds.has(m._id)}
                            isHighlighted={highlightedId === m._id}
                            onJumpToReply={m.replyTo ? () => handleJumpToMessage(m.replyTo!) : undefined}
                            onReply={() => onReply(m)}
                            onEdit={item.isMine ? () => onEdit(m) : undefined}
                            onDelete={() => onDelete(m._id)}
                            onForward={() => onForward(m._id)}
                            onReact={(type) => onReact(m._id, type)}
                            onRetry={() => onRetry(m)}
                            onToggleSelect={() => toggleSelection(m._id)}
                            onPin={onPin ? () => onPin(m._id) : undefined}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
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
                    selectionMode={selectionMode}
                    selected={selectedIds.has(item.message._id)}
                    isHighlighted={highlightedId === item.message._id}
                    onJumpToReply={item.message.replyTo ? () => handleJumpToMessage(item.message.replyTo!) : undefined}
                    onReply={() => onReply(item.message)}
                    onEdit={item.isMine ? () => onEdit(item.message) : undefined}
                    onDelete={() => onDelete(item.message._id)}
                    onForward={() => onForward(item.message._id)}
                    onReact={(type) => onReact(item.message._id, type)}
                    onRetry={() => onRetry(item.message)}
                    onToggleSelect={() => toggleSelection(item.message._id)}
                    onPin={onPin ? () => onPin(item.message._id) : undefined}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
