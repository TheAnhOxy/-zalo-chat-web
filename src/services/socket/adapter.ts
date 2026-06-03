/**
 * Socket contract from zalo-chat-mobile (lib/services/socket_service.dart + chat_controller.dart).
 * Backend uses these exact event names — not message:send / message:receive aliases.
 */

export const SOCKET_CLIENT = {
  joinUserRoom: "join_user_room",
  joinConversation: "join_conversation",
  sendMessage: "send_message",
  editMessage: "edit_message",
  recallMessage: "recall_message",
  deleteMessageMe: "delete_message_me",
  addReaction: "add_reaction",
  removeReaction: "remove_reaction",
  typing: "typing",
  stopTyping: "stop_typing",
  seenConversation: "seen_conversation",
  pinMessage: "pin_message",
  unpinMessage: "unpin_message",
} as const;

export const SOCKET_SERVER = {
  newMessage: "new_message",
  messageSeen: "message_seen",
  typing: "typing",
  stopTyping: "stop_typing",
  messagePinnedUpdate: "message_pinned_update",
  userStatusChanged: "user_status_changed",
  messageUpdated: "message_updated",
  messageDeleted: "message_deleted",
  conversationCallUpdated: "conversation_call_updated",
  callEnded: "call_ended",
  callRejected: "call_rejected",
  conversationHistoryCleared: "conversation_history_cleared",
} as const;

/** Normalize incoming message payloads (flat or nested under `message`) */
export function normalizeSocketMessagePayload(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (
    p.conversationId &&
    (p._id || p.id) &&
    (p.content !== undefined || p.type !== undefined || p.messageType !== undefined)
  ) {
    return p;
  }
  if (p.message && typeof p.message === "object") {
    return p.message as Record<string, unknown>;
  }
  return p;
}
