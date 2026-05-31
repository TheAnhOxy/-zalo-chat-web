"use client";

import { contactsService } from "@/src/services/contacts/contacts.service";
import { useApiQuery, useApiMutation } from "./use-api";
import { useQueryClient } from "@tanstack/react-query";

// ==============================
// QUERIES (LẤY DỮ LIỆU)
// ==============================

export function useFriends(userId?: string) {
  return useApiQuery(
    () => contactsService.getFriends(userId as string),
    ["friends", userId],
    {},
    { enabled: Boolean(userId) }
  );
}

export function useGroups(userId?: string) {
  return useApiQuery(
    () => contactsService.getGroups(userId as string),
    ["groups", userId],
    {},
    { enabled: Boolean(userId) }
  );
}

export function useReceivedRequests(userId?: string) {
  return useApiQuery(
    () => contactsService.getReceivedRequests(userId as string),
    ["friend-requests", "received", userId],
    {},
    { enabled: Boolean(userId) }
  );
}

export function useSentRequests(userId?: string) {
  return useApiQuery(
    () => contactsService.getSentRequests(userId as string),
    ["friend-requests", "sent", userId],
    {},
    { enabled: Boolean(userId) }
  );
}

// ==============================
// MUTATIONS (SỬA ĐỔI DỮ LIỆU)
// ==============================

export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();
  return useApiMutation<{ id: string; status: string }, any>(
    (vars) => `/friendships/${vars.id}`,
    "patch",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
        queryClient.invalidateQueries({ queryKey: ["friends"] });
      },
    }
  );
}

export function useRejectFriendRequest() {
  const queryClient = useQueryClient();
  return useApiMutation<{ id: string }, any>(
    (vars) => `/friendships/${vars.id}`,
    "delete",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      },
    }
  );
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  return useApiMutation<{ requesterId: string; addresseeId: string; message?: string }, any>(
    "/friendships",
    "post",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      },
    }
  );
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useApiMutation<any, any>(
    "/conversations",
    "post",
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["groups"] });
      },
    }
  );
}
