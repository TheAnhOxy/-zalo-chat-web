import { IMessage } from "@/src/types/message";

/** Metadata khi chuyển tiếp — khớp mobile ForwardMessageScreen._buildForwardMetadata */
export function buildForwardMetadata(message: IMessage): Record<string, unknown> | undefined {
  const md = message.metadata;
  if (!md) return undefined;

  const metadata: Record<string, unknown> = {};
  if (md.fileName) metadata.fileName = md.fileName;
  if (md.fileSize != null) metadata.fileSize = md.fileSize;
  if (md.thumbnail) metadata.thumbnail = md.thumbnail;
  if (md.thumbnailUrl) metadata.thumbnailUrl = md.thumbnailUrl;
  if (md.lat != null) metadata.lat = md.lat;
  if (md.lng != null) metadata.lng = md.lng;
  if (md.duration != null) metadata.duration = md.duration;

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

export function forwardPreviewLabel(message: IMessage): string {
  if (message.isRecalled) return "Tin nhắn đã thu hồi";
  const text = message.content?.trim();
  switch (message.type) {
    case "IMAGE":
      return text ? `[Ảnh] ${text.slice(0, 60)}` : "[Hình ảnh]";
    case "VIDEO":
      return "[Video]";
    case "FILE":
      return message.metadata?.fileName?.trim() || "[Tệp đính kèm]";
    case "VOICE":
      return "[Tin nhắn thoại]";
    case "LOCATION":
      return "[Vị trí]";
    case "SYSTEM":
      return text || "[Thông báo]";
    default:
      return text?.replace(/<[^>]+>/g, "").slice(0, 120) || "[Tin nhắn]";
  }
}
