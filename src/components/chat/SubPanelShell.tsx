"use client";

import { ArrowLeft } from "lucide-react";

export function SubPanelShell({
  title,
  onBack,
  children,
  headerExtra,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[var(--qc-bg)]">
      <div className="flex shrink-0 items-center gap-1 bg-[var(--qc-primary)] px-1 py-2 text-white">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full p-2 hover:bg-white/10"
          aria-label="Quay lại"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h3 className="min-w-0 flex-1 truncate text-[17px] font-bold">{title}</h3>
        {headerExtra}
      </div>
      <div className="min-h-0 flex-1 overflow-hidden flex flex-col">{children}</div>
    </div>
  );
}
