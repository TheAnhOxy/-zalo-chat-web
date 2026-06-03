"use client";

import { AppNavSidebar } from "@/src/components/layout/app-nav-sidebar";
import { MobileBottomNav } from "@/src/components/layout/mobile-bottom-nav";

type ContactsShellProps = {
  children: React.ReactNode;
  /** Hiện bottom nav trên mobile (màn danh sách chính) */
  showMobileBottomNav?: boolean;
};

/** Shell chung: nav trái desktop + bottom nav mobile */
export function ContactsShell({
  children,
  showMobileBottomNav = false,
}: ContactsShellProps) {
  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-amber-50 text-slate-800 md:h-screen">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:grid md:grid-cols-[72px_minmax(0,1fr)]">
        <AppNavSidebar activeTab="contacts" />
        <div
          className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
            showMobileBottomNav ? "pb-14 md:pb-0" : ""
          }`}
        >
          {children}
        </div>
      </div>
      {showMobileBottomNav ? <MobileBottomNav activeTab="contacts" /> : null}
    </main>
  );
}

type ContactsMainShellProps = {
  list: React.ReactNode;
  detail?: React.ReactNode;
};

/** Shell trang /contacts: cột list + placeholder desktop */
export function ContactsMainShell({ list, detail }: ContactsMainShellProps) {
  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-amber-50 text-slate-800 md:h-screen">
      <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[72px_330px_1fr]">
        <AppNavSidebar activeTab="contacts" />
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden pb-14 md:h-full md:w-[330px] md:pb-0">
          {list}
        </div>
        {detail ?? (
          <section className="hidden min-h-0 flex-col overflow-hidden bg-white md:flex">
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-800">Danh bạ QuickChat</h2>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                Chọn một liên hệ từ danh sách để xem thông tin hoặc bắt đầu trò chuyện.
              </p>
            </div>
          </section>
        )}
      </div>
      <MobileBottomNav activeTab="contacts" />
    </main>
  );
}
