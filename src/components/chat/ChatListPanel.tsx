"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Pin, Plus, Search, Sparkles, X } from "lucide-react";
import { AvatarWidget } from "@/src/components/common/AvatarWidget";
import {
  getConversationAvatarUrl,
  getConversationDisplayName,
  getOtherParticipant,
} from "@/src/lib/conversation-display";
import { dedupeConversations, getPinnedConversationIds, sortConversationsLikeMobile } from "@/src/lib/conversation-list";
import { formatChatTime } from "@/src/lib/date-utils";
import { formatLastMessagePreview } from "@/src/lib/messages";
import { useConversationProfiles } from "@/src/hooks/useConversationProfiles";
import { useFriends } from "@/src/hooks/use-contacts";
import { conversationsApi } from "@/src/services/api/conversations";
import { contactsService } from "@/src/services/contacts/contacts.service";
import { socketService } from "@/src/services/socket/socket.service";
import { IConversation } from "@/src/types/conversation";
import { useToast } from "@/src/components/providers/toast-provider";
import { AiChatSheet } from "@/src/components/ai/AiChatSheet";

export type ConversationListItem = {
  id: string;
  name: string;
  avatar?: string;
  otherId?: string;
  isGroup: boolean;
  lastMessage: string;
  isMissedCall: boolean;
  time: string;
  sortTimestamp: number;
  unreadCount: number;
  online: boolean;
  isPinned: boolean;
};

type ActiveUser = {
  userId: string;
  name: string;
  avatar?: string;
};

type ChatListPanelProps = {
  userId: string;
  userName: string;
  userAvatar?: string;
  conversations: IConversation[];
  isLoading: boolean;
  activeConversationId: string | null;
  onOpenConversation: (conversationId: string) => void;
  onRefresh: () => Promise<void>;
};

function buildListItem(
  conversation: IConversation,
  currentUserId: string,
  profiles: Record<string, { fullName?: string; avatar?: string }>,
  pinnedIds: Set<string>,
  onlineStates: Record<string, boolean>
): ConversationListItem {
  const other = getOtherParticipant(conversation, currentUserId);
  const isGroup = conversation.type === "GROUP";
  const name = getConversationDisplayName(conversation, currentUserId, profiles);

  let lastMessage = `Xin chào, ${name.trim() || "bạn"}`;
  if (conversation.lastMessage) {
    lastMessage = formatLastMessagePreview(conversation.lastMessage.content, {
      type: conversation.lastMessage.type,
      senderId: conversation.lastMessage.senderId,
      currentUserId,
    });
  }

  const timeSource = conversation.lastMessage?.createdAt ?? conversation.updatedAt;
  const sortTimestamp = new Date(timeSource).getTime();
  const otherId = other?.userId;

  return {
    id: conversation._id,
    name,
    avatar: getConversationAvatarUrl(conversation, currentUserId, profiles),
    otherId,
    isGroup,
    lastMessage,
    isMissedCall: lastMessage.toLowerCase().includes("cuộc gọi nhỡ"),
    time: formatChatTime(timeSource),
    sortTimestamp: Number.isNaN(sortTimestamp) ? 0 : sortTimestamp,
    unreadCount: conversation.unreadCount,
    online: !isGroup && Boolean(otherId && onlineStates[otherId]),
    isPinned: pinnedIds.has(conversation._id),
  };
}

