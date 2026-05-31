import { IConversation, IConversationParticipant } from "@/src/types/conversation";

export type ConversationProfileCache = Record<string, { fullName?: string; avatar?: string }>;

export function getOtherParticipant(
  conversation: IConversation,
  currentUserId: string
): IConversationParticipant | null {
  return (
    conversation.participants.find((p) => p.userId !== currentUserId) ??
    conversation.participants[0] ??
    null
  );
}

export function getConversationDisplayName(
  conversation: IConversation,
  currentUserId: string,
  profiles?: ConversationProfileCache
): string {
  if (conversation.type === "GROUP") {
    return conversation.name?.trim() || "Nhóm";
  }

  const other = getOtherParticipant(conversation, currentUserId);
  if (!other) return "Người dùng";

  const cached = profiles?.[other.userId];
  if (cached?.fullName?.trim()) return cached.fullName.trim();
  if (other.fullName?.trim()) return other.fullName.trim();
  return "Người dùng";
}

export function getConversationAvatarUrl(
  conversation: IConversation,
  currentUserId: string,
  profiles?: ConversationProfileCache
): string | undefined {
  if (conversation.type === "GROUP") {
    const groupAvatar = conversation.avatar?.trim();
    return groupAvatar || undefined;
  }

  const other = getOtherParticipant(conversation, currentUserId);
  if (!other) return undefined;

  const cached = profiles?.[other.userId];
  if (cached?.avatar?.trim()) return cached.avatar.trim();
  if (other.avatar?.trim()) return other.avatar.trim();
  return undefined;
}
