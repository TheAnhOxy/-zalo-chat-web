import { apiClient } from "@/src/services/api/client";

export interface StoryItem {
  _id: string;
  userId?: string;
  type?: string;
  mediaUrl?: string;
  caption?: string;
  createdAt?: string;
  user?: { fullName?: string; avatar?: string };
  userName?: string;
  userAvatar?: string;
  viewers?: string[];
  thumbnailUrl?: string;
}

export interface StoryUserModel {
  id: string;
  fullName: string;
  avatar: string;
}

export interface StoryGroupModel {
  user: StoryUserModel;
  hasUnseen: boolean;
  lastStoryTime: string;
  stories: StoryItem[];
}

export const storiesService = {
  async getStories(userId?: string): Promise<StoryItem[]> {
    try {
      const params = userId ? { excludeUserId: "" } : {}; // exclude nothing, show all friends
      const res = await apiClient.get<StoryItem[]>("/stories", { params });
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  async getStoryFeed(userId: string): Promise<StoryGroupModel[]> {
    try {
      const res = await apiClient.get<StoryGroupModel[]>(`/stories/feed/${userId}`);
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },

  async viewStory(id: string, viewerId: string): Promise<void> {
    try {
      await apiClient.post(`/stories/${id}/viewers`, { viewerId });
    } catch (e) {
      console.error("Lỗi khi view story:", e);
    }
  }
};
