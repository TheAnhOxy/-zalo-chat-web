import { render, screen } from "@testing-library/react";
import { TypingIndicator } from "@/src/components/chat/TypingIndicator";

describe("TypingIndicator", () => {
  it("renders nothing when no names", () => {
    const { container } = render(<TypingIndicator names={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows typing status", () => {
    render(<TypingIndicator names={["An"]} />);
    expect(screen.getByRole("status")).toHaveTextContent(/An đang nhập/i);
  });
});
