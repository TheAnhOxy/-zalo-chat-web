"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { userService } from "@/src/services/user/user.service";

export interface MemberProfile {
  fullName: string;
  avatar?: string;
}

/** Tải tên + avatar từng TV nhóm — giống mobile `_loadUsers` trong sheet thành viên */
export function useGroupMemberProfiles(userIds: string[]) {
  const uniqueIds = useMemo(
    () => [...new Set(userIds.filter(Boolean))],
    [userIds]
  );

  const queries = useQueries({
    queries: uniqueIds.map((userId) => ({
      queryKey: ["user-profile", userId],
      queryFn: () => userService.getProfile(userId),
      staleTime: 5 * 60_000,
    })),
  });

  const profiles = useMemo(() => {
    const map: Record<string, MemberProfile> = {};
    uniqueIds.forEach((id, index) => {
      const user = queries[index]?.data;
      if (user) {
        map[id] = {
          fullName: user.fullName?.trim() || "",
          avatar: user.avatar,
        };
      }
    });
    return map;
  }, [uniqueIds, queries]);

  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError) && !isLoading;

  return { profiles, isLoading, isError };
}

export function resolveMemberDisplay(
  participant: { userId: string; fullName?: string; avatar?: string },
  profiles: Record<string, MemberProfile>
): { name: string; avatar?: string } {
  const fromApi = profiles[participant.userId];
  const name =
    fromApi?.fullName ||
    participant.fullName?.trim() ||
    "";
  return {
    name: name || "Người dùng",
    avatar: fromApi?.avatar ?? participant.avatar,
  };
}
