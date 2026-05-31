"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  chatbotService,
  CHATBOT_QUICK_REPLIES,
  WELCOME_MESSAGE,
} from "@/src/services/chatbot/chatbot.service";
import { ChatbotMessage } from "@/src/types/chatbot";

function isObjectId(id: string) {
  return /^[0-9a-fA-F]{24}$/.test(id.trim());
}

type UseChatbotOptions = {
  userId: string;
  targetConversationId?: string | null;
  targetConversationLimit?: number;
  autoSummarizeOnOpen?: boolean;
};

export function useChatbot({
  userId,
  targetConversationId,
  targetConversationLimit = 60,
  autoSummarizeOnOpen = false,
}: UseChatbotOptions) {
  const [messages, setMessages] = useState<ChatbotMessage[]>([WELCOME_MESSAGE]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [conversations, setConversations] = useState<Record<string, unknown>[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const initializedRef = useRef(false);
  const listEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      listEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }, []);

  const loadConversationById = useCallback(
    async (id: string) => {
      setConversationId(id);
      const raw = await chatbotService.getConversationMessages(userId, id);
      const mapped = raw.map((m) => chatbotService.mapApiMessage(m));
      setMessages(mapped.length > 0 ? mapped : [WELCOME_MESSAGE]);
      scrollToBottom();
    },
    [userId, scrollToBottom]
  );

  const loadOrCreateConversation = useCallback(async () => {
    try {
      const list = await chatbotService.listConversations(userId);
      if (list.length === 0) {
        const id = await chatbotService.createConversation(userId);
        if (id) setConversationId(id);
        return;
      }
      const firstId = String(list[0]?.id ?? list[0]?._id ?? "");
      if (firstId) await loadConversationById(firstId);
    } catch {
      // local-only fallback
    }
  }, [userId, loadConversationById]);

  useEffect(() => {
    if (!userId || initializedRef.current) return;
    initializedRef.current = true;
    void loadOrCreateConversation();
  }, [userId, loadOrCreateConversation]);

  const refreshConversations = useCallback(async () => {
    setLoadingConversations(true);
    try {
      const list = await chatbotService.listConversations(userId);
      setConversations(list);
    } finally {
      setLoadingConversations(false);
    }
  }, [userId]);

  const sendMessage = useCallback(
    async (
      text: string,
      options?: { targetConversationId?: string }
    ) => {
      const trimmed = text.trim();
      if ((trimmed.length === 0 && selectedFiles.length === 0) || isSending) return;

      const userMsgId = `u_${Date.now()}`;
      const loadingId = `ai_${Date.now()}`;

      const userMsg: ChatbotMessage = {
        id: userMsgId,
        content: trimmed,
        isUser: true,
        createdAt: new Date(),
        attachments: [],
      };
      const loadingMsg: ChatbotMessage = {
        id: loadingId,
        content: "",
        isUser: false,
        createdAt: new Date(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, userMsg, loadingMsg]);
      setIsSending(true);
      scrollToBottom();

      const filesToUpload = [...selectedFiles];
      setSelectedFiles([]);

      try {
        const history = messages
          .filter((m) => !m.isLoading && m.id !== "welcome")
          .slice(-10)
          .map((m) => ({
            role: (m.isUser ? "user" : "model") as "user" | "model",
            content: m.content,
          }));

        const uploads =
          filesToUpload.length > 0
            ? await chatbotService.uploadFiles(filesToUpload)
            : [];

        if (uploads.length > 0) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === userMsgId
                ? {
                    ...m,
                    attachments: uploads.map((u) => ({
                      name: u.name,
                      url: u.fileUrl,
                      mimeType: u.mimeType,
                    })),
                  }
                : m
            )
          );
        }

        const result = await chatbotService.sendMessage({
          userId,
          message:
            trimmed.length === 0 ? "(Người dùng gửi file đính kèm)" : trimmed,
          conversationId: conversationId ?? undefined,
          history,
          files: uploads.map((u) => ({
            url: u.fileUrl,
            mimeType: u.mimeType,
            name: u.name,
          })),
          targetConversationId:
            options?.targetConversationId ?? targetConversationId ?? undefined,
          targetConversationLimit,
        });

        if (result.conversationId && result.conversationId !== conversationId) {
          setConversationId(result.conversationId);
        }

        setMessages((prev) => {
          let next = prev.map((m) => {
            if (m.id === userMsgId && result.userMessageId) {
              return { ...m, id: result.userMessageId };
            }
            if (m.id === loadingId) {
              return {
                ...m,
                content: result.reply,
                isLoading: false,
                toolsUsed: result.toolsUsed,
              };
            }
            return m;
          });
          return next;
        });
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? {
                  ...m,
                  content: "Đã có lỗi xảy ra. Vui lòng thử lại.",
                  isLoading: false,
                }
              : m
          )
        );
      } finally {
        setIsSending(false);
        scrollToBottom();
      }
    },
    [
      conversationId,
      isSending,
      messages,
      scrollToBottom,
      selectedFiles,
      targetConversationId,
      targetConversationLimit,
      userId,
    ]
  );

  const summarizeRequestedRef = useRef(false);
  useEffect(() => {
    if (
      !userId ||
      !autoSummarizeOnOpen ||
      !targetConversationId?.trim() ||
      summarizeRequestedRef.current
    ) {
      return;
    }
    summarizeRequestedRef.current = true;
    const t = setTimeout(() => {
      void sendMessage(
        "Tóm tắt cuộc trò chuyện này (nêu ý chính, quyết định/việc cần làm, mốc thời gian nếu có).",
        { targetConversationId }
      );
    }, 400);
    return () => clearTimeout(t);
  }, [userId, autoSummarizeOnOpen, targetConversationId, sendMessage]);

  const newConversation = useCallback(async () => {
    const id = await chatbotService.createConversation(userId);
    setConversationId(id);
    setMessages([
      {
        id: "welcome_new",
        content: "Bắt đầu cuộc trò chuyện mới. Bạn muốn hỏi gì?",
        isUser: false,
        createdAt: new Date(),
      },
    ]);
  }, [userId]);

  const deleteCurrentConversation = useCallback(async () => {
    if (!conversationId) return;
    await chatbotService.deleteConversation(userId, conversationId);
    setConversationId(null);
    await loadOrCreateConversation();
  }, [conversationId, loadOrCreateConversation, userId]);

  const recallMessage = useCallback(
    async (messageId: string) => {
      if (!conversationId || !isObjectId(messageId)) return;
      await chatbotService.deleteMessage(userId, conversationId, messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    },
    [conversationId, userId]
  );

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...arr]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const showQuickReplies = messages.length <= 2 && !isSending;

  return {
    messages,
    conversationId,
    isSending,
    selectedFiles,
    conversations,
    loadingConversations,
    listEndRef,
    quickReplies: CHATBOT_QUICK_REPLIES,
    showQuickReplies,
    sendMessage,
    newConversation,
    deleteCurrentConversation,
    loadConversationById,
    refreshConversations,
    recallMessage,
    addFiles,
    removeFile,
    scrollToBottom,
  };
}
