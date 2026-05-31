export type ChatLocale = "vi" | "en";

const strings = {
  vi: {
    chatTitle: "Trò chuyện",
    typeMessage: "Nhập tin nhắn...",
    send: "Gửi",
    attach: "Đính kèm",
    recordVoice: "Ghi âm",
    typing: "{name} đang nhập...",
    online: "Đang hoạt động",
    lastSeen: "Hoạt động {time} trước",
    loadOlder: "Tải tin nhắn cũ hơn",
    noMessages: "Chưa có tin nhắn",
    searchInChat: "Tìm trong hội thoại",
    reply: "Trả lời",
    edit: "Chỉnh sửa",
    delete: "Xóa",
    recall: "Thu hồi",
    deleteForMe: "Xóa phía tôi",
    copy: "Sao chép",
    forward: "Chuyển tiếp",
    react: "Cảm xúc",
    edited: "Đã chỉnh sửa",
    recalled: "Tin nhắn đã được thu hồi",
    blocked: "Bạn không thể nhắn tin với người dùng này",
    reconnecting: "Đang kết nối lại...",
    offlineQueued: "Tin nhắn sẽ gửi khi có mạng",
    selectMessages: "Chọn tin nhắn",
    cancel: "Hủy",
    retry: "Thử lại",
    cancelUpload: "Hủy tải lên",
    callVoice: "Cuộc gọi thoại",
    callVideo: "Cuộc gọi video",
    callMissed: "Cuộc gọi nhỡ",
    callEnded: "Cuộc gọi kết thúc",
    conflictEdit: "Tin nhắn đã được chỉnh sửa ở thiết bị khác",
    pinnedMessage: "Tin nhắn ghim",
    unpin: "Bỏ ghim",
    pin: "Ghim tin nhắn",
    report: "Báo cáo",
  },
  en: {
    chatTitle: "Chat",
    typeMessage: "Type a message...",
    send: "Send",
    attach: "Attach",
    recordVoice: "Record voice",
    typing: "{name} is typing...",
    online: "Online",
    lastSeen: "Active {time} ago",
    loadOlder: "Load older messages",
    noMessages: "No messages yet",
    searchInChat: "Search in conversation",
    reply: "Reply",
    edit: "Edit",
    delete: "Delete",
    recall: "Recall",
    deleteForMe: "Delete for me",
    copy: "Copy",
    forward: "Forward",
    react: "React",
    edited: "Edited",
    recalled: "Message recalled",
    blocked: "You cannot message this user",
    reconnecting: "Reconnecting...",
    offlineQueued: "Message will send when online",
    selectMessages: "Select messages",
    cancel: "Cancel",
    retry: "Retry",
    cancelUpload: "Cancel upload",
    callVoice: "Voice call",
    callVideo: "Video call",
    callMissed: "Missed call",
    callEnded: "Call ended",
    conflictEdit: "Message was edited on another device",
    pinnedMessage: "Pinned message",
    unpin: "Unpin",
    pin: "Pin message",
    report: "Report",
  },
} as const;

export type ChatStringKey = keyof (typeof strings)["vi"];

export function t(key: ChatStringKey, locale: ChatLocale = "vi", vars?: Record<string, string>): string {
  let text: string = strings[locale][key] ?? strings.vi[key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}
