
export type NotificationType = 'MESSAGE' | 'FRIEND_REQUEST' | 'CALL';
export interface INotification {
  _id: string;
  receiverId: string;
  type: NotificationType;
  content: string;
  data: {
    senderId?: string;
    conversationId?: string;
    messageId?: string;
  };
  isRead: boolean;
  createdAt: Date;
}