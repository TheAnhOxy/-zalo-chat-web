"use client";

import { useChatStore } from "@/src/store/chat-store";

/** Reads presence updated via ChatSocket `user_status_changed` in useMessages */
export function usePresence(userId: string | undefined) {
  const presence = useChatStore((s) => (userId ? s.presenceByUser[userId] : undefined));
  return { presence: presence ?? null };
}
