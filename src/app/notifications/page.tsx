"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { AppNavSidebar } from "@/src/components/layout/app-nav-sidebar";
import { MobileBottomNav } from "@/src/components/layout/mobile-bottom-nav";
import { PageLoader } from "@/src/components/ui/page-state";
import { useNotifications } from "@/src/hooks/use-notifications";
import { NotificationItem } from "@/src/components/notifications/notification-item";

export default function NotificationsPage() {
  const auth = useAuthGuard();
  const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  if (!auth.isInitialized || !auth.user || isLoading) return <PageLoader />;

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-slate-50 text-slate-800 md:h-screen">
      <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[72px_1fr]">
        <AppNavSidebar activeTab="notifications" />

        <section className="flex min-h-0 flex-1 flex-col bg-[#f0f2f5] md:m-4 md:rounded-2xl md:shadow-sm md:ring-1 md:ring-slate-200">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <h1 className="text-xl font-bold text-slate-800">Thông báo</h1>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
              >
                <CheckCheck size={16} />
                Đánh dấu đã đọc tất cả
              </button>
            )}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
            {notifications.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                  <Bell size={48} strokeWidth={1.5} />
                </div>
                <h2 className="mt-4 text-lg font-semibold text-slate-700">Chưa có thông báo nào</h2>
                <p className="mt-2 max-w-xs text-sm text-slate-500">
                  Khi có hoạt động mới (lời mời kết bạn, tin nhắn, nhóm…), chúng sẽ hiển thị tại đây.
                </p>
              </div>
            ) : (
              <div className="mx-auto flex max-w-2xl flex-col gap-3 pb-8">
                {notifications.map((notif, idx) => (
                  <NotificationItem 
                    key={notif._id || notif.id || idx} 
                    notification={notif} 
                    onRead={markAsRead} 
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
      
      <div className="md:hidden">
        <MobileBottomNav activeTab="notifications" />
      </div>
    </main>
  );
}
