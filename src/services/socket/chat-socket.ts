import { socketService } from "@/src/services/socket/socket.service";
import { SOCKET_CLIENT, SOCKET_SERVER, normalizeSocketMessagePayload } from "@/src/services/socket/adapter";
import { parseMessageFromApi, parsePresenceFromSocket } from "@/src/lib/parse-api";
import { IMessage } from "@/src/types/message";
import { IUserPresence } from "@/src/types/presence";

export type ChatSocketHandlers = {
  onMessage?: (message: IMessage) => void;
  onMessageSeen?: (data: {
    conversationId: string;
    messageId: string;
    status?: IMessage["status"];
    seenBy?: IMessage["seenBy"];
    userId?: string;
  }) => void;
  onTyping?: (data: { conversationId: string; userId: string; isTyping: boolean }) => void;
  onReaction?: (data: { messageId: string; reactions: IMessage["reactions"] }) => void;
  onPresence?: (presence: IUserPresence) => void;
  onMessageUpdated?: (message: IMessage) => void;
  onMessageRecalled?: (data: { messageId: string; conversationId: string }) => void;
  onMessagePinnedUpdate?: (data: { conversationId: string; messageId?: string; isPinned?: boolean }) => void;
  onConversationCallUpdated?: (data: {
    conversationId: string;
    lastMessage?: {
      content?: string;
      senderId?: string;
      createdAt?: string;
    };
    callData?: Record<string, unknown>;
  }) => void;
  onReconnect?: () => void;
};

function toMessage(raw: Record<string, unknown>): IMessage {
  return parseMessageFromApi(raw);
}

export class ChatSocket {
  private handlers: ChatSocketHandlers = {};
  private joinedConversations = new Set<string>();
  private boundHandlers: Array<{ event: string; fn: (...args: unknown[]) => void }> = [];

  constructor(private userId: string) {}

  setHandlers(h: ChatSocketHandlers) {
    this.handlers = h;
  }

  subscribe() {
    const receive = (...args: unknown[]) => {
      const raw = normalizeSocketMessagePayload(args[0]);
      if (raw) this.handlers.onMessage?.(toMessage(raw));
    };

    const messageSeen = (...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      if (!data?.conversationId || !data?.messageId) return;
      const seenBy = Array.isArray(data.seenBy)
        ? (data.seenBy as Record<string, unknown>[]).map((s) => ({
            userId: String(s.userId ?? ""),
            seenAt: s.seenAt ? new Date(String(s.seenAt)) : new Date(),
          }))
        : undefined;
      this.handlers.onMessageSeen?.({
        conversationId: String(data.conversationId),
        messageId: String(data.messageId),
        status: data.status as IMessage["status"] | undefined,
        seenBy,
        userId: data.userId ? String(data.userId) : undefined,
      });
    };

    const typing = (...args: unknown[]) => {
      const data = args[0] as { conversationId?: string; userId?: string };
      if (data?.conversationId && data?.userId) {
        this.handlers.onTyping?.({
          conversationId: data.conversationId,
          userId: data.userId,
          isTyping: true,
        });
      }
    };

    const stopTyping = (...args: unknown[]) => {
      const data = args[0] as { conversationId?: string; userId?: string };
      if (data?.conversationId && data?.userId) {
        this.handlers.onTyping?.({
          conversationId: data.conversationId,
          userId: data.userId,
          isTyping: false,
        });
      }
    };

    const presence = (...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      if (data?.userId) this.handlers.onPresence?.(parsePresenceFromSocket(data));
    };

    const updated = (...args: unknown[]) => {
      const raw = normalizeSocketMessagePayload(args[0]);
      if (raw) this.handlers.onMessageUpdated?.(toMessage(raw));
    };

    const recalled = (data: { messageId?: string; conversationId?: string }) => {
      if (data?.messageId) {
        this.handlers.onMessageRecalled?.({
          messageId: data.messageId,
          conversationId: data.conversationId || "",
        });
      }
    };

    const pinnedUpdate = (data: Record<string, unknown>) => {
      if (data.conversationId) {
        this.handlers.onMessagePinnedUpdate?.({
          conversationId: String(data.conversationId),
          messageId: data.messageId ? String(data.messageId) : undefined,
          isPinned: typeof data.isPinned === "boolean" ? data.isPinned : undefined,
        });
      }
    };

    const conversationCallUpdated = (...args: unknown[]) => {
      const data = args[0] as Record<string, unknown>;
      if (!data?.conversationId) return;
      this.handlers.onConversationCallUpdated?.({
        conversationId: String(data.conversationId),
        lastMessage:
          data.lastMessage && typeof data.lastMessage === "object"
            ? {
                content: String((data.lastMessage as Record<string, unknown>).content ?? ""),
                senderId: String((data.lastMessage as Record<string, unknown>).senderId ?? ""),
                createdAt: String((data.lastMessage as Record<string, unknown>).createdAt ?? ""),
              }
            : undefined,
        callData:
          data.callData && typeof data.callData === "object"
            ? (data.callData as Record<string, unknown>)
            : undefined,
      });
    };

    const pairs: Array<[string, (...args: unknown[]) => void]> = [
      [SOCKET_SERVER.newMessage, receive],
      [SOCKET_SERVER.messageSeen, messageSeen],
      [SOCKET_SERVER.typing, typing],
      [SOCKET_SERVER.stopTyping, stopTyping],
      [SOCKET_SERVER.userStatusChanged, presence],
      [SOCKET_SERVER.messageUpdated, updated],
      [SOCKET_SERVER.messageRecalled, (...a) => recalled(a[0] as Parameters<typeof recalled>[0])],
      [SOCKET_SERVER.messagePinnedUpdate, pinnedUpdate as (...args: unknown[]) => void],
      [SOCKET_SERVER.conversationCallUpdated, conversationCallUpdated],
    ];

    for (const [event, fn] of pairs) {
      socketService.on(event, fn);
      this.boundHandlers.push({ event, fn });
    }

    socketService.on("connect", () => {
      socketService.emit(SOCKET_CLIENT.joinUserRoom, { userId: this.userId });
      for (const id of this.joinedConversations) {
        this.joinConversation(id);
      }
      this.handlers.onReconnect?.();
    });
  }

