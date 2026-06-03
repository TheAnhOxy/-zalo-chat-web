"use client";

import { Suspense, useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { useFriends, useGroups, usePendingRequestCount } from "@/src/hooks/use-contacts";
import { useQueryClient } from "@tanstack/react-query";
import { socketService } from "@/src/services/socket/socket.service";
import { contactsService } from "@/src/services/contacts/contacts.service";
import { PageLoader } from "@/src/components/ui/page-state";
import {
  Search,
  Users,
  UserPlus,
  Cake,
  ArrowUpDown,
  Check,
  Settings,
} from "lucide-react";
import { ContactsMainShell } from "@/src/components/layout/contacts-shell";
import Image from "next/image";
import Link from "next/link";

type Tab = "FRIENDS" | "GROUPS";
type GroupSortMode = "RECENT" | "NAME" | "ADMIN";
type FriendFilter = "ALL" | "RECENT";

/** Chuyển hướng `/contacts?user=id` → `/contacts/user/id` (link cũ từ chat/nhóm). */
function ContactsUserQueryRedirect() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const userId = searchParams.get("user");

  useEffect(() => {
    if (userId) router.replace(`/contacts/user/${userId}`);
  }, [userId, router]);

  return null;
}

export default function ContactsPage() {
  const auth = useAuthGuard();
  const router = useRouter();
  const queryClient = useQueryClient();

  const friendsQuery = useFriends(auth.user?._id);
  const groupsQuery = useGroups(auth.user?._id);
  const pendingCountQuery = usePendingRequestCount(auth.user?._id);

  const [activeTab, setActiveTab] = useState<Tab>("FRIENDS");
  const [search, setSearch] = useState("");
  const [groupSortMode, setGroupSortMode] = useState<GroupSortMode>("RECENT");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [friendFilter, setFriendFilter] = useState<FriendFilter>("ALL");
  const [openingChat, setOpeningChat] = useState<string | null>(null);

  const currentUserId = auth.user?._id ?? "";
  const pendingCount = pendingCountQuery.data ?? 0;

  // Real-time: dùng socketService chung, không tạo socket riêng
  useEffect(() => {
    if (!currentUserId) return;
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ["groups", currentUserId] });
      queryClient.invalidateQueries({ queryKey: ["friends", currentUserId] });
      queryClient.invalidateQueries({ queryKey: ["friend-requests", "pending-count", currentUserId] });
    };
    socketService.on("conversation_updated", refresh);
    socketService.on("new_message", refresh);
    socketService.on("conversation_created", refresh);
    socketService.on("conversation_removed", refresh);
    socketService.on("friendship_created", refresh);
    socketService.on("friendship_updated", refresh);
    return () => {
      socketService.off("conversation_updated", refresh);
      socketService.off("new_message", refresh);
      socketService.off("conversation_created", refresh);
      socketService.off("conversation_removed", refresh);
      socketService.off("friendship_created", refresh);
      socketService.off("friendship_updated", refresh);
    };
  }, [currentUserId, queryClient]);

  // Mở chat trực tiếp khi nhấn vào bạn bè
  const handleOpenChat = useCallback(async (friendId: string) => {
    if (!currentUserId || openingChat) return;
    setOpeningChat(friendId);
    try {
      const conv = await contactsService.findOrCreateDirectConversation(currentUserId, friendId);
      if (conv?._id) {
        router.push(`/?conversation=${conv._id}`);
      }
    } catch {
      // ignore
    } finally {
      setOpeningChat(null);
    }
  }, [currentUserId, openingChat, router]);

  // Lọc + sort bạn bè
  const filteredFriends = useMemo(() => {
    const list = friendsQuery.data || [];
    const keyword = search.toLowerCase().trim();
    return list.filter((f) => {
      const matchSearch =
        f.fullName?.toLowerCase().includes(keyword) ||
        f.phone?.includes(keyword) ||
        f.email?.toLowerCase().includes(keyword);
      return matchSearch;
    });
  }, [friendsQuery.data, search]);

  // Group theo chữ cái
  const groupedFriends = useMemo(() => {
    return filteredFriends.reduce((acc, friend) => {
      const name = friend.fullName || "Unknown";
      const letter = name.charAt(0).toUpperCase();
      const groupKey = /[A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝĂĐƠƯ]/.test(letter) ? letter : "#";
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(friend);
      return acc;
    }, {} as Record<string, typeof filteredFriends>);
  }, [filteredFriends]);

  const sortedLetters = useMemo(() =>
    Object.keys(groupedFriends).sort((a, b) => {
      if (a === "#") return 1;
      if (b === "#") return -1;
      return a.localeCompare(b, "vi");
    }),
    [groupedFriends]
  );

  // Lọc + sort nhóm
  const filteredGroups = useMemo(() => {
    const list = groupsQuery.data || [];
    const keyword = search.toLowerCase().trim();
    let result = list.filter((g) => g.name?.toLowerCase().includes(keyword));

    if (groupSortMode === "ADMIN") {
      result = result.filter((g) =>
        g.members?.some((m) => m.userId === currentUserId && m.role === "ADMIN")
      );
    }
    result = [...result].sort((a, b) => {
      if (groupSortMode === "NAME") return (a.name || "").localeCompare(b.name || "", "vi");
      const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return tb - ta;
    });
    return result;
  }, [groupsQuery.data, search, groupSortMode, currentUserId]);

  if (!auth.isInitialized || !auth.user) return <PageLoader />;

  const sortLabels: Record<GroupSortMode, string> = {
    RECENT: "Hoạt động cuối",
    NAME: "Tên nhóm",
    ADMIN: "Nhóm quản lý",
  };

  return (
    <>
      <Suspense fallback={null}>
        <ContactsUserQueryRedirect />
      </Suspense>
      <ContactsMainShell
        list={
        <section className="flex h-full min-h-0 w-full flex-col overflow-hidden border-r border-slate-200 bg-slate-50">
          <div className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
            <h1 className="text-center text-[17px] font-semibold text-slate-800">Danh bạ</h1>
          </div>
          {/* Search + Add */}
          <div className="shrink-0 border-b border-slate-200 px-3 py-2.5 sm:px-4 sm:py-3">
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-slate-200/70 px-3 py-2">
                <Search size={16} className="text-slate-500 shrink-0" />
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

          {/* Tabs: Bạn bè / Nhóm */}
          <div className="flex border-b border-slate-200 shrink-0">
            <button
              onClick={() => setActiveTab("FRIENDS")}
              className={`flex-1 py-3 text-sm font-semibold transition ${
                activeTab === "FRIENDS"
                  ? "border-b-2 border-emerald-600 text-emerald-700"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Bạn bè
            </button>
            <button
              onClick={() => setActiveTab("GROUPS")}
              className={`flex-1 py-3 text-sm font-semibold transition ${
                activeTab === "GROUPS"
                  ? "border-b-2 border-emerald-600 text-emerald-700"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              Nhóm
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Bạn bè tab ── */}
            {activeTab === "FRIENDS" && (
              <div>
                {/* Quick Actions */}
                <div className="pt-2">
                  {/* Lời mời kết bạn — có badge số đếm */}
                  <Link
                    href="/contacts/requests"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-100 transition"
                  >
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                      <UserPlus size={20} />
                      {pendingCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                          {pendingCount > 99 ? "99+" : pendingCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 text-sm font-medium">
                      {pendingCount > 0 ? `Lời mời kết bạn (${pendingCount})` : "Lời mời kết bạn"}
                    </div>
                  </Link>

                  {/* Sinh nhật */}
                  <Link
                    href="/contacts/birthdays"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-100 transition"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-600 shrink-0">
                      <Cake size={20} />
                    </div>
                    <div className="flex-1 text-sm font-medium">Sinh nhật</div>
                  </Link>
                </div>

                {/* Filter chips: Tất cả / Mới truy cập */}
                <div className="flex gap-2 border-t border-slate-200 px-4 py-3">
                  {(["ALL", "RECENT"] as FriendFilter[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFriendFilter(f)}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        friendFilter === f
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {f === "ALL" ? `Tất cả ${filteredFriends.length}` : "Mới truy cập"}
                    </button>
                  ))}
                </div>

                {/* Friend list grouped by letter */}
                <div className="pb-4">
                  {friendsQuery.isLoading ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">
                      Đang tải danh sách bạn bè...
                    </div>
                  ) : filteredFriends.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">
                      {search ? `Không tìm thấy "${search}"` : "Chưa có bạn bè nào."}
                    </div>
                  ) : (
                    sortedLetters.map((letter) => (
                      <div key={letter}>
                        <div className="px-4 py-1.5 text-xs font-bold text-slate-500 bg-slate-100/60 uppercase tracking-wide">
                          {letter}
                        </div>
                        {groupedFriends[letter].map((friend) => (
                          <button
                            key={friend._id}
                            onClick={() => handleOpenChat(friend._id)}
                            disabled={openingChat === friend._id}
                            className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-100 transition text-left disabled:opacity-60"
                          >
                            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 text-white font-bold text-sm">
                              {friend.avatar ? (
                                <Image
                                  src={friend.avatar}
                                  alt={friend.fullName || "Avatar"}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              ) : (
                                (friend.fullName || "U").charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-800">
                                {friend.fullName}
                              </p>
                            </div>
                            {openingChat === friend._id && (
                              <span className="text-xs text-slate-400">Đang mở...</span>
                            )}
                          </button>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── Nhóm tab ── */}
            {activeTab === "GROUPS" && (
              <div>
                {/* Tạo nhóm mới */}
                <div className="pt-2">
                  <Link
                    href="/groups/create"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-100 transition"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shrink-0">
                      <Users size={20} />
                    </div>
                    <div className="flex-1 text-sm font-medium">Tạo nhóm mới</div>
                  </Link>
                </div>

                {/* Header + Sort */}
                <div className="relative flex items-center justify-between border-t border-slate-200 px-4 py-2.5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    {groupSortMode === "ADMIN"
                      ? `Nhóm quản lý (${filteredGroups.length})`
                      : `Nhóm đang tham gia (${filteredGroups.length})`}
                  </p>
                  <button
                    onClick={() => setShowSortMenu((v) => !v)}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                      groupSortMode !== "RECENT"
                        ? "bg-emerald-100 text-emerald-700"
                        : "text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <ArrowUpDown size={12} />
                    {sortLabels[groupSortMode]}
                  </button>

                  {/* Sort dropdown */}
                  {showSortMenu && (
                    <div className="absolute right-4 top-10 z-30 w-44 rounded-xl border border-slate-200 bg-white shadow-xl">
                      {(["RECENT", "NAME", "ADMIN"] as GroupSortMode[]).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => { setGroupSortMode(mode); setShowSortMenu(false); }}
                          className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition first:rounded-t-xl last:rounded-b-xl ${
                            groupSortMode === mode
                              ? "bg-emerald-50 font-bold text-emerald-700"
                              : "text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {sortLabels[mode]}
                          {groupSortMode === mode && <Check size={14} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Group list */}
                <div className="pb-4">
                  {groupsQuery.isLoading ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">
                      Đang tải danh sách nhóm...
                    </div>
                  ) : filteredGroups.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-slate-500">
                      {search ? `Không tìm thấy "${search}"` : "Bạn chưa tham gia nhóm nào."}
                    </div>
                  ) : (
                    filteredGroups.map((group) => {
                      const conversationId = group._id || (group as { id?: string }).id || "";
                      const isAdmin = group.members?.some(
                        (m) => m.userId === currentUserId && m.role === "ADMIN"
                      );
                      return (
                        <div
                          key={conversationId}
                          onClick={() => {
                            if (!conversationId) return;
                            router.push(`/?conversation=${conversationId}`);
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-slate-100 transition text-left cursor-pointer"
                        >
                          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-white font-bold">
                            {group.avatar ? (
                              <Image
                                src={group.avatar}
                                alt={group.name || "Avatar"}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <Users size={20} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {group.name}
                            </p>
                            <p className="truncate text-xs text-slate-500 mt-0.5">
                              {group.memberCount || 0} thành viên
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {group.updatedAt && (
                              <span className="text-[11px] text-slate-400">
                                {new Date(group.updatedAt).toLocaleDateString("vi-VN", { weekday: "short" })}
                              </span>
                            )}
                            {/* Nút quản lý dành cho ADMIN — giống di động */}
                            {isAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!conversationId) return;
                                  router.push(`/?conversation=${conversationId}&tab=options`);
                                }}
                                className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                              >
                                <Settings size={11} />
                                Quản lý
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
        }
      />

      {showSortMenu && (
        <div className="fixed inset-0 z-20" onClick={() => setShowSortMenu(false)} />
      )}
    </>
  );
}
