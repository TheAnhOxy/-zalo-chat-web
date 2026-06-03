import { IMessage } from "@/src/types/message";

/** Khớp mobile group_chat_screen _pinSystemDisplayText */
export function formatSystemMessageText(message: IMessage): string {
  const content = message.content?.trim() ?? "";
  if (!content) return "";

  if (content.startsWith("PIN_MESSAGE|")) return "Đã ghim một tin nhắn";
  if (content.startsWith("UNPIN_MESSAGE|")) return "Đã bỏ ghim một tin nhắn";

  if (content.startsWith("ADD_MEMBER|")) {
    const parts = content.split("|");
    const actor = parts[1]?.trim() || "Ai đó";
    const peer = parts[2]?.trim() || "một thành viên";
    return `${actor} đã thêm ${peer} vào nhóm`;
  }

  if (content.startsWith("REMOVE_MEMBER|") || content.startsWith("KICK_MEMBER|")) {
    const parts = content.split("|");
    const actor = parts[1]?.trim() || "Ai đó";
    const peer = parts[2]?.trim() || "một thành viên";
    return `${actor} đã xóa ${peer} khỏi nhóm`;
  }

  if (content.startsWith("LEAVE_GROUP|")) {
    const parts = content.split("|");
    const actor = parts[1]?.trim() || "Ai đó";
    return `${actor} đã rời khỏi nhóm`;
  }

  if (content.startsWith("MAKE_ADMIN|")) {
    const parts = content.split("|");
    const member = parts[1]?.trim() || "một thành viên";
    const by = parts[2]?.trim() || "Ai đó";
    return `${by} đã đặt ${member} làm quản trị viên`;
  }

  if (content.startsWith("REVOKE_ADMIN|")) {
    const parts = content.split("|");
    const member = parts[1]?.trim() || "một thành viên";
    const by = parts[2]?.trim() || "Ai đó";
    return `${by} đã thu hồi quyền quản trị của ${member}`;
  }

  if (content.includes("Bạn đã ghim một tin nhắn")) return content;
  if (content.includes("ghim")) return content;

  return content;
}

export function isPinRelatedSystemMessage(message: IMessage): boolean {
  const content = message.content?.trim() ?? "";
  if (!content) return false;
  if (content.startsWith("PIN_MESSAGE|") || content.startsWith("UNPIN_MESSAGE|")) return true;
  if (content.startsWith("ADD_MEMBER|")) return true;
  if (content.startsWith("REMOVE_MEMBER|") || content.startsWith("KICK_MEMBER|")) return true;
  if (content.startsWith("LEAVE_GROUP|")) return true;
  if (content.startsWith("MAKE_ADMIN|") || content.startsWith("REVOKE_ADMIN|")) return true;
  if (content.includes("Bạn đã ghim một tin nhắn")) return true;
  if (content.includes("ghim")) return true;
  return false;
}

export function systemMessageShowsPinnedShortcut(message: IMessage): boolean {
  const content = message.content?.trim() ?? "";
  return content.startsWith("PIN_MESSAGE|") || content.startsWith("UNPIN_MESSAGE|");
}
