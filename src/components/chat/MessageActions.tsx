"use client";

import { ReactionType } from "@/src/types/message";
import { t, ChatLocale } from "@/src/lib/i18n/chat";

const REACTIONS: ReactionType[] = ["LIKE", "LOVE", "HAHA", "WOW", "SAD", "ANGRY"];

interface MessageActionsProps {
  locale?: ChatLocale;
  isMine: boolean;
  onReply: () => void;
  onEdit?: () => void;
  onDelete: () => void;
  onForward?: () => void;
  onReact: (type: ReactionType) => void;
  onSelect?: () => void;
  onPin?: () => void;
}

export function MessageActions({
  locale = "vi",
  isMine,
  onReply,
  onEdit,
  onDelete,
  onForward,
  onReact,
  onSelect,
  onPin,
}: MessageActionsProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-1 rounded-lg border bg-white p-1 shadow-lg"
      role="menu"
      aria-label="Thao tác tin nhắn"
    >
      <div className="flex w-full gap-0.5 border-b pb-1 mb-1" role="group" aria-label={t("react", locale)}>
        {REACTIONS.map((r) => (
          <button
            key={r}
            type="button"
            role="menuitem"
            className="rounded px-1.5 py-0.5 text-xs hover:bg-gray-100"
            onClick={() => onReact(r)}
          >
            {reactionEmoji(r)}
          </button>
        ))}
      </div>
      <ActionButton label={t("reply", locale)} onClick={onReply} />
      {isMine && onEdit && <ActionButton label={t("edit", locale)} onClick={onEdit} />}
      <ActionButton label={t("delete", locale)} onClick={onDelete} />
      {onForward && <ActionButton label={t("forward", locale)} onClick={onForward} />}
      {onSelect && <ActionButton label={t("selectMessages", locale)} onClick={onSelect} />}
      {onPin && <ActionButton label={t("pin", locale)} onClick={onPin} />}
    </div>
  );
}

function ActionButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="menuitem"
      className="rounded px-2 py-1 text-xs text-gray-700 hover:bg-zalo-light"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function reactionEmoji(type: ReactionType): string {
  const map: Record<ReactionType, string> = {
    LIKE: "👍",
    LOVE: "❤️",
    HAHA: "😂",
    WOW: "😮",
    SAD: "😢",
    ANGRY: "😠",
  };
  return map[type];
}
