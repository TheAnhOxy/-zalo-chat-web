import { useChatStore } from "@/src/store/chat-store";
import { IMessage } from "@/src/types/message";

function resetStore() {
  useChatStore.setState({
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
  });
}

describe("chat store optimistic reconcile", () => {
  beforeEach(resetStore);

  it("replaces temp id with server message", () => {
    const convId = "c1";
    const temp: IMessage = {
      _id: "temp_1",
      clientTempId: "temp_1",
      conversationId: convId,
      senderId: "u1",
      type: "TEXT",
      content: "hi",
      status: "SENDING",
      isRecalled: false,
      deletedBy: [],
      reactions: [],
      seenBy: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    useChatStore.getState().upsertMessage(convId, temp);

    const server: IMessage = {
      ...temp,
      _id: "server_1",
      status: "SENT",
      clientTempId: undefined,
    };

    useChatStore.getState().reconcileOptimistic(convId, "temp_1", server);

    const slice = useChatStore.getState().messagesByConversation[convId];
    expect(slice.byId["server_1"]).toBeDefined();
    expect(slice.byId["temp_1"]).toBeUndefined();
    expect(slice.order).toContain("server_1");
  });
});
