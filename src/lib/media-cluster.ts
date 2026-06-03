import { IMessage, IMessageMetadata, IMediaClusterItem, MediaClusterItemType } from "@/src/types/message";

export type { IMediaClusterItem, MediaClusterItemType };

export function isMediaFile(file: File): boolean {
  return file.type.startsWith("image/") || file.type.startsWith("video/");
}

export function mediaClusterItemTypeFromFile(file: File): MediaClusterItemType {
  return file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
}

/** Gửi cụm khi một lần chọn có từ 2 file media trở lên (ảnh hoặc video). */
export function shouldSendAsMediaCluster(files: File[]): boolean {
  const media = files.filter(isMediaFile);
  return media.length >= 2;
}

export function parseMediaClusterItems(message: IMessage): IMediaClusterItem[] {
  const fromMeta = message.metadata?.mediaItems;
  if (Array.isArray(fromMeta) && fromMeta.length > 0) {
    return fromMeta
      .map((raw) => {
        const item = raw as Record<string, unknown>;
        const url = String(item.url ?? "").trim();
        const type = String(item.type ?? "").toUpperCase();
        if (!url) return null;
        if (type !== "IMAGE" && type !== "VIDEO") return null;
        return {
          url,
          type: type as MediaClusterItemType,
          thumbnail: item.thumbnail ? String(item.thumbnail) : undefined,
        };
      })
      .filter(Boolean) as IMediaClusterItem[];
  }

  const content = message.content?.trim();
  if (!content || !content.startsWith("[")) return [];

  try {
    const parsed = JSON.parse(content) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((raw) => {
        const item = raw as Record<string, unknown>;
        const url = String(item.url ?? "").trim();
        const type = String(item.type ?? "").toUpperCase();
        if (!url || (type !== "IMAGE" && type !== "VIDEO")) return null;
        return { url, type: type as MediaClusterItemType };
      })
      .filter(Boolean) as IMediaClusterItem[];
  } catch {
    return [];
  }
}

export function serializeMediaClusterItems(items: IMediaClusterItem[]): string {
  return JSON.stringify(items.map(({ url, type }) => ({ url, type })));
}

export function mediaClusterMetadata(items: IMediaClusterItem[]): IMessageMetadata {
  return { mediaItems: items };
}

export function mediaClusterGridClass(count: number, index: number): string {
  if (count === 1) return "col-span-2 aspect-[4/3]";
  if (count === 2) return "aspect-square";
  if (count === 3 && index === 2) return "col-span-2 aspect-video";
  if (count >= 4 && index === 3) return "aspect-square";
  return "aspect-square";
}
