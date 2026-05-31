export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'VOICE' | 'LOCATION' | 'CONTACT';
export type MessageStatus = 'SENDING' | 'SENT' | 'DELIVERED' | 'SEEN' | 'FAILED';
export type ReactionType = 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY';

export interface IMessageMetadata {
  fileName?: string;
  fileSize?: number;
  thumbnail?: string;
  thumbnailUrl?: string;
  lat?: number;
  lng?: number;
  duration?: number;
  groupId?: string;
}

export interface IReaction {
  userId: string;
  type: ReactionType;
}

export interface ISeenBy {
  userId: string;
  seenAt: Date;
}

export interface IMessage {
  _id: string;
  conversationId: string;
  senderId: string;
  type: MessageType;
  content: string;
  metadata?: IMessageMetadata;
  replyTo?: string;
  status: MessageStatus;
  isRecalled: boolean;
  deletedBy: string[];
  reactions: IReaction[];
  seenBy: ISeenBy[];
  createdAt: Date | string;
  updatedAt: Date | string;
  /** Optimistic UI temp id from client */
  clientTempId?: string;
  editedAt?: Date | string;
  forwardFrom?: string;
  /** Call metadata when type references a call event */
  callId?: string;
}