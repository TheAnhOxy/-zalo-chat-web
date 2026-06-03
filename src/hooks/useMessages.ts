"use client";

import { useCallback, useEffect, useRef } from "react";
import { conversationsApi } from "@/src/services/api/conversations";
import { ChatSocket } from "@/src/services/socket/chat-socket";
import { useChatStore, selectOrderedMessages } from "@/src/store/chat-store";
import { IMessage, MessageType } from "@/src/types/message";
import {
  dequeueOfflineMessage,
  enqueueOfflineMessage,
  getCachedMessages,
  getOfflineQueue,
  setCachedMessages,
  QueuedOutgoingMessage,
} from "@/src/lib/message-cache";
import { uploadFile, uploadFileViaPresigned, retryWithBackoff } from "@/src/services/api/uploads";
import {
  IMediaClusterItem,
  mediaClusterItemTypeFromFile,
  mediaClusterMetadata,
  serializeMediaClusterItems,
} from "@/src/lib/media-cluster";
import { useQueryClient } from "@tanstack/react-query";

const PAGE_LIMIT = 50;

function tempId() {
  return `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function buildCallMetaMessage(params: {
  conversationId: string;
  fallbackSenderId: string;
  callData?: Record<string, unknown>;
  lastMessage?: { content?: string; senderId?: string; createdAt?: string };
}): IMessage {
  const { conversationId, fallbackSenderId, callData, lastMessage } = params;
  const rawCallId = String(callData?._id ?? callData?.id ?? "");
  const createdAt = lastMessage?.createdAt || new Date().toISOString();
  const _id = rawCallId ? `call_${rawCallId}` : `call_${createdAt}`;
  return {
    _id,
    callId: rawCallId || _id,
    conversationId,
    senderId: lastMessage?.senderId || fallbackSenderId,
    type: "TEXT",
    content: lastMessage?.content || "📞 Cuộc gọi kết thúc",
    status: "SENT",
    isRecalled: false,
    deletedBy: [],
    reactions: [],
    seenBy: [],
    createdAt,
    updatedAt: createdAt,
  };
}

export function useMessages(conversationId: string | undefined, currentUserId: string | undefined) {
  const queryClient = useQueryClient();
  const socketRef = useRef<ChatSocket | null>(null);
  const slice = useChatStore((s) =>
    conversationId ? s.messagesByConversation[conversationId] : undefined
  );

  const orderedMessages = conversationId ? selectOrderedMessages(conversationId) : [];

  const loadOlder = useCallback(async () => {
    if (!conversationId || !currentUserId || !slice?.hasMore || slice.loading) return;
    const nextSkip = slice.skip + PAGE_LIMIT;
    useChatStore.getState().setMessagesSlice(conversationId, { loading: true, error: null });
    try {
      const page = await conversationsApi.getMessages(conversationId, currentUserId, {
        limit: PAGE_LIMIT,
        skip: nextSkip,
      });
      useChatStore.getState().upsertMessages(conversationId, [...page.messages, ...selectOrderedMessages(conversationId)]);
      useChatStore.getState().setMessagesSlice(conversationId, {
        loading: false,
        skip: nextSkip,
        hasMore: page.hasMore,
      });
      await setCachedMessages(conversationId, selectOrderedMessages(conversationId), nextSkip);
    } catch (e) {
      useChatStore.getState().setMessagesSlice(conversationId, {
        loading: false,
        error: e instanceof Error ? e.message : "Load failed",
      });
    }
  }, [conversationId, currentUserId, slice?.hasMore, slice?.loading, slice?.skip]);

  const loadInitial = useCallback(async () => {
    if (!conversationId || !currentUserId) return;
    useChatStore.getState().resetConversationMessages(conversationId);
    useChatStore.getState().setMessagesSlice(conversationId, { loading: true });

    const cached = await getCachedMessages(conversationId);
    if (cached?.messages.length) {
      useChatStore.getState().upsertMessages(conversationId, cached.messages);
      useChatStore.getState().setMessagesSlice(conversationId, { skip: cached.skip, hasMore: true });
    }

    try {
      const page = await conversationsApi.getMessages(conversationId, currentUserId, {
        limit: PAGE_LIMIT,
        skip: 0,
      });
      useChatStore.getState().upsertMessages(conversationId, page.messages);
      useChatStore.getState().setMessagesSlice(conversationId, {
        loading: false,
        skip: 0,
        hasMore: page.hasMore,
      });
      await setCachedMessages(conversationId, selectOrderedMessages(conversationId), 0);
    } catch (e) {
      useChatStore.getState().setMessagesSlice(conversationId, {
        loading: false,
        error: e instanceof Error ? e.message : "Load failed",
      });
    }
  }, [conversationId, currentUserId]);

  const flushOfflineQueue = useCallback(() => {
    if (!conversationId || !currentUserId || !socketRef.current) return;
    const queue = getOfflineQueue().filter((q) => q.conversationId === conversationId);
    for (const item of queue) {
      socketRef.current.sendMessage({
        conversationId,
        senderId: currentUserId,
        type: item.payload.type,
        content: item.payload.content,
        ...(item.payload.replyTo ? { replyToId: item.payload.replyTo } : {}),
        ...(item.payload.metadata ? { metadata: item.payload.metadata } : {}),
      });
      dequeueOfflineMessage(item.id);
    }
  }, [conversationId, currentUserId]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;
    void loadInitial();
  }, [conversationId, currentUserId, loadInitial]);

  useEffect(() => {
    if (!conversationId || !currentUserId) return;

    const chatSocket = new ChatSocket(currentUserId);
    socketRef.current = chatSocket;

    chatSocket.setHandlers({
      onMessage: (msg) => {
        if (msg.conversationId !== conversationId) return;
        const tempMatch = msg.clientTempId
          ? useChatStore.getState().messagesByConversation[conversationId]?.byId[msg.clientTempId]
          : undefined;
        if (tempMatch?.clientTempId) {
          useChatStore.getState().reconcileOptimistic(conversationId, tempMatch.clientTempId, msg);
        } else {
          useChatStore.getState().upsertMessage(conversationId, msg);
        }
        const skip = useChatStore.getState().messagesByConversation[conversationId]?.skip ?? 0;
        void setCachedMessages(
          conversationId,
          selectOrderedMessages(conversationId),
          skip
        );
      },
      onMessageSeen: ({ messageId, status, seenBy, userId }) => {
        const updates: Partial<IMessage> = {};
        if (status) updates.status = status;
        if (seenBy?.length) updates.seenBy = seenBy;
        else if (userId) {
          const existing = useChatStore.getState().messagesByConversation[conversationId]?.byId[messageId];
          if (existing) {
            updates.seenBy = [...existing.seenBy, { userId, seenAt: new Date() }];
            if (existing.senderId === currentUserId) updates.status = "SEEN";
          }
        }
        useChatStore.getState().updateMessage(conversationId, messageId, updates);
      },
      onMessageUpdated: (msg) => {
        if (msg.conversationId === conversationId) useChatStore.getState().upsertMessage(conversationId, msg);
      },
      onMessageRecalled: ({ messageId }) => {
        useChatStore.getState().updateMessage(conversationId, messageId, { isRecalled: true });
        queryClient.invalidateQueries({ queryKey: ["conversations", currentUserId] });
      },
      onMessagePinnedUpdate: ({ conversationId: cid }) => {
        if (cid === conversationId) {
          queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
        }
      },
      onTyping: ({ conversationId: cid, userId, isTyping }) => {
        if (cid === conversationId) useChatStore.getState().setTyping(conversationId, userId, isTyping);
      },
      onPresence: (p) => useChatStore.getState().setPresence(p),
      onConversationCallUpdated: ({ conversationId: cid, lastMessage, callData }) => {
        if (cid !== conversationId) return;
        const callMeta = buildCallMetaMessage({
          conversationId,
          fallbackSenderId: currentUserId,
          callData,
          lastMessage,
        });
        const sliceState = useChatStore.getState().messagesByConversation[conversationId];
        const existingId = Object.values(sliceState?.byId ?? {}).find(
          (m) => m.callId && m.callId === callMeta.callId
        )?._id;
        if (existingId) {
          useChatStore.getState().updateMessage(conversationId, existingId, {
            content: callMeta.content,
            createdAt: callMeta.createdAt,
            updatedAt: callMeta.updatedAt,
            senderId: callMeta.senderId,
          });
        } else {
          useChatStore.getState().upsertMessage(conversationId, callMeta);
        }
      },
      onReconnect: () => {
        useChatStore.getState().setUi({ socketConnected: true });
        flushOfflineQueue();
      },
    });

    chatSocket.subscribe();
    chatSocket.joinConversation(conversationId);
    useChatStore.getState().setUi({ socketConnected: true });

    return () => {
      chatSocket.leaveConversation(conversationId);
      chatSocket.unsubscribe();
      socketRef.current = null;
    };
  }, [conversationId, currentUserId, flushOfflineQueue]);

  const sendText = useCallback(
    async (content: string, replyTo?: string) => {
      if (!conversationId || !currentUserId) return;
      const clientTempId = tempId();
      const optimistic: IMessage = {
        _id: clientTempId,
        clientTempId,
        conversationId,
        senderId: currentUserId,
        type: "TEXT",
        content,
        status: "SENDING",
        isRecalled: false,
        deletedBy: [],
        reactions: [],
        seenBy: [],
        replyTo,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      useChatStore.getState().upsertMessage(conversationId, optimistic);
      useChatStore.getState().setUi({ replyToId: null });

      const payload = {
        conversationId,
        senderId: currentUserId,
        content,
        type: "TEXT" as const,
        ...(replyTo ? { replyToId: replyTo } : {}),
      };

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        enqueueOfflineMessage({
          id: clientTempId,
          conversationId,
          payload: { type: "TEXT", content, replyTo, clientTempId },
          attempts: 0,
          createdAt: Date.now(),
        });
        return;
      }

      try {
        socketRef.current?.sendMessage({ ...payload, clientTempId });
        useChatStore.getState().updateMessage(conversationId, clientTempId, { status: "SENT" });
      } catch {
        useChatStore.getState().updateMessage(conversationId, clientTempId, { status: "FAILED" });
      }
    },
    [conversationId, currentUserId]
  );

  const sendWithAttachment = useCallback(
    async (file: File, type: MessageType, replyTo?: string, signal?: AbortSignal) => {
      if (!conversationId || !currentUserId) return;
      const clientTempId = tempId();
      const optimistic: IMessage = {
        _id: clientTempId,
        clientTempId,
        conversationId,
        senderId: currentUserId,
        type,
        content: file.name,
        metadata: { fileName: file.name, fileSize: file.size },
        status: "SENDING",
        isRecalled: false,
        deletedBy: [],
        reactions: [],
        seenBy: [],
        replyTo,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      useChatStore.getState().upsertMessage(conversationId, optimistic);

      try {
        const uploaded = await retryWithBackoff(() => uploadFile(file, { signal }));
        const metadata = {
          fileName: uploaded.fileName ?? file.name,
          fileSize: uploaded.fileSize ?? file.size,
          thumbnail: uploaded.thumbnail,
        };
        socketRef.current?.sendMessage({
          conversationId,
          senderId: currentUserId,
          type,
          content: uploaded.url,
          metadata,
          ...(replyTo ? { replyToId: replyTo } : {}),
          clientTempId,
        });
        useChatStore.getState().updateMessage(conversationId, clientTempId, {
          content: uploaded.url,
          metadata,
          status: "SENT",
        });
      } catch {
        useChatStore.getState().updateMessage(conversationId, clientTempId, { status: "FAILED" });
      }
    },
    [conversationId, currentUserId]
  );

  const sendMediaCluster = useCallback(
    async (
      files: File[],
      replyTo?: string,
      options?: {
        onFileProgress?: (fileIndex: number, percent: number) => void;
        getSignal?: (fileIndex: number) => AbortSignal | undefined;
      }
    ) => {
      if (!conversationId || !currentUserId || !files.length) return;
      const clientTempId = tempId();
      const optimistic: IMessage = {
        _id: clientTempId,
        clientTempId,
        conversationId,
        senderId: currentUserId,
        type: "MEDIA_CLUSTER",
        content: "[]",
        metadata: mediaClusterMetadata([]),
        status: "SENDING",
        isRecalled: false,
        deletedBy: [],
        reactions: [],
        seenBy: [],
        replyTo,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      useChatStore.getState().upsertMessage(conversationId, optimistic);

      try {
        const clusterItems: IMediaClusterItem[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const uploaded = await retryWithBackoff(() =>
            uploadFileViaPresigned(file, {
              signal: options?.getSignal?.(i),
              onProgress: (percent) => options?.onFileProgress?.(i, percent),
            })
          );
          clusterItems.push({
            url: uploaded.url,
            type: mediaClusterItemTypeFromFile(file),
            thumbnail: uploaded.thumbnail,
          });
        }

        const content = serializeMediaClusterItems(clusterItems);
        const metadata = mediaClusterMetadata(clusterItems);

        socketRef.current?.sendMessage({
          conversationId,
          senderId: currentUserId,
          type: "MEDIA_CLUSTER",
          content,
          metadata,
          ...(replyTo ? { replyToId: replyTo } : {}),
          clientTempId,
        });

        useChatStore.getState().updateMessage(conversationId, clientTempId, {
          content,
          metadata,
          status: "SENT",
        });
      } catch {
        useChatStore.getState().updateMessage(conversationId, clientTempId, { status: "FAILED" });
        throw new Error("MEDIA_CLUSTER_UPLOAD_FAILED");
      }
    },
    [conversationId, currentUserId]
  );

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!conversationId) return;
      socketRef.current?.editMessage(messageId, content, conversationId);
      useChatStore.getState().updateMessage(conversationId, messageId, { content, editedAt: new Date().toISOString() });
      useChatStore.getState().setUi({ editingId: null });
    },
    [conversationId]
  );

  const recallMessage = useCallback(
    async (messageId: string) => {
      if (!conversationId) return;
      socketRef.current?.recallMessage(messageId, conversationId);
      useChatStore.getState().updateMessage(conversationId, messageId, { isRecalled: true });
      const editingId = useChatStore.getState().ui.editingId;
      if (editingId === messageId) useChatStore.getState().setUi({ editingId: null });
    },
    [conversationId]
  );

  const deleteMessageForMe = useCallback(
    async (messageId: string) => {
      if (!conversationId || !currentUserId) return;
      socketRef.current?.deleteMessageForMe(messageId);
      useChatStore.getState().removeMessage(conversationId, messageId);
      const { replyToId, editingId } = useChatStore.getState().ui;
      if (replyToId === messageId) useChatStore.getState().setUi({ replyToId: null });
      if (editingId === messageId) useChatStore.getState().setUi({ editingId: null });
    },
    [conversationId, currentUserId]
  );

  const markSeen = useCallback(() => {
    if (!conversationId) return;
    socketRef.current?.markConversationSeen(conversationId);
  }, [conversationId]);

  const retryFailed = useCallback(
    async (message: IMessage) => {
      if (!conversationId || message.status !== "FAILED") return;
      const id = message.clientTempId || message._id;
      useChatStore.getState().removeMessage(conversationId, id);
      await sendText(message.content, message.replyTo);
    },
    [conversationId, sendText]
  );

  return {
    messages: orderedMessages,
    loading: slice?.loading ?? false,
    hasMore: slice?.hasMore ?? true,
    error: slice?.error,
    loadOlder,
    loadInitial,
    sendText,
    sendWithAttachment,
    sendMediaCluster,
    editMessage,
    recallMessage,
    deleteMessageForMe,
    markSeen,
    retryFailed,
    socket: socketRef,
  };
}
