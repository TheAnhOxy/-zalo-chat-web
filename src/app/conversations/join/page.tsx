"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/src/components/providers/auth-provider";
import { conversationGroupApi } from "@/src/services/api/conversation-group";
import { PageLoader } from "@/src/components/ui/page-state";
import { getErrorMessage } from "@/src/utils/error";

function JoinGroupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const code = (searchParams.get("code") ?? "").trim();

  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!code) {
      setError("Link mời không hợp lệ (thiếu mã).");
      return;
    }
    if (!auth.isInitialized) return;
    if (!auth.user?._id) return;

    let cancelled = false;
    setJoining(true);
    setError(null);

    conversationGroupApi
      .joinByInviteCode(code, auth.user._id)
      .then((conv) => {
        if (cancelled) return;
        const id = conv._id;
        if (!id) {
          setError("Đã tham gia nhưng không nhận được id hội thoại.");
          return;
        }
        router.replace(`/?conversation=${id}`);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(getErrorMessage(err) || "Không thể tham gia nhóm.");
      })
      .finally(() => {
        if (!cancelled) setJoining(false);
      });

    return () => {
      cancelled = true;
    };
  }, [auth.isInitialized, auth.user?._id, code, router]);

  if (!auth.isInitialized) {
    return <PageLoader text="Đang tải..." />;
  }

  if (!code) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-center text-white">
        <p className="text-lg font-medium">Link mời không hợp lệ</p>
        <Link href="/" className="text-sm text-emerald-400 hover:underline">
          Về trang chủ
        </Link>
      </main>
    );
  }

  if (!auth.user) {
    const loginHref = `/login?redirect=${encodeURIComponent(`/conversations/join?code=${code}`)}`;
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-center text-white">
        <p className="text-lg font-medium">Tham gia nhóm</p>
        <p className="max-w-sm text-sm text-slate-400">
          Bạn cần đăng nhập để tham gia nhóm qua link mời.
        </p>
        <Link
          href={loginHref}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Đăng nhập
        </Link>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-center text-white">
        <p className="text-lg font-medium text-rose-400">{error}</p>
        <Link href="/" className="text-sm text-emerald-400 hover:underline">
          Về trang chủ
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <p>{joining ? "Đang tham gia nhóm..." : "Đang xử lý..."}</p>
    </main>
  );
}

export default function JoinGroupPage() {
  return (
    <Suspense fallback={<PageLoader text="Đang tải..." />}>
      <JoinGroupContent />
    </Suspense>
  );
}
