"use client";

import { useEffect, useRef, useState } from "react";
import { IMessage, ReactionType } from "@/src/types/message";
import { sanitizeMessageHtml, plainTextFromHtml } from "@/src/lib/sanitize";
import { formatMessageTime, getStatusIconLabel } from "@/src/lib/messages";
import { t, ChatLocale } from "@/src/lib/i18n/chat";
import { currentUserReaction, groupReactions, reactionEmoji } from "@/src/lib/reactions";
import { MessagePreviewSnippet } from "@/src/components/chat/MessagePreviewSnippet";
import { MediaClusterBubble } from "@/src/components/chat/MediaClusterBubble";
import { ImageViewerModal } from "@/src/components/chat/ImageViewerModal";
import { VideoPlayerModal } from "@/src/components/chat/VideoPlayerModal";
import { parseMediaClusterItems } from "@/src/lib/media-cluster";
import { MessageHoverToolbar } from "@/src/components/chat/MessageHoverToolbar";
import { MessageMoreMenu } from "@/src/components/chat/MessageMoreMenu";
import { MessageReactionPopover } from "@/src/components/chat/MessageReactionPopover";
import { AnchorPlacement } from "@/src/hooks/useAnchorPosition";
import { Check, CheckCheck } from "lucide-react";

interface MessageItemProps {
  message: IMessage;
  isMine: boolean;
  currentUserId?: string;
  showAvatar?: boolean;
  replyMessage?: IMessage | null;
  locale?: ChatLocale;
  onReply: () => void;
  onEdit?: () => void;
  onDeleteForMe: () => void;
  onRecall?: () => void;
  onForward?: () => void;
  onReact: (type: ReactionType) => void;
  onRemoveReaction?: () => void;
  onRetry?: () => void;
  avatar?: string;
  hideAvatarSpace?: boolean;
  fullWidth?: boolean;
  senderName?: string;
  onJumpToReply?: () => void;
  isHighlighted?: boolean;
  isPinned?: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
  mediaLayout?: "auto" | "square" | "wide";
  hideTimeAndStatus?: boolean;
  onMediaLoad?: () => void;
  /** Ảnh/video liên tiếp cùng người gửi — giảm khoảng cách để xếp thẳng hàng */
  stackedMedia?: boolean;
}

