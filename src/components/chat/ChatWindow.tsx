"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/src/components/providers/auth-provider";
import { useConversation } from "@/src/hooks/useConversation";
import { useMessages } from "@/src/hooks/useMessages";
import { useTyping } from "@/src/hooks/useTyping";
import { usePresence } from "@/src/hooks/usePresence";
import { useAttachments } from "@/src/hooks/useAttachments";
import { useCallHistory } from "@/src/hooks/useCallHistory";
import { ChatHeader } from "@/src/components/chat/ChatHeader";
import { MessageList } from "@/src/components/chat/MessageList";
import { Composer } from "@/src/components/chat/Composer";
import { TypingIndicator } from "@/src/components/chat/TypingIndicator";
import { MessageSearchPanel } from "@/src/components/chat/MessageSearchPanel";
import { ForwardMessageModal } from "@/src/components/chat/ForwardMessageModal";
import { buildForwardMetadata } from "@/src/lib/forward-message";
import { useChatStore } from "@/src/store/chat-store";
import { IMessage, ReactionType } from "@/src/types/message";
import { t } from "@/src/lib/i18n/chat";
import { PageLoader } from "@/src/components/ui/page-state";
import { ChatOptionsPanel } from "@/src/components/chat/ChatOptionsPanel";
import { useConversationBackground } from "@/src/hooks/useConversationBackground";
import { conversationsApi } from "@/src/services/api/conversations";
import { conversationGroupApi } from "@/src/services/api/conversation-group";
import { socketService } from "@/src/services/socket/socket.service";
import { GROUP_BG_LABELS, clampGroupBgIndex } from "@/src/lib/group-chat-backgrounds";
import { useToast } from "@/src/components/providers/toast-provider";
import {
  getConversationAvatarUrl,
  getConversationDisplayName,
} from "@/src/lib/conversation-display";
import { profileCacheForUser, usePeerProfile } from "@/src/hooks/usePeerProfile";
import { useGroupMemberProfiles } from "@/src/hooks/useGroupMemberProfiles";
import { ComposerActionsSheet } from "@/src/components/chat/ComposerActionsSheet";
import { AiChatSheet } from "@/src/components/ai/AiChatSheet";
import { isMediaFile, shouldSendAsMediaCluster } from "@/src/lib/media-cluster";

interface ChatWindowProps {
  conversationId: string;
  onConversationLeft?: () => void;
  onConversationUpdated?: () => void;
}

