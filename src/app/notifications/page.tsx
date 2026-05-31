"use client";

import { Bell } from "lucide-react";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { AppNavSidebar } from "@/src/components/layout/app-nav-sidebar";
import { PageLoader } from "@/src/components/ui/page-state";

export default function NotificationsPage() {
  const auth = useAuthGuard();

  if (!auth.isInitialized || !auth.user) return <PageLoader />;

  return (
    <main className="h-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-amber-50 text-slate-800">
      <div className="h-full w-full md:grid md:grid-cols-[72px_1fr]">
        <AppNavSidebar activeTab="notifications" />

        <section className="flex h-full flex-col items-center justify-center bg-white px-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Bell size={40} />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-800">Thông báo</h1>
          <p className="mt-2 max-w-sm text-center text-sm text-slate-500">
            Chưa có thông báo mới. Khi có hoạt động (lời mời kết bạn, tin nhắn, nhóm…), chúng sẽ hiển thị tại đây.
          </p>
        </section>
      </div>
    </main>
  );
}
