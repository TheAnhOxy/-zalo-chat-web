"use client";

import { ArrowLeft } from "lucide-react";

type ContactsSubpageHeaderProps = {
  title: string;
  onBack: () => void;
  variant?: "light" | "primary";
  right?: React.ReactNode;
};

export function ContactsSubpageHeader({
  title,
  onBack,
  variant = "light",
  right,
}: ContactsSubpageHeaderProps) {
  const isPrimary = variant === "primary";

  return (
    <header
      className={`flex shrink-0 items-center justify-between gap-2 px-2 py-2 md:px-4 ${
        isPrimary
          ? "bg-[var(--qc-primary)] text-white"
          : "border-b border-slate-200 bg-white text-slate-800"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <button
          type="button"
          onClick={onBack}
          className={`shrink-0 rounded-full p-2 transition ${
            isPrimary ? "hover:bg-white/10" : "text-slate-600 hover:bg-slate-100"
          }`}
          aria-label="Quay lại"
        >
          <ArrowLeft className="h-6 w-6 md:h-5 md:w-5" />
        </button>
        <h1
          className={`truncate text-[17px] font-semibold md:text-xl ${
            isPrimary ? "text-white" : "font-bold"
          }`}
        >
          {title}
        </h1>
      </div>
      {right ? <div className="flex shrink-0 items-center gap-1">{right}</div> : null}
    </header>
  );
}
