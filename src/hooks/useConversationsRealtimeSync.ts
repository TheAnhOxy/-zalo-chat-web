"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { parseConversationFromApi } from "@/src/lib/parse-api";
import { IConversation } from "@/src/types/conversation";
import { socketService } from "@/src/services/socket/socket.service";

function extractConversationId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const map = payload as Record<string, unknown>;
  const cid = map.conversationId ?? map.id;
  if (typeof cid === "string" && cid.trim()) return cid.trim();
  const conv = map.conversation;
  if (conv && typeof conv === "object") {
    const raw = conv as Record<string, unknown>;
    const id = raw._id ?? raw.id;
    if (typeof id === "string" && id.trim()) return id.trim();
  }
  return null;
}

/** Luôn lắng nghe socket — cập nhật danh sách chat realtime (kể cả khi không ở tab Chat) */
export function useConversationsRealtimeSync(userId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const invalidateList = () => {
      void queryClient.invalidateQueries({ queryKey: ["conversations", userId] });
    };

    const handleConversationCreated = (payload: unknown) => {
      try {
        const map =
          payload && typeof payload === "object"
            ? (payload as Record<string, unknown>)
            : null;
        const raw = map?.conversation as Record<string, unknown> | undefined;
        if (!raw) {
          invalidateList();
          return;
        }

        const conv = parseConversationFromApi(raw);
        if (!conv._id) {
          invalidateList();
          return;
        }

        queryClient.setQueryData<IConversation[]>(["conversations", userId], (old) => {
          const list = old ?? [];
          if (list.some((c) => c._id === conv._id)) {
            return list.map((c) => (c._id === conv._id ? { ...c, ...conv } : c));
          }
          return [conv, ...list];
        });

        socketService.emit("join_conversation", { conversationId: conv._id });
      } catch {
        invalidateList();
      }
    };

    const handleConversationRemoved = (payload: unknown) => {
      const id = extractConversationId(payload);
      if (!id) {
        invalidateList();
        return;
      }
      queryClient.setQueryData<IConversation[]>(["conversations", userId], (old) =>
        (old ?? []).filter((c) => c._id !== id)
      );
    };

    socketService.on("new_message", invalidateList);
    socketService.on("conversation_updated", invalidateList);
    socketService.on("conversation_created", handleConversationCreated);
    socketService.on("conversation_removed", handleConversationRemoved);
    socketService.on("conversation_pin_updated", invalidateList);
    socketService.on("conversation_history_cleared", invalidateList);
    socketService.on("conversation_call_updated", invalidateList);

    return () => {
      socketService.off("new_message", invalidateList);
      socketService.off("conversation_updated", invalidateList);
      socketService.off("conversation_created", handleConversationCreated);
      socketService.off("conversation_removed", handleConversationRemoved);
      socketService.off("conversation_pin_updated", invalidateList);
      socketService.off("conversation_history_cleared", invalidateList);
      socketService.off("conversation_call_updated", invalidateList);
    };
  }, [queryClient, userId]);
}
