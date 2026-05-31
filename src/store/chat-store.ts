import { create } from "zustand";
import { IMessage } from "@/src/types/message";
import { IConversation } from "@/src/types/conversation";
import { IUserPresence } from "@/src/types/presence";
import { dedupeMessagesById, normalizeMessage, sortMessagesAsc } from "@/src/lib/messages";

export interface MessagesSlice {
  byId: Record<string, IMessage>;
  order: string[];
  loading: boolean;
  hasMore: boolean;
  /** skip offset for next GET /messages/conversation (mobile pagination) */
  skip: number;
  error: string | null;
}

const emptySlice = (): MessagesSlice => ({
  byId: {},
  order: [],
  loading: false,
  hasMore: true,
  skip: 0,
  error: null,
});

interface ChatState {
  conversations: Record<string, IConversation>;
  messagesByConversation: Record<string, MessagesSlice>;
  presenceByUser: Record<string, IUserPresence>;
  typingByConversation: Record<string, Set<string>>;
  ui: {
    replyToId: string | null;
    editingId: string | null;
    selectionMode: boolean;
    selectedIds: Set<string>;
    searchQuery: string;
    isAtBottom: boolean;
    locale: "vi" | "en";
    socketConnected: boolean;
  };

  setConversation: (c: IConversation) => void;
  setMessagesSlice: (conversationId: string, patch: Partial<MessagesSlice>) => void;
  upsertMessage: (conversationId: string, message: IMessage) => void;
  upsertMessages: (conversationId: string, messages: IMessage[], prepend?: boolean) => void;
  removeMessage: (conversationId: string, messageId: string) => void;
  updateMessage: (conversationId: string, messageId: string, patch: Partial<IMessage>) => void;
  reconcileOptimistic: (conversationId: string, clientTempId: string, serverMessage: IMessage) => void;
  setPresence: (p: IUserPresence) => void;
  setTyping: (conversationId: string, userId: string, isTyping: boolean) => void;
  setUi: (patch: Partial<ChatState["ui"]>) => void;
  toggleSelection: (messageId: string) => void;
  clearSelection: () => void;
  resetConversationMessages: (conversationId: string) => void;
}

