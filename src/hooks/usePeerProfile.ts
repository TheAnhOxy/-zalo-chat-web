"use client";

import { useQuery } from "@tanstack/react-query";
import { userService } from "@/src/services/user/user.service";
import { ConversationProfileCache } from "@/src/lib/conversation-display";

/** Lấy tên + avatar một user (chat 1-1, tùy chọn, header) */
export function usePeerProfile(userId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["user-profile", userId],
    queryFn: () => userService.getProfile(userId!),
    enabled: Boolean(userId && enabled),
    staleTime: 5 * 60_000,
  });
}

export function profileCacheForUser(
  userId: string | undefined,
  user: { fullName?: string; avatar?: string } | null | undefined
): ConversationProfileCache | undefined {
  if (!userId || !user) return undefined;
  return { [userId]: { fullName: user.fullName, avatar: user.avatar } };
}
