"use client";

import { t, ChatLocale } from "@/src/lib/i18n/chat";

interface TypingIndicatorProps {
  names: string[];
  locale?: ChatLocale;
}

export function TypingIndicator({ names, locale = "vi" }: TypingIndicatorProps) {
  if (!names.length) return null;
  const label = t("typing", locale, { name: names.join(", ") });

  return (
    <div
      className="px-4 py-1 text-xs text-zalo-blue animate-pulse"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      {label}
      <span className="inline-flex gap-0.5 ml-1" aria-hidden>
        <span className="animate-bounce">.</span>
        <span className="animate-bounce [animation-delay:0.1s]">.</span>
        <span className="animate-bounce [animation-delay:0.2s]">.</span>
      </span>
    </div>
  );
}
