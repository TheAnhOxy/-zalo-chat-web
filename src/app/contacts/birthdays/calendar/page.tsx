"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { useFriends } from "@/src/hooks/use-contacts";
import { PageLoader } from "@/src/components/ui/page-state";
import { ArrowLeft, Cake, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import Image from "next/image";
import { contactsService } from "@/src/services/contacts/contacts.service";

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const FULL_WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

export default function BirthdayCalendarPage() {
  const auth = useAuthGuard();
  const router = useRouter();
  const friendsQuery = useFriends(auth.user?._id);

  const [focusedMonth, setFocusedMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  const birthdayMap = useMemo(() => {
    const map = new Map<string, any[]>();
    const list = friendsQuery.data || [];
    for (const u of list) {
      if (!u.dob) continue;
      const dobDate = new Date(u.dob);
      const key = `${dobDate.getMonth() + 1}-${dobDate.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(u);
    }
    return map;
  }, [friendsQuery.data]);

  const selectedBirthdays = useMemo(() => {
    const key = `${selectedDay.getMonth() + 1}-${selectedDay.getDate()}`;
    return birthdayMap.get(key) || [];
  }, [selectedDay, birthdayMap]);

  const handleOpenChat = async (friendId: string) => {
    if (!auth.user) return;
    try {
      const conv = await contactsService.findOrCreateDirectConversation(auth.user._id, friendId);
      if (conv && (conv._id || conv.id)) {
        router.push(`/?conversationId=${conv._id || conv.id}`);
      } else {
        router.push(`/?conversationId=${friendId}`);
      }
    } catch (e) {
      router.push(`/?conversationId=${friendId}`);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const renderCalendar = () => {
    const year = focusedMonth.getFullYear();
    const month = focusedMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    // Shift so Monday is index 0
    let startOffset = firstDay === 0 ? 6 : firstDay - 1;

    const days = [];
    for (let i = 0; i < startOffset; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
    }

    const today = new Date();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
      const isSelected = date.getFullYear() === selectedDay.getFullYear() && date.getMonth() === selectedDay.getMonth() && date.getDate() === selectedDay.getDate();
      const isSunday = date.getDay() === 0;
      const key = `${date.getMonth() + 1}-${date.getDate()}`;
      const hasBirthday = birthdayMap.has(key) && birthdayMap.get(key)!.length > 0;

      days.push(
        <button
          key={`day-${day}`}
          onClick={() => setSelectedDay(date)}
          className={`flex flex-col items-center justify-center h-12 w-full transition ${isSelected ? "bg-emerald-600 rounded-full text-white" : isToday ? "bg-emerald-50 rounded-full border border-emerald-600 text-emerald-700" : "hover:bg-slate-100 rounded-full"}`}
        >
          <span className={`text-[13px] font-semibold ${isSelected ? "text-white" : isSunday ? "text-red-500" : "text-slate-800"}`}>{day}</span>
          {hasBirthday ? (
            <Cake size={10} className={`${isSelected ? "text-white" : "text-[#FF4D6D]"} mt-0.5`} />
          ) : (
            <div className="h-3"></div>
          )}
        </button>
      );
    }

    return days;
  };

  if (!auth.isInitialized || !auth.user) return <PageLoader />;

  return (
    <main className="h-screen overflow-hidden bg-slate-50 text-slate-800 flex flex-col">
      <header className="flex items-center justify-between border-b border-slate-200 bg-emerald-600 px-4 py-3 text-white">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="rounded-full p-2 text-white transition hover:bg-white/20">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-[17px] font-semibold">
            Tháng {focusedMonth.getMonth() + 1}, {focusedMonth.getFullYear()}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setFocusedMonth(new Date(focusedMonth.getFullYear(), focusedMonth.getMonth() - 1, 1))} className="rounded-full p-2 text-white transition hover:bg-white/20">
            <ChevronLeft size={24} />
          </button>
          <button onClick={() => setFocusedMonth(new Date(focusedMonth.getFullYear(), focusedMonth.getMonth() + 1, 1))} className="rounded-full p-2 text-white transition hover:bg-white/20">
            <ChevronRight size={24} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="bg-white px-2 py-4 shadow-sm">
          <div className="grid grid-cols-7 mb-2">
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d, i) => (
              <div key={d} className={`text-center text-xs font-semibold ${i === 6 ? "text-red-500" : "text-slate-500"}`}>
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-2">
            {renderCalendar()}
          </div>
        </div>

        <div className="bg-emerald-50 px-4 py-3 border-y border-emerald-100">
          <p className="text-[13px] font-bold text-emerald-700">
            {FULL_WEEKDAYS[selectedDay.getDay()]}, {selectedDay.getDate()} tháng {selectedDay.getMonth() + 1}
          </p>
        </div>

        <div className="bg-white min-h-[200px]">
          {selectedBirthdays.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-slate-500">
              Không có sinh nhật vào ngày này
            </div>
          ) : (
            <div>
              {selectedBirthdays.map((friend) => (
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
                    <p className="text-[14px] font-semibold text-slate-800">Sinh nhật {friend.fullName}</p>
                  </div>

                  <button 
                    onClick={() => handleOpenChat(friend._id)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
                  >
                    <MessageSquare size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
