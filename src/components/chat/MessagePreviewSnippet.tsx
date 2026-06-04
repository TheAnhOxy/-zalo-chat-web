"use client";

import { FileText, Mic, Video } from "lucide-react";
import { IMessage } from "@/src/types/message";
import { ChatLocale } from "@/src/lib/i18n/chat";
import {
  getMessagePreviewLabel,
  getMessagePreviewMediaUrl,
  shouldShowMessagePreviewThumbnail,
} from "@/src/lib/message-preview";

interface MessagePreviewSnippetProps {
  message: IMessage;
  locale?: ChatLocale;
  /** compact = reply bar in composer; inline = quoted reply in bubble */
  variant?: "compact" | "inline";
  className?: string;
}

export function MessagePreviewSnippet({
  message,
  locale = "vi",
  variant = "compact",
  className = "",
}: MessagePreviewSnippetProps) {
  const label = getMessagePreviewLabel(message, locale);
  const mediaUrl = getMessagePreviewMediaUrl(message);
  const showThumb = shouldShowMessagePreviewThumbnail(message) && Boolean(mediaUrl);

  const thumbSize =
    variant === "compact" ? "h-11 w-11 shrink-0" : "h-10 w-10 shrink-0";

  const mediaIcon = (() => {
    if (message.type === "VOICE") {
      return (
        <span
          className={`flex ${thumbSize} items-center justify-center rounded-lg bg-[var(--qc-primary-light)] text-[var(--qc-primary)]`}
          aria-hidden
        >
          <Mic className="h-5 w-5" />
        </span>
      );
    }
    if (message.type === "FILE") {
      return (
        <span
          className={`flex ${thumbSize} items-center justify-center rounded-lg bg-gray-100 text-gray-600`}
          aria-hidden
        >
          <FileText className="h-5 w-5" />
        </span>
      );
    }
    if (message.type === "VIDEO" && !showThumb) {
      return (
        <span
          className={`flex ${thumbSize} items-center justify-center rounded-lg bg-gray-900/80 text-white`}
          aria-hidden
        >
          <Video className="h-5 w-5" />
        </span>
      );
    }
    if (showThumb && mediaUrl) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaUrl}
          alt=""
          className={`${thumbSize} rounded-lg object-cover bg-gray-100`}
        />
      );
    }
    return null;
  })();

  return (
    <span
      className={`flex min-w-0 items-center gap-2 ${className}`}
      title={label}
    >
      {mediaIcon}
      <span className="min-w-0 truncate text-inherit">{label}</span>
    </span>
  );
}
