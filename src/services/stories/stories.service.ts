import { apiClient } from "@/src/services/api/client";

export interface StoryItem {
  _id: string;
  userId?: string;
  type?: string;
  mediaUrl?: string;
  caption?: string;
  createdAt?: string;
  user?: { fullName?: string; avatar?: string };
}

export const storiesService = {
  async getStories(): Promise<StoryItem[]> {
    try {
      const res = await apiClient.get<StoryItem[]>("/stories");
      return Array.isArray(res.data) ? res.data : [];
    } catch {
      return [];
    }
  },
};
