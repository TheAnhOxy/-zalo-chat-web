"use client";

import { useQuery } from "@tanstack/react-query";
import { contactsService } from "@/src/services/contacts/contacts.service";

export function useFriends(userId?: string) {
  return useQuery({
    queryKey: ["friends", userId],
    queryFn: () => contactsService.getFriends(userId as string),
    enabled: Boolean(userId),
  });
}

export function useGroups(userId?: string) {
  return useQuery({
    queryKey: ["groups", userId],
    queryFn: () => contactsService.getGroups(userId as string),
    enabled: Boolean(userId),
  });
}
