"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/components/providers/auth-provider";
import { useConversation } from "@/src/hooks/useConversation";
import { useMessages } from "@/src/hooks/useMessages";
import { useTyping } from "@/src/hooks/useTyping";
import { usePresence } from "@/src/hooks/usePresence";
import { useAttachments } from "@/src/hooks/useAttachments";
import { ChatHeader } from "@/src/components/chat/ChatHeader";
import { MessageList } from "@/src/components/chat/MessageList";
import { Composer } from "@/src/components/chat/Composer";
import { TypingIndicator } from "@/src/components/chat/TypingIndicator";
import { useChatStore } from "@/src/store/chat-store";
import { IMessage, ReactionType } from "@/src/types/message";
import { t } from "@/src/lib/i18n/chat";
import { PageLoader } from "@/src/components/ui/page-state";
import { ChatOptionsPanel } from "@/src/components/chat/ChatOptionsPanel";
import { useChatTheme, ChatTheme } from "@/src/hooks/useChatTheme";

interface ChatWindowProps {
  conversationId: string;
}

export function ChatWindow({ conversationId }: ChatWindowProps) {
  const { user } = useAuth();
  const userId = user?._id;
  const locale = useChatStore((s) => s.ui.locale);

  const { conversation, isLoading, otherParticipant, isBlocked } = useConversation(conversationId);
  const other = userId ? otherParticipant(userId) : null;
  const { presence } = usePresence(other?.userId);

  const { theme, setTheme, themeClass } = useChatTheme(conversationId);

  const handleThemeToggle = useCallback(() => {
    const themes: ChatTheme[] = ["default", "sky", "mint", "sunset"];
    const currentIndex = themes.indexOf(theme);
    setTheme(themes[(currentIndex + 1) % themes.length]);
  }, [theme, setTheme]);

  const {
    messages,
    loading,
    hasMore,
    loadOlder,
    loadInitial,
    sendText,
    sendWithAttachment,
    editMessage,
    deleteMessage,
    markSeen,
    retryFailed,
    socket,
  } = useMessages(conversationId, userId);

  const { othersTyping, onComposerInput } = useTyping(conversationId, userId, socket.current);

  const attachments = useAttachments();
  const replyToId = useChatStore((s) => s.ui.replyToId);
  const editingId = useChatStore((s) => s.ui.editingId);
  const searchQuery = useChatStore((s) => s.ui.searchQuery);
  const setUi = useChatStore((s) => s.setUi);
  const clearSelection = useChatStore((s) => s.clearSelection);
  const selectionMode = useChatStore((s) => s.ui.selectionMode);
  const selectedIds = useChatStore((s) => s.ui.selectedIds);

  const [showOptions, setShowOptions] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const replyTo = useMemo(
    () => (replyToId ? messages.find((m) => m._id === replyToId) : null),
    [messages, replyToId]
  );
  const editingMessage = useMemo(
    () => (editingId ? messages.find((m) => m._id === editingId) : null),
    [messages, editingId]
  );

  const isGroup = conversation?.type === "GROUP";
  const title = isGroup 
    ? (conversation?.name || t("chatTitle", locale))
    : (other?.fullName || t("chatTitle", locale));

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
      const items = attachments.addFiles(files);
      for (const item of items) {
        attachments.updateUpload(item.id, { status: "uploading", progress: 0 });
        const signal = attachments.getAbortSignal(item.id);
        try {
          await sendWithAttachment(item.file, item.messageType, replyTo?._id, signal);
          attachments.updateUpload(item.id, { status: "done", progress: 100 });
          attachments.removeUpload(item.id);
        } catch {
          attachments.updateUpload(item.id, { status: "failed" });
        }
      }
    },
    [attachments, sendWithAttachment, replyTo]
  );

  const handleVoiceRecorded = useCallback(
    async (file: File) => {
      // Just upload the voice file directly
      await sendWithAttachment(file, "VOICE", replyTo?._id);
    },
    [sendWithAttachment, replyTo]
  );

  const handleReact = useCallback(
    (messageId: string, type: ReactionType) => {
      socket.current?.addReaction(messageId, type, conversationId);
    },
    [socket, conversationId]
  );

  const handleBulkDelete = useCallback(async () => {
    for (const id of selectedIds) {
      await deleteMessage(id);
    }
    clearSelection();
  }, [selectedIds, deleteMessage, clearSelection]);

  const handleBulkForward = useCallback(() => {
    const targetId = prompt("Nhập ID hội thoại đích:");
    if (!targetId || !userId) return;
    for (const messageId of selectedIds) {
      const msg = messages.find((m) => m._id === messageId);
      if (!msg) continue;
      socket.current?.sendMessage({
        conversationId: targetId,
        senderId: userId,
        type: msg.type,
        content: msg.content,
        metadata: msg.metadata,
      });
    }
    clearSelection();
  }, [selectedIds, messages, userId, clearSelection, socket]);

  useEffect(() => {
    if (!userId) return;
    const hasUnreadFromPeer = messages.some(
      (m) => m.senderId !== userId && !m.isRecalled && m.status !== "SEEN"
    );
    if (hasUnreadFromPeer) markSeen();
  }, [messages.length, userId, markSeen]);

  const handlePin = useCallback((messageId: string) => {
    socket.current?.pinMessage(messageId, conversationId);
  }, [conversationId, socket]);

  const handleUnpin = useCallback((messageId: string) => {
    socket.current?.unpinMessage(messageId, conversationId);
  }, [conversationId, socket]);

  if (isLoading && !conversation) {
    return <PageLoader />;
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <ChatHeader
        title={title}
        participant={other ?? undefined}
        presence={presence}
        locale={locale}
        onSearchToggle={() => setShowSearch((v) => !v)}
        onThemeToggle={handleThemeToggle}
        onOptionsOpen={() => setShowOptions(true)}
        callHref={other ? `/call/${conversationId}` : undefined}
      />

      {showSearch && (
        <div className="border-b px-3 py-2">
          <input
            type="search"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setUi({ searchQuery: e.target.value });
            }}
            placeholder={t("searchInChat", locale)}
            className="w-full rounded-lg border px-3 py-1.5 text-sm"
            aria-label={t("searchInChat", locale)}
          />
        </div>
      )}

      <div className={`flex-1 overflow-hidden flex flex-col ${themeClass}`}>
        <MessageList
          messages={messages}
          currentUserId={userId!}
          participants={conversation?.participants}
          pinnedMessages={conversation?.pinnedMessages}
          locale={locale}
          hasMore={hasMore}
          loading={loading}
          searchQuery={searchQuery}
          onLoadOlder={loadOlder}
          onReply={(m) => setUi({ replyToId: m._id, editingId: null })}
          onEdit={(m) => setUi({ editingId: m._id, replyToId: null })}
          onDelete={deleteMessage}
          onForward={() => setUi({ selectionMode: true })}
          onReact={handleReact}
          onRetry={retryFailed}
          onPin={handlePin}
          onUnpin={handleUnpin}
        />

        <TypingIndicator
          names={othersTyping.map(() => other?.fullName ?? "User")}
          locale={locale}
        />
      </div>

      {selectionMode && (
        <div className="flex gap-2 border-t bg-white px-3 py-2">
          <button type="button" className="text-sm text-red-600" onClick={handleBulkDelete}>
            {t("delete", locale)}
          </button>
          <button type="button" className="text-sm text-zalo-blue" onClick={handleBulkForward}>
            {t("forward", locale)}
          </button>
          <button type="button" className="text-sm" onClick={clearSelection}>
            {t("cancel", locale)}
          </button>
        </div>
      )}

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
      />

      {conversation && userId && (
        <ChatOptionsPanel
          open={showOptions}
          onClose={() => setShowOptions(false)}
          conversation={conversation}
          currentUserId={userId}
          peerName={other?.fullName || title}
          peerId={other?.userId}
          theme={theme}
          onThemeChange={setTheme}
          onSearchMessages={() => setShowSearch(true)}
          onHistoryDeleted={loadInitial}
        />
      )}
    </div>
  );
}
