import { IMessage } from "@/src/types/message";

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

export interface LinkItem {
  url: string;
  message: IMessage;
}

export function extractUrls(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  const matches = t.match(URL_REGEX) ?? [];
  return matches
    .map((u) => u.replace(/[)\],.]+$/, ""))
    .filter(Boolean);
}

export function indexMessagesForGallery(messages: IMessage[]) {
  const media: IMessage[] = [];
  const files: IMessage[] = [];
  const voices: IMessage[] = [];
  const links: LinkItem[] = [];
  const seenUrls = new Set<string>();

  for (const m of messages) {
    if (m.isRecalled) continue;
    const type = m.type.toUpperCase();

    if (type === "IMAGE" || type === "VIDEO") {
      if (m.content.trim()) media.push(m);
      continue;
    }
    if (type === "FILE") {
      files.push(m);
      continue;
    }
    if (type === "VOICE") {
      if (m.content.trim()) voices.push(m);
      continue;
    }
    if (type === "TEXT") {
      for (const url of extractUrls(m.content)) {
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          links.push({ url, message: m });
        }
      }
    }
  }

  return { media, files, voices, links };
}

export function fileDisplayName(message: IMessage): string {
  const name = message.metadata?.fileName?.trim();
  if (name) return name;
  try {
    const uri = new URL(message.content);
    const seg = uri.pathname.split("/").filter(Boolean).pop();
    if (seg) return decodeURIComponent(seg);
  } catch {
    /* ignore */
  }
  return "Tệp đính kèm";
}

export function formatVoiceDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
