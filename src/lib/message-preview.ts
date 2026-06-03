import { IMessage } from "@/src/types/message";
import { plainTextFromHtml } from "@/src/lib/sanitize";
import { parseMediaClusterItems } from "@/src/lib/media-cluster";

const IMAGE_URL_RE = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i;
const VIDEO_URL_RE = /\.(mp4|mov|webm|mkv|avi)(\?|$)/i;

function isHttpUrl(value: string): boolean {
  const t = value.trim();
  return t.startsWith("http://") || t.startsWith("https://");
}

export function inferPreviewKindFromContent(content: string): "image" | "video" | null {
  const t = content.trim();
  if (!isHttpUrl(t)) return null;
  if (IMAGE_URL_RE.test(t)) return "image";
  if (VIDEO_URL_RE.test(t)) return "video";
  return null;
}

export function getMessagePreviewMediaUrl(msg: IMessage): string | null {
  if (msg.type === "IMAGE") {
    const url = msg.content?.trim();
    return url || null;
  }
  if (msg.type === "VIDEO") {
    return (
      msg.metadata?.thumbnailUrl?.trim() ||
      msg.metadata?.thumbnail?.trim() ||
      msg.content?.trim() ||
      null
    );
  }
  if (msg.type === "MEDIA_CLUSTER") {
    const items = parseMediaClusterItems(msg);
    const first = items[0];
    if (!first) return null;
    if (first.type === "IMAGE") return first.url;
    return first.thumbnail?.trim() || first.url;
  }
  if (msg.type === "TEXT") {
    const kind = inferPreviewKindFromContent(msg.content);
    if (kind === "image" || kind === "video") return msg.content.trim();
  }
  return null;
}

export function shouldShowMessagePreviewThumbnail(msg: IMessage): boolean {
  if (msg.type === "IMAGE" || msg.type === "VIDEO" || msg.type === "MEDIA_CLUSTER") return true;
  if (msg.type === "TEXT") {
    const kind = inferPreviewKindFromContent(msg.content);
    return kind === "image" || kind === "video";
  }
  return false;
}

export function getMessagePreviewLabel(msg: IMessage, locale: "vi" | "en" = "vi"): string {
  const fileName = msg.metadata?.fileName?.trim();
  const vi = locale === "vi";

  switch (msg.type) {
    case "IMAGE":
      return vi ? "Hình ảnh" : "Photo";
    case "VIDEO":
      return vi ? "Video" : "Video";
    case "MEDIA_CLUSTER": {
      const n = parseMediaClusterItems(msg).length;
      return vi
        ? n > 0
          ? `${n} ảnh/video`
          : "Album ảnh/video"
        : n > 0
          ? `${n} photos/videos`
          : "Media album";
    }
    case "VOICE":
      return vi ? "Tin nhắn thoại" : "Voice message";
    case "FILE":
      return fileName || (vi ? "Tệp đính kèm" : "Attachment");
    case "TEXT": {
      const text = plainTextFromHtml(msg.content).trim();
      const urlKind = inferPreviewKindFromContent(text);
      if (urlKind === "image") return vi ? "Hình ảnh" : "Photo";
      if (urlKind === "video") return vi ? "Video" : "Video";
      if (!text) return vi ? "Tin nhắn" : "Message";
      return text.length > 72 ? `${text.slice(0, 72)}…` : text;
    }
    default:
      return vi ? "Tin nhắn" : "Message";
  }
}
