import { IConversation, IConversationParticipant, IGroupSettings } from "@/src/types/conversation";
import { IMessage, IReaction, ISeenBy, MessageType } from "@/src/types/message";
import { IUserPresence } from "@/src/types/presence";
import { normalizeMessage } from "@/src/lib/messages";

/** Chuẩn hóa MongoDB ObjectId (string hoặc `{ $oid }`) — dùng khi so sánh requesterId/addresseeId. */
export function extractMongoId(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    return String(o.$oid ?? o._id ?? o.id ?? "");
  }
  return String(raw);
}

export function parseMessageFromApi(raw: Record<string, unknown>): IMessage {
  const reactions = ((raw.reactions as unknown[]) ?? []).map((r) => {
    const item = r as Record<string, unknown>;
    return {
      userId: String(item.userId ?? ""),
      type: (item.reactionType ?? item.type ?? "LIKE") as IReaction["type"],
    };
  });

  const seenBy = ((raw.seenBy as unknown[]) ?? []).map((s) => {
    const item = s as Record<string, unknown>;
    return {
      userId: String(item.userId ?? ""),
      seenAt: item.seenAt ? new Date(String(item.seenAt)) : new Date(),
    } as ISeenBy;
  });

  const replyRaw = raw.replyToId ?? raw.replyTo;

  return normalizeMessage({
    _id: extractMongoId(raw._id ?? raw.id),
    conversationId: String(raw.conversationId ?? ""),
    senderId: String(raw.senderId ?? ""),
    clientTempId: raw.clientTempId ?? raw.clientTempID ?? raw.client_temp_id ? String(raw.clientTempId ?? raw.clientTempID ?? raw.client_temp_id) : undefined,
    type: (raw.messageType ?? raw.type ?? "TEXT") as MessageType,
    content: String(raw.content ?? ""),
    metadata: raw.metadata as IMessage["metadata"],
    replyTo: replyRaw ? String(replyRaw) : undefined,
    status: (raw.status ?? "SENT") as IMessage["status"],
    isRecalled: Boolean(raw.isRecalled),
    deletedBy: Array.isArray(raw.deletedBy) ? raw.deletedBy.map(String) : [],
    reactions,
    seenBy,
    createdAt: raw.createdAt ? String(raw.createdAt) : new Date().toISOString(),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : new Date().toISOString(),
    editedAt: raw.editedAt ? String(raw.editedAt) : undefined,
    callId: raw.callId ? String(raw.callId) : undefined,
  });
}

export function parseConversationFromApi(raw: Record<string, unknown>): IConversation {
  const members = ((raw.members as unknown[]) ?? []).map((m) => {
    if (typeof m === "string") {
      return {
        userId: extractMongoId(m),
        fullName: "",
        avatar: undefined,
        isOnline: false,
        lastSeen: undefined,
        isBlocked: false,
      } satisfies IConversationParticipant;
    }

    const item = m as Record<string, unknown>;
    const user = (item.user as Record<string, unknown>) ?? item;
    
    return {
      userId: extractMongoId(user.userId ?? user._id ?? item.userId ?? item._id),
      fullName: String(
        user.name ?? user.fullName ?? user.nickname ?? item.name ?? item.fullName ?? item.nickname ?? ""
      ).trim(),
      avatar: (user.avatar ?? item.avatar) ? String(user.avatar ?? item.avatar) : undefined,
      isOnline: Boolean(user.isOnline ?? item.isOnline ?? (user.status as { isOnline?: unknown } | undefined)?.isOnline),
      lastSeen: (user.lastSeen ?? item.lastSeen) ? String(user.lastSeen ?? item.lastSeen) : undefined,
      isBlocked: Boolean(user.isBlocked ?? item.isBlocked),
      isPinned: Boolean(user.isPinned ?? item.isPinned),
      role: item.role ? (String(item.role) as IConversationParticipant["role"]) : undefined,
    } satisfies IConversationParticipant;
  });

  const type = String(raw.type ?? "PRIVATE") as IConversation["type"];
  const lastMessageRaw = raw.lastMessage as Record<string, unknown> | undefined;

  let pinnedMessages: IMessage[] = [];
  let pinnedMessageIds: string[] = [];
  const rawId = extractMongoId(raw._id ?? raw.id);

  try {
    if (Array.isArray(raw.pinnedMessages)) {
      pinnedMessages = raw.pinnedMessages.map((m) => parseMessageFromApi(m as Record<string, unknown>));
      pinnedMessageIds = pinnedMessages.map((m) => m._id);
      localStorage.setItem(`pinned_${rawId}`, JSON.stringify(raw.pinnedMessages));
    } else {
      const saved = localStorage.getItem(`pinned_${rawId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          pinnedMessages = parsed.map((m) => parseMessageFromApi(m as Record<string, unknown>));
          pinnedMessageIds = pinnedMessages.map((m) => m._id);
        }
      }
    }
  } catch (e) {
    console.error("Failed to parse pinned messages fallback", e);
  }

  const gsRaw = raw.groupSettings as Record<string, unknown> | undefined;
  let groupSettings: IGroupSettings | undefined;
  if (gsRaw && typeof gsRaw === "object") {
    groupSettings = {
      allowInviteLink: gsRaw.allowInviteLink as boolean | undefined,
      joinQrCode: gsRaw.joinQrCode != null ? String(gsRaw.joinQrCode) : undefined,
      isLockChat: gsRaw.isLockChat as boolean | undefined,
      chatBackgroundType: (gsRaw.chatBackgroundType as IGroupSettings["chatBackgroundType"]) ?? "PRESET",
      chatBackgroundIndex: Number(gsRaw.chatBackgroundIndex ?? 0),
      chatBackgroundCustomBase64:
        gsRaw.chatBackgroundCustomBase64 != null
          ? String(gsRaw.chatBackgroundCustomBase64)
          : undefined,
    };
  }

  return {
    _id: rawId,
    type: type === "GROUP" ? "GROUP" : "PRIVATE",
    name: raw.name ? String(raw.name).trim() : undefined,
    description: raw.description != null ? String(raw.description).trim() : undefined,
    groupSettings,
    avatar: raw.avatar ? String(raw.avatar) : undefined,
    participants: members,
    lastMessage: lastMessageRaw
      ? {
          _id: extractMongoId(lastMessageRaw._id ?? lastMessageRaw.id ?? lastMessageRaw.messageId),
          content: String(lastMessageRaw.content ?? ""),
          type: (lastMessageRaw.messageType ?? lastMessageRaw.type ?? "TEXT") as IMessage["type"],
          senderId: String(lastMessageRaw.senderId ?? ""),
          createdAt: lastMessageRaw.createdAt ? String(lastMessageRaw.createdAt) : new Date().toISOString(),
        }
      : undefined,
    unreadCount: Number(raw.unreadCount ?? 0),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : new Date().toISOString(),
    createdAt: raw.createdAt ? String(raw.createdAt) : new Date().toISOString(),
    pinnedMessages,
    pinnedMessageIds,
  };
}

export function parsePresenceFromSocket(raw: Record<string, unknown>): IUserPresence {
  return {
    userId: String(raw.userId ?? ""),
    isOnline: raw.isOnline === true,
    lastSeen: raw.lastSeen ? String(raw.lastSeen) : undefined,
  };
}
