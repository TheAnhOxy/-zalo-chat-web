"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Send, Square, Trash, ThumbsUp, Smile } from "lucide-react";
import { EmojiPicker } from "@/src/components/chat/EmojiPicker";
import { t, ChatLocale } from "@/src/lib/i18n/chat";
import { AttachmentPicker } from "@/src/components/chat/AttachmentPicker";
import { AttachmentUploadState } from "@/src/hooks/useAttachments";
import { IMessage } from "@/src/types/message";
import { useVoiceRecorder } from "@/src/hooks/useVoiceRecorder";

interface ComposerProps {
  locale?: ChatLocale;
  disabled?: boolean;
  blocked?: boolean;
  replyTo?: IMessage | null;
  editingMessage?: IMessage | null;
  uploads: AttachmentUploadState[];
  onSend: (text: string) => void;
  onFilesSelected: (files: FileList) => void;
  onCancelUpload: (id: string) => void;
  onTyping: () => void;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onVoiceRecorded?: (file: File) => void;
}

export function Composer({
  locale = "vi",
  disabled,
  blocked,
  replyTo,
  editingMessage,
  uploads,
  onSend,
  onFilesSelected,
  onCancelUpload,
  onTyping,
  onCancelReply,
  onCancelEdit,
  onVoiceRecorded,
}: ComposerProps) {
  const [text, setText] = useState(editingMessage?.content ?? "");
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { isRecording, recordingDuration, startRecording, stopRecording, cancelRecording } = useVoiceRecorder();

  useEffect(() => {
    setText(editingMessage?.content ?? "");
    inputRef.current?.focus();
  }, [editingMessage]);

  const handleVoiceStop = async () => {
    const file = await stopRecording();
    if (file && onVoiceRecorded) {
      onVoiceRecorded(file);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled || blocked) return;
    onSend(trimmed);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as FormEvent);
    }
  };

  if (blocked) {
    return (
      <div className="border-t bg-gray-50 px-4 py-3 text-center text-sm text-gray-500" role="alert">
        {t("blocked", locale)}
      </div>
    );
  }

  return (
    <footer className="shrink-0 border-t border-[var(--qc-divider)] bg-[var(--qc-card)]">
      {(replyTo || editingMessage) && (
        <div className="flex items-center justify-between border-b border-[var(--qc-divider)] bg-[var(--qc-primary-light)]/50 px-3 py-2 text-xs text-[var(--qc-text-primary)]">
          <span className="truncate">
            {editingMessage ? t("edit", locale) : t("reply", locale)}:{" "}
            {(replyTo ?? editingMessage)?.content?.slice(0, 60)}
          </span>
          <button
            type="button"
            className="text-gray-500 hover:text-gray-800"
            onClick={editingMessage ? onCancelEdit : onCancelReply}
            aria-label={t("cancel", locale)}
          >
            ×
          </button>
        </div>
      )}

      <EmojiPicker
        open={showEmoji && !isRecording}
        onPick={(emoji) => {
          setText((prev) => prev + emoji);
          inputRef.current?.focus();
        }}
      />

      <form onSubmit={handleSubmit} className="flex items-end gap-1 px-2.5 py-2.5">
        {!isRecording && (
          <>
            <button
              type="button"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--qc-primary)] hover:bg-[var(--qc-primary-light)]"
              onClick={() => setShowEmoji((v) => !v)}
              aria-label="Biểu tượng cảm xúc"
            >
              <Smile className="h-5 w-5" />
            </button>
            <AttachmentPicker
            locale={locale}
            disabled={disabled}
            uploads={uploads}
            onFilesSelected={onFilesSelected}
            onCancelUpload={onCancelUpload}
            onVoiceRecordClick={() => {
              if (onVoiceRecorded) void startRecording();
            }}
          />
          </>
        )}

        {isRecording ? (
          <div className="flex h-10 flex-1 items-center justify-between rounded-full bg-red-50 px-4 text-red-500 border border-red-200">
            <div className="flex items-center gap-2 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-sm font-medium">
                {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <button
              type="button"
              onClick={cancelRecording}
              className="p-1 hover:text-red-700"
              aria-label={t("cancel", locale)}
            >
              <Trash className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <>
            <label className="sr-only" htmlFor="chat-composer-input">
              {t("typeMessage", locale)}
            </label>
            <textarea
              id="chat-composer-input"
              ref={inputRef}
              rows={1}
              value={text}
              disabled={disabled}
              placeholder={t("typeMessage", locale)}
              className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl border border-gray-200 bg-chat-bg px-4 py-2 text-sm focus:border-zalo-blue focus:outline-none focus:ring-1 focus:ring-zalo-blue"
              onChange={(e) => {
                setText(e.target.value);
                onTyping();
              }}
              onKeyDown={handleKeyDown}
              aria-label={t("typeMessage", locale)}
            />
          </>
        )}

        <button
          type={text.trim() && !isRecording ? "submit" : "button"}
          disabled={disabled}
          onClick={() => {
            if (isRecording) {
              void handleVoiceStop();
            } else if (!text.trim()) {
              onSend("👍");
            }
          }}
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
            text.trim() || isRecording
              ? "bg-[var(--qc-primary)] text-white hover:brightness-95 focus-visible:ring-2 focus-visible:ring-[var(--qc-primary)]"
              : "text-[var(--qc-primary)] hover:bg-[var(--qc-primary-light)]"
          } disabled:opacity-50`}
          aria-label={isRecording ? t("send", locale) : text.trim() ? t("send", locale) : "Gửi Like"}
        >
          {isRecording ? <Square className="h-5 w-5" /> : text.trim() ? <Send className="h-5 w-5" /> : <ThumbsUp className="h-5 w-5" />}
        </button>
      </form>
    </footer>
  );
}
