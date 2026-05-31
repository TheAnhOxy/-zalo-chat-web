"use client";

import { ReactNode } from "react";
import { AppNavSidebar } from "@/src/components/layout/app-nav-sidebar";

export function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="h-screen overflow-hidden bg-[var(--qc-bg)] text-[var(--qc-text-primary)]">
      <div className="h-full w-full md:grid md:grid-cols-[72px_1fr]">
        <AppNavSidebar activeTab="profile" />
        <div className="h-full min-h-0 overflow-hidden">{children}</div>
      </div>
    </main>
  );
}
