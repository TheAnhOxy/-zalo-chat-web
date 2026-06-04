import { IMessage, MessageType } from "@/src/types/message";
import { ICall } from "@/src/types/call";

/** Matches mobile ConversationModel.type: PRIVATE | GROUP */
export type ConversationType = "PRIVATE" | "GROUP";

export type GroupMemberRole = "ADMIN" | "MODERATOR" | "MEMBER";

export interface IGroupSettings {
  allowInviteLink?: boolean;
  joinQrCode?: string;
  isLockChat?: boolean;
  chatBackgroundType?: "PRESET" | "CUSTOM";
  chatBackgroundIndex?: number;
  chatBackgroundCustomBase64?: string;
}

export interface IConversationParticipant {
  userId: string;
  fullName: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: string | Date;
  isBlocked?: boolean;
  isPinned?: boolean;
  role?: GroupMemberRole;
}

export interface IConversation {
  _id: string;
  type: ConversationType;
  name?: string;
  description?: string;
  groupSettings?: IGroupSettings;
  avatar?: string;
  participants: IConversationParticipant[];
  lastMessage?: Pick<IMessage, "_id" | "content" | "type" | "senderId" | "createdAt">;
  lastCall?: Pick<ICall, "_id" | "callerId" | "type" | "status" | "duration" | "createdAt" | "endedAt">;
  unreadCount: number;
  updatedAt: string | Date;
  createdAt: string | Date;
  pinnedMessageIds?: string[];
  pinnedMessages?: IMessage[];
}

export interface SendMessageSocketPayload {
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  replyToId?: string;
  metadata?: IMessage["metadata"];
}
