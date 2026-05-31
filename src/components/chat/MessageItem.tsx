"use client";

import { useState } from "react";
import { IMessage, ReactionType } from "@/src/types/message";
import { sanitizeMessageHtml, plainTextFromHtml } from "@/src/lib/sanitize";
import { formatMessageTime, getStatusIconLabel } from "@/src/lib/messages";
import { t, ChatLocale } from "@/src/lib/i18n/chat";
import { MessageActions } from "@/src/components/chat/MessageActions";
import { Check, CheckCheck } from "lucide-react";

interface MessageItemProps {
  message: IMessage;
  isMine: boolean;
  showAvatar?: boolean;
  replyPreview?: string;
  locale?: ChatLocale;
  selectionMode?: boolean;
  selected?: boolean;
  onReply: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  onForward?: () => void;
  onReact: (type: ReactionType) => void;
  onRetry?: () => void;
  onToggleSelect?: () => void;
  avatar?: string;
  hideAvatarSpace?: boolean;
  fullWidth?: boolean;
  senderName?: string;
  onJumpToReply?: () => void;
  isHighlighted?: boolean;
  onPin?: () => void;
}

export function MessageItem({
  message,
  isMine,
  showAvatar,
  replyPreview,
  locale = "vi",
  selectionMode,
  selected,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onReact,
  onRetry,
  onToggleSelect,
  avatar,
  hideAvatarSpace,
  fullWidth,
  senderName,
  onJumpToReply,
  isHighlighted,
  onPin,
}: MessageItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  if (message.isRecalled) {
    return (
      <div className={`flex ${isMine ? "justify-end" : "justify-start"} px-3 py-1 ${isHighlighted ? "bg-blue-50/50 transition-colors duration-1000" : ""}`}>
        <p className="text-xs italic text-gray-400">{t("recalled", locale)}</p>
      </div>
    );
  }

  const safeContent =
    message.type === "TEXT" ? sanitizeMessageHtml(message.content) : plainTextFromHtml(message.content);

  const isCallMeta = Boolean(message.callId);
  const fallbackLetter = senderName ? senderName.charAt(0).toUpperCase() : "?";

  if (isCallMeta) {
    const isMissed = message.content.toLowerCase().includes("nhỡ") || message.content.toLowerCase().includes("missed");
    return (
      <div className={`flex justify-center py-2 ${isHighlighted ? "bg-blue-50/50 transition-colors duration-1000" : ""}`}>
        <div className="flex items-center gap-2 rounded-2xl bg-gray-100 px-4 py-2 text-sm text-gray-600">
          <span className="text-base">{isMissed ? "📞" : "☎️"}</span>
          <span>{message.content}</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex gap-2 px-3 py-0.5 ${isMine ? "flex-row-reverse" : "flex-row"} ${isHighlighted ? "bg-blue-50/50 transition-colors duration-1000" : ""}`}
      role="listitem"
      aria-label={`Tin nhắn ${isMine ? "của bạn" : "đối phương"}`}
    >
      {selectionMode && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="mt-2"
          aria-label="Chọn tin nhắn"
        />
      )}

      {!isMine && showAvatar && !hideAvatarSpace && (
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-zalo-blue to-blue-700">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-white" aria-hidden>
              {fallbackLetter}
            </div>
          )}
        </div>
      )}
      {!isMine && !showAvatar && !hideAvatarSpace && <div className="w-8 shrink-0" aria-hidden />}

      <div className={`relative ${fullWidth ? "w-full" : "max-w-[75%] sm:max-w-[65%]"} ${isMine ? "items-end" : "items-start"} flex flex-col`}>
        {replyPreview && (
          <button
            type="button"
            onClick={onJumpToReply}
            className="mb-1 rounded-lg border-l-4 border-zalo-blue bg-gray-50 px-2 py-1 text-left text-xs text-gray-600 hover:bg-gray-100"
          >
            {replyPreview}
          </button>
        )}

        <div
          className={`relative rounded-2xl px-3 py-2 text-sm shadow-sm animate-message-in ${
            isMine
              ? "rounded-br-md bg-chat-bubble-user text-gray-900"
              : "rounded-bl-md bg-chat-bubble text-gray-900"
          }`}
          onContextMenu={(e) => {
            e.preventDefault();
            setMenuOpen(true);
          }}
        >
          {renderBody(message, safeContent, isCallMeta, locale)}
          {message.editedAt && (
            <span className="ml-1 text-[10px] text-gray-400">({t("edited", locale)})</span>
          )}
        </div>

        {message.reactions.length > 0 && (
          <div className="mt-0.5 flex gap-1" aria-label="Cảm xúc">
            {message.reactions.map((r, i) => (
              <span key={`${r.userId}-${i}`} className="rounded-full bg-white px-1.5 text-xs shadow">
                {r.type}
              </span>
            ))}
          </div>
        )}

        <div className={`mt-0.5 flex items-center gap-1 text-[10px] text-gray-400 ${isMine ? "justify-end" : ""}`}>
          <time dateTime={String(message.createdAt)}>{formatMessageTime(message.createdAt)}</time>
          {isMine && <StatusIcon status={message.status} />}
          {message.status === "FAILED" && onRetry && (
            <button type="button" className="text-red-500 underline" onClick={onRetry}>
              {t("retry", locale)}
            </button>
          )}
        </div>

        {menuOpen && (
          <div className="absolute z-20 top-0 right-0">
            <MessageActions
              locale={locale}
              isMine={isMine}
              onReply={() => {
                setMenuOpen(false);
                onReply();
              }}
              onEdit={
                onEdit
                  ? () => {
                      setMenuOpen(false);
                      onEdit();
                    }
                  : undefined
              }
              onDelete={() => {
                setMenuOpen(false);
                onDelete();
              }}
              onForward={
                onForward
                  ? () => {
                      setMenuOpen(false);
                      onForward();
                    }
                  : undefined
              }
              onPin={
                onPin && message.type === "TEXT"
                  ? () => {
                      setMenuOpen(false);
                      onPin();
                    }
                  : undefined
              }
              onReact={(type) => {
                setMenuOpen(false);
                onReact(type);
              }}
              onSelect={
                onToggleSelect
                  ? () => {
                      setMenuOpen(false);
                      onToggleSelect();
                    }
                  : undefined
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}

function renderBody(message: IMessage, safeContent: string, isCallMeta: boolean, locale: ChatLocale) {
  if (isCallMeta) {
    return <p className="text-zalo-blue font-medium">{t("callEnded", locale)}</p>;
  }
  switch (message.type) {
    case "IMAGE":
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={message.content} alt={message.metadata?.fileName ?? "Ảnh"} className="max-h-64 rounded-lg" />
      );
    case "VIDEO":
      return <video src={message.content} controls className="max-h-64 rounded-lg" />;
    case "VOICE":
      return <audio src={message.content} controls className="h-10 w-full min-w-[200px] outline-none" />;
    case "FILE":
      return (
        <a href={message.content} download className="text-zalo-blue underline">
          {message.metadata?.fileName ?? "Tệp đính kèm"}
        </a>
      );
    default:
      return <p dangerouslySetInnerHTML={{ __html: safeContent }} />;
  }
}

function StatusIcon({ status }: { status: IMessage["status"] }) {
  const label = getStatusIconLabel(status);
  if (status === "SEEN" || status === "DELIVERED") {
    return <CheckCheck className="h-3 w-3 text-zalo-blue" aria-label={label} />;
  }
  if (status === "SENT") {
    return <Check className="h-3 w-3" aria-label={label} />;
  }
  return <span aria-label={label}>·</span>;
}
