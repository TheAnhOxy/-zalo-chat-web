"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { IMessage } from "@/src/types/message";
import { messageMatchesSearch } from "@/src/lib/messages";
import { t, ChatLocale } from "@/src/lib/i18n/chat";

interface MessageSearchPanelProps {
  open: boolean;
  onClose: () => void;
  messages: IMessage[];
  locale?: ChatLocale;
  onJumpToMessage: (messageId: string) => void;
}

export function MessageSearchPanel({
  open,
  onClose,
  messages,
  locale = "vi",
  onJumpToMessage,
}: MessageSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const matches = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return messages.filter((m) => !m.isRecalled && messageMatchesSearch(m, q)).map((m) => m._id);
  }, [messages, query]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  const go = useCallback(
    (delta: number) => {
      if (!matches.length) return;
      const next = (index + delta + matches.length) % matches.length;
      setIndex(next);
      onJumpToMessage(matches[next]);
    },
    [index, matches, onJumpToMessage]
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      setIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim() || !matches.length) return;
    setIndex(0);
    onJumpToMessage(matches[0]);
  }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-[var(--qc-divider)] bg-[var(--qc-card)] px-2 py-2">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchInChat", locale)}
        className="min-w-0 flex-1 rounded-lg bg-[var(--qc-bg)] px-3 py-2 text-sm outline-none ring-1 ring-[var(--qc-divider)] focus:ring-[var(--qc-primary)]/40"
        autoFocus
        aria-label={t("searchInChat", locale)}
      />
      {matches.length > 0 ? (
        <span className="shrink-0 text-xs text-[var(--qc-text-secondary)]">
          {index + 1}/{matches.length}
        </span>
      ) : query.trim() ? (
        <span className="shrink-0 text-xs text-[var(--qc-text-secondary)]">0</span>
      ) : null}
      <button
        type="button"
        className="rounded p-1.5 hover:bg-[var(--qc-bg)] disabled:opacity-40"
        disabled={!matches.length}
        onClick={() => go(-1)}
        aria-label="Kết quả trước"
      >
        <ChevronUp className="h-5 w-5 text-[var(--qc-primary)]" />
      </button>
      <button
        type="button"
        className="rounded p-1.5 hover:bg-[var(--qc-bg)] disabled:opacity-40"
        disabled={!matches.length}
        onClick={() => go(1)}
        aria-label="Kết quả sau"
      >
        <ChevronDown className="h-5 w-5 text-[var(--qc-primary)]" />
      </button>
      <button type="button" onClick={onClose} className="rounded p-1.5 hover:bg-[var(--qc-bg)]" aria-label="Đóng tìm kiếm">
        <X className="h-5 w-5 text-[var(--qc-text-secondary)]" />
      </button>
    </div>
  );
}
