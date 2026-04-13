"use client";

import { AppShell } from "@/src/components/ui/app-shell";
import { PageLoader, PageError } from "@/src/components/ui/page-state";
import { useToast } from "@/src/components/providers/toast-provider";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { useLogoutAllDevices, useSessions } from "@/src/hooks/use-auth-actions";
import { getErrorMessage } from "@/src/utils/error";

export default function SessionsPage() {
  const auth = useAuthGuard();
  const { showToast } = useToast();
  const sessionsQuery = useSessions(auth.user?._id);
  const logoutAllMutation = useLogoutAllDevices();

  if (!auth.isInitialized || !auth.user || sessionsQuery.isLoading) {
    return <PageLoader />;
  }

  const userId = auth.user._id;

  if (sessionsQuery.isError) {
    return <PageError text={getErrorMessage(sessionsQuery.error)} onRetry={() => sessionsQuery.refetch()} />;
  }

  const onLogoutAll = async () => {
    try {
      await logoutAllMutation.mutateAsync({ userId });
      showToast("Đã đăng xuất tất cả thiết bị", "success");
      sessionsQuery.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  };

  return (
    <AppShell title="Phiên đăng nhập">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-300">Danh sách phiên từ API GET /auth/sessions/:userId</p>
        <button
          onClick={onLogoutAll}
          disabled={logoutAllMutation.isPending}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-60"
        >
          {logoutAllMutation.isPending ? "Đang xử lý..." : "Đăng xuất tất cả thiết bị"}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {sessionsQuery.data?.map((session) => (
          <div key={session._id} className="rounded-lg border border-slate-700 bg-slate-800 p-4 text-sm">
            <p className="font-semibold">{session.deviceName}</p>
            <p className="mt-1 text-slate-300">Thiết bị: {session.device}</p>
            <p className="mt-1 text-slate-300">IP: {session.ipAddress || "-"}</p>
            <p className="mt-1 text-slate-300">Tạo lúc: {new Date(session.createdAt).toLocaleString("vi-VN")}</p>
            <p className={`mt-1 font-medium ${session.isCurrent ? "text-emerald-400" : "text-slate-400"}`}>
              {session.isCurrent ? "Phiên hiện tại" : "Phiên khác"}
            </p>
          </div>
        ))}

        {!sessionsQuery.data?.length ? <p className="text-sm text-slate-400">Chưa có phiên đăng nhập.</p> : null}
      </div>
    </AppShell>
  );
}