export function ChatWindow({
  conversationId,
  onConversationLeft,
  onConversationUpdated,
}: ChatWindowProps) {
  const { user } = useAuth();
  const userId = user?._id;
  const locale = useChatStore((s) => s.ui.locale);

  const { conversation, isLoading, otherParticipant, isBlocked, refetch } =
    useConversation(conversationId);
  const other = userId ? otherParticipant(userId) : null;
  const { presence } = usePresence(other?.userId);

  const { showToast } = useToast();
  const bg = useConversationBackground(conversationId, conversation ?? null);

  const [optionsFocusWallpaper, setOptionsFocusWallpaper] = useState(false);
  const [optionsFocusPinned, setOptionsFocusPinned] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showComposerActions, setShowComposerActions] = useState(false);
  const [showAiSheet, setShowAiSheet] = useState(false);
  const [jumpToMessageId, setJumpToMessageId] = useState<string | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMessageIds, setForwardMessageIds] = useState<string[]>([]);

  const conversationsQuery = useQuery({
    queryKey: ["conversations", userId],
    queryFn: () => conversationsApi.listForUser(userId!),
    enabled: Boolean(userId && showForwardModal),
  });

  const {
    messages,
    loading,
    hasMore,
    isFetchingNextPage,
    loadOlder,
    reload: loadInitial,
    sendText,
    sendWithAttachment,
    sendMediaCluster,
    editMessage,
    recallMessage,
    deleteMessageForMe,
    markSeen,
    retryFailed,
    socket,
  } = useMessages(conversationId, userId);

  const { calls } = useCallHistory(conversationId, userId);

  const { othersTyping, onComposerInput } = useTyping(conversationId, userId, socket.current);

  const attachments = useAttachments();
  const replyToId = useChatStore((s) => s.ui.replyToId);
  const editingId = useChatStore((s) => s.ui.editingId);
  const setUi = useChatStore((s) => s.setUi);

  const replyTo = useMemo(
    () => (replyToId ? messages.find((m) => m._id === replyToId) : null),
    [messages, replyToId]
  );
  const editingMessage = useMemo(
    () => (editingId ? messages.find((m) => m._id === editingId) : null),
    [messages, editingId]
  );

  const isGroup = conversation?.type === "GROUP";
  const memberIds = useMemo(() => {
    const ids = new Set(conversation?.participants.map((p) => p.userId) ?? []);
    if (isGroup) {
      messages.forEach(m => ids.add(m.senderId));
    }
    return Array.from(ids);
  }, [conversation?.participants, isGroup, messages]);

  const { profiles: memberProfiles } = useGroupMemberProfiles(isGroup ? memberIds : []);
  const otherId = other?.userId;
  const { data: peerUser } = usePeerProfile(otherId, Boolean(conversation && !isGroup));
  const peerProfiles = profileCacheForUser(otherId, peerUser);

  const participantsForList = useMemo(() => {
    if (!conversation?.participants) return undefined;
    
    const baseList = [...conversation.participants];
    const presentIds = new Set(baseList.map(p => p.userId));

    if (!isGroup) {
      return baseList.map((p) => {
        const isPeer = p.userId === otherId;
        const isMe = p.userId === userId;
        const profileName = isPeer
          ? peerProfiles?.[p.userId]?.fullName
          : isMe
            ? user?.fullName
            : undefined;
        const profileAvatar = isPeer
          ? peerProfiles?.[p.userId]?.avatar
          : isMe
            ? user?.avatar
            : undefined;

        return {
          ...p,
          fullName:
            profileName?.trim() ||
            p.fullName?.trim() ||
            `User ${p.userId.slice(-4).toUpperCase()}`,
          avatar: profileAvatar || p.avatar,
        };
      });
    }

    memberIds.forEach(id => {
      if (!presentIds.has(id)) {
        baseList.push({
          userId: id,
          fullName: `User ${id.slice(-4).toUpperCase()}`,
        } as any);
      }
    });

    return baseList.map((p) => ({
      ...p,
      fullName:
        memberProfiles[p.userId]?.fullName?.trim() ||
        p.fullName?.trim() ||
        `User ${p.userId.slice(-4).toUpperCase()}`,
      avatar: memberProfiles[p.userId]?.avatar || p.avatar,
    }));
  }, [conversation?.participants, isGroup, memberProfiles, otherId, peerProfiles, user?.fullName, user?.avatar, userId, memberIds]);

  const title =
    conversation && userId
      ? getConversationDisplayName(conversation, userId, peerProfiles)
      : isGroup
        ? "Nhóm"
        : "Người dùng";
  const headerAvatar =
    conversation && userId ? getConversationAvatarUrl(conversation, userId, peerProfiles) : undefined;

  const handleSend = useCallback(
    async (text: string) => {
      if (editingMessage) {
        await editMessage(editingMessage._id, text);
        return;
      }
      await sendText(text, replyTo?._id);
    },
    [editingMessage, editMessage, sendText, replyTo]
  );

  const handleFiles = useCallback(
    async (files: FileList) => {
      const allFiles = Array.from(files);
      const mediaFiles = allFiles.filter(isMediaFile);
      const otherFiles = allFiles.filter((f) => !isMediaFile(f));
      const sendAsCluster = shouldSendAsMediaCluster(mediaFiles);

      const uploadOne = async (file: File, messageType: Parameters<typeof sendWithAttachment>[1]) => {
        const [uploadItem] = attachments.addFiles([file]);
        if (!uploadItem) return;
        attachments.updateUpload(uploadItem.id, { status: "uploading", progress: 0 });
        const signal = attachments.getAbortSignal(uploadItem.id);
        try {
          await sendWithAttachment(file, messageType, replyTo?._id, signal);
          attachments.updateUpload(uploadItem.id, { status: "done", progress: 100 });
          attachments.removeUpload(uploadItem.id);
        } catch {
          attachments.updateUpload(uploadItem.id, { status: "failed" });
        }
      };

      if (sendAsCluster) {
        const uploadItems = attachments.addFiles(mediaFiles);
        uploadItems.forEach((u) => attachments.updateUpload(u.id, { status: "uploading", progress: 0 }));
        const idByIndex = uploadItems.map((u) => u.id);
        try {
          await sendMediaCluster(mediaFiles, replyTo?._id, {
            onFileProgress: (fileIndex, percent) => {
              const id = idByIndex[fileIndex];
              if (id) attachments.updateUpload(id, { status: "uploading", progress: percent });
            },
            getSignal: (fileIndex) => {
              const id = idByIndex[fileIndex];
              return id ? attachments.getAbortSignal(id) : undefined;
            },
          });
          idByIndex.forEach((id) => {
            attachments.updateUpload(id, { status: "done", progress: 100 });
            attachments.removeUpload(id);
          });
        } catch {
          idByIndex.forEach((id) => attachments.updateUpload(id, { status: "failed" }));
          showToast("Gửi cụm ảnh/video thất bại", "error");
        }
      } else {
        for (const file of mediaFiles) {
          const type = file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
          await uploadOne(file, type);
        }
      }

      for (const file of otherFiles) {
        const type = file.type.startsWith("audio/") ? "VOICE" : "FILE";
        await uploadOne(file, type);
      }
    },
    [attachments, sendWithAttachment, sendMediaCluster, replyTo, showToast]
  );

  const handleVoiceRecorded = useCallback(
    async (file: File) => {
      await sendWithAttachment(file, "VOICE", replyTo?._id);
    },
    [sendWithAttachment, replyTo]
  );

  const handleReact = useCallback(
    (messageId: string, type: ReactionType) => {
      const msg = messages.find((m) => m._id === messageId);
      const mine = msg?.reactions.find((r) => r.userId === userId);
      if (mine?.type === type) {
        socket.current?.removeReaction(messageId, conversationId);
      } else {
        socket.current?.addReaction(messageId, type, conversationId);
      }
    },
    [socket, conversationId, messages, userId]
  );

  const handleRemoveReaction = useCallback(
    (messageId: string) => {
      socket.current?.removeReaction(messageId, conversationId);
    },
    [socket, conversationId]
  );

  const forwardMessages = useCallback(
    async (targetConversationId: string, msgs: IMessage[]) => {
      if (!userId) return;
      for (const msg of msgs) {
        const metadata = buildForwardMetadata(msg);
        socket.current?.sendMessage({
          conversationId: targetConversationId,
          senderId: userId,
          type: msg.type,
          content: msg.content,
          ...(metadata ? { metadata } : {}),
        });
      }
      setForwardMessageIds([]);
      showToast(
        msgs.length > 1 ? `Đã chuyển tiếp ${msgs.length} tin nhắn` : "Đã chuyển tiếp tin nhắn"
      );
    },
    [userId, socket, showToast]
  );

  const openForwardModal = useCallback((messageIds: string[]) => {
    if (!messageIds.length) return;
    setForwardMessageIds(messageIds);
    setShowForwardModal(true);
  }, []);

  const handleForward = useCallback(
    (messageIds: string[]) => {
      openForwardModal(messageIds);
    },
    [openForwardModal]
  );

  const handleJumpToMessage = useCallback((messageId: string) => {
    setJumpToMessageId(messageId);
    setTimeout(() => setJumpToMessageId(null), 100);
  }, []);

  useEffect(() => {
    setUi({ replyToId: null, editingId: null, isAtBottom: true });
  }, [conversationId, setUi]);

  useEffect(() => {
    if (!userId) return;
    const hasUnreadFromPeer = messages.some(
      (m) => m.senderId !== userId && !m.isRecalled && m.status !== "SEEN"
    );
    if (hasUnreadFromPeer) markSeen();
  }, [messages.length, userId, markSeen]);

  const handleRecall = useCallback(
    async (messageId: string) => {
      await recallMessage(messageId);
      showToast("Đã thu hồi tin nhắn");
    },
    [recallMessage, showToast]
  );

  const handleDeleteForMe = useCallback(
    async (messageId: string) => {
      await deleteMessageForMe(messageId);
      showToast("Đã xóa tin nhắn phía bạn");
    },
    [deleteMessageForMe, showToast]
  );

  const handlePin = useCallback(
    (messageId: string) => {
      socket.current?.pinMessage(messageId, conversationId);
      showToast("Đã ghim tin nhắn");
    },
    [conversationId, socket, showToast]
  );

  const handleUnpin = useCallback(
    (messageId: string) => {
      socket.current?.unpinMessage(messageId, conversationId);
      showToast("Đã bỏ ghim tin nhắn");
    },
    [conversationId, socket, showToast]
  );

  const closeSearch = useCallback(() => {
    setShowSearch(false);
    setUi({ searchQuery: "" });
  }, [setUi]);

  useEffect(() => {
    const handler = (payload: unknown) => {
      if (!payload || typeof payload !== "object") return;
      const data = payload as Record<string, unknown>;
      const cid = String(data.conversationId ?? data._id ?? "");
      if (cid === conversationId) {
        void refetch();
        bg.refreshBackground();
      }
    };
    socketService.on("conversation_updated", handler);
    return () => {
      socketService.off("conversation_updated", handler);
    };
  }, [conversationId, refetch, bg]);

  const handleGroupPreset = useCallback(
    async (index: number, applyForAll: boolean) => {
      if (applyForAll) {
        await conversationGroupApi.updateGroupChatBackground(conversationId, {
          type: "PRESET",
          index: clampGroupBgIndex(index),
        });
        bg.clearGroupOverride();
        await refetch();
        showToast("Đã áp dụng hình nền cho tất cả thành viên");
      } else {
        bg.applyLocalGroupPreset(index);
        showToast(`Đã đặt nền: ${GROUP_BG_LABELS[clampGroupBgIndex(index)]}`);
      }
      bg.refreshBackground();
    },
    [conversationId, bg, refetch, showToast]
  );

  const handleGroupCustom = useCallback(
    async (base64: string, applyForAll: boolean) => {
      if (applyForAll) {
        await conversationGroupApi.updateGroupChatBackground(conversationId, {
          type: "CUSTOM",
          index: 0,
          customBase64: base64,
        });
        bg.clearGroupOverride();
        await refetch();
        showToast("Đã áp dụng hình nền cho tất cả thành viên");
      } else {
        bg.applyLocalGroupCustom(base64);
        showToast("Đã đặt nền: Ảnh từ thiết bị");
      }
      bg.refreshBackground();
    },
    [conversationId, bg, refetch, showToast]
  );

  const selectedGroupBgIndex = clampGroupBgIndex(
    conversation?.groupSettings?.chatBackgroundIndex ?? 0
  );

  if (isLoading && !conversation) {
    return <PageLoader />;
  }

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <ChatHeader
        title={title}
        avatarName={title}
        avatarUrl={headerAvatar}
        isGroup={isGroup}
        memberCount={conversation?.participants.length ?? 0}
        participant={other ?? undefined}
        presence={presence}
        locale={locale}
        showWallpaper={!isGroup}
        showCalls={true}
        callHref={`/call/${conversationId}`}
        onSearchToggle={() => setShowSearch((v) => !v)}
        onAppearance={
          !isGroup
            ? () => {
                setOptionsFocusWallpaper(true);
                setOptionsFocusPinned(false);
                setShowOptions(true);
              }
            : undefined
        }
        onInfo={() => {
          setOptionsFocusWallpaper(false);
          setOptionsFocusPinned(false);
          setShowOptions(true);
        }}
      />

      <MessageSearchPanel
        open={showSearch}
        onClose={closeSearch}
        messages={messages}
        locale={locale}
        onJumpToMessage={handleJumpToMessage}
      />

      <div
        className={`flex flex-1 flex-col overflow-hidden ${bg.background.backgroundClass}`}
        style={bg.background.backgroundStyle}
      >
        <MessageList
          conversationId={conversationId}
          messages={messages}
          calls={calls}
          currentUserId={userId!}
          participants={participantsForList}
          pinnedMessages={conversation?.pinnedMessages}
          locale={locale}
          hasMore={hasMore}
          loading={loading}
          isFetchingNextPage={isFetchingNextPage}
          jumpToMessageId={jumpToMessageId}
          onLoadOlder={loadOlder}
          onReply={(m) => setUi({ replyToId: m._id, editingId: null })}
          onEdit={(m) => setUi({ editingId: m._id, replyToId: null })}
          onDeleteForMe={(id) => void handleDeleteForMe(id)}
          onRecall={(id) => void handleRecall(id)}
          onForward={handleForward}
          allowEdit={!isGroup}
          onReact={handleReact}
          onRemoveReaction={handleRemoveReaction}
          onRetry={retryFailed}
          onPin={handlePin}
          onUnpin={handleUnpin}
          onViewAllPinned={() => {
            setOptionsFocusPinned(true);
            setOptionsFocusWallpaper(false);
            setShowOptions(true);
          }}
        />

        <TypingIndicator
          names={othersTyping.map((id) => {
            if (!isGroup) return other?.fullName?.trim() || "Người dùng";
            const p = conversation?.participants.find((x) => x.userId === id);
            return (
              memberProfiles[id]?.fullName?.trim() ||
              p?.fullName?.trim() ||
              "Ai đó"
            );
          })}
          locale={locale}
        />
      </div>

      <Composer
        locale={locale}
        disabled={!userId}
        blocked={userId ? isBlocked(userId) : false}
        replyTo={replyTo}
        editingMessage={editingMessage}
        uploads={attachments.uploads}
        onSend={handleSend}
        onFilesSelected={handleFiles}
        onCancelUpload={attachments.cancelUpload}
        onTyping={onComposerInput}
        onCancelReply={() => setUi({ replyToId: null })}
        onCancelEdit={() => setUi({ editingId: null })}
        onVoiceRecorded={handleVoiceRecorded}
        onOpenActions={() => setShowComposerActions(true)}
      />

      <ComposerActionsSheet
        open={showComposerActions}
        onClose={() => setShowComposerActions(false)}
        onOpenAi={() => setShowAiSheet(true)}
        onFilesSelected={handleFiles}
      />

      {userId ? (
        <AiChatSheet
          open={showAiSheet}
          onClose={() => setShowAiSheet(false)}
          userId={userId}
          targetConversationId={conversationId}
          autoSummarizeOnOpen
        />
      ) : null}

      {conversation && userId && (
        <ChatOptionsPanel
          open={showOptions}
          onClose={() => setShowOptions(false)}
          conversation={conversation}
          currentUserId={userId}
          peerName={other?.fullName?.trim() || title}
          peerId={other?.userId}
          privateTheme={bg.privateTheme}
          onPrivateThemeChange={bg.setPrivateChatTheme}
          selectedGroupBgIndex={selectedGroupBgIndex}
          onSelectGroupPreset={handleGroupPreset}
          onSelectGroupCustom={handleGroupCustom}
          onSearchMessages={() => {
            setShowSearch(true);
            setShowOptions(false);
          }}
          onOpenPinnedMessage={handleJumpToMessage}
          onUnpinMessage={handleUnpin}
          onHistoryDeleted={loadInitial}
          onMemberKicked={loadInitial}
          currentUserDisplayName={user?.fullName?.trim() || "Bạn"}
          onConversationUpdated={() => {
            void refetch();
            onConversationUpdated?.();
          }}
          onLeftGroup={onConversationLeft}
          openWallpaperSection={optionsFocusWallpaper}
          openPinnedSection={optionsFocusPinned}
        />
      )}

      {userId && showForwardModal ? (
        <ForwardMessageModal
          open={showForwardModal}
          onClose={() => {
            setShowForwardModal(false);
            setForwardMessageIds([]);
          }}
          conversations={conversationsQuery.data ?? []}
          currentUserId={userId}
          currentConversationId={conversationId}
          messageIds={forwardMessageIds}
          messages={messages}
          onForward={forwardMessages}
        />
      ) : null}
    </div>
  );
}
