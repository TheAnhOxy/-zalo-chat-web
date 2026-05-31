import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Composer } from "@/src/components/chat/Composer";

describe("Composer", () => {
  it("sends text on submit", async () => {
    const onSend = jest.fn();
    const user = userEvent.setup();

    render(
      <Composer
        uploads={[]}
        onSend={onSend}
        onFilesSelected={jest.fn()}
        onCancelUpload={jest.fn()}
        onTyping={jest.fn()}
        onCancelReply={jest.fn()}
        onCancelEdit={jest.fn()}
      />
    );

    const input = screen.getByLabelText(/Nhập tin nhắn/i);
    await user.type(input, "Xin chào");
    await user.click(screen.getByLabelText(/Gửi/i));

    expect(onSend).toHaveBeenCalledWith("Xin chào");
  });

  it("shows blocked state", () => {
    render(
      <Composer
        blocked
        uploads={[]}
        onSend={jest.fn()}
        onFilesSelected={jest.fn()}
        onCancelUpload={jest.fn()}
        onTyping={jest.fn()}
        onCancelReply={jest.fn()}
        onCancelEdit={jest.fn()}
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/không thể nhắn tin/i);
  });
});
