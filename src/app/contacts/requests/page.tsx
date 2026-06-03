"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { useReceivedRequests, useSentRequests } from "@/src/hooks/use-contacts";
import { PageLoader } from "@/src/components/ui/page-state";
import { contactsService } from "@/src/services/contacts/contacts.service";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/src/components/providers/toast-provider";
import { Settings } from "lucide-react";
import Image from "next/image";
import { ContactsShell } from "@/src/components/layout/contacts-shell";
import { ContactsSubpageHeader } from "@/src/components/layout/contacts-subpage-header";

type Tab = "RECEIVED" | "SENT";

export default function FriendRequestsPage() {
  const auth = useAuthGuard();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("RECEIVED");

  const receivedQuery = useReceivedRequests(auth.user?._id);
  const sentQuery = useSentRequests(auth.user?._id);

  if (!auth.isInitialized || !auth.user) {
    return <PageLoader />;
  }

  const handleAccept = async (friendshipId: string) => {
    try {
      await contactsService.acceptFriendRequest(friendshipId);
      queryClient.invalidateQueries({ queryKey: ["friend-requests", "received"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
      showToast("Đã chấp nhận lời mời kết bạn", "success");
    } catch (e) {
      showToast("Có lỗi xảy ra", "error");
    }
  };

  const handleReject = async (friendshipId: string) => {
    try {
      await contactsService.rejectFriendRequest(friendshipId);
      queryClient.invalidateQueries({ queryKey: ["friend-requests", "received"] });
      showToast("Đã từ chối lời mời", "success");
    } catch (e) {
      showToast("Có lỗi xảy ra", "error");
    }
  };

  const handleCancel = async (friendshipId: string) => {
    try {
      await contactsService.rejectFriendRequest(friendshipId);
      queryClient.invalidateQueries({ queryKey: ["friend-requests", "sent"] });
      showToast("Đã thu hồi lời mời kết bạn", "success");
    } catch (e) {
      showToast("Có lỗi xảy ra", "error");
    }
  };

  return (
    <ContactsShell>
      <ContactsSubpageHeader
        title="Lời mời kết bạn"
        onBack={() => router.back()}
        right={
          <button
            type="button"
            onClick={() => router.push("/contacts/requests/settings")}
            className="rounded-full p-2 text-slate-600 transition hover:bg-slate-100"
            aria-label="Cài đặt"
          >
            <Settings size={22} />
          </button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
        <div className="mx-auto w-full max-w-3xl p-4 md:p-6">
          <div className="mb-6 flex gap-4 border-b border-slate-200">
            <button
              onClick={() => setActiveTab("RECEIVED")}
              className={`pb-3 text-sm font-semibold transition ${
                activeTab === "RECEIVED" ? "border-b-2 border-emerald-600 text-emerald-700" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Đã nhận ({receivedQuery.data?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab("SENT")}
              className={`pb-3 text-sm font-semibold transition ${
                activeTab === "SENT" ? "border-b-2 border-emerald-600 text-emerald-700" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Đã gửi ({sentQuery.data?.length || 0})
            </button>
          </div>

          <div className="space-y-4">
            {activeTab === "RECEIVED" && (
              <>
                {receivedQuery.isLoading && <div className="py-10 text-center text-slate-500">Đang tải dữ liệu...</div>}
                {!receivedQuery.isLoading && receivedQuery.data?.length === 0 && (
                  <div className="py-20 text-center">
                    <p className="text-slate-500">Bạn không có lời mời kết bạn nào.</p>
                  </div>
                )}
                {receivedQuery.data?.map((req) => (
                  <div key={req.id} className="flex flex-col items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
                    <div className="flex flex-1 items-center gap-4">
                      <div className="relative h-14 w-14 overflow-hidden rounded-full bg-slate-200">
                        {req.user.avatar ? (
                          <Image src={req.user.avatar} alt={req.user.fullName} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-emerald-100 text-lg font-bold text-emerald-700">
                            {req.user.fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{req.user.fullName}</p>
                        <p className="text-sm text-slate-500">{new Date(req.createdAt).toLocaleDateString("vi-VN")}</p>
                      </div>
                    </div>
                    <div className="flex w-full gap-2 md:w-auto">
                      <button
                        onClick={() => handleReject(req.id)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 md:flex-none"
                      >
                        Từ chối
                      </button>
                      <button
                        onClick={() => handleAccept(req.id)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 md:flex-none"
                      >
                        Đồng ý
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {activeTab === "SENT" && (
              <>
                {sentQuery.isLoading && <div className="py-10 text-center text-slate-500">Đang tải dữ liệu...</div>}
                {!sentQuery.isLoading && sentQuery.data?.length === 0 && (
                  <div className="py-20 text-center">
                    <p className="text-slate-500">Bạn chưa gửi lời mời kết bạn nào.</p>
                  </div>
                )}
                {sentQuery.data?.map((req) => (
                  <div key={req.id} className="flex flex-col items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
                    <div className="flex flex-1 items-center gap-4">
                      <div className="relative h-14 w-14 overflow-hidden rounded-full bg-slate-200">
                        {req.user.avatar ? (
                          <Image src={req.user.avatar} alt={req.user.fullName} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-emerald-100 text-lg font-bold text-emerald-700">
                            {req.user.fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold">{req.user.fullName}</p>
                        <p className="text-sm text-slate-500">{new Date(req.createdAt).toLocaleDateString("vi-VN")}</p>
                      </div>
                    </div>
                    <div className="flex w-full gap-2 md:w-auto">
                      <button
                        onClick={() => handleCancel(req.id)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 md:flex-none"
                      >
                        Thu hồi
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </ContactsShell>
  );
}
