"use client";

import { useEffect, useRef } from "react";
import { t, ChatLocale } from "@/src/lib/i18n/chat";
import { AnchorPortal } from "@/src/components/chat/AnchorPortal";
import { AnchorPlacement } from "@/src/hooks/useAnchorPosition";

/** Menu ⋮ — khớp mobile chat_detail_screen / group_chat_screen */
export interface MessageMoreMenuProps {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  placement?: AnchorPlacement;
  locale?: ChatLocale;
  isMine: boolean;
  isPinned?: boolean;
  canRecall?: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onRecall?: () => void;
  onForward: () => void;
  onPin?: () => void;
  onUnpin?: () => void;
  onDeleteForMe: () => void;
}

export function MessageMoreMenu({
  open,
  anchorRef,
  placement = "bottom-start",
  locale = "vi",
  isMine,
  isPinned = false,
  canRecall = false,
  onClose,
  onEdit,
  onRecall,
  onForward,
  onPin,
  onUnpin,
  onDeleteForMe,
}: MessageMoreMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorRef]);

  const run = (fn: () => void) => {
    onClose();
    fn();
  };

  return (
    <AnchorPortal open={open} anchorRef={anchorRef} placement={placement} offset={4}>
      <div
        ref={menuRef}
        className="min-w-[172px] rounded-md bg-white py-1 shadow-[0_4px_20px_rgba(0,0,0,0.12)]"
        role="menu"
      >
        {isMine && onEdit ? (
          <MenuItem label={t("edit", locale)} onClick={() => run(onEdit)} />
        ) : null}
        {isMine && canRecall && onRecall ? (
          <MenuItem label={t("recall", locale)} onClick={() => run(onRecall)} danger />
        ) : null}
        {isPinned && onUnpin ? (
          <MenuItem label={t("unpin", locale)} onClick={() => run(onUnpin)} />
        ) : !isPinned && onPin ? (
          <MenuItem label={t("pin", locale)} onClick={() => run(onPin)} />
        ) : null}
        <MenuItem label={t("forward", locale)} onClick={() => run(onForward)} />
        <MenuItem
          label={t("deleteForMe", locale)}
          onClick={() => run(onDeleteForMe)}
          danger
        />
      </div>
    </AnchorPortal>
  );
}

function MenuItem({
  label,
  onClick,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className={`w-full px-4 py-2.5 text-left text-[15px] hover:bg-[var(--qc-bg)] ${
        danger ? "text-red-500" : "text-[var(--qc-text-primary)]"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
