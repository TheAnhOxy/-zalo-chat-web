"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "@/src/components/ui/app-shell";
import { PageError, PageLoader } from "@/src/components/ui/page-state";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { useFriends } from "@/src/hooks/use-contacts";
import { useCreateDirectConversation } from "@/src/hooks/useConversation";
import { getErrorMessage } from "@/src/utils/error";

export default function ContactsPage() {
  const auth = useAuthGuard();
  const router = useRouter();
  const friendsQuery = useFriends(auth.user?._id);
  const { create, loading } = useCreateDirectConversation();

  const startChat = async (participantId: string) => {
    if (!auth.user?._id) return;
    const conv = await create(auth.user._id, participantId);
    router.push(`/chat/${conv._id}`);
  };

  if (!auth.isInitialized || !auth.user || friendsQuery.isLoading) {
    return <PageLoader />;
  }

  if (friendsQuery.isError) {
    return <PageError text={getErrorMessage(friendsQuery.error)} onRetry={() => friendsQuery.refetch()} />;
  }

  return (
    <AppShell title="Danh bạ bạn bè">
      <p className="text-sm text-slate-300">Dữ liệu đang gọi từ contactsService.getFriends(userId).</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {friendsQuery.data?.map((friend) => (
          <div key={friend._id} className="rounded-lg border border-slate-700 bg-slate-800 p-4">
            <p className="font-semibold">{friend.fullName}</p>
            <p className="mt-1 text-sm text-slate-300">{friend.email}</p>
            <p className="mt-1 text-sm text-slate-300">{friend.phone}</p>
            <button
              type="button"
              disabled={loading || friend.isBlocked}
              onClick={() => startChat(friend._id)}
              className="mt-3 rounded-lg bg-zalo-blue px-3 py-1.5 text-sm text-white hover:bg-zalo-dark disabled:opacity-50"
            >
              Nhắn tin
            </button>
            {friend.isBlocked ? (
              <p className="mt-1 text-xs text-red-400">Đã chặn</p>
            ) : null}
          </div>
        ))}

        {!friendsQuery.data?.length ? <p className="text-sm text-slate-400">Chưa có bạn bè hoặc endpoint trả về rỗng.</p> : null}
      </div>
    </AppShell>
  );
}
