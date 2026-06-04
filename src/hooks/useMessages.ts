"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { conversationsApi, MessagesPage } from "@/src/services/api/conversations";
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
import { InfiniteData, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";

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

  const queryKey = useMemo(() => ["messages", conversationId], [conversationId]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = useInfiniteQuery<
    MessagesPage,
    Error,
    InfiniteData<MessagesPage, string | undefined>,
    (string | undefined)[],
    string | undefined
  >({
    queryKey,
    initialPageParam: undefined,
    queryFn: ({ pageParam }) =>
      conversationsApi.getMessages(conversationId!, currentUserId!, {
        limit: 30,
        beforeMessageId: pageParam,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore && lastPage.messages.length > 0
        ? lastPage.messages[lastPage.messages.length - 1]._id
        : undefined,
    enabled: !!conversationId && !!currentUserId,
    refetchOnWindowFocus: false,
  });

  const orderedMessages = useMemo((): IMessage[] => {
    if (!data) return [];
    // The backend returns pages with messages sorted DESC (newest first).
    // We flatten them, then reverse so the oldest is at the top of the UI list.
    const all = data.pages.flatMap((page) => page.messages);
    return all.reverse();
  }, [data]);

  const addMessageToCache = useCallback((msg: IMessage) => {
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return { pages: [{ messages: [msg], hasMore: false }], pageParams: [undefined] };
      const firstPage = old.pages[0];
      // Since pages hold newest first, we put the new message at index 0
      return {
        ...old,
        pages: [
          { ...firstPage, messages: [msg, ...firstPage.messages] },
          ...old.pages.slice(1),
        ],
      };
    });
  }, [queryClient, queryKey]);

  const updateMessageInCache = useCallback((messageId: string, updates: Partial<IMessage> | ((m: IMessage) => Partial<IMessage>)) => {
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          messages: page.messages.map((m: IMessage) => {
            if (m._id === messageId || m.clientTempId === messageId) {
              const appliedUpdates = typeof updates === "function" ? updates(m) : updates;
              return { ...m, ...appliedUpdates };
            }
            return m;
          })
        }))
      };
    });
  }, [queryClient, queryKey]);

  const removeMessageFromCache = useCallback((messageId: string) => {
    queryClient.setQueryData(queryKey, (old: any) => {
      if (!old) return old;
      return {
        ...old,
        pages: old.pages.map((page: any) => ({
          ...page,
          messages: page.messages.filter((m: IMessage) => m._id !== messageId && m.clientTempId !== messageId)
        }))
      };
    });
  }, [queryClient, queryKey]);

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

    const chatSocket = new ChatSocket(currentUserId);
    socketRef.current = chatSocket;

    chatSocket.setHandlers({
      onMessage: (msg) => {
        if (msg.conversationId !== conversationId) return;
        queryClient.setQueryData(queryKey, (old: any) => {
           if (!old) return old;
           let found = false;
           const newPages = old.pages.map((page: any) => ({
             ...page,
             messages: page.messages.map((m: IMessage) => {
                if (m._id === msg._id || (m.clientTempId && msg.clientTempId && m.clientTempId === msg.clientTempId)) {
                   found = true;
                   return { ...m, ...msg };
                }
                const isOptimistic = m.clientTempId && m._id === m.clientTempId;
                if (!found && isOptimistic && m.senderId === msg.senderId && m.type === msg.type && JSON.stringify(m.content) === JSON.stringify(msg.content)) {
                   found = true;
                   return { ...m, ...msg, clientTempId: m.clientTempId };
                }
                return m;
             })
           }));
           if (found) {
             return { ...old, pages: newPages };
           }
           const firstPage = newPages[0] || { messages: [] };
           return { ...old, pages: [{ ...firstPage, messages: [msg, ...firstPage.messages] }, ...newPages.slice(1)] };
        });
      },
      onMessageSeen: ({ messageId, status, seenBy, userId }) => {
        const updates: Partial<IMessage> = {};
        if (status) updates.status = status;
        
        updateMessageInCache(messageId, (existing) => {
          const res: Partial<IMessage> = { ...updates };
          if (seenBy?.length) {
            res.seenBy = seenBy;
          } else if (userId && existing) {
            const currentSeen = existing.seenBy || [];
            if (!currentSeen.some((s) => s.userId === userId)) {
               res.seenBy = [...currentSeen, { userId, seenAt: new Date() }];
            }
            if (existing.senderId === currentUserId) res.status = "SEEN";
          }
          return res;
        });
      },
      onMessageUpdated: (msg) => {
        if (msg.conversationId === conversationId) {
           updateMessageInCache(msg._id, msg);
        }
      },
      onMessageRecalled: ({ messageId }) => {
        updateMessageInCache(messageId, { isRecalled: true });
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
        
        // Find existing call message
        queryClient.setQueryData(queryKey, (old: any) => {
           if (!old) return old;
           let found = false;
           const newPages = old.pages.map((page: any) => ({
             ...page,
             messages: page.messages.map((m: IMessage) => {
               if (m.callId && m.callId === callMeta.callId) {
                 found = true;
                 return { ...m, content: callMeta.content, createdAt: callMeta.createdAt, updatedAt: callMeta.updatedAt, senderId: callMeta.senderId };
               }
               return m;
             })
           }));
           if (!found) {
             const firstPage = newPages[0] || { messages: [] };
             return { ...old, pages: [{ ...firstPage, messages: [callMeta, ...firstPage.messages] }, ...newPages.slice(1)] };
           }
           return { ...old, pages: newPages };
        });
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
      addMessageToCache(optimistic);
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
        updateMessageInCache(clientTempId, { status: "SENT" });
      } catch {
        updateMessageInCache(clientTempId, { status: "FAILED" });
      }
    },
    [conversationId, currentUserId, addMessageToCache, updateMessageInCache]
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
      addMessageToCache(optimistic);

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
        updateMessageInCache(clientTempId, {
          content: uploaded.url,
          metadata,
          status: "SENT",
        });
      } catch {
        updateMessageInCache(clientTempId, { status: "FAILED" });
      }
    },
    [conversationId, currentUserId, addMessageToCache, updateMessageInCache]
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
      addMessageToCache(optimistic);

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

        updateMessageInCache(clientTempId, {
          content,
          metadata,
          status: "SENT",
        });
      } catch {
        updateMessageInCache(clientTempId, { status: "FAILED" });
        throw new Error("MEDIA_CLUSTER_UPLOAD_FAILED");
      }
    },
    [conversationId, currentUserId, addMessageToCache, updateMessageInCache]
  );

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!conversationId) return;
      socketRef.current?.editMessage(messageId, content, conversationId);
      updateMessageInCache(messageId, { content, editedAt: new Date().toISOString() });
      useChatStore.getState().setUi({ editingId: null });
    },
    [conversationId, updateMessageInCache]
  );

  const recallMessage = useCallback(
    async (messageId: string) => {
      if (!conversationId) return;
      socketRef.current?.recallMessage(messageId, conversationId);
      updateMessageInCache(messageId, { isRecalled: true });
      const editingId = useChatStore.getState().ui.editingId;
      if (editingId === messageId) useChatStore.getState().setUi({ editingId: null });
    },
    [conversationId, updateMessageInCache]
  );

  const deleteMessageForMe = useCallback(
    async (messageId: string) => {
      if (!conversationId || !currentUserId) return;
      socketRef.current?.deleteMessageForMe(messageId);
      removeMessageFromCache(messageId);
      const { replyToId, editingId } = useChatStore.getState().ui;
      if (replyToId === messageId) useChatStore.getState().setUi({ replyToId: null });
      if (editingId === messageId) useChatStore.getState().setUi({ editingId: null });
    },
    [conversationId, currentUserId, removeMessageFromCache]
  );

  const markSeen = useCallback(() => {
    if (!conversationId) return;
    socketRef.current?.markConversationSeen(conversationId);
  }, [conversationId]);

  const retryFailed = useCallback(
    async (message: IMessage) => {
      if (!conversationId || message.status !== "FAILED") return;
      const id = message.clientTempId || message._id;
      removeMessageFromCache(id);
      await sendText(message.content, message.replyTo);
    },
    [conversationId, sendText, removeMessageFromCache]
  );

  return {
    messages: orderedMessages,
    loading: isLoading,
    hasMore: hasNextPage,
    isFetchingNextPage,
    loadOlder: fetchNextPage,
    reload: refetch,
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