export function MessageItem({
  message,
  isMine,
  currentUserId = "",
  showAvatar,
  replyMessage,
  locale = "vi",
  onReply,
  onEdit,
  onDeleteForMe,
  onRecall,
  onForward,
  onReact,
  onRemoveReaction,
  onRetry,
  avatar,
  hideAvatarSpace,
  fullWidth,
  senderName,
  onJumpToReply,
  isHighlighted,
  isPinned = false,
  onPin,
  onUnpin,
  mediaLayout = "auto",
  hideTimeAndStatus = false,
  onMediaLoad,
  stackedMedia = false,
}: MessageItemProps) {
  const toolbarRef = useRef<HTMLDivElement>(null);
  const hideToolbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reactionOpen, setReactionOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [viewerVideo, setViewerVideo] = useState<string | null>(null);

  const toolbarVisible = hovered || menuOpen || reactionOpen;

  const clearHideToolbarTimer = () => {
    if (hideToolbarTimerRef.current) {
      clearTimeout(hideToolbarTimerRef.current);
      hideToolbarTimerRef.current = null;
    }
  };

  const handleActionsEnter = () => {
    clearHideToolbarTimer();
    setHovered(true);
  };

  const handleActionsLeave = () => {
    if (menuOpen || reactionOpen) return;
    clearHideToolbarTimer();
    hideToolbarTimerRef.current = setTimeout(() => setHovered(false), 280);
  };

  useEffect(() => () => clearHideToolbarTimer(), []);
  const reactionPlacement: AnchorPlacement = isMine ? "top-end" : "top-start";
  const menuPlacement: AnchorPlacement = "bottom-start";
  const uniqueReactions = Object.values(
    (message.reactions || []).reduce((acc, r) => {
      if (!acc[r.userId]) acc[r.userId] = r;
      return acc;
    }, {} as Record<string, (typeof message.reactions)[number]>)
  );

  const myReaction = currentUserReaction(uniqueReactions, currentUserId);
  const reactionGroups = groupReactions(uniqueReactions, currentUserId);

  const handlePickReaction = (type: ReactionType) => {
    if (myReaction === type) {
      onRemoveReaction?.();
    } else {
      onReact(type);
    }
  };



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
      className={`group flex max-w-full min-w-0 gap-2 px-3 ${stackedMedia ? "py-0" : "py-0.5"} ${isMine ? "flex-row-reverse" : "flex-row"} ${isHighlighted ? "bg-blue-50/50 transition-colors duration-1000" : ""}`}
      role="listitem"
      aria-label={`Tin nhắn ${isMine ? "của bạn" : "đối phương"}`}
    >
      {!isMine && showAvatar && !hideAvatarSpace && (
        <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[var(--qc-primary-dark)] to-[var(--qc-primary)]">
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

      <div
        className={`relative min-w-0 ${fullWidth ? "w-full" : "max-w-[75%] sm:max-w-[65%]"} ${isMine ? "items-end" : "items-start"} flex flex-col`}
      >
        {!isMine && senderName && showAvatar ? (
          <p className="mb-1 max-w-full truncate pl-1 text-[11px] text-[var(--qc-text-secondary)]">{senderName}</p>
        ) : null}
        {replyMessage && (
          <button
            type="button"
            onClick={onJumpToReply}
            className="mb-1 max-w-full rounded-lg border-l-4 border-zalo-blue bg-gray-50 px-2 py-1.5 text-left text-xs text-gray-600 hover:bg-gray-100"
          >
            <MessagePreviewSnippet message={replyMessage} locale={locale} variant="inline" />
          </button>
        )}

        <div
          className={`relative max-w-full min-w-0 ${isMine ? "ml-auto" : ""} inline-flex flex-col ${isMine ? "items-end" : "items-start"}`}
          onMouseEnter={handleActionsEnter}
          onMouseLeave={handleActionsLeave}
        >
          {/* Vùng đệm vô hình: di chuột từ bubble sang toolbar không mất hover */}
          <div
            className={`absolute z-10 ${
              isMine
                ? "right-full top-1/2 h-10 w-2 -translate-y-1/2"
                : "left-full top-1/2 h-10 w-2 -translate-y-1/2"
            }`}
            aria-hidden
          />
          <div
            className={`relative min-w-0 text-sm animate-message-in ${
              message.isRecalled
                ? "rounded-2xl px-3 py-2 border border-[var(--qc-divider)] bg-white text-gray-400 italic shadow-sm"
                : message.type === "IMAGE" || message.type === "VIDEO" || message.type === "MEDIA_CLUSTER"
                ? "bg-transparent shadow-none w-fit"
                : `rounded-2xl px-3 py-2 shadow-sm ${
                    isMine
                      ? "rounded-br-md bg-[var(--qc-primary)] text-white"
                      : "rounded-bl-md border border-[var(--qc-divider)] bg-white text-[var(--qc-text-primary)]"
                  }`
            }`}
            onDoubleClick={message.isRecalled ? undefined : () => handlePickReaction("LIKE")}
            title={message.isRecalled ? undefined : "Nhấp đúp để thích"}
          >
            {message.isRecalled ? (
              <p>{t("recalled", locale)}</p>
            ) : (
              <>
                {renderBody(message, safeContent, isCallMeta, locale, mediaLayout, setViewerImage, setViewerVideo, onMediaLoad)}
                {message.editedAt && (
                  <span className="ml-1 text-[10px] text-gray-400">({t("edited", locale)})</span>
                )}
              </>
            )}
          </div>

          <div
            ref={toolbarRef}
            className={`absolute z-20 ${
              isMine
                ? "right-full top-1/2 mr-1.5 -translate-y-1/2"
                : "left-full top-1/2 ml-1.5 -translate-y-1/2"
            }`}
          >
            <MessageHoverToolbar
              visible={toolbarVisible}
              dotsOnEnd={!isMine}
              moreActive={menuOpen}
              onMore={() => {
                setReactionOpen(false);
                setMenuOpen((v) => !v);
              }}
              onReply={message.isRecalled ? undefined : () => {
                setMenuOpen(false);
                setReactionOpen(false);
                onReply();
              }}
              onReaction={message.isRecalled ? undefined : () => {
                setMenuOpen(false);
                setReactionOpen((v) => !v);
              }}
            />
            <MessageMoreMenu
              open={menuOpen}
              anchorRef={toolbarRef}
              placement={menuPlacement}
              locale={locale}
              isMine={isMine}
              isPinned={isPinned}
              canRecall={isMine && !message.isRecalled && Boolean(onRecall)}
              onClose={() => {
                setMenuOpen(false);
                clearHideToolbarTimer();
                hideToolbarTimerRef.current = setTimeout(() => setHovered(false), 280);
              }}
              onEdit={onEdit}
              onRecall={onRecall}
              onForward={onForward ?? (() => undefined)}
              onPin={onPin}
              onUnpin={onUnpin}
              onDeleteForMe={onDeleteForMe}
            />
            <MessageReactionPopover
              open={reactionOpen}
              anchorRef={toolbarRef}
              placement={reactionPlacement}
              activeType={myReaction}
              onClose={() => {
                setReactionOpen(false);
                clearHideToolbarTimer();
                hideToolbarTimerRef.current = setTimeout(() => setHovered(false), 280);
              }}
              onReact={handlePickReaction}
            />
          </div>
        </div>

        {!message.isRecalled && reactionGroups.length > 0 && (
          <div className="mt-0.5 flex max-w-full flex-wrap gap-1" aria-label="Cảm xúc">
            {reactionGroups.map(({ type, count, mine }) => (
              <button
                key={type}
                type="button"
                title={mine ? "Bấm để thu hồi cảm xúc" : undefined}
                className={`inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs shadow-sm transition hover:brightness-95 ${
                  mine
                    ? "border-[var(--qc-primary)]/40 bg-[var(--qc-primary-light)]"
                    : "border-[var(--qc-divider)] bg-white"
                }`}
                onClick={() => {
                  if (mine) {
                    onRemoveReaction?.();
                  } else {
                    onReact(type);
                  }
                }}
              >
                <span className="text-base leading-none" aria-hidden>
                  {reactionEmoji(type)}
                </span>
                {count > 1 ? <span className="text-[10px] text-[var(--qc-text-secondary)]">{count}</span> : null}
              </button>
            ))}
          </div>
        )}

        {!hideTimeAndStatus && (
          <div className={`mt-0.5 flex items-center gap-1 text-[10px] text-gray-400 ${isMine ? "justify-end" : ""}`}>
            <time dateTime={String(message.createdAt)}>{formatMessageTime(message.createdAt)}</time>
            {isMine && <StatusIcon status={message.status} />}
            {message.status === "FAILED" && onRetry && (
              <button type="button" className="text-red-500 underline" onClick={onRetry}>
                {t("retry", locale)}
              </button>
            )}
          </div>
        )}
      </div>

      <ImageViewerModal
        open={Boolean(viewerImage)}
        src={viewerImage ?? ""}
        onClose={() => setViewerImage(null)}
      />
      <VideoPlayerModal
        open={Boolean(viewerVideo)}
        src={viewerVideo ?? ""}
        onClose={() => setViewerVideo(null)}
      />
    </div>
  );
}

function renderBody(
  message: IMessage, 
  safeContent: string, 
  isCallMeta: boolean, 
  locale: ChatLocale, 
  mediaLayout: "auto" | "square" | "wide",
  onViewImage: (url: string) => void,
  onViewVideo: (url: string) => void,
  onMediaLoad?: () => void
) {
  if (isCallMeta) {
    return <p className="text-zalo-blue font-medium">{t("callEnded", locale)}</p>;
  }

  const mediaClass = (() => {
    const base =
      "block max-w-[min(100%,280px)] sm:max-w-[min(100%,320px)] max-h-[min(45vh,260px)] w-auto h-auto rounded-2xl object-contain";
    if (mediaLayout === "square") return `${base} aspect-square object-cover`;
    if (mediaLayout === "wide") return `${base} aspect-video object-cover`;
    return base;
  })();

  switch (message.type) {
    case "IMAGE":
      return (
        <button type="button" onClick={() => onViewImage(message.content)} className="block relative overflow-hidden rounded-2xl outline-none text-left w-[280px] sm:w-[320px] max-w-full max-h-[min(45vh,260px)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={message.content}
            alt={message.metadata?.fileName ?? "Ảnh"}
            className="block w-full h-auto max-h-[min(45vh,260px)] object-contain rounded-2xl bg-gray-100"
            onLoad={onMediaLoad}
          />
        </button>
      );
    case "VIDEO":
      return (
        <button type="button" onClick={() => onViewVideo(message.content)} className="block relative overflow-hidden rounded-2xl outline-none text-left w-[280px] sm:w-[320px] max-w-full max-h-[min(45vh,260px)] group">
          <video
            src={message.content}
            className="block w-full h-auto object-contain rounded-2xl bg-gray-100"
            onLoadedData={onMediaLoad}
            preload="metadata"
            muted
            playsInline
          />
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25 opacity-100 transition-opacity">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            </span>
          </span>
        </button>
      );
    case "MEDIA_CLUSTER":
      return (
        <MediaClusterBubble items={parseMediaClusterItems(message)} onMediaLoad={onMediaLoad} />
      );
    case "VOICE":
      return <audio src={message.content} controls className="h-10 w-full min-w-[200px] outline-none" />;
    case "FILE":
      return (
        <a href={message.content} download className="text-zalo-blue underline break-all line-clamp-2">
          {message.metadata?.fileName ?? "Tệp đính kèm"}
        </a>
      );
    default:
      return <p dangerouslySetInnerHTML={{ __html: safeContent }} className="break-words" />;
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
