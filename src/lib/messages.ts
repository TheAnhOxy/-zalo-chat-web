import { IMessage } from "@/src/types/message";

export type MessageGroupItem =
  | { kind: "date"; key: string; label: string }
  | { kind: "system"; key: string; message: IMessage }
  | { kind: "message"; key: string; message: IMessage; showAvatar: boolean; isMine: boolean }
  | { kind: "mediaGroup"; key: string; messages: IMessage[]; showAvatar: boolean; isMine: boolean };

export function parseMessageDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatMessageTime(value: Date | string, locale = "vi-VN"): string {
  const date = parseMessageDate(value);
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

export function formatDateSeparator(value: Date | string, locale = "vi-VN"): string {
  const date = parseMessageDate(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Hôm nay";
  if (sameDay(date, yesterday)) return "Hôm qua";
  return date.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function groupMessagesForList(
  messages: IMessage[],
  currentUserId: string,
  replyMap?: Record<string, IMessage>
): MessageGroupItem[] {
  const items: MessageGroupItem[] = [];
  let lastDateKey = "";
  let lastSenderId = "";
  let lastMessageTime: number | null = null;

  /** Ngưỡng thời gian gộp nhóm tin nhắn: 10 phút */
  const GROUP_THRESHOLD_MS = 10 * 60 * 1000;

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    if (message.deletedBy?.includes(currentUserId) || message.isRecalled) {
      continue;
    }

    const date = parseMessageDate(message.createdAt);
    const dateKey = date.toISOString().slice(0, 10);
    if (dateKey !== lastDateKey) {
      items.push({ kind: "date", key: `date-${dateKey}`, label: formatDateSeparator(message.createdAt) });
      lastDateKey = dateKey;
      lastSenderId = "";
      lastMessageTime = null;
    }

    if (message.type === "SYSTEM") {
      items.push({
        kind: "system",
        key: message.clientTempId || message._id,
        message,
      });
      lastSenderId = "";
      lastMessageTime = null;
      continue;
    }

    const isMine = message.senderId === currentUserId;

    // Hiển thị avatar khi: khác người gửi HOẶC cách tin nhắn trước > 10 phút
    const timeSinceLast = lastMessageTime !== null ? date.getTime() - lastMessageTime : Infinity;
    const sameGroup = message.senderId === lastSenderId && timeSinceLast <= GROUP_THRESHOLD_MS;
    const showAvatar = !isMine && !sameGroup;

    if (message.type === "IMAGE" || message.type === "VIDEO") {
      let addedToExisting = false;
      const lastItem = items[items.length - 1];

      if (lastItem && lastItem.kind === "mediaGroup" && lastItem.messages[0].senderId === message.senderId) {
        const lastMsg = lastItem.messages[lastItem.messages.length - 1];
        const timeDiff = Math.abs(date.getTime() - parseMessageDate(lastMsg.createdAt).getTime()) / 60000;
        
        if (
          (message.metadata?.groupId && lastMsg.metadata?.groupId === message.metadata.groupId) ||
          (!message.metadata?.groupId && !lastMsg.metadata?.groupId && timeDiff <= 5)
        ) {
          lastItem.messages.push(message);
          addedToExisting = true;
        }
      }

      if (!addedToExisting) {
        items.push({
          kind: "mediaGroup",
          key: `mediaGroup-${message.clientTempId || message._id}`,
          messages: [message],
          showAvatar,
          isMine,
        });
      }
    } else {
      items.push({
        kind: "message",
        key: message.clientTempId || message._id,
        message,
        showAvatar,
        isMine,
      });
    }

    lastSenderId = message.senderId;
    lastMessageTime = date.getTime();

    if (message.replyTo && replyMap?.[message.replyTo]) {
      void replyMap[message.replyTo];
    }
  }

  return items;
}

export function dedupeMessagesById(messages: IMessage[]): IMessage[] {
  const seen = new Set<string>();
  const result: IMessage[] = [];
  for (const m of messages) {
    const id = m._id || m.clientTempId;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push(m);
  }
  return result;
}

export function sortMessagesAsc(messages: IMessage[]): IMessage[] {
  return [...messages].sort(
    (a, b) => parseMessageDate(a.createdAt).getTime() - parseMessageDate(b.createdAt).getTime()
  );
}

export function normalizeMessage(raw: IMessage): IMessage {
  return {
    ...raw,
    reactions: raw.reactions ?? [],
    seenBy: raw.seenBy ?? [],
    deletedBy: raw.deletedBy ?? [],
    isRecalled: raw.isRecalled ?? false,
  };
}

export function messageMatchesSearch(message: IMessage, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return message.content.toLowerCase().includes(q) || (message.metadata?.fileName?.toLowerCase().includes(q) ?? false);
}

export function getStatusIconLabel(status: IMessage["status"]): string {
  switch (status) {
    case "SENDING":
      return "Đang gửi";
    case "SENT":
      return "Đã gửi";
    case "DELIVERED":
      return "Đã nhận";
    case "SEEN":
      return "Đã xem";
    case "FAILED":
      return "Gửi thất bại";
    default:
      return "";
  }
}

const IMAGE_URL_RE = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i;
const VIDEO_URL_RE = /\.(mp4|mov|webm|mkv|avi)(\?|$)/i;

function isImageUrl(content: string): boolean {
  const t = content.trim();
  return (t.startsWith("http://") || t.startsWith("https://")) && IMAGE_URL_RE.test(t);
}

function isVideoUrl(content: string): boolean {
  const t = content.trim();
  return (t.startsWith("http://") || t.startsWith("https://")) && VIDEO_URL_RE.test(t);
}

const ATTACHMENT_TYPES = new Set<IMessage["type"]>(["IMAGE", "VIDEO", "VOICE", "FILE"]);

/**
 * Preview text for conversation list — mirrors mobile chat_list_screen._buildMessagePreview
 */
export function formatLastMessagePreview(
  content: string,
  options?: {
    type?: IMessage["type"];
    senderId?: string;
    currentUserId?: string;
  }
): string {
  const raw = content.trim();

  if (raw.startsWith("ADD_MEMBER|")) {
    const parts = raw.split("|");
    const actor = parts[1]?.trim() || "Ai đó";
    const peer = parts[2]?.trim() || "một thành viên";
    return `${actor} đã thêm ${peer} vào nhóm`;
  }
  if (raw.startsWith("REMOVE_MEMBER|") || raw.startsWith("KICK_MEMBER|")) {
    const parts = raw.split("|");
    const actor = parts[1]?.trim() || "Ai đó";
    const peer = parts[2]?.trim() || "một thành viên";
    return `${actor} đã xóa ${peer} khỏi nhóm`;
  }
  if (raw.startsWith("LEAVE_GROUP|")) {
    const actor = raw.split("|")[1]?.trim() || "Ai đó";
    return `${actor} đã rời khỏi nhóm`;
  }
  if (raw.startsWith("MAKE_ADMIN|")) {
    const parts = raw.split("|");
    const member = parts[1]?.trim() || "một thành viên";
    const by = parts[2]?.trim() || "Ai đó";
    return `${by} đã đặt ${member} làm quản trị viên`;
  }
  if (raw.startsWith("REVOKE_ADMIN|")) {
    const parts = raw.split("|");
    const member = parts[1]?.trim() || "một thành viên";
    const by = parts[2]?.trim() || "Ai đó";
    return `${by} đã thu hồi quyền quản trị của ${member}`;
  }
  if (raw.startsWith("PIN_MESSAGE|")) return "Đã ghim một tin nhắn";
  if (raw.startsWith("UNPIN_MESSAGE|")) return "Đã bỏ ghim một tin nhắn";

  const normalizedType = (options?.type ?? "").toUpperCase() as IMessage["type"];
  if (normalizedType === "IMAGE" || isImageUrl(raw)) return "Đã gửi 1 ảnh";
  if (normalizedType === "VIDEO" || isVideoUrl(raw)) return "Đã gửi 1 video";
  if (normalizedType === "VOICE") return "Đã gửi 1 tin nhắn thoại";
  if (normalizedType === "FILE") return "Đã gửi 1 file";
  if (ATTACHMENT_TYPES.has(normalizedType)) return "Đã gửi 1 tệp đính kèm";

  const text = raw || "Chưa có tin nhắn";
  const isMe =
    options?.senderId &&
    options?.currentUserId &&
    options.senderId === options.currentUserId;
  return isMe ? `Bạn: ${text}` : text;
}
