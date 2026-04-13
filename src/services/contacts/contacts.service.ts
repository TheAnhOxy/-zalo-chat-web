import { apiClient } from "@/src/services/api/client";
import { IUser } from "@/src/types/user";

export interface GroupItem {
  _id: string;
  name: string;
  description?: string;
  avatar?: string;
  memberCount: number;
  updatedAt: string;
}

// NOTE: Backend endpoints for contacts/groups are not specified in the request.
// Using conventional endpoints so frontend is ready; adjust path if your backend differs.
export const contactsService = {
  getFriends(userId: string) {
    return apiClient.get<IUser[]>(`/contacts/${userId}/friends`).then((res) => res.data);
  },

  getGroups(userId: string) {
    return apiClient.get<GroupItem[]>(`/groups/${userId}`).then((res) => res.data);
  },
};
