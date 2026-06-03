"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { useFriends } from "@/src/hooks/use-contacts";
import { PageLoader } from "@/src/components/ui/page-state";
import { Cake, Calendar, MessageSquare, Settings } from "lucide-react";
import Image from "next/image";
import { contactsService } from "@/src/services/contacts/contacts.service";
import { ContactsShell } from "@/src/components/layout/contacts-shell";
import { ContactsSubpageHeader } from "@/src/components/layout/contacts-subpage-header";

const WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

export default function BirthdaysPage() {
  const auth = useAuthGuard();
  const router = useRouter();
  const friendsQuery = useFriends(auth.user?._id);

  const groups = useMemo(() => {
    const list = friendsQuery.data || [];
    const withDob = list.filter((f) => f.dob);
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const past: typeof withDob = [];
    const upcoming: typeof withDob = [];

    for (const u of withDob) {
      const dobDate = new Date(u.dob!);
      const thisYearBirthday = new Date(now.getFullYear(), dobDate.getMonth(), dobDate.getDate());

      if (thisYearBirthday < today) {
        past.push(u);
      } else {
        upcoming.push(u);
      }
    }

    past.sort((a, b) => {
      const da = new Date(now.getFullYear(), new Date(a.dob!).getMonth(), new Date(a.dob!).getDate());
      const db = new Date(now.getFullYear(), new Date(b.dob!).getMonth(), new Date(b.dob!).getDate());
      return db.getTime() - da.getTime(); // closest past first
    });

    upcoming.sort((a, b) => {
      const da = new Date(now.getFullYear(), new Date(a.dob!).getMonth(), new Date(a.dob!).getDate());
      const db = new Date(now.getFullYear(), new Date(b.dob!).getMonth(), new Date(b.dob!).getDate());
      return da.getTime() - db.getTime(); // closest upcoming first
    });

    return { past, upcoming };
  }, [friendsQuery.data]);

  const handleOpenChat = async (friendId: string) => {
    if (!auth.user) return;
    try {
      const conv = await contactsService.findOrCreateDirectConversation(auth.user._id, friendId);
      if (conv && (conv._id || conv.id)) {
        router.push(`/?conversation=${conv._id || conv.id}`);
      } else {
        router.push(`/?conversation=${friendId}`);
      }
    } catch {
      router.push(`/?conversation=${friendId}`);
    }
  };

  if (!auth.isInitialized || !auth.user) return <PageLoader />;

  const renderTile = (friend: any) => {
    const dob = new Date(friend.dob!);
    const now = new Date();
    const birthdayThisYear = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
    const weekday = WEEKDAYS[birthdayThisYear.getDay()];
    const dateStr = `${weekday}, ${dob.getDate()} tháng ${dob.getMonth() + 1}`;

    return (
      <div key={friend._id} className="flex items-center gap-3.5 bg-white px-4 py-3 border-b border-slate-100 last:border-b-0">
        <div className="relative">
          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-50 text-emerald-600 font-bold">
            {friend.avatar ? (
              <Image src={friend.avatar} alt={friend.fullName} fill className="object-cover" unoptimized />
            ) : (
              (friend.fullName || "U").charAt(0).toUpperCase()
            )}
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 flex h-[20px] w-[20px] items-center justify-center rounded-full border-[1.5px] border-white bg-[#FF4D6D]">
            <Cake size={11} className="text-white" />
          </div>
        </div>
        
        <div className="flex-1">
          <p className="text-[14px] font-semibold text-slate-800">{friend.fullName}</p>
          <p className="mt-0.5 text-[12px] text-slate-500">{dateStr}</p>
        </div>

        <button 
          onClick={() => handleOpenChat(friend._id)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
        >
          <MessageSquare size={18} />
        </button>
      </div>
    );
  };

  return (
    <ContactsShell>
      <ContactsSubpageHeader
        title="Sinh nhật"
        onBack={() => router.back()}
        right={
          <>
            <button
              type="button"
              onClick={() => router.push("/contacts/birthdays/calendar")}
              className="rounded-full p-2 text-slate-600 transition hover:bg-slate-100"
              aria-label="Lịch"
            >
              <Calendar size={22} />
            </button>
            <button
              type="button"
              onClick={() => router.push("/contacts/birthdays/settings")}
              className="rounded-full p-2 text-slate-600 transition hover:bg-slate-100"
              aria-label="Cài đặt"
            >
              <Settings size={22} />
            </button>
          </>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 pb-4">
        {friendsQuery.isLoading && <div className="py-10 text-center text-sm text-slate-500">Đang tải dữ liệu...</div>}
        
        {!friendsQuery.isLoading && groups.past.length === 0 && groups.upcoming.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
              <Cake size={40} className="text-emerald-600" />
            </div>
            <p className="mt-4 text-[14px] text-slate-500">Không có thông tin sinh nhật nào</p>
          </div>
        )}

        {groups.past.length > 0 && (
          <div>
            <div className="px-4 py-3 pt-4">
              <p className="text-[13px] font-bold text-slate-500">Sinh nhật đã qua</p>
            </div>
            <div className="bg-white">
              {groups.past.map(renderTile)}
            </div>
          </div>
        )}

        {groups.upcoming.length > 0 && (
          <div>
            <div className="px-4 py-3 pt-4">
              <p className="text-[13px] font-bold text-slate-500">Sinh nhật sắp tới</p>
            </div>
            <div className="bg-white">
              {groups.upcoming.map(renderTile)}
            </div>
          </div>
        )}
      </div>
    </ContactsShell>
  );
}
