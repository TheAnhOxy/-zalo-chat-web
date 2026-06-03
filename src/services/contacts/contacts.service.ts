import { apiClient } from "@/src/services/api/client";
import { extractMongoId, parseConversationFromApi } from "@/src/lib/parse-api";
import { IConversation } from "@/src/types/conversation";
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
            const rid = extractMongoId(f.requesterId);
            const aid = extractMongoId(f.addresseeId);
            const friendId = rid === userId ? aid : rid;
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

  async getGroups(userId: string): Promise<GroupItem[]> {
    const res = await apiClient.get<unknown>(`/conversations/member/${userId}`);
    const rows = Array.isArray(res.data) ? res.data : [];
    const groups = rows
      .filter((c) => (c as { type?: string }).type === "GROUP")
      .map((c) => parseConversationFromApi(c as Record<string, unknown>))
      .map((conv) => ({
        _id: conv._id,
        name: conv.name?.trim() || "Nhóm",
        description: conv.description,
        avatar: conv.avatar?.trim() || undefined,
        memberCount: conv.participants.length,
        updatedAt:
          typeof conv.updatedAt === "string"
            ? conv.updatedAt
            : new Date(conv.updatedAt).toISOString(),
        members: conv.participants.map((p) => ({
          userId: p.userId,
          role: p.role ?? "MEMBER",
        })),
      }))
      .sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    return groups;
  },

  async getReceivedRequests(userId: string) {
    // According to flutter app, we get friendships and filter by PENDING and addresseeId == userId
    const res = await apiClient.get<any[]>(`/friendships/user/${userId}`);
    const pending = res.data.filter(
      (f) => f.status === "PENDING" && extractMongoId(f.addresseeId) === userId
    );

    const requests = await Promise.all(
      pending.map(async (f) => {
        try {
          const userRes = await apiClient.get<IUser>(`/users/${extractMongoId(f.requesterId)}`);
          return {
            id: extractMongoId(f._id ?? f.id),
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
    const pending = res.data.filter(
      (f) => f.status === "PENDING" && extractMongoId(f.requesterId) === userId
    );

    const requests = await Promise.all(
      pending.map(async (f) => {
        try {
          const userRes = await apiClient.get<IUser>(`/users/${extractMongoId(f.addresseeId)}`);
          return {
            id: extractMongoId(f._id ?? f.id),
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
      return res.data.filter(
        (f) => f.status === "PENDING" && extractMongoId(f.addresseeId) === userId
      ).length;
    } catch {
      return 0;
    }
  },

  sendFriendRequest(requesterId: string, receiverId: string, message?: string) {
    return apiClient.post(`/friendships`, { requesterId, addresseeId: receiverId, message });
  },

  /** Quan hệ giữa hai user (giống mobile getFriendshipBetween). */
  async getFriendshipBetween(
    myUserId: string,
    otherUserId: string
  ): Promise<{ id: string; status: string; requesterId: string; addresseeId: string } | null> {
    if (!myUserId || !otherUserId) return null;
    try {
      const res = await apiClient.get<{ _id?: string; id?: string; requesterId: unknown; addresseeId: unknown; status: string }[]>(
        `/friendships/user/${myUserId}`
      );
      for (const f of res.data) {
        const rid = extractMongoId(f.requesterId);
        const aid = extractMongoId(f.addresseeId);
        const match =
          (rid === myUserId && aid === otherUserId) || (rid === otherUserId && aid === myUserId);
        if (!match) continue;
        const id = extractMongoId(f._id ?? f.id);
        if (!id) continue;
        return { id, status: f.status, requesterId: rid, addresseeId: aid };
      }
      return null;
    } catch {
      return null;
    }
  },

  createGroup(name: string, memberIds: string[], creatorId: string, avatar?: string) {
    const members = memberIds.map((id) => ({
      userId: id,
      role: id === creatorId ? "ADMIN" : "MEMBER",
    }));

    const payload: Record<string, unknown> = {
      type: "GROUP",
      name,
      members,
    };
    if (avatar) payload.avatar = avatar;

    return apiClient.post<unknown>(`/conversations`, payload).then((res) => {
      const raw = (res.data as { data?: unknown })?.data ?? res.data;
      return parseConversationFromApi(raw as Record<string, unknown>) as IConversation;
    });
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
