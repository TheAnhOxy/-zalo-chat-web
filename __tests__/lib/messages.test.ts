import {
  dedupeMessagesById,
  formatDateSeparator,
  formatLastMessagePreview,
  groupMessagesForList,
  messageMatchesSearch,
  sortMessagesAsc,
} from "@/src/lib/messages";
import { IMessage } from "@/src/types/message";

function msg(partial: Partial<IMessage> & Pick<IMessage, "_id" | "senderId" | "content">): IMessage {
  return {
    conversationId: "c1",
    type: "TEXT",
    status: "SENT",
    isRecalled: false,
    deletedBy: [],
    reactions: [],
    seenBy: [],
    createdAt: partial.createdAt ?? "2026-05-31T10:00:00Z",
    updatedAt: partial.updatedAt ?? "2026-05-31T10:00:00Z",
    ...partial,
  };
}

describe("messages lib", () => {
  it("shows attachment label for media types", () => {
    expect(formatLastMessagePreview("https://cdn/a.jpg", { type: "IMAGE" })).toBe(
      "Đã gửi 1 tệp đính kèm"
    );
    expect(formatLastMessagePreview("voice.m4a", { type: "VOICE" })).toBe("Đã gửi 1 tệp đính kèm");
  });

  it("prefixes with Bạn when sender is current user", () => {
    expect(
      formatLastMessagePreview("Hello", { senderId: "u1", currentUserId: "u1" })
    ).toBe("Bạn: Hello");
  });

  it("detects image url without type", () => {
    expect(formatLastMessagePreview("https://x.com/a.png")).toBe("Đã gửi 1 tệp đính kèm");
  });

  it("dedupes by id", () => {
    const a = msg({ _id: "1", senderId: "u1", content: "a" });
    const result = dedupeMessagesById([a, a]);
    expect(result).toHaveLength(1);
  });

  it("sorts ascending by createdAt", () => {
    const older = msg({ _id: "1", senderId: "u1", content: "a", createdAt: "2026-05-31T09:00:00Z" });
    const newer = msg({ _id: "2", senderId: "u1", content: "b", createdAt: "2026-05-31T10:00:00Z" });
    expect(sortMessagesAsc([newer, older]).map((m) => m._id)).toEqual(["1", "2"]);
  });

  it("groups consecutive same-sender without avatar repeat", () => {
    const items = groupMessagesForList(
      [
        msg({ _id: "1", senderId: "them", content: "hi", createdAt: "2026-05-31T10:00:00Z" }),
        msg({ _id: "2", senderId: "them", content: "again", createdAt: "2026-05-31T10:01:00Z" }),
      ],
      "me"
    );
    const messageItems = items.filter((i) => i.kind === "message");
    expect(messageItems[0].kind === "message" && messageItems[0].showAvatar).toBe(true);
    expect(messageItems[1].kind === "message" && messageItems[1].showAvatar).toBe(false);
  });

  it("matches search query", () => {
    const m = msg({ _id: "1", senderId: "u1", content: "Hello World" });
    expect(messageMatchesSearch(m, "world")).toBe(true);
    expect(messageMatchesSearch(m, "xyz")).toBe(false);
  });

  it("formats today separator", () => {
    const label = formatDateSeparator(new Date().toISOString());
    expect(label).toBe("Hôm nay");
  });

  it("lists each image as its own message row", () => {
    const items = groupMessagesForList(
      [
        msg({
          _id: "1",
          senderId: "u1",
          type: "IMAGE",
          content: "https://cdn/1.jpg",
          createdAt: "2026-05-31T10:00:00Z",
        }),
        msg({
          _id: "2",
          senderId: "u1",
          type: "IMAGE",
          content: "https://cdn/2.jpg",
          createdAt: "2026-05-31T10:02:00Z",
        }),
      ],
      "me"
    );
    const rows = items.filter((i) => i.kind === "message");
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.kind === "message" && (r.message.type === "IMAGE"))).toBe(true);
  });
});
