"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Info,
  Phone,
  Search,
  Video,
  Wallpaper,
} from "lucide-react";
import { useEffect, useState } from "react";
import { userService } from "@/src/services/user/user.service";
import { IConversationParticipant } from "@/src/types/conversation";
import { IUserPresence } from "@/src/types/presence";
import { t, ChatLocale } from "@/src/lib/i18n/chat";
import { AvatarWidget } from "@/src/components/common/AvatarWidget";

interface ChatHeaderProps {
  title: string;
  avatarUrl?: string;
  avatarName: string;
  isGroup?: boolean;
  memberCount?: number;
  participant?: IConversationParticipant | null;
  presence?: IUserPresence | null;
  locale?: ChatLocale;
  showWallpaper?: boolean;
  showCalls?: boolean;
  onSearchToggle?: () => void;
  onAppearance?: () => void;
  onInfo?: () => void;
  callHref?: string;
}

function HeaderIconButton({
  onClick,
  href,
  label,
  children,
}: {
  onClick?: () => void;
  href?: string;
  label: string;
  children: React.ReactNode;
}) {
  const className =
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--qc-primary)] transition hover:bg-[var(--qc-primary-light)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--qc-primary)]/30";

  if (href) {
    return (
      <a href={href} className={className} aria-label={label}>
        {children}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className} aria-label={label}>
      {children}
    </button>
  );
}

export function ChatHeader({
  title,
  avatarUrl: avatarUrlProp,
  avatarName,
  isGroup = false,
  memberCount = 0,
  participant,
  presence,
  locale = "vi",
  showWallpaper = true,
  showCalls = true,
  onSearchToggle,
  onAppearance,
  onInfo,
  callHref,
}: ChatHeaderProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(title);
  const [avatarUrl, setAvatarUrl] = useState(avatarUrlProp);

  useEffect(() => {
    let mounted = true;
    setDisplayName(title);
    setAvatarUrl(avatarUrlProp);

    if (!isGroup && participant?.userId) {
      const nameFromParticipant = participant.fullName?.trim();
      if (nameFromParticipant) setDisplayName(nameFromParticipant);
      if (participant.avatar?.trim()) setAvatarUrl(participant.avatar);

      if (!nameFromParticipant || !participant.avatar?.trim()) {
        userService
          .getProfile(participant.userId)
          .then((u) => {
            if (!mounted) return;
            if (u?.fullName?.trim()) setDisplayName(u.fullName.trim());
            if (u?.avatar?.trim()) setAvatarUrl(u.avatar);
          })
          .catch(() => {
            if (mounted && !nameFromParticipant) setDisplayName("Người dùng");
          });
      }
    }

    return () => {
      mounted = false;
    };
  }, [participant, title, avatarUrlProp, isGroup]);

  const online = !isGroup && (presence?.isOnline ?? participant?.isOnline);
  const lastSeen = presence?.lastSeen ?? participant?.lastSeen;
  const presenceText = isGroup
    ? `${memberCount} thành viên`
    : online
      ? "Đang hoạt động"
      : lastSeen
        ? t("lastSeen", locale, { time: new Date(lastSeen).toLocaleTimeString("vi-VN") })
        : "Hoạt động gần đây";

  return (
    <header
      className="shrink-0 border-b border-[var(--qc-divider)] bg-[var(--qc-card)] px-1.5 py-2"
      role="banner"
    >
      <div className="flex items-center">
        <HeaderIconButton label="Quay lại" onClick={() => router.replace("/")}>
          <ArrowLeft className="h-[22px] w-[22px] stroke-[2]" />
        </HeaderIconButton>

        <div className="relative mx-2.5 h-[38px] w-[38px] shrink-0">
          <AvatarWidget url={avatarUrl} name={displayName} size={38} />
          {!isGroup && online ? (
            <span
              className="absolute -bottom-px -left-px h-[11px] w-[11px] rounded-full border-2 border-[var(--qc-card)] bg-[var(--qc-online)]"
              aria-hidden
            />
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-bold leading-tight text-[var(--qc-text-primary)]">
            {displayName}
          </h1>
          <p
            className={`truncate text-xs leading-tight ${
              online && !isGroup ? "text-[var(--qc-online)]" : "text-[var(--qc-text-secondary)]"
            }`}
          >
            {presenceText}
          </p>
        </div>

        <div className="flex shrink-0 items-center">
          {onSearchToggle ? (
            <HeaderIconButton label={t("searchInChat", locale)} onClick={onSearchToggle}>
              <Search className="h-[22px] w-[22px] stroke-[2]" />
            </HeaderIconButton>
          ) : null}
          {showCalls && callHref ? (
            <>
              <HeaderIconButton
                label={t("callVoice", locale)}
                href={`${callHref}?type=voice`}
              >
                <Phone className="h-[22px] w-[22px] stroke-[2]" />
              </HeaderIconButton>
              <HeaderIconButton
                label={t("callVideo", locale)}
                href={`${callHref}?type=video`}
              >
                <Video className="h-[23px] w-[23px] stroke-[2]" />
              </HeaderIconButton>
            </>
          ) : null}
          {showWallpaper && onAppearance ? (
            <HeaderIconButton label="Đổi hình nền" onClick={onAppearance}>
              <Wallpaper className="h-[22px] w-[22px] stroke-[2]" />
            </HeaderIconButton>
          ) : null}
          {onInfo ? (
            <HeaderIconButton label="Thông tin" onClick={onInfo}>
              <Info className="h-[22px] w-[22px] stroke-[2]" />
            </HeaderIconButton>
          ) : null}
        </div>
      </div>
    </header>
  );
}
