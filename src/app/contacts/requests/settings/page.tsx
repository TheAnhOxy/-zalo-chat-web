"use client";

import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { useProfile, useUpdatePrivacy } from "@/src/hooks/use-user";
import { PageLoader } from "@/src/components/ui/page-state";
import { useToast } from "@/src/components/providers/toast-provider";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";

export default function FriendRequestSettingsPage() {
  const auth = useAuthGuard();
  const router = useRouter();
  const { showToast } = useToast();
  
  const profileQuery = useProfile(auth.user?._id);
  const updatePrivacyMutation = useUpdatePrivacy(auth.user?._id);

  const [findByPhone, setFindByPhone] = useState(true);

  useEffect(() => {
    if (profileQuery.data?.privacy) {
      setFindByPhone(Boolean(profileQuery.data.privacy.findByPhone));
    }
  }, [profileQuery.data]);

  const handleSave = async (newValue: boolean) => {
    if (!profileQuery.data?.privacy) return;
    
    setFindByPhone(newValue);
    try {
      await updatePrivacyMutation.mutateAsync({
        ...profileQuery.data.privacy,
        findByPhone: newValue
      });
      showToast("Cập nhật cài đặt thành công", "success");
    } catch (e) {
      showToast("Lỗi khi cập nhật cài đặt", "error");
      setFindByPhone(!newValue);
    }
  };

  if (!auth.isInitialized || !auth.user || profileQuery.isLoading) {
    return <PageLoader />;
  }

  return (
    <main className="h-screen bg-slate-50 text-slate-800">
      <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-4">
        <button onClick={() => router.back()} className="rounded-full p-2 text-slate-600 transition hover:bg-slate-100">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Cài đặt lời mời kết bạn</h1>
      </header>

      <div className="mx-auto w-full max-w-xl p-4 md:p-8">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="pr-4">
              <p className="font-semibold">Nhận lời mời kết bạn từ số điện thoại</p>
              <p className="mt-1 text-sm text-slate-500">Cho phép người khác tìm thấy bạn qua số điện thoại để kết bạn.</p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center shrink-0">
              <input
                type="checkbox"
                className="peer sr-only"
                checked={findByPhone}
                onChange={(e) => handleSave(e.target.checked)}
                disabled={updatePrivacyMutation.isPending}
              />
              <div className="peer h-6 w-11 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none"></div>
            </label>
          </div>
        </div>
      </div>
    </main>
  );
}