function messageKey(m: IMessage): string {
  return m._id || m.clientTempId || "";
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: {},
  messagesByConversation: {},
  presenceByUser: {},
  typingByConversation: {},
  ui: {
    replyToId: null,
    editingId: null,
    selectionMode: false,
    selectedIds: new Set(),
    searchQuery: "",
    isAtBottom: true,
    locale: "vi",
    socketConnected: false,
  },

  setConversation: (c) =>
    set((s) => ({
      conversations: { ...s.conversations, [c._id]: c },
    })),

  setMessagesSlice: (conversationId, patch) =>
    set((s) => {
      const prev = s.messagesByConversation[conversationId] ?? emptySlice();
      return {
        messagesByConversation: {
          ...s.messagesByConversation,
          [conversationId]: { ...prev, ...patch },
        },
      };
    }),

  resetConversationMessages: (conversationId) =>
    set((s) => ({
      messagesByConversation: {
        ...s.messagesByConversation,
        [conversationId]: emptySlice(),
      },
    })),

  upsertMessage: (conversationId, message) => {
    const m = normalizeMessage(message);
    const key = messageKey(m);
    if (!key) return;
    set((s) => {
      const slice = s.messagesByConversation[conversationId] ?? emptySlice();
      // If this is a server-assigned id (not a temp id), try to dedupe any optimistic/temp message
      let byId = { ...slice.byId };
      let order = slice.order.slice();

      const isServerId = !String(m._id || "").startsWith("temp_");
      if (isServerId) {
        // find possible matching temp message
        const existingEntry = Object.entries(byId).find(([id, existing]) => {
          if (!existing) return false;
          // match optimistic temp messages by sender/content and close timestamp
          const existingCreated = new Date(String(existing.createdAt)).getTime();
          const newCreated = new Date(String(m.createdAt)).getTime();
          const timeDiff = Math.abs(existingCreated - newCreated);
          return (
            (String(existing.clientTempId || existing._id).startsWith("temp_") || String(id).startsWith("temp_")) &&
            existing.senderId === m.senderId &&
            existing.content === m.content &&
            timeDiff <= 5000
          );
        });

        if (existingEntry) {
          const [oldId] = existingEntry;
          // replace old temp entry with server message
          const newKey = messageKey(m);
          delete byId[oldId];
          byId[newKey] = m;
          order = order.map((id) => (id === oldId ? newKey : id));
          return {
            messagesByConversation: {
              ...s.messagesByConversation,
              [conversationId]: { ...slice, byId, order },
            },
          };
        }
      }

      // default insert/merge
      byId = { ...byId, [key]: m };
      order = order.includes(key) ? order : [...order, key];
      return {
        messagesByConversation: {
          ...s.messagesByConversation,
          [conversationId]: { ...slice, byId, order },
        },
      };
    });
  },

  upsertMessages: (conversationId, messages) => {
    set((s) => {
      const slice = s.messagesByConversation[conversationId] ?? emptySlice();
      const byId = { ...slice.byId };
      for (const raw of messages) {
        const m = normalizeMessage(raw);
        const key = messageKey(m);
        if (!key) continue;
        byId[key] = m;
      }
      const list = sortMessagesAsc(Object.values(byId));
      const order = list.map((m) => messageKey(m)).filter(Boolean);
      return {
        messagesByConversation: {
          ...s.messagesByConversation,
          [conversationId]: { ...slice, byId, order },
        },
      };
    });
  },

  removeMessage: (conversationId, messageId) =>
    set((s) => {
      const slice = s.messagesByConversation[conversationId];
      if (!slice) return s;
      const { [messageId]: _, ...byId } = slice.byId;
      return {
        messagesByConversation: {
          ...s.messagesByConversation,
          [conversationId]: {
            ...slice,
            byId,
            order: slice.order.filter((id) => id !== messageId),
          },
        },
      };
    }),

  updateMessage: (conversationId, messageId, patch) =>
    set((s) => {
      const slice = s.messagesByConversation[conversationId];
      if (!slice?.byId[messageId]) return s;
      return {
        messagesByConversation: {
          ...s.messagesByConversation,
          [conversationId]: {
            ...slice,
            byId: {
              ...slice.byId,
              [messageId]: { ...slice.byId[messageId], ...patch },
            },
          },
        },
      };
    }),

  reconcileOptimistic: (conversationId, clientTempId, serverMessage) => {
    const state = get();
    const slice = state.messagesByConversation[conversationId];
    if (!slice) {
      get().upsertMessage(conversationId, serverMessage);
      return;
    }
    const { [clientTempId]: temp, ...restById } = slice.byId;
    const serverKey = serverMessage._id;
    const byId = { ...restById, [serverKey]: normalizeMessage({ ...serverMessage, clientTempId: undefined }) };
    const order = slice.order.map((id) => (id === clientTempId ? serverKey : id));
    set({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: { ...slice, byId, order },
      },
    });
  },

  setPresence: (p) =>
    set((s) => ({
      presenceByUser: { ...s.presenceByUser, [p.userId]: p },
    })),

  setTyping: (conversationId, userId, isTyping) =>
    set((s) => {
      const current = new Set(s.typingByConversation[conversationId] ?? []);
      if (isTyping) current.add(userId);
      else current.delete(userId);
      return {
        typingByConversation: {
          ...s.typingByConversation,
          [conversationId]: current,
        },
      };
    }),

  setUi: (patch) =>
    set((s) => ({
      ui: { ...s.ui, ...patch },
    })),

  toggleSelection: (messageId) =>
    set((s) => {
      const next = new Set(s.ui.selectedIds);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return { ui: { ...s.ui, selectedIds: next, selectionMode: next.size > 0 } };
    }),

  clearSelection: () =>
    set((s) => ({
      ui: { ...s.ui, selectedIds: new Set(), selectionMode: false },
    })),
}));

export function selectOrderedMessages(conversationId: string): IMessage[] {
  const slice = useChatStore.getState().messagesByConversation[conversationId];
  if (!slice) return [];
  return slice.order.map((id) => slice.byId[id]).filter(Boolean);
}
