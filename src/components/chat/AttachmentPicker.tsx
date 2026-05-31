"use client";

import { useRef } from "react";
import { Image, Paperclip, Mic } from "lucide-react";
import { t, ChatLocale } from "@/src/lib/i18n/chat";
import { AttachmentUploadState } from "@/src/hooks/useAttachments";

interface AttachmentPickerProps {
  locale?: ChatLocale;
  disabled?: boolean;
  uploads: AttachmentUploadState[];
  onFilesSelected: (files: FileList) => void;
  onCancelUpload: (id: string) => void;
  onRetryUpload?: (id: string) => void;
  onVoiceRecordClick?: () => void;
}

export function AttachmentPicker({
  locale = "vi",
  disabled,
  uploads,
  onFilesSelected,
  onCancelUpload,
  onVoiceRecordClick,
}: AttachmentPickerProps) {
  const imageRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <input
          ref={imageRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          multiple
          onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
        />
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          multiple
          onChange={(e) => e.target.files && onFilesSelected(e.target.files)}
        />
        <button
          type="button"
          disabled={disabled}
          className="rounded-full p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          aria-label={t("attach", locale)}
          onClick={() => imageRef.current?.click()}
        >
          <Image className="h-5 w-5" />
        </button>
        <button
          type="button"
          disabled={disabled}
          className="rounded-full p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          aria-label="Tệp"
          onClick={() => fileRef.current?.click()}
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <button
          type="button"
          disabled={disabled}
          className="rounded-full p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
          aria-label={t("recordVoice", locale)}
          onClick={onVoiceRecordClick}
        >
          <Mic className="h-5 w-5" />
        </button>
      </div>

      {uploads.length > 0 && (
        <ul className="space-y-1 px-2" aria-label="Tiến trình tải lên">
          {uploads.map((u) => (
            <li key={u.id} className="flex items-center gap-2 text-xs text-gray-600">
              <span className="truncate flex-1">{u.file.name}</span>
              {u.status === "uploading" && (
                <progress value={u.progress} max={100} className="w-20" />
              )}
              {u.status === "failed" && <span className="text-red-500">{t("retry", locale)}</span>}
              <button
                type="button"
                className="text-gray-500 hover:text-red-500"
                onClick={() => onCancelUpload(u.id)}
                aria-label={t("cancelUpload", locale)}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
