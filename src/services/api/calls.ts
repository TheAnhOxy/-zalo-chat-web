import { apiClient } from "@/src/services/api/client";
import { ICall } from "@/src/types/call";

function asArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as { data: unknown }).data)) {
    return (data as { data: unknown[] }).data;
  }
  if (data && typeof data === "object" && Array.isArray((data as { calls?: unknown[] }).calls)) {
    return (data as { calls: unknown[] }).calls;
  }
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown[] }).items)) {
    return (data as { items: unknown[] }).items;
  }
  if (data && typeof data === "object" && ((data as { _id?: unknown })._id || (data as { id?: unknown }).id)) {
    return [data];
  }
  return [];
}

function parseCall(raw: Record<string, unknown>): ICall {
  const startedAt = raw.startedAt ? new Date(raw.startedAt as string) : undefined;
  const endedAt = raw.endedAt ? new Date(raw.endedAt as string) : undefined;
  const createdAt = raw.createdAt ? new Date(raw.createdAt as string) : new Date();

  return {
    _id: String(raw._id || ""),
    conversationId: String(raw.conversationId || ""),
    callerId: String(raw.callerId || ""),
    participants: Array.isArray(raw.participants) ? raw.participants.map(String) : [],
    type: (raw.type as "VOICE" | "VIDEO") || "VOICE",
    status: (raw.status as "CALLING" | "ACCEPTED" | "REJECTED" | "MISSED" | "ENDED") || "CALLING",
    startedAt,
    endedAt,
    duration: Number(raw.duration || 0),
    createdAt,
  };
}

export const callsApi = {
  /** GET /calls/conversation/:conversationId — fetch all calls for a conversation */
  listByConversation(conversationId: string) {
    return apiClient
      .get<unknown>(`/calls/conversation/${conversationId}`)
      .then((res) => asArray(res.data).map((item) => parseCall(item as Record<string, unknown>)))
      .catch(() => []);
  },

  /** GET /calls/:callId — fetch a single call by ID */
  getById(callId: string) {
    return apiClient
      .get<unknown>(`/calls/${callId}`)
      .then((res) => {
        const payload = (res.data as any)?.data || res.data;
        return parseCall(payload as Record<string, unknown>);
      })
      .catch(() => null);
  },
};