  unsubscribe() {
    for (const { event, fn } of this.boundHandlers) {
      socketService.off(event, fn);
    }
    this.boundHandlers = [];
  }

  joinConversation(conversationId: string) {
    this.joinedConversations.add(conversationId);
    socketService.emit(SOCKET_CLIENT.joinConversation, { conversationId });
  }

  leaveConversation(conversationId: string) {
    this.joinedConversations.delete(conversationId);
  }

  sendTyping(conversationId: string, isTyping: boolean) {
    if (isTyping) {
      socketService.emit(SOCKET_CLIENT.typing, { conversationId, userId: this.userId });
    } else {
      socketService.emit(SOCKET_CLIENT.stopTyping, { conversationId, userId: this.userId });
    }
  }

  sendMessage(payload: Record<string, unknown>) {
    socketService.emit(SOCKET_CLIENT.sendMessage, payload);
  }

  editMessage(messageId: string, content: string, conversationId: string) {
    socketService.emit(SOCKET_CLIENT.editMessage, { messageId, content, conversationId });
  }

  recallMessage(messageId: string, conversationId: string) {
    socketService.emit(SOCKET_CLIENT.recallMessage, { messageId, conversationId });
  }

  deleteMessageForMe(messageId: string) {
    socketService.emit(SOCKET_CLIENT.deleteMessageMe, { messageId, userId: this.userId });
  }

  markConversationSeen(conversationId: string) {
    socketService.emit(SOCKET_CLIENT.seenConversation, {
      conversationId,
      userId: this.userId,
    });
  }

  addReaction(messageId: string, type: string, conversationId: string) {
    socketService.emit(SOCKET_CLIENT.addReaction, {
      messageId,
      userId: this.userId,
      type,
      conversationId,
    });
  }

  removeReaction(messageId: string, conversationId: string) {
    socketService.emit(SOCKET_CLIENT.removeReaction, {
      messageId,
      userId: this.userId,
      conversationId,
    });
  }

  pinMessage(messageId: string, conversationId: string) {
    socketService.emit(SOCKET_CLIENT.pinMessage, { messageId, conversationId, userId: this.userId });
  }

  unpinMessage(messageId: string, conversationId: string) {
    socketService.emit(SOCKET_CLIENT.unpinMessage, { messageId, conversationId, userId: this.userId });
  }
}
