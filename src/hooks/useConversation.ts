"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { conversationsApi } from "@/src/services/api/conversations";
import { IConversation } from "@/src/types/conversation";
import { useChatStore } from "@/src/store/chat-store";

export function useConversation(conversationId: string | undefined) {
  const setConversation = useChatStore((s) => s.setConversation);
  const cached = useChatStore((s) => (conversationId ? s.conversations[conversationId] : undefined));

  const query = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => conversationsApi.getById(conversationId!),
    enabled: Boolean(conversationId),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.data) setConversation(query.data);
  }, [query.data, setConversation]);

  const otherParticipant = useCallback(
    (currentUserId: string) => {
      const c = query.data ?? cached;
      if (!c || c.type !== "PRIVATE") return null;
      return c.participants.find((p) => p.userId !== currentUserId) ?? null;
    },
    [query.data, cached]
  );

  const isBlocked = useCallback(
    (currentUserId: string) => {
      const other = otherParticipant(currentUserId);
      return Boolean(other?.isBlocked);
    },
    [otherParticipant]
  );

  return {
    conversation: query.data ?? cached ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    otherParticipant,
    isBlocked,
  };
}

export function useCreateDirectConversation() {
  const [loading, setLoading] = useState(false);

  const create = useCallback(
    async (currentUserId: string, targetUserId: string): Promise<IConversation> => {
      setLoading(true);
      try {
        return await conversationsApi.findOrCreateDirect(currentUserId, targetUserId);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { create, loading };
}
