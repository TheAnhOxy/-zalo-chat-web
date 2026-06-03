"use client";

import { AppNavSidebar } from "@/src/components/layout/app-nav-sidebar";
import { MobileBottomNav } from "@/src/components/layout/mobile-bottom-nav";

type AiShellProps = {
  children: React.ReactNode;
};

/** Shell trang /ai: nav desktop + bottom nav mobile + vùng chat full height */
export function AiShell({ children }: AiShellProps) {
  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-[var(--qc-bg)] text-slate-800 md:h-screen">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:grid md:grid-cols-[72px_minmax(0,1fr)]">
        <AppNavSidebar activeTab="ai" />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-14 md:pb-0">
          {children}
        </div>
      </div>
      <MobileBottomNav activeTab="ai" />
    </main>
  );
}
