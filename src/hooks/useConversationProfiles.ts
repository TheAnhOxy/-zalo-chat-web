"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { getOtherParticipant, ConversationProfileCache } from "@/src/lib/conversation-display";
import { IConversation } from "@/src/types/conversation";
import { userService } from "@/src/services/user/user.service";

/** Fetch profile (tên + avatar) cho mọi user trong chat 1-1 — giống mobile `_fetchUserProfiles` */
export function useConversationProfiles(
  conversations: IConversation[],
  currentUserId: string | undefined
): ConversationProfileCache {
  const otherIds = useMemo(() => {
    if (!currentUserId) return [];
    const ids = new Set<string>();
    for (const conversation of conversations) {
      if (conversation.type === "GROUP") continue;
      const other = getOtherParticipant(conversation, currentUserId);
      if (other?.userId && other.userId !== currentUserId) {
        ids.add(other.userId);
      }
    }
    return [...ids];
  }, [conversations, currentUserId]);

  const queries = useQueries({
    queries: otherIds.map((userId) => ({
      queryKey: ["user-profile", userId],
      queryFn: () => userService.getProfile(userId),
      enabled: Boolean(userId),
      staleTime: 5 * 60_000,
    })),
  });

  return useMemo(() => {
    const map: ConversationProfileCache = {};
    otherIds.forEach((id, index) => {
      const user = queries[index]?.data;
      if (user) {
        map[id] = { fullName: user.fullName, avatar: user.avatar };
      }
    });
    return map;
  }, [otherIds, queries]);
}
