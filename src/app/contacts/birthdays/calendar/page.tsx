"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { useFriends } from "@/src/hooks/use-contacts";
import { PageLoader } from "@/src/components/ui/page-state";
import { Cake, ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import Image from "next/image";
import { contactsService } from "@/src/services/contacts/contacts.service";
import { ContactsShell } from "@/src/components/layout/contacts-shell";
import { ContactsSubpageHeader } from "@/src/components/layout/contacts-subpage-header";
import type { IUser } from "@/src/types/user";

const FULL_WEEKDAYS = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

export default function BirthdayCalendarPage() {
  const auth = useAuthGuard();
  const router = useRouter();
  const friendsQuery = useFriends(auth.user?._id);

  const [focusedMonth, setFocusedMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  const birthdayMap = useMemo(() => {
    const map = new Map<string, IUser[]>();
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
        router.push(`/?conversation=${conv._id || conv.id}`);
      } else {
        router.push(`/?conversation=${friendId}`);
      }
    } catch {
      router.push(`/?conversation=${friendId}`);
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

    const startOffset = firstDay === 0 ? 6 : firstDay - 1;

    const days = [];
    for (let i = 0; i < startOffset; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10" />);
    }

    const today = new Date();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday =
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate();
      const isSelected =
        date.getFullYear() === selectedDay.getFullYear() &&
        date.getMonth() === selectedDay.getMonth() &&
        date.getDate() === selectedDay.getDate();
      const isSunday = date.getDay() === 0;
      const key = `${date.getMonth() + 1}-${date.getDate()}`;
      const hasBirthday = birthdayMap.has(key) && birthdayMap.get(key)!.length > 0;

      days.push(
        <button
          key={`day-${day}`}
          type="button"
          onClick={() => setSelectedDay(date)}
          className={`flex h-12 w-full flex-col items-center justify-center transition ${
            isSelected
              ? "rounded-full bg-emerald-600 text-white"
              : isToday
                ? "rounded-full border border-emerald-600 bg-emerald-50 text-emerald-700"
                : "rounded-full hover:bg-slate-100"
          }`}
        >
          <span
            className={`text-[13px] font-semibold ${
              isSelected ? "text-white" : isSunday ? "text-red-500" : "text-slate-800"
            }`}
          >
            {day}
          </span>
          {hasBirthday ? (
            <Cake size={10} className={`${isSelected ? "text-white" : "text-[#FF4D6D]"} mt-0.5`} />
          ) : (
            <div className="h-3" />
          )}
        </button>
      );
    }

    return days;
  };

  if (!auth.isInitialized || !auth.user) return <PageLoader />;

  return (
    <ContactsShell>
      <ContactsSubpageHeader
        variant="primary"
        title={`Tháng ${focusedMonth.getMonth() + 1}, ${focusedMonth.getFullYear()}`}
        onBack={() => router.back()}
        right={
          <>
            <button
              type="button"
              onClick={() =>
                setFocusedMonth(new Date(focusedMonth.getFullYear(), focusedMonth.getMonth() - 1, 1))
              }
              className="rounded-full p-2 transition hover:bg-white/10"
              aria-label="Tháng trước"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              type="button"
              onClick={() =>
                setFocusedMonth(new Date(focusedMonth.getFullYear(), focusedMonth.getMonth() + 1, 1))
              }
              className="rounded-full p-2 transition hover:bg-white/10"
              aria-label="Tháng sau"
            >
              <ChevronRight size={24} />
            </button>
          </>
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50">
        <div className="bg-white px-2 py-4 shadow-sm sm:px-4">
          <div className="mb-2 grid grid-cols-7">
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d, i) => (
              <div
                key={d}
                className={`text-center text-xs font-semibold ${i === 6 ? "text-red-500" : "text-slate-500"}`}
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-2">{renderCalendar()}</div>
        </div>

        <div className="border-y border-emerald-100 bg-emerald-50 px-4 py-3">
          <p className="text-[13px] font-bold text-emerald-700">
            {FULL_WEEKDAYS[selectedDay.getDay()]}, {selectedDay.getDate()} tháng{" "}
            {selectedDay.getMonth() + 1}
          </p>
        </div>

        <div className="min-h-[200px] bg-white">
          {selectedBirthdays.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-slate-500">
              Không có sinh nhật vào ngày này
            </div>
          ) : (
            <div>
              {selectedBirthdays.map((friend) => (
                <div
                  key={friend._id}
                  className="flex items-center gap-3.5 border-b border-slate-100 bg-white px-4 py-3 last:border-b-0"
                >
                  <div className="relative">
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-50 font-bold text-emerald-600">
                      {friend.avatar ? (
                        <Image
                          src={friend.avatar}
                          alt={friend.fullName}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        (friend.fullName || "U").charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 flex h-[20px] w-[20px] items-center justify-center rounded-full border-[1.5px] border-white bg-[#FF4D6D]">
                      <Cake size={11} className="text-white" />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-slate-800">
                      Sinh nhật {friend.fullName}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleOpenChat(friend._id)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"
                    aria-label="Nhắn tin"
                  >
                    <MessageSquare size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ContactsShell>
  );
}
