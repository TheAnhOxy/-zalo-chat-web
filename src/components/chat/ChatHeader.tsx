"use client";

import Link from "next/link";
import { ArrowLeft, MoreHorizontal, Phone, Search, Video, Palette } from "lucide-react";
import { IConversationParticipant } from "@/src/types/conversation";
import { useEffect, useState } from "react";
import { userService } from "@/src/services/user/user.service";
import { IUserPresence } from "@/src/types/presence";
import { t, ChatLocale } from "@/src/lib/i18n/chat";

interface ChatHeaderProps {
  title: string;
  participant?: IConversationParticipant | null;
  presence?: IUserPresence | null;
  locale?: ChatLocale;
  onSearchToggle?: () => void;
  onThemeToggle?: () => void;
  onOptionsOpen?: () => void;
  callHref?: string;
}

export function ChatHeader({
  title,
  participant,
  presence,
  locale = "vi",
  onSearchToggle,
  onThemeToggle,
  onOptionsOpen,
  callHref,
}: ChatHeaderProps) {
  const [displayName, setDisplayName] = useState<string>(title);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(participant?.avatar);

  useEffect(() => {
    let mounted = true;
    if (participant && participant.userId) {
      if (participant.fullName) setDisplayName(participant.fullName);
      if (participant.avatar) setAvatarUrl(participant.avatar);

      if ((!participant.fullName || !participant.avatar) && participant.userId) {
        userService
          .getProfile(participant.userId)
          .then((u) => {
            if (!mounted) return;
            if (u?.fullName) setDisplayName(u.fullName);
            if (u?.avatar) setAvatarUrl(u.avatar);
          })
          .catch(() => {
            if (mounted && !participant.fullName) setDisplayName(participant.userId);
          });
      }
    } else {
      setDisplayName(title);
      setAvatarUrl(undefined);
    }
    return () => {
      mounted = false;
    };
  }, [participant, title]);
  const online = presence?.isOnline ?? participant?.isOnline;
  const lastSeen = presence?.lastSeen ?? participant?.lastSeen;
  const subtitle = online
    ? t("online", locale)
    : lastSeen
      ? t("lastSeen", locale, { time: new Date(lastSeen).toLocaleTimeString() })
      : participant
        ? "Hoạt động gần đây" // Provide a fallback if it's a 1-1 chat
        : "";

  return (
    <header
      className="flex items-center gap-3 border-b border-gray-200 bg-white px-3 py-2.5 shadow-sm"
      role="banner"
    >
      <Link
        href="/"
        className="rounded-full p-2 text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zalo-blue"
        aria-label="Quay lại"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>

      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zalo-blue to-blue-700 text-sm font-semibold text-white"
        aria-hidden
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
        ) : (
          title.slice(0, 1).toUpperCase()
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold text-gray-900">{displayName}</h1>
        {subtitle && (
          <p className="truncate text-xs text-gray-500">
            <span className={online ? "text-emerald-600" : ""}>{subtitle}</span>
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onSearchToggle}
          className="rounded-full p-2 text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-zalo-blue"
          aria-label={t("searchInChat", locale)}
        >
          <Search className="h-5 w-5" />
        </button>
        {callHref && (
          <>
            <Link
              href={`${callHref}?type=voice`}
              className="rounded-full p-2 text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-zalo-blue"
              aria-label={t("callVoice", locale)}
            >
              <Phone className="h-5 w-5" />
            </Link>
            <Link
              href={`${callHref}?type=video`}
              className="rounded-full p-2 text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-zalo-blue"
              aria-label={t("callVideo", locale)}
            >
              <Video className="h-5 w-5" />
            </Link>
          </>
        )}
        <button
          type="button"
          onClick={onThemeToggle}
          className="rounded-full p-2 text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-zalo-blue"
          aria-label="Đổi hình nền"
        >
          <Palette className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onOptionsOpen}
          className="rounded-full p-2 text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-zalo-blue"
          aria-label="Tùy chọn"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
