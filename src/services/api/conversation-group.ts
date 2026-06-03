import { apiClient } from "@/src/services/api/client";
import { parseConversationFromApi } from "@/src/lib/parse-api";
import { IConversation, IConversationParticipant } from "@/src/types/conversation";

export type GroupMemberRole = "ADMIN" | "MODERATOR" | "MEMBER";

export interface GroupMemberPayload {
  userId: string;
  role: GroupMemberRole;
}

export function membersToPayload(participants: IConversationParticipant[]): GroupMemberPayload[] {
  return participants.map((p) => ({
    userId: p.userId,
    role: (p.role as GroupMemberRole) || "MEMBER",
  }));
}

export interface InviteLinkResult {
  code?: string;
  link?: string;
  enabled?: boolean;
}

function unwrap<T>(data: unknown): T {
  if (data && typeof data === "object" && "data" in (data as object)) {
    return (data as { data: T }).data;
  }
  return data as T;
}

export const conversationGroupApi = {
  patch(conversationId: string, body: Record<string, unknown>) {
    return apiClient.patch<unknown>(`/conversations/${conversationId}`, body).then((res) => {
      const payload = unwrap<Record<string, unknown>>(res.data);
      return parseConversationFromApi(payload);
    });
  },

  updateDescription(conversationId: string, description: string) {
    return conversationGroupApi.patch(conversationId, { description });
  },

  updateName(conversationId: string, name: string) {
    return conversationGroupApi.patch(conversationId, { name });
  },

  updateAvatar(conversationId: string, avatar: string) {
    return conversationGroupApi.patch(conversationId, { avatar });
  },

  setInviteLinkEnabled(conversationId: string, enabled: boolean) {
    return conversationGroupApi.patch(conversationId, {
      groupSettings: { allowInviteLink: enabled },
    });
  },

  addMembers(conversationId: string, current: IConversationParticipant[], newUserIds: string[]) {
    const existing = new Set(current.map((p) => p.userId));
    const updated: GroupMemberPayload[] = [
      ...membersToPayload(current),
      ...newUserIds
        .filter((id) => !existing.has(id))
        .map((id) => ({ userId: id, role: "MEMBER" as const })),
    ];
    return conversationGroupApi.patch(conversationId, { members: updated });
  },

  removeMember(conversationId: string, current: IConversationParticipant[], targetUserId: string) {
    const updated = membersToPayload(current).filter((m) => m.userId !== targetUserId);
    return conversationGroupApi.patch(conversationId, { members: updated });
  },

  kickMember(
    conversationId: string,
    current: IConversationParticipant[],
    targetUserId: string
  ) {
    return conversationGroupApi.removeMember(conversationId, current, targetUserId);
  },

  updateMemberRole(
    conversationId: string,
    current: IConversationParticipant[],
    targetUserId: string,
    newRole: GroupMemberRole
  ) {
    const updated = membersToPayload(current).map((m) =>
      m.userId === targetUserId ? { ...m, role: newRole } : m
    );
    return conversationGroupApi.patch(conversationId, { members: updated });
  },

  leaveGroup(conversationId: string, myUserId: string, current: IConversationParticipant[]) {
    return conversationGroupApi.removeMember(conversationId, current, myUserId);
  },

  dissolveGroup(conversationId: string) {
    return apiClient.delete(`/conversations/${conversationId}`);
  },

  getInviteLink(conversationId: string) {
    return apiClient
      .get<unknown>(`/conversations/${conversationId}/invite-link`)
      .then((res) => unwrap<InviteLinkResult>(res.data));
  },

  regenerateInviteLink(conversationId: string) {
    return apiClient
      .post<unknown>(`/conversations/${conversationId}/invite-link/regenerate`)
      .then((res) => unwrap<InviteLinkResult>(res.data));
  },

  joinByInviteCode(code: string, userId: string) {
    return apiClient
      .post<unknown>("/conversations/join-by-link", { code, userId })
      .then((res) => {
        const payload = unwrap<Record<string, unknown>>(res.data);
        return parseConversationFromApi(payload);
      });
  },

  updateGroupChatBackground(
    conversationId: string,
    payload: {
      type: "PRESET" | "CUSTOM";
      index: number;
      customBase64?: string | null;
    }
  ) {
    return conversationGroupApi.patch(conversationId, {
      groupSettings: {
        chatBackgroundType: payload.type,
        chatBackgroundIndex: payload.index,
        chatBackgroundCustomBase64: payload.customBase64 ?? "",
      },
    });
  },
};

export function isGroupAdmin(
  participants: IConversationParticipant[],
  userId: string
): boolean {
  const me = participants.find((p) => p.userId === userId);
  return me?.role === "ADMIN";
}

export function countGroupAdmins(participants: IConversationParticipant[]): number {
  return participants.filter((p) => p.role === "ADMIN").length;
}

/** Chỉ còn một QTV và đó là userId — không cho rời (giống mobile). */
export function isSoleAdmin(
  participants: IConversationParticipant[],
  userId: string
): boolean {
  if (countGroupAdmins(participants) !== 1) return false;
  return isGroupAdmin(participants, userId);
}

export function roleLabel(role?: string): string {
  if (role === "ADMIN") return "Quản trị viên";
  if (role === "MODERATOR") return "Điều hành viên";
  return "Thành viên";
}
