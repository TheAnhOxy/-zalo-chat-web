import axios from "axios";
import { apiClient } from "@/src/services/api/client";

export interface UploadResult {
  url: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  thumbnail?: string;
}

function pickString(raw: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = raw[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function detectContentType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".m4a")) return "audio/mpeg";
  if (lower.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

/** GET /upload/presigned-url — mobile getPresignedUrl */
async function getPresignedUrl(fileName: string, contentType: string) {
  const res = await apiClient.get<Record<string, unknown>>("/upload/presigned-url", {
    params: { fileName, contentType },
  });
  const raw = (res.data as any)?.data || res.data;
  const uploadUrl = pickString(raw, ["uploadUrl", "url"]);
  const fileUrl = pickString(raw, ["fileUrl"]);
  if (!uploadUrl || !fileUrl) throw new Error("Invalid presigned response");
  return { uploadUrl, fileUrl };
}

/** POST /conversations/avatar/upload — mobile uploadFileAndGetUrl (also used for chat media) */
async function uploadViaBackend(
  file: File,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const res = await apiClient.post<Record<string, unknown>>("/conversations/avatar/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    signal,
    onUploadProgress: (e) => {
      if (!e.total || !onProgress) return;
      onProgress(Math.round((e.loaded * 100) / e.total));
    },
  });

  const raw = (res.data as any)?.data || res.data;
  const fileUrl = pickString(raw, ["fileUrl"]);
  if (!fileUrl) throw new Error("Upload failed: missing fileUrl");
  return fileUrl;
}

export async function uploadFile(
  file: File,
  options?: {
    onProgress?: (percent: number) => void;
    signal?: AbortSignal;
    preferPresigned?: boolean;
  }
): Promise<UploadResult> {
  const contentType = file.type || detectContentType(file.name);

  if (options?.preferPresigned) {
    try {
      const { uploadUrl, fileUrl } = await getPresignedUrl(file.name, contentType);
      await axios.put(uploadUrl, file, {
        headers: { "Content-Type": contentType },
        signal: options.signal,
        onUploadProgress: (e) => {
          if (!e.total || !options.onProgress) return;
          options.onProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      return { url: fileUrl, fileName: file.name, fileSize: file.size, mimeType: contentType };
    } catch {
      // fall through to multipart
    }
  }

  const url = await uploadViaBackend(file, options?.onProgress, options?.signal);
  return { url, fileName: file.name, fileSize: file.size, mimeType: contentType };
}

export function retryWithBackoff<T>(fn: () => Promise<T>, maxAttempts = 3, baseMs = 500): Promise<T> {
  let attempt = 0;
  const run = async (): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt >= maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, baseMs * 2 ** (attempt - 1)));
      return run();
    }
  };
  return run();
}
