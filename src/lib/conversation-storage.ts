import { IMessage } from "@/src/types/message";

export interface ConversationStorageStats {
  count: number;
  bytesText: number;
  bytesMedia: number;
  bytesVideo: number;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Tính dung lượng từ danh sách tin (giống mobile _ConversationStorageSheet). */
export function computeConversationStorage(messages: IMessage[]): ConversationStorageStats {
  let bytesText = 0;
  let bytesMedia = 0;
  let bytesVideo = 0;

  for (const m of messages) {
    const fs = m.metadata?.fileSize;
    if (fs != null && fs > 0) {
      bytesMedia += fs;
      if (m.type.toUpperCase() === "VIDEO") {
        bytesVideo += fs;
      }
    } else {
      bytesText += new TextEncoder().encode(m.content).length;
    }
  }

  return {
    count: messages.length,
    bytesText,
    bytesMedia,
    bytesVideo,
  };
}
