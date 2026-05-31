"use client";

import { MessageCircle } from "lucide-react";

export function WelcomeEmptyState() {
  return (
    <div className="flex h-full items-center justify-center bg-[var(--qc-bg)]">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--qc-primary-light)] text-[var(--qc-primary)]">
          <MessageCircle size={32} strokeWidth={2} />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-[var(--qc-text-primary)]">QuickChat</h1>
      </div>
    </div>
  );
}
