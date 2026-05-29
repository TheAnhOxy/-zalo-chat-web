"use client";

import { useState, useEffect, useMemo } from "react";
import { io } from "socket.io-client";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { useFriends, useGroups } from "@/src/hooks/use-contacts";
import { PageLoader } from "@/src/components/ui/page-state";
import {
  Bell,
  BookMarked,
  MessageSquare,
  Search,
  Settings,
  Users,
  UserPlus,
  Cake,
  Mail,
  MoreHorizontal,
  Phone,
  Video,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Tab = "FRIENDS" | "GROUPS";

export default function ContactsPage() {
  const auth = useAuthGuard();
  const friendsQuery = useFriends(auth.user?._id);
  const groupsQuery = useGroups(auth.user?._id);
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<Tab>("FRIENDS");
  const [search, setSearch] = useState("");
  const [groupSortMode, setGroupSortMode] = useState<"RECENT" | "NAME" | "ADMIN">("RECENT");

  // Setup Socket.io for real-time group updates
  useEffect(() => {
    if (!auth.user?._id) return;
    
    const socketURL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";
    const socket = io(socketURL, {
      query: { userId: auth.user._id },
      transports: ["websocket"]
    });

    const handleUpdate = () => {
      groupsQuery.refetch();
    };

    socket.on("conversation_updated", handleUpdate);
    socket.on("new_message", handleUpdate);
    socket.on("conversation_created", handleUpdate);
    socket.on("conversation_removed", handleUpdate);

    return () => {
      socket.disconnect();
    };
  }, [auth.user?._id, groupsQuery]);

  // Filter and sort groups
  const filteredGroups = useMemo(() => {
    const list = groupsQuery.data || [];
    const keyword = search.toLowerCase().trim();
    let result = list.filter((g) => g.name?.toLowerCase().includes(keyword));
    
    if (groupSortMode === "ADMIN") {
      result = result.filter(g => g.members?.some(m => m.userId === auth.user?._id && m.role === "ADMIN"));
    }

    result = result.sort((a, b) => {
      if (groupSortMode === "NAME") {
        return (a.name || "").localeCompare(b.name || "");
      }
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return timeB - timeA;
    });

    return result;
  }, [groupsQuery.data, search, groupSortMode, auth.user?._id]);

  if (!auth.isInitialized || !auth.user) {
    return <PageLoader />;
  }

  const userInitial = auth.user.fullName?.charAt(0).toUpperCase() || "U";

  const friendsList = friendsQuery.data || [];
  
  const filteredFriends = friendsList.filter((f) => {
    const keyword = search.toLowerCase().trim();
    return (
      f.fullName?.toLowerCase().includes(keyword) || 
      f.phone?.includes(keyword) ||
      f.email?.toLowerCase().includes(keyword)
    );
  });

  const groupedFriends = filteredFriends.reduce((acc, friend) => {
    const name = friend.fullName || "Unknown";
    const letter = name.charAt(0).toUpperCase();
    const groupKey = /[A-Z]/.test(letter) ? letter : "#";
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(friend);
    return acc;
  }, {} as Record<string, typeof friendsList>);

  const sortedLetters = Object.keys(groupedFriends).sort((a, b) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b);
  });

  return (
    <main className="h-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-amber-50 text-slate-800">
      <div className="h-full w-full md:grid md:grid-cols-[72px_330px_1fr]">
        {/* Leftmost Sidebar - Navigation */}
        <aside className="relative hidden h-full flex-col items-center justify-between border-r border-emerald-200 bg-[#0f766e] py-4 text-white md:flex">
          <div className="space-y-3">
            <button className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-base font-bold ring-2 ring-white/30 transition hover:bg-white/30">
              {userInitial}
            </button>
            <button onClick={() => router.push("/")} className="flex h-11 w-11 items-center justify-center rounded-xl bg-transparent hover:bg-white/20 transition">
              <MessageSquare size={18} />
            </button>
            <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/30 shadow-inner">
              <Users size={18} />
            </button>
            <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-transparent hover:bg-white/20 transition">
              <BookMarked size={18} />
            </button>
          </div>

          <div className="space-y-3">
            <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-transparent hover:bg-white/20 transition">
              <Bell size={18} />
            </button>
            <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-transparent hover:bg-white/20 transition">
              <Settings size={18} />
            </button>
          </div>
        </aside>

        {/* Contacts List Sidebar */}
        <section className="flex flex-col border-r border-slate-200 bg-slate-50">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-200/70 px-3 py-2">
                <Search size={16} className="text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                  placeholder="Tìm kiếm danh bạ"
                />
              </div>
              <button 
                onClick={() => router.push("/contacts/add")}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 transition hover:bg-emerald-200"
                title="Thêm bạn"
              >
                <UserPlus size={18} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("FRIENDS")}
              className={`flex-1 py-3 text-sm font-semibold transition ${
                activeTab === "FRIENDS" ? "border-b-2 border-emerald-600 text-emerald-700" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Bạn bè
            </button>
            <button
              onClick={() => setActiveTab("GROUPS")}
              className={`flex-1 py-3 text-sm font-semibold transition ${
                activeTab === "GROUPS" ? "border-b-2 border-emerald-600 text-emerald-700" : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Nhóm
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === "FRIENDS" && (
              <div className="py-2">
                {/* Quick Actions */}
                <Link href="/contacts/requests" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-100 transition">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <Mail size={20} />
                  </div>
                  <div className="flex-1 text-sm font-medium">Lời mời kết bạn</div>
                </Link>
                <Link href="/contacts/birthdays" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-100 transition">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                    <Cake size={20} />
                  </div>
                  <div className="flex-1 text-sm font-medium">Sinh nhật</div>
                </Link>

                <div className="mt-2 border-t border-slate-200 px-4 py-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Bạn bè ({filteredFriends.length})</p>
                </div>
                
                {/* Friend List */}
                <div className="space-y-1 pb-4">
                  {friendsQuery.isLoading ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">Đang tải danh sách bạn bè...</div>
                  ) : filteredFriends.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">
                      {search ? "Không tìm thấy bạn bè nào phù hợp." : "Chưa có bạn bè nào."}
                    </div>
                  ) : (
                    sortedLetters.map((letter) => (
                      <div key={letter} className="mb-2">
                        <div className="px-4 py-1 text-sm font-semibold text-slate-800 bg-slate-50">
                          {letter}
                        </div>
                        {groupedFriends[letter].map((friend) => (
                          <button key={friend._id} className="flex w-full items-center gap-3 px-4 py-2 hover:bg-slate-100 transition text-left">
                            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-white font-bold">
                              {friend.avatar ? (
                                <Image src={friend.avatar} alt={friend.fullName || "Avatar"} fill className="object-cover" unoptimized />
                              ) : (
                                (friend.fullName || "U").charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                              <p className="truncate text-sm font-medium text-slate-800">{friend.fullName}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "GROUPS" && (
              <div className="py-2">
                 <Link href="/groups/create" className="flex items-center gap-3 px-4 py-3 hover:bg-slate-100 transition">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Users size={20} />
                  </div>
                  <div className="flex-1 text-sm font-medium">Tạo nhóm mới</div>
                </Link>

                <div className="mt-2 flex items-center justify-between border-t border-slate-200 px-4 py-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase">Nhóm đang tham gia ({filteredGroups.length})</p>
                  <select 
                    value={groupSortMode} 
                    onChange={(e) => setGroupSortMode(e.target.value as any)}
                    className="cursor-pointer bg-transparent text-xs font-medium text-slate-600 outline-none"
                  >
                    <option value="RECENT">Hoạt động cuối</option>
                    <option value="NAME">Tên nhóm (A-Z)</option>
                    <option value="ADMIN">Nhóm quản lý</option>
                  </select>
                </div>
                
                <div className="space-y-1 pb-4">
                  {groupsQuery.isLoading ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">Đang tải danh sách nhóm...</div>
                  ) : filteredGroups.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">
                      {search ? "Không tìm thấy nhóm nào phù hợp." : "Bạn chưa tham gia nhóm nào."}
                    </div>
                  ) : (
                    filteredGroups.map((group) => (
                      <button key={group._id} className="flex w-full items-center gap-3 px-4 py-2 hover:bg-slate-100 transition text-left">
                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white font-bold">
                          {group.avatar ? (
                            <Image src={group.avatar} alt={group.name || "Avatar"} fill className="object-cover" unoptimized />
                          ) : (
                            <Users size={20} />
                          )}
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <p className="truncate text-sm font-semibold text-slate-800">{group.name}</p>
                          <p className="truncate text-xs text-slate-500 mt-0.5">{group.memberCount || 0} thành viên</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Main Content Area */}
        <section className="hidden flex-col bg-white md:flex">
          <div className="flex h-full flex-col items-center justify-center text-center">
             <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
               <Users size={48} />
             </div>
             <h2 className="text-xl font-semibold text-slate-800">Danh bạ QuickChat</h2>
             <p className="mt-2 max-w-md text-sm text-slate-500">
               Chọn một liên hệ từ danh sách bên trái để xem thông tin chi tiết hoặc bắt đầu cuộc trò chuyện mới.
             </p>
          </div>
        </section>

        {/* Mobile Bottom Navigation - visible only on small screens */}
        <div className="fixed bottom-0 left-0 right-0 flex border-t border-slate-200 bg-white md:hidden">
          <button onClick={() => router.push("/")} className="flex flex-1 flex-col items-center py-3 text-slate-500">
            <MessageSquare size={20} />
            <span className="mt-1 text-[10px] font-medium">Tin nhắn</span>
          </button>
          <button className="flex flex-1 flex-col items-center py-3 text-emerald-600">
            <Users size={20} />
            <span className="mt-1 text-[10px] font-medium">Danh bạ</span>
          </button>
          <button className="flex flex-1 flex-col items-center py-3 text-slate-500">
            <UserPlus size={20} />
            <span className="mt-1 text-[10px] font-medium">Cá nhân</span>
          </button>
        </div>
      </div>
    </main>
  );
}
