"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Pencil } from "lucide-react";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { PageLoader } from "@/src/components/ui/page-state";
import { usePeerProfile } from "@/src/hooks/usePeerProfile";
import { contactsService } from "@/src/services/contacts/contacts.service";
import { useToast } from "@/src/components/providers/toast-provider";
import { AvatarWidget } from "@/src/components/common/AvatarWidget";

const MAX_LEN = 150;

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default function SendFriendRequestPage({ params }: PageProps) {
  const { userId } = use(params);
  const auth = useAuthGuard();
  const router = useRouter();
  const { showToast } = useToast();
  const { data: targetUser, isLoading } = usePeerProfile(userId, Boolean(auth.user?._id));

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!auth.user?.fullName) return;
    setMessage(`Xin chào, mình là ${auth.user.fullName}. Kết bạn với mình nhé!`);
  }, [auth.user?.fullName]);

  const handleSend = async () => {
    if (!auth.user?._id) return;
    const text = message.trim();
    if (text.length > MAX_LEN) {
      showToast(`Tối đa ${MAX_LEN} ký tự`, "error");
      return;
    }
    setSending(true);
    try {
      await contactsService.sendFriendRequest(auth.user._id, userId, text);
      showToast("Đã gửi lời mời kết bạn");
      router.replace(`/contacts/user/${userId}`);
    } catch {
      showToast("Gửi lời mời thất bại, vui lòng thử lại", "error");
    } finally {
      setSending(false);
    }
  };

  if (!auth.isInitialized || !auth.user) return <PageLoader />;
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--qc-bg)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--qc-primary)]" />
      </div>
    );
  }

  const name = targetUser?.fullName?.trim() || "Người dùng";

  return (
    <div className="flex h-screen flex-col bg-[var(--qc-bg)]">
      <header className="flex shrink-0 items-center gap-1 bg-[var(--qc-primary)] px-1 py-2 text-white">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-full p-2 hover:bg-white/10"
          aria-label="Quay lại"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-[17px] font-semibold">Kết bạn</h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl bg-white p-4 pt-5 shadow-sm">
          <div className="flex items-center gap-3">
            <AvatarWidget url={targetUser?.avatar} name={name} size={48} />
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <p className="truncate text-[15px] font-semibold text-[var(--qc-text-primary)]">{name}</p>
              <Pencil className="h-4 w-4 shrink-0 text-[var(--qc-text-secondary)]" aria-hidden />
            </div>
          </div>

          <div className="mt-4 rounded-[10px] bg-[var(--qc-bg)] p-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
              rows={4}
              className="w-full resize-none bg-transparent text-sm text-[var(--qc-text-primary)] outline-none"
              placeholder="Nhập lời nhắn..."
            />
            <p
              className={`mt-1 text-right text-xs ${
                message.length > MAX_LEN ? "text-[#e41e3f]" : "text-[var(--qc-text-secondary)]"
              }`}
            >
              {message.length}/{MAX_LEN}
            </p>
          </div>
        </div>
      </div>

      <div className="shrink-0 border-t border-[var(--qc-divider)] bg-white p-4">
        <button
          type="button"
          disabled={sending || !message.trim()}
          onClick={() => void handleSend()}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] bg-[var(--qc-primary)] py-3 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Gửi lời mời
        </button>
      </div>
    </div>
  );
}
