"use client";

import { useEffect, useMemo } from "react";
import { FileText, Mic, Video, X } from "lucide-react";
import { AttachmentUploadState } from "@/src/hooks/useAttachments";
import { t, ChatLocale } from "@/src/lib/i18n/chat";

interface AttachmentUploadPreviewProps {
  uploads: AttachmentUploadState[];
  locale?: ChatLocale;
  onCancel: (id: string) => void;
}

function uploadKind(file: File): "image" | "video" | "audio" | "file" {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

export function AttachmentUploadPreview({
  uploads,
  locale = "vi",
  onCancel,
}: AttachmentUploadPreviewProps) {
  const previewUrls = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of uploads) {
      const kind = uploadKind(u.file);
      if (kind === "image" || kind === "video") {
        map.set(u.id, URL.createObjectURL(u.file));
      }
    }
    return map;
  }, [uploads]);

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  if (!uploads.length) return null;

  return (
    <ul
      className="flex flex-wrap gap-2 border-b border-[var(--qc-divider)] px-3 py-2"
      aria-label="Tệp đính kèm chờ gửi"
    >
      {uploads.map((u) => {
        const kind = uploadKind(u.file);
        const thumb = previewUrls.get(u.id);

        return (
          <li
            key={u.id}
            className="relative flex max-w-[120px] flex-col overflow-hidden rounded-xl border border-[var(--qc-divider)] bg-white shadow-sm"
          >
            <div className="relative flex h-20 w-28 items-center justify-center bg-gray-50">
              {kind === "image" && thumb ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumb} alt="" className="h-full w-full object-cover" />
              ) : kind === "video" && thumb ? (
                <>
                  <video src={thumb} className="h-full w-full object-cover" muted playsInline />
                  <Video className="absolute h-6 w-6 text-white drop-shadow" aria-hidden />
                </>
              ) : kind === "audio" ? (
                <Mic className="h-8 w-8 text-[var(--qc-primary)]" aria-hidden />
              ) : (
                <FileText className="h-8 w-8 text-gray-500" aria-hidden />
              )}
              {u.status === "uploading" && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gray-200">
                  <div
                    className="h-full bg-[var(--qc-primary)] transition-all"
                    style={{ width: `${u.progress}%` }}
                  />
                </div>
              )}
            </div>
            <p className="truncate px-1.5 py-1 text-[10px] text-gray-600" title={u.file.name}>
              {u.file.name}
            </p>
            {u.status === "failed" && (
              <span className="px-1.5 pb-1 text-[10px] text-red-500">{t("retry", locale)}</span>
            )}
            <button
              type="button"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
              onClick={() => onCancel(u.id)}
              aria-label={t("cancelUpload", locale)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