export function ChatListPanel({
  userId,
  userName,
  userAvatar,
  conversations,
  isLoading,
  activeConversationId,
  onOpenConversation,
  onRefresh,
}: ChatListPanelProps) {
  const queryClient = useQueryClient();
  const [showAiSheet, setShowAiSheet] = useState(false);
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [pinnedIds, setPinnedIds] = useState<Set<string>>(() => new Set());
  const [onlineStates, setOnlineStates] = useState<Record<string, boolean>>({});
  const [contextMenu, setContextMenu] = useState<ConversationListItem | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const pullStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);

  const friendsQuery = useFriends(userId);
  const profileMap = useConversationProfiles(conversations, userId);

  const dedupedConversations = useMemo(
    () => dedupeConversations(conversations, userId),
    [conversations, userId]
  );

  useEffect(() => {
    setPinnedIds(getPinnedConversationIds(dedupedConversations, userId));
  }, [dedupedConversations, userId]);

  useEffect(() => {
    if (!userId) return;
    for (const conversation of dedupedConversations) {
      socketService.emit("join_conversation", { conversationId: conversation._id });
    }
  }, [dedupedConversations, userId]);

  useEffect(() => {
    const friends = friendsQuery.data ?? [];
    if (!friends.length) return;
    setOnlineStates((prev) => {
      const next = { ...prev };
      for (const friend of friends) {
        if (friend._id) next[friend._id] = Boolean(friend.status?.isOnline);
      }
      return next;
    });
  }, [friendsQuery.data]);

  useEffect(() => {
    const handleStatus = (payload: unknown) => {
      const data = payload as { userId?: string; isOnline?: boolean };
      if (!data?.userId) return;
      setOnlineStates((prev) => ({ ...prev, [data.userId!]: Boolean(data.isOnline) }));
    };

    const handlePinUpdated = () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
    };

    const handleListEvent = () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
    };

    socketService.on("user_status_changed", handleStatus);
    socketService.on("conversation_pin_updated", handlePinUpdated);
    socketService.on("conversation_history_cleared", handleListEvent);
    socketService.on("message_seen", handleListEvent);
    socketService.on("conversation_call_updated", handleListEvent);

    return () => {
      socketService.off("user_status_changed", handleStatus);
      socketService.off("conversation_pin_updated", handlePinUpdated);
      socketService.off("conversation_history_cleared", handleListEvent);
      socketService.off("message_seen", handleListEvent);
      socketService.off("conversation_call_updated", handleListEvent);
    };
  }, [queryClient, userId]);

  const sortedConversations = useMemo(
    () => sortConversationsLikeMobile(dedupedConversations, pinnedIds),
    [dedupedConversations, pinnedIds]
  );

  const listItems = useMemo(
    () =>
      sortedConversations.map((conversation) =>
        buildListItem(conversation, userId, profileMap, pinnedIds, onlineStates)
      ),
    [sortedConversations, userId, profileMap, pinnedIds, onlineStates]
  );

  const filteredItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return listItems;
    return listItems.filter((item) => item.name.toLowerCase().includes(keyword));
  }, [listItems, search]);

  const activeUsers = useMemo(() => {
    const map = new Map<string, ActiveUser>();

    for (const conversation of dedupedConversations) {
      if (conversation.type === "GROUP") continue;
      const other = getOtherParticipant(conversation, userId);
      if (!other?.userId || other.userId === userId) continue;
      map.set(other.userId, {
        userId: other.userId,
        name: getConversationDisplayName(conversation, userId, profileMap),
        avatar: getConversationAvatarUrl(conversation, userId, profileMap),
      });
    }

    for (const friend of friendsQuery.data ?? []) {
      if (!friend._id || friend._id === userId) continue;
      if (!map.has(friend._id)) {
        map.set(friend._id, {
          userId: friend._id,
          name: friend.fullName?.trim() || "Người dùng",
          avatar: friend.avatar,
        });
      }
    }

    return [...map.values()].sort((a, b) => {
      const aOnline = onlineStates[a.userId] ? 1 : 0;
      const bOnline = onlineStates[b.userId] ? 1 : 0;
      if (aOnline !== bOnline) return bOnline - aOnline;
      return a.name.localeCompare(b.name, "vi");
    });
  }, [dedupedConversations, friendsQuery.data, onlineStates, profileMap, userId]);

  const handleOpenConversation = useCallback(
    (conversationId: string) => {
      socketService.emit("seen_conversation", { conversationId, userId });
      onOpenConversation(conversationId);
    },
    [onOpenConversation, userId]
  );

  const handleOpenActiveUser = useCallback(
    async (targetUserId: string) => {
      const existing = dedupedConversations.find(
        (c) => c.type === "PRIVATE" && getOtherParticipant(c, userId)?.userId === targetUserId
      );
      if (existing) {
        handleOpenConversation(existing._id);
        return;
      }
      try {
        const conv = await contactsService.findOrCreateDirectConversation(userId, targetUserId);
        await queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
        handleOpenConversation(conv._id);
      } catch {
        showToast("Không thể mở cuộc trò chuyện", "error");
      }
    },
    [dedupedConversations, handleOpenConversation, queryClient, showToast, userId]
  );

  const handleTogglePin = useCallback(
    async (item: ConversationListItem) => {
      const nextPinned = !item.isPinned;
      setPinnedIds((prev) => {
        const next = new Set(prev);
        if (nextPinned) next.add(item.id);
        else next.delete(item.id);
        return next;
      });
      setContextMenu(null);

      try {
        await conversationsApi.setConversationPinned(item.id, userId, nextPinned);
        showToast(nextPinned ? "Đã ghim hội thoại" : "Đã bỏ ghim hội thoại", "success");
        await queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
      } catch {
        setPinnedIds((prev) => {
          const next = new Set(prev);
          if (item.isPinned) next.add(item.id);
          else next.delete(item.id);
          return next;
        });
        showToast("Không thể ghim hội thoại", "error");
      }
    },
    [queryClient, showToast, userId]
  );

  const handlePullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      setPullDistance(0);
    }
  }, [onRefresh]);

  const onListTouchStart = (event: React.TouchEvent) => {
    if (listRef.current && listRef.current.scrollTop === 0) {
      pullStartY.current = event.touches[0].clientY;
    }
  };

  const onListTouchMove = (event: React.TouchEvent) => {
    if (!listRef.current || listRef.current.scrollTop > 0 || refreshing) return;
    const delta = event.touches[0].clientY - pullStartY.current;
    if (delta > 0) setPullDistance(Math.min(delta * 0.4, 72));
  };

  const onListTouchEnd = () => {
    if (pullDistance >= 48) void handlePullRefresh();
    else setPullDistance(0);
  };

  return (
    <section className="flex h-full min-h-0 flex-col border-r border-[var(--qc-divider)] bg-[var(--qc-bg)]">
      {/* Header — mobile _buildHeader */}
      <div className="flex items-center gap-3 px-4 pb-1 pt-3">
        <AvatarWidget url={userAvatar} name={userName} size={36} />
        <h1 className="flex-1 text-xl font-bold text-[var(--qc-text-primary)]">Tin nhắn</h1>
        <Link
          href="/contacts/add"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--qc-primary)] text-white shadow-sm transition hover:brightness-95"
          aria-label="Thêm"
        >
          <Plus className="h-5 w-5" />
        </Link>
      </div>

      {/* Active users — mobile _buildActiveBar */}
      {activeUsers.length > 0 ? (
        <div className="shrink-0 overflow-x-auto overflow-y-visible px-2 pb-3 pt-1">
          <div className="flex gap-2">
            {activeUsers.map((user) => {
              const isOnline = onlineStates[user.userId] ?? false;
              return (
                <button
                  key={user.userId}
                  type="button"
                  onClick={() => void handleOpenActiveUser(user.userId)}
                  className="flex w-[78px] shrink-0 flex-col items-center gap-1.5 rounded-lg p-1 transition hover:bg-white/60"
                >
                  <AvatarWidget url={user.avatar} name={user.name} size={60} showOnline isOnline={isOnline} />
                  <span className="w-full truncate text-center text-[11px] text-[var(--qc-text-secondary)]">
                    {user.name}
                  </span>
                  <span
                    className={`w-full truncate text-center text-[10px] ${isOnline ? "text-[var(--qc-online)]" : "text-[var(--qc-text-secondary)]/70"}`}
                  >
                    {isOnline ? "Đang hoạt động" : "Ngoại tuyến"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Search — mobile _buildSearch */}
      <div className="px-4 pb-2 pt-0">
        <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 shadow-sm ring-1 ring-[var(--qc-divider)]">
          <Search size={18} className="shrink-0 text-[var(--qc-text-secondary)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm cuộc trò chuyện..."
            className="w-full bg-transparent text-sm text-[var(--qc-text-primary)] outline-none placeholder:text-[var(--qc-text-secondary)]"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="rounded-full p-0.5 text-[var(--qc-text-secondary)] hover:bg-[var(--qc-primary-light)]"
              aria-label="Xóa tìm kiếm"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
      </div>

      {/* List + pull refresh */}
      <div
        ref={listRef}
        className="min-h-0 flex-1 overflow-y-auto"
        onTouchStart={onListTouchStart}
        onTouchMove={onListTouchMove}
        onTouchEnd={onListTouchEnd}
      >
        {(pullDistance > 0 || refreshing) && (
          <div
            className="flex items-center justify-center text-xs text-[var(--qc-primary)] transition-all"
            style={{ height: refreshing ? 40 : pullDistance }}
          >
            {refreshing ? "Đang tải lại..." : pullDistance >= 48 ? "Thả để tải lại" : "Kéo để tải lại"}
          </div>
        )}

        {/* AI card — mobile _buildAiCard */}
        <button
          type="button"
          onClick={() => setShowAiSheet(true)}
          className="mx-4 mb-2 flex w-[calc(100%-32px)] items-center gap-3 rounded-2xl border border-[var(--qc-primary)]/25 bg-gradient-to-br from-[#1a3a1a] to-[#1f4a1f] px-3.5 py-3 text-left transition hover:brightness-110"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--qc-primary-dark)] to-[var(--qc-primary)] text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-white">Trợ lý AI</span>
            <span className="block text-xs text-white/70">Hôm nay tôi có thể giúp gì cho bạn?</span>
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-white/50" />
        </button>

        {isLoading && listItems.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[var(--qc-text-secondary)]">Đang tải hội thoại...</div>
        ) : null}

        {filteredItems.map((item) => {
          const hasUnread = item.unreadCount > 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleOpenConversation(item.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu(item);
              }}
              className={`mx-3 my-0.5 grid w-[calc(100%-24px)] grid-cols-[52px_1fr_auto] gap-3 rounded-[14px] px-3 py-2.5 text-left transition ${
                activeConversationId === item.id
                  ? "bg-white shadow-sm"
                  : hasUnread
                    ? "bg-[var(--qc-primary-light)]"
                    : "bg-transparent hover:bg-white/80"
              }`}
            >
              <AvatarWidget
                url={item.avatar}
                name={item.name}
                size={52}
                showOnline={!item.isGroup}
                isOnline={item.online}
              />
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  <p
                    className={`min-w-0 flex-1 truncate text-[15px] text-[var(--qc-text-primary)] ${
                      hasUnread ? "font-bold" : "font-semibold"
                    }`}
                  >
                    {item.name}
                  </p>
                  {item.isPinned ? <Pin className="h-4 w-4 shrink-0 text-[var(--qc-primary)]" /> : null}
                </div>
                <p
                  className={`truncate text-[13px] ${
                    item.isMissedCall ? "font-medium text-red-600" : "text-[var(--qc-text-secondary)]"
                  }`}
                >
                  {item.lastMessage}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-xs text-[var(--qc-text-secondary)]">{item.time}</span>
                {hasUnread ? (
                  <span className="rounded-full bg-[var(--qc-primary)] px-2 py-0.5 text-[10px] font-bold text-white">
                    {item.unreadCount}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}

        {!isLoading && filteredItems.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[var(--qc-text-secondary)]">
            {search.trim() ? "Không tìm thấy cuộc trò chuyện" : "Chưa có cuộc trò chuyện nào"}
          </div>
        ) : null}
        <div className="h-4" />
      </div>

      {/* Context menu — mobile _showContextMenu (chuột phải / long-press mở bằng contextmenu) */}
      {contextMenu ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 md:items-center">
          <button type="button" className="absolute inset-0" aria-label="Đóng" onClick={() => setContextMenu(null)} />
          <div className="relative w-full max-w-sm rounded-t-2xl bg-white p-2 shadow-xl md:rounded-2xl">
            <div className="mx-auto my-2 h-1 w-9 rounded-full bg-[var(--qc-divider)]" />
            <button
              type="button"
              onClick={() => void handleTogglePin(contextMenu)}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-medium hover:bg-[var(--qc-bg)]"
            >
              <Pin className="h-5 w-5 text-[var(--qc-text-primary)]" />
              {contextMenu.isPinned ? "Bỏ ghim cuộc trò chuyện" : "Ghim cuộc trò chuyện"}
            </button>
          </div>
        </div>
      ) : null}

      <AiChatSheet open={showAiSheet} onClose={() => setShowAiSheet(false)} userId={userId} />
    </section>
  );
}
