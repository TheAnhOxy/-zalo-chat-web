"use client";

import { useRef } from "react";
import { Image, Paperclip, Mic } from "lucide-react";
import { t, ChatLocale } from "@/src/lib/i18n/chat";
interface AttachmentPickerProps {
  locale?: ChatLocale;
  disabled?: boolean;
  onFilesSelected: (files: FileList) => void;
  onVoiceRecordClick?: () => void;
}

export function AttachmentPicker({
  locale = "vi",
  disabled,
  onFilesSelected,
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

    </div>
  );
}
