import { apiClient } from "@/src/services/api/client";
import { parseConversationFromApi, parseMessageFromApi } from "@/src/lib/parse-api";
import { IConversation } from "@/src/types/conversation";
import { IMessage } from "@/src/types/message";

const DEFAULT_LIMIT = 50;

export interface MessagesPage {
  messages: IMessage[];
  skip: number;
  hasMore: boolean;
}

function asArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as { data: unknown }).data)) {
    return (data as { data: unknown[] }).data;
  }
  if (data && typeof data === "object" && Array.isArray((data as { conversations?: unknown[] }).conversations)) {
    return (data as { conversations: unknown[] }).conversations;
  }
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown[] }).items)) {
    return (data as { items: unknown[] }).items;
  }
  if (data && typeof data === "object" && Array.isArray((data as { messages?: unknown[] }).messages)) {
    return (data as { messages: unknown[] }).messages;
  }
  if (data && typeof data === "object" && Array.isArray((data as { results?: unknown[] }).results)) {
    return (data as { results: unknown[] }).results;
  }
  if (data && typeof data === "object" && ((data as { _id?: unknown })._id || (data as { id?: unknown }).id)) {
    return [data];
  }
  return [];
}

export const conversationsApi = {
  /** GET /conversations/member/:userId — same as mobile getConversations */
  listForUser(userId: string) {
    return apiClient
      .get<unknown>(`/conversations/member/${userId}`)
      .then((res) => asArray(res.data).map((item) => parseConversationFromApi(item as Record<string, unknown>)));
  },

  getById(conversationId: string) {
    return apiClient
      .get<unknown>(`/conversations/${conversationId}`)
      .then((res) => {
        const payload = (res.data as any)?.data || res.data;
        return parseConversationFromApi(payload as Record<string, unknown>);
      });
  },

  /**
   * Mobile: find existing PRIVATE chat or POST /conversations
   * @see api_service.dart findOrCreateDirectConversation
   */
  async findOrCreateDirect(currentUserId: string, targetUserId: string): Promise<IConversation> {
    const existing = await conversationsApi.listForUser(currentUserId);
    const found = existing.find(
      (c) => c.type === "PRIVATE" && c.participants.some((p) => p.userId === targetUserId)
    );
    if (found) return found;

    const res = await apiClient.post<unknown>("/conversations", {
      type: "PRIVATE",
      members: [{ userId: currentUserId }, { userId: targetUserId }],
    });
    const payload = (res.data as any)?.data || res.data;
    return parseConversationFromApi(payload as Record<string, unknown>);
  },

  /**
   * GET /messages/conversation/:id?userId=&limit=&skip=
   * Returns raw array (newest batch per skip), same as mobile getMessages
   */
  getMessages(
    conversationId: string,
    userId: string,
    options?: { limit?: number; skip?: number; beforeMessageId?: string }
  ): Promise<MessagesPage> {
    const limit = options?.limit ?? DEFAULT_LIMIT;
    const skip = options?.skip ?? 0;
    const beforeMessageId = options?.beforeMessageId;

    return apiClient
      .get<unknown>(`/messages/conversation/${conversationId}`, {
        params: { userId, limit, skip, beforeMessageId },
      })
      .then((res) => {
        const payload = res.data as any;
        const list = asArray(payload?.data || payload).map((item) =>
          parseMessageFromApi(item as Record<string, unknown>)
        );
        return {
          messages: list,
          skip,
          hasMore: payload?.hasMore ?? payload?.metadata?.hasMore ?? (list.length >= limit),
        };
      });
  },

  /** POST /messages/conversation/:id/deleted-by — xóa lịch sử phía tôi */
  deleteConversationHistoryForMe(conversationId: string, userId: string) {
    return apiClient.post(`/messages/conversation/${conversationId}/deleted-by`, { userId });
  },

  /** PATCH /conversations/:id/pin */
  setConversationPinned(conversationId: string, userId: string, isPinned: boolean) {
    return apiClient.patch(`/conversations/${conversationId}/pin`, { userId, isPinned });
  },

  getPinnedMessages(conversationId: string, userId: string) {
    return apiClient
      .get<unknown>(`/messages/conversation/${conversationId}`, {
        params: { userId, pinned: true, limit: 50, skip: 0 },
      })
      .then((res) =>
        asArray(res.data).map((item) => parseMessageFromApi(item as Record<string, unknown>))
      );
  },

  /** GET /calls/conversation/:conversationId */
  getCalls(conversationId: string) {
    return apiClient
      .get<unknown>(`/calls/conversation/${conversationId}`)
      .then((res) => asArray(res.data) as Record<string, unknown>[]);
  },
};
