"use client";

import { AppShell } from "@/src/components/ui/app-shell";
import { PageError, PageLoader } from "@/src/components/ui/page-state";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { useGroups } from "@/src/hooks/use-contacts";
import { getErrorMessage } from "@/src/utils/error";

export default function GroupsPage() {
  const auth = useAuthGuard();
  const groupsQuery = useGroups(auth.user?._id);

  if (!auth.isInitialized || !auth.user || groupsQuery.isLoading) {
    return <PageLoader />;
  }

  if (groupsQuery.isError) {
    return <PageError text={getErrorMessage(groupsQuery.error)} onRetry={() => groupsQuery.refetch()} />;
  }

  return (
    <AppShell title="Nhóm">
      <p className="text-sm text-slate-300">Dữ liệu đang gọi từ contactsService.getGroups(userId).</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {groupsQuery.data?.map((group) => (
          <div key={group._id} className="rounded-lg border border-slate-700 bg-slate-800 p-4">
            <p className="font-semibold">{group.name}</p>
            <p className="mt-1 text-sm text-slate-300">{group.description || "Không có mô tả"}</p>
            <p className="mt-1 text-sm text-slate-300">Số thành viên: {group.memberCount}</p>
          </div>
        ))}

        {!groupsQuery.data?.length ? <p className="text-sm text-slate-400">Chưa có nhóm hoặc endpoint trả về rỗng.</p> : null}
      </div>
    </AppShell>
  );
}
