"use client";

import { useCallback, useEffect, useRef } from "react";
import { ChatSocket } from "@/src/services/socket/chat-socket";
import { useChatStore } from "@/src/store/chat-store";

const TYPING_DEBOUNCE_MS = 400;
const TYPING_STOP_MS = 2000;

export function useTyping(
  conversationId: string | undefined,
  currentUserId: string | undefined,
  chatSocket: ChatSocket | null
) {
  const typingUsers = useChatStore((s) =>
    conversationId ? s.typingByConversation[conversationId] : undefined
  );
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const notifyTyping = useCallback(() => {
    if (!conversationId || !chatSocket) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      chatSocket.sendTyping(conversationId, true);
    }
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = setTimeout(() => {
      isTypingRef.current = false;
      chatSocket.sendTyping(conversationId, false);
    }, TYPING_STOP_MS);
  }, [conversationId, chatSocket]);

  const onComposerInput = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      notifyTyping();
    }, TYPING_DEBOUNCE_MS);
  }, [notifyTyping]);

  useEffect(() => {
    return () => {
      if (stopTimer.current) clearTimeout(stopTimer.current);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (conversationId && chatSocket && isTypingRef.current) {
        chatSocket.sendTyping(conversationId, false);
      }
    };
  }, [conversationId, chatSocket]);

  const othersTyping = Array.from(typingUsers ?? []).filter((id) => id !== currentUserId);

  return { othersTyping, onComposerInput };
}
