"use client";

import { Globe, Monitor, RefreshCw, Smartphone } from "lucide-react";
import { SettingsLayout } from "@/src/components/settings/settings-layout";
import {
  SettingsCard,
  SettingsOutlineDangerButton,
  SettingsShell,
} from "@/src/components/settings/settings-ui";
import { PageLoader, PageError } from "@/src/components/ui/page-state";
import { useToast } from "@/src/components/providers/toast-provider";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { useLogoutAllDevices, useSessions } from "@/src/hooks/use-auth-actions";
import { getErrorMessage } from "@/src/utils/error";

function deviceIcon(device: string) {
  if (device === "web") return Globe;
  if (device === "android") return Smartphone;
  return Monitor;
}

export default function DeviceSessionsPage() {
  const auth = useAuthGuard();
  const { showToast } = useToast();
  const sessionsQuery = useSessions(auth.user?._id);
  const logoutAllMutation = useLogoutAllDevices();

  if (!auth.isInitialized || !auth.user || sessionsQuery.isLoading) {
    return <PageLoader />;
  }

  const userId = auth.user._id;

  if (sessionsQuery.isError) {
    return (
      <SettingsLayout>
        <PageError text={getErrorMessage(sessionsQuery.error)} onRetry={() => sessionsQuery.refetch()} />
      </SettingsLayout>
    );
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
    <SettingsLayout>
      <SettingsShell
        title="Thiết bị & Phiên đăng nhập"
        action={
          <button
            type="button"
            onClick={() => sessionsQuery.refetch()}
            className="rounded-lg p-2 text-[var(--qc-text-secondary)] hover:bg-[var(--qc-primary-light)]"
            title="Làm mới"
          >
            <RefreshCw size={20} />
          </button>
        }
      >
        <div className="mx-auto max-w-2xl space-y-4 pb-8">
          <SettingsOutlineDangerButton
            loading={logoutAllMutation.isPending}
            onClick={() => void onLogoutAll()}
          >
            Đăng xuất tất cả thiết bị
          </SettingsOutlineDangerButton>

          {!sessionsQuery.data?.length ? (
            <p className="py-12 text-center text-sm text-[var(--qc-text-secondary)]">
              Không có phiên đăng nhập nào.
            </p>
          ) : (
            <div className="space-y-2.5">
              {sessionsQuery.data.map((session) => {
                const DeviceIcon = deviceIcon(session.device);
                const isActive = session.isCurrent;
                return (
                  <SettingsCard key={session._id} className="!p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--qc-bg)] text-[var(--qc-primary)]">
                        <DeviceIcon size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--qc-text-primary)]">
                          {session.device} — {session.deviceName}
                        </p>
                        <p className="mt-1 text-xs text-[var(--qc-text-secondary)]">
                          IP: {session.ipAddress || "-"}
                        </p>
                        <p className="text-xs text-[var(--qc-text-secondary)]">
                          {new Date(session.createdAt).toLocaleString("vi-VN")}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${
                          isActive
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-[var(--qc-text-secondary)]"
                        }`}
                      >
                        {isActive ? "Đang hoạt động" : "Không hoạt động"}
                      </span>
                    </div>
                  </SettingsCard>
                );
              })}
            </div>
          )}
        </div>
      </SettingsShell>
    </SettingsLayout>
  );
}
