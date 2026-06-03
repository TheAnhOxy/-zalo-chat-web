import { apiClient } from "./client";

export interface ApiNotification {
  _id?: string;
  id?: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  receiverId: string;
  type: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  conversationId?: string;
}

export const NotificationsApi = {
  getNotifications: async (userId: string): Promise<ApiNotification[]> => {
    try {
      const res = await apiClient.get(`/notifications/receiver/${userId}`);
      return res.data;
    } catch (e) {
      console.error("Lỗi getNotifications:", e);
      return [];
    }
  },

  markAsRead: async (notificationId: string): Promise<boolean> => {
    try {
      const res = await apiClient.patch(`/notifications/${notificationId}/read`);
      return res.status === 200;
    } catch (e) {
      console.error("Lỗi markAsRead:", e);
      return false;
    }
  },

  markAllAsRead: async (userId: string): Promise<boolean> => {
    try {
      const res = await apiClient.patch(`/notifications/receiver/${userId}/read-all`);
      return res.status === 200 || res.status === 201;
    } catch (e) {
      console.error("Lỗi markAllAsRead:", e);
      return false;
    }
  },

  deleteNotification: async (notificationId: string): Promise<boolean> => {
    try {
      const res = await apiClient.delete(`/notifications/${notificationId}`);
      return res.status === 200 || res.status === 204;
    } catch (e) {
      console.error("Lỗi deleteNotification:", e);
      return false;
    }
  },
};
