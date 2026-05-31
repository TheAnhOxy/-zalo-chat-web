import { render, screen } from "@testing-library/react";
import { MessageItem } from "@/src/components/chat/MessageItem";
import { IMessage } from "@/src/types/message";

const baseMessage: IMessage = {
  _id: "m1",
  conversationId: "c1",
  senderId: "me",
  type: "TEXT",
  content: "Hello <b>world</b>",
  status: "SENT",
  isRecalled: false,
  deletedBy: [],
  reactions: [],
  seenBy: [],
  createdAt: "2026-05-31T10:00:00Z",
  updatedAt: "2026-05-31T10:00:00Z",
};

describe("MessageItem", () => {
  it("renders text content sanitized", () => {
    render(
      <MessageItem
        message={baseMessage}
        isMine
        onReply={jest.fn()}
        onDelete={jest.fn()}
        onReact={jest.fn()}
      />
    );

    expect(screen.getByRole("listitem")).toBeInTheDocument();
    expect(screen.getByText(/world/)).toBeInTheDocument();
  });

  it("renders image attachment", () => {
    render(
      <MessageItem
        message={{
          ...baseMessage,
          type: "IMAGE",
          content: "https://example.com/a.png",
        }}
        isMine={false}
        showAvatar
        onReply={jest.fn()}
        onDelete={jest.fn()}
        onReact={jest.fn()}
      />
    );

    expect(screen.getByRole("img")).toHaveAttribute("src", "https://example.com/a.png");
  });
});
