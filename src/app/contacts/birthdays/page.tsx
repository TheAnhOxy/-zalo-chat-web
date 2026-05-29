"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { useFriends } from "@/src/hooks/use-contacts";
import { PageLoader } from "@/src/components/ui/page-state";
import { ArrowLeft, Cake, Calendar as CalendarIcon, List, Settings } from "lucide-react";
import Image from "next/image";

type ViewMode = "LIST" | "CALENDAR";

export default function BirthdaysPage() {
  const auth = useAuthGuard();
  const router = useRouter();
  const friendsQuery = useFriends(auth.user?._id);

  const [viewMode, setViewMode] = useState<ViewMode>("LIST");
  const today = new Date();

  const birthdays = useMemo(() => {
    const list = friendsQuery.data || [];
    const withDob = list.filter((f) => f.dob);
    
    return withDob.sort((a, b) => {
      const dateA = new Date(a.dob!);
      const dateB = new Date(b.dob!);
      
      const nextBirthdayA = new Date(today.getFullYear(), dateA.getMonth(), dateA.getDate());
      if (nextBirthdayA < today) nextBirthdayA.setFullYear(today.getFullYear() + 1);

      const nextBirthdayB = new Date(today.getFullYear(), dateB.getMonth(), dateB.getDate());
      if (nextBirthdayB < today) nextBirthdayB.setFullYear(today.getFullYear() + 1);

      return nextBirthdayA.getTime() - nextBirthdayB.getTime();
    });
  }, [friendsQuery.data, today]);

  // Calendar logic for current month
  const calendarDays = useMemo(() => {
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
    
    // Adjust so Monday is 0, Sunday is 6
    const adjustedFirstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    return Array.from({ length: 42 }).map((_, i) => {
      const dayNumber = i - adjustedFirstDayIndex + 1;
      const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
      
      // Find friends having birthday this day
      const bdays = isCurrentMonth ? birthdays.filter((f) => {
        const d = new Date(f.dob!);
        return d.getMonth() === currentMonth && d.getDate() === dayNumber;
      }) : [];

      return {
        dayNumber: isCurrentMonth ? dayNumber : null,
        isToday: isCurrentMonth && dayNumber === today.getDate(),
        birthdays: bdays
      };
    });
  }, [today, birthdays]);

  if (!auth.isInitialized || !auth.user) return <PageLoader />;

  return (
    <main className="h-screen overflow-hidden bg-slate-50 text-slate-800">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="rounded-full p-2 text-slate-600 transition hover:bg-slate-100">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Sinh nhật</h1>
        </div>
        <button onClick={() => router.push("/contacts/birthdays/settings")} className="rounded-full p-2 text-slate-600 transition hover:bg-slate-100">
          <Settings size={22} />
        </button>
      </header>

      <div className="mx-auto h-[calc(100vh-73px)] w-full max-w-3xl overflow-y-auto p-4 md:p-6">
        
        {/* Toggle View */}
        <div className="mb-6 flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <button
            onClick={() => setViewMode("LIST")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition ${
              viewMode === "LIST" ? "bg-rose-50 text-rose-600" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <List size={18} /> Danh sách
          </button>
          <div className="w-px bg-slate-200" />
          <button
            onClick={() => setViewMode("CALENDAR")}
            className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition ${
              viewMode === "CALENDAR" ? "bg-rose-50 text-rose-600" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <CalendarIcon size={18} /> Lịch
          </button>
        </div>

        {viewMode === "LIST" && (
          <>
            <div className="mb-6 rounded-2xl bg-gradient-to-r from-rose-400 to-pink-500 p-6 text-white shadow-md">
              <div className="flex items-center gap-3">
                <Cake size={32} />
                <h2 className="text-2xl font-bold">Sinh nhật sắp tới</h2>
              </div>
              <p className="mt-2 text-rose-50 opacity-90">Đừng quên gửi những lời chúc tốt đẹp nhất đến bạn bè của bạn!</p>
            </div>

            {friendsQuery.isLoading && <div className="py-10 text-center text-slate-500">Đang tải...</div>}
            
            {!friendsQuery.isLoading && birthdays.length === 0 && (
              <div className="py-20 text-center text-slate-500">
                Không có sinh nhật nào của bạn bè.
              </div>
            )}

            <div className="space-y-3 pb-8">
              {birthdays.map((friend) => {
                 const dobDate = new Date(friend.dob!);
                 const isToday = dobDate.getDate() === today.getDate() && dobDate.getMonth() === today.getMonth();

                 return (
                  <div key={friend._id} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-pink-300 to-rose-400 text-white font-bold">
                      {friend.avatar ? (
                        <Image src={friend.avatar} alt={friend.fullName} fill className="object-cover" unoptimized />
                      ) : (
                        friend.fullName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-800">{friend.fullName}</p>
                      <p className={`text-sm ${isToday ? "font-semibold text-rose-500" : "text-slate-500"}`}>
                        {isToday ? "Hôm nay!" : `${dobDate.getDate()} tháng ${dobDate.getMonth() + 1}`}
                      </p>
                    </div>
                    <button className="rounded-lg bg-rose-100 px-4 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-200">
                      Chúc mừng
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {viewMode === "CALENDAR" && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-6 text-center text-xl font-bold text-slate-800">
              Tháng {today.getMonth() + 1} Năm {today.getFullYear()}
            </h2>
            
            <div className="grid grid-cols-7 gap-2">
              {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
                <div key={day} className="py-2 text-center text-xs font-bold text-slate-400">
                  {day}
                </div>
              ))}
              
              {calendarDays.map((day, idx) => (
                <div 
                  key={idx} 
                  className={`relative flex h-16 flex-col items-center justify-start rounded-lg border p-1 transition ${
                    day.isToday ? "border-rose-300 bg-rose-50" : "border-transparent bg-slate-50"
                  } ${!day.dayNumber ? "opacity-0" : ""}`}
                >
                  {day.dayNumber && (
                    <>
                      <span className={`text-xs font-semibold ${day.isToday ? "text-rose-600" : "text-slate-600"}`}>
                        {day.dayNumber}
                      </span>
                      
                      {/* Avatars */}
                      <div className="mt-1 flex flex-wrap justify-center gap-1">
                        {day.birthdays.slice(0, 3).map((f) => (
                           <div key={f._id} className="relative h-5 w-5 overflow-hidden rounded-full border border-white">
                             {f.avatar ? (
                               <Image src={f.avatar} alt={f.fullName} fill className="object-cover" unoptimized />
                             ) : (
                               <div className="flex h-full w-full items-center justify-center bg-rose-200 text-[10px] font-bold text-rose-700">
                                 {f.fullName.charAt(0).toUpperCase()}
                               </div>
                             )}
                           </div>
                        ))}
                        {day.birthdays.length > 3 && (
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-600">
                            +{day.birthdays.length - 3}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
