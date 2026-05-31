import { apiClient } from "@/src/services/api/client";
import { IUser } from "@/src/types/user";

export interface GroupItem {
  _id: string;
  name: string;
  description?: string;
  avatar?: string;
  memberCount: number;
  updatedAt: string;
  members?: { userId: string; role: string }[];
}

// NOTE: Backend endpoints for contacts/groups are not specified in the request.
// Using conventional endpoints so frontend is ready; adjust path if your backend differs.
export const contactsService = {
  async getFriends(userId: string) {
    try {
      const res = await apiClient.get<any[]>(`/friendships/user/${userId}`);
      const accepted = res.data.filter((f) => f.status === "ACCEPTED");
      
      const friends = await Promise.all(
        accepted.map(async (f) => {
          try {
            const friendId = f.requesterId === userId ? f.addresseeId : f.requesterId;
            const userRes = await apiClient.get<IUser>(`/users/${friendId}`);
            return userRes.data;
          } catch (e) {
            return null;
          }
        })
      );
      
      return friends.filter(Boolean) as IUser[];
    } catch (error) {
      console.error("Failed to fetch friends", error);
      return [];
    }
  },

  getGroups(userId: string) {
    return apiClient.get<any[]>(`/conversations/member/${userId}`).then((res) => {
      const groups = res.data.filter((c: any) => c.type === "GROUP");
      return groups as GroupItem[];
    });
  },

  async getReceivedRequests(userId: string) {
    // According to flutter app, we get friendships and filter by PENDING and addresseeId == userId
    const res = await apiClient.get<any[]>(`/friendships/user/${userId}`);
    const pending = res.data.filter((f) => f.status === "PENDING" && f.addresseeId === userId);
    
    // Fetch users for each request
    const requests = await Promise.all(
      pending.map(async (f) => {
        try {
          const userRes = await apiClient.get<IUser>(`/users/${f.requesterId}`);
          return {
            id: f._id || f.id,
            user: userRes.data,
            createdAt: f.createdAt,
          };
        } catch (e) {
          return null;
        }
      })
    );
    return requests.filter(Boolean) as { id: string; user: IUser; createdAt: string }[];
  },

  async getSentRequests(userId: string) {
    const res = await apiClient.get<any[]>(`/friendships/user/${userId}`);
    const pending = res.data.filter((f) => f.status === "PENDING" && f.requesterId === userId);
    
    const requests = await Promise.all(
      pending.map(async (f) => {
        try {
          const userRes = await apiClient.get<IUser>(`/users/${f.addresseeId}`);
          return {
            id: f._id || f.id,
            user: userRes.data,
            createdAt: f.createdAt,
          };
        } catch (e) {
          return null;
        }
      })
    );
    return requests.filter(Boolean) as { id: string; user: IUser; createdAt: string }[];
  },

  acceptFriendRequest(friendshipId: string) {
    return apiClient.patch(`/friendships/${friendshipId}`, { status: "ACCEPTED" });
  },

  rejectFriendRequest(friendshipId: string) {
    return apiClient.delete(`/friendships/${friendshipId}`);
  },

  searchByPhone(phone: string) {
    const normalized = phone.trim().replace(/\s+/g, "");
    return apiClient.get<IUser>(`/users/phone/${normalized}`).then(res => res.data).catch(() => null);
  },

  async getPendingRequestCount(userId: string): Promise<number> {
    try {
      const res = await apiClient.get<any[]>(`/friendships/user/${userId}`);
      return res.data.filter((f) => f.status === "PENDING" && f.addresseeId === userId).length;
    } catch {
      return 0;
    }
  },

  sendFriendRequest(requesterId: string, receiverId: string, message?: string) {
    return apiClient.post(`/friendships`, { requesterId, addresseeId: receiverId, message });
  },

  createGroup(name: string, memberIds: string[], creatorId: string, avatar?: string) {
    const members = memberIds.map((id) => ({
      userId: id,
      role: id === creatorId ? "ADMIN" : "MEMBER",
    }));

    const payload: any = {
      type: "GROUP",
      name,
      members,
    };
    if (avatar) payload.avatar = avatar;

    return apiClient.post(`/conversations`, payload).then(res => res.data);
  },

  async findOrCreateDirectConversation(currentUserId: string, targetUserId: string) {
    try {
      // 1. Tìm trong danh sách hội thoại hiện có (giống logic mobile)
      const res = await apiClient.get<any[]>(`/conversations/member/${currentUserId}`);
      const existing = res.data.find(
        (c: any) => c.type === "PRIVATE" && c.members.some((m: any) => m.userId === targetUserId || m._id === targetUserId)
      );

      if (existing) {
        return existing;
      }

      // 2. Nếu chưa có, tạo mới
      const payload = {
        type: "PRIVATE",
        members: [
          { userId: currentUserId, role: "MEMBER" },
          { userId: targetUserId, role: "MEMBER" }
        ]
      };
      const createRes = await apiClient.post(`/conversations`, payload);
      return createRes.data;
    } catch (e) {
      console.error("Failed to find or create conversation", e);
      return null;
    }
  },

  async uploadGroupAvatar(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("file", file);
    // apiClient might override Content-Type to application/json, so we use fetch or override it
    const res = await apiClient.post<any>("/conversations/avatar/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data.fileUrl || res.data.data?.fileUrl;
  }
};
