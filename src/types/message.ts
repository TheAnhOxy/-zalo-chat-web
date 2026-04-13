export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'VOICE' | 'LOCATION' | 'CONTACT';
export type MessageStatus = 'SENDING' | 'SENT' | 'DELIVERED' | 'SEEN';
export type ReactionType = 'LIKE' | 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY';

export interface IMessageMetadata {
  fileName?: string;
  fileSize?: number;
  thumbnail?: string;
  lat?: number;
  lng?: number;
  duration?: number; // Cho Voice/Video
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
  replyTo?: string; // ID của message được reply
  status: MessageStatus;
  isRecalled: boolean;
  deletedBy: string[]; // Chứa UserID của những người đã xóa tin nhắn ở phía họ
  reactions: IReaction[];
  seenBy: ISeenBy[];
  createdAt: Date;
  updatedAt: Date;
}