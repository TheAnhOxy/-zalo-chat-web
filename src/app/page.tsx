"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BookMarked,
  ChevronDown,
  CircleUserRound,
  Dot,
  Eye,
  EyeOff,
  Image as ImageIcon,
  KeyRound,
  LogOut,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRoundPen,
  Users,
  X,
} from "lucide-react";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { ChatWindow } from "@/src/components/chat/ChatWindow";
import {
  useProfile,
  useUpdatePrivacy,
  useUpdateProfile,
  useUpdateStatus,
  useUploadAvatar,
  useUploadCover,
} from "@/src/hooks/use-user";
import { PageLoader } from "@/src/components/ui/page-state";
import { useToast } from "@/src/components/providers/toast-provider";
import { conversationsApi } from "@/src/services/api/conversations";
import { userService } from "@/src/services/user/user.service";
import { formatMessageTime, formatLastMessagePreview } from "@/src/lib/messages";
import { getErrorMessage } from "@/src/utils/error";
import { IConversation } from "@/src/types/conversation";
import { IUser, PrivacyStatus } from "@/src/types/user";
import { useChangePassword, useLogoutAllDevices, useSessions } from "@/src/hooks/use-auth-actions";
import { strongPasswordRegex } from "@/src/utils/validators/auth";
import axios from "axios";

type ReadFilter = "ALL" | "UNREAD" | "READ";
type SettingsTab = "GENERAL" | "SECURITY" | "PRIVACY" | "SESSIONS";

type ConversationCard = {
  id: string;
  name: string;
  avatar?: string;
  otherId?: string;
  subtitle: string;
  lastMessage: string;
  time: string;
  sortTimestamp: number;
  unreadCount: number;
  online: boolean;
  avatarColor: string;
};

const avatarGradients = [
  "from-emerald-400 to-teal-600",
  "from-orange-400 to-amber-600",
  "from-cyan-400 to-sky-600",
  "from-fuchsia-400 to-pink-600",
  "from-indigo-400 to-blue-700",
  "from-rose-400 to-red-600",
];

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function sameDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate();
}

function formatConversationTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (sameDay(date, today)) return formatMessageTime(date);
  if (sameDay(date, yesterday)) return "Hôm qua";
  return date.toLocaleDateString("vi-VN", { weekday: "short" });
}

function getConversationAvatarColor(conversationId: string) {
  return avatarGradients[hashString(conversationId) % avatarGradients.length];
}

function getOtherParticipant(conversation: IConversation, currentUserId: string) {
  return conversation.participants.find((participant) => participant.userId !== currentUserId) ?? conversation.participants[0] ?? null;
}

function buildConversationCard(conversation: IConversation, currentUserId: string): ConversationCard {
  const otherParticipant = getOtherParticipant(conversation, currentUserId);
  const isGroup = conversation.type === "GROUP";
  const lastMessage = conversation.lastMessage
    ? formatLastMessagePreview(conversation.lastMessage.content, {
        type: conversation.lastMessage.type,
        senderId: conversation.lastMessage.senderId,
        currentUserId,
      })
    : "Chưa có tin nhắn";
  const timeSource = conversation.lastMessage?.createdAt ?? conversation.updatedAt;
  const sortTimestamp = new Date(timeSource).getTime();

  return {
    id: conversation._id,
    name: isGroup ? (conversation.name || "Nhóm trò chuyện") : (otherParticipant?.fullName || ""),
    avatar: isGroup ? conversation.avatar : otherParticipant?.avatar,
    otherId: otherParticipant?.userId,
    subtitle: isGroup
      ? `${conversation.participants.length} thành viên`
      : otherParticipant?.isOnline
        ? "Đang hoạt động"
        : otherParticipant?.lastSeen
          ? "Hoạt động gần đây"
          : "Đang hoạt động",
    lastMessage,
    time: formatConversationTime(timeSource),
    sortTimestamp: Number.isNaN(sortTimestamp) ? 0 : sortTimestamp,
    unreadCount: conversation.unreadCount,
    online: isGroup ? false : Boolean(otherParticipant?.isOnline),
    avatarColor: getConversationAvatarColor(conversation._id),
  };
}

export default function HomePage() {
  const auth = useAuthGuard();
  const { showToast } = useToast();

  const profileQuery = useProfile(auth.user?._id);
  const sessionsQuery = useSessions(auth.user?._id);

  const updateProfileMutation = useUpdateProfile(auth.user?._id);
  const updatePrivacyMutation = useUpdatePrivacy(auth.user?._id);
  const updateStatusMutation = useUpdateStatus(auth.user?._id);
  const uploadAvatarMutation = useUploadAvatar(auth.user?._id);
  const uploadCoverMutation = useUploadCover(auth.user?._id);
  const changePasswordMutation = useChangePassword();
  const logoutAllDevicesMutation = useLogoutAllDevices();

  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState<ReadFilter>("ALL");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("GENERAL");

  const [profileForm, setProfileForm] = useState({
    fullName: "",
    gender: "other" as IUser["gender"],
    dob: "",
    bio: "",
  });

  const [privacyForm, setPrivacyForm] = useState({
    showPhone: "FRIEND" as PrivacyStatus,
    showOnline: true,
    allowStrangerMessage: false,
    findByPhone: true,
  });

  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "", confirmNewPassword: "" });
  const [generalForm, setGeneralForm] = useState({ startupWithSystem: true, rememberLogin: true, language: "vi" as "vi" | "en" });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const profile = profileQuery.data;
  const currentUserId = auth.user?._id;

  const conversationsQuery = useQuery({
    queryKey: ["conversations", currentUserId],
    queryFn: () => conversationsApi.listForUser(currentUserId!),
    enabled: Boolean(auth.isInitialized && currentUserId),
    staleTime: 30_000,
  });

  const conversationCards = useMemo(() => {
    const list = conversationsQuery.data ?? [];
    return list
      .map((conversation) => buildConversationCard(conversation, currentUserId ?? ""))
      .sort((left, right) => {
        if (left.unreadCount !== right.unreadCount) return right.unreadCount - left.unreadCount;
        return right.sortTimestamp - left.sortTimestamp;
      });
  }, [conversationsQuery.data, currentUserId]);

  const [userCache, setUserCache] = useState<Record<string, { fullName?: string; avatar?: string }>>({});

  useEffect(() => {
    // Fetch missing display names for participants
    const idsToLoad = new Set<string>();
    for (const card of conversationCards) {
      if ((!card.name || !card.avatar) && card.otherId && !userCache[card.otherId]) idsToLoad.add(card.otherId);
    }
    if (!idsToLoad.size) return;

    for (const id of idsToLoad) {
      userService
        .getProfile(id)
        .then((u) => {
          setUserCache((prev) => ({ ...prev, [id]: { fullName: u?.fullName, avatar: u?.avatar } }));
        })
        .catch(() => {
          // ignore
        });
    }
  }, [conversationCards, userCache]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setProfileForm({
      fullName: profile.fullName || "",
      gender: profile.gender || "other",
      dob: profile.dob ? new Date(profile.dob).toISOString().slice(0, 10) : "",
      bio: profile.bio || "",
    });

    setPrivacyForm({
      showPhone: profile.privacy?.showPhone || "FRIEND",
      showOnline: Boolean(profile.privacy?.showOnline),
      allowStrangerMessage: Boolean(profile.privacy?.allowStrangerMessage),
      findByPhone: Boolean(profile.privacy?.findByPhone),
    });

    setTwoFactorEnabled(Boolean(profile.settings?.twoFactorAuth));
  }, [profile]);

  useEffect(() => {
    if (conversationCards.length === 0) {
      setActiveConversationId(null);
      return;
    }

    if (!activeConversationId) {
      setActiveConversationId(conversationCards[0].id);
      return;
    }

    const stillExists = conversationCards.some((item) => item.id === activeConversationId);
    if (!stillExists) {
      setActiveConversationId(null);
    }
  }, [activeConversationId, conversationCards]);

  const filteredConversations = useMemo(() => {
    return conversationCards.filter((item) => {
      const keyword = `${item.name} ${item.lastMessage}`.toLowerCase();
      const matchesSearch = keyword.includes(search.toLowerCase().trim());

      if (!matchesSearch) {
        return false;
      }

      if (readFilter === "UNREAD") {
        return item.unreadCount > 0;
      }

      if (readFilter === "READ") {
        return item.unreadCount === 0;
      }

      return true;
    });
  }, [conversationCards, readFilter, search]);

  const activeConversation = activeConversationId
    ? filteredConversations.find((item) => item.id === activeConversationId) || conversationCards.find((item) => item.id === activeConversationId) || null
    : null;

  const userName = profile?.fullName || auth.user?.fullName || "QuickChat User";
  const userInitial = userName.charAt(0).toUpperCase();

  const syncAuthUser = (user: IUser) => {
    auth.updateCurrentUser({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatar: user.avatar,
      coverImage: user.coverImage,
    });
  };

  const saveProfile = async () => {
    try {
      const updated = await updateProfileMutation.mutateAsync({
        fullName: profileForm.fullName,
        gender: profileForm.gender,
        dob: profileForm.dob || undefined,
        bio: profileForm.bio,
      });
      syncAuthUser(updated);
      await profileQuery.refetch();
      setProfileEditMode(false);
      showToast("Cập nhật hồ sơ thành công", "success");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  };

  const savePrivacy = async () => {
    try {
      await updatePrivacyMutation.mutateAsync(privacyForm);
      await profileQuery.refetch();
      showToast("Đã lưu quyền riêng tư", "success");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  };

  const saveStatus = async (isOnline: boolean) => {
    try {
      await updateStatusMutation.mutateAsync(isOnline);
      await profileQuery.refetch();
      showToast("Đã cập nhật trạng thái hoạt động", "success");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const updated = await uploadAvatarMutation.mutateAsync(file);
      syncAuthUser(updated);
      await profileQuery.refetch();
      showToast("Cập nhật ảnh đại diện thành công", "success");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      event.target.value = "";
    }
  };

  const handleCoverUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const updated = await uploadCoverMutation.mutateAsync(file);
      syncAuthUser(updated);
      await profileQuery.refetch();
      showToast("Cập nhật ảnh bìa thành công", "success");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      event.target.value = "";
    }
  };

  const handleChangePassword = async () => {
    if (!auth.user) {
      return;
    }

    if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmNewPassword) {
      showToast("Vui lòng nhập đủ mật khẩu cũ và mới", "error");
      return;
    }

    if (!strongPasswordRegex.test(passwordForm.newPassword)) {
      showToast("Mật khẩu mới phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và chữ số", "error");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      showToast("Xác nhận mật khẩu mới không khớp", "error");
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        userId: auth.user._id,
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ oldPassword: "", newPassword: "", confirmNewPassword: "" });
      showToast("Đổi mật khẩu thành công", "success");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        showToast("Mật khẩu cũ không chính xác", "error");
        return;
      }

      showToast(getErrorMessage(error), "error");
    }
  };

  const handleLogoutAllDevices = async () => {
    if (!auth.user) {
      return;
    }

    try {
      await logoutAllDevicesMutation.mutateAsync({ userId: auth.user._id });
      await sessionsQuery.refetch();
      showToast("Đã đăng xuất tất cả thiết bị", "success");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  };

  if (!auth.isInitialized || !auth.user) {
    return <PageLoader />;
  }

  return (
    <main className="h-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-amber-50 text-slate-800">
      <div className="h-full w-full md:grid md:grid-cols-[72px_330px_1fr_320px]">
        <aside className="relative hidden h-full flex-col items-center justify-between border-r border-emerald-200 bg-[#0f766e] py-4 text-white md:flex">
          <div className="space-y-3">
            <button
              onClick={() => setShowAccountMenu((prev) => !prev)}
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-base font-bold ring-2 ring-white/30 transition hover:bg-white/30"
            >
              {userInitial}
            </button>

            {showAccountMenu ? (
              <div className="absolute left-16 top-4 z-40 w-72 rounded-2xl border border-emerald-200 bg-white p-4 text-slate-700 shadow-2xl">
                <div className="mb-3 border-b border-slate-100 pb-3">
                  <p className="font-semibold">{userName}</p>
                  <p className="text-sm text-slate-500">{profile?.status?.isOnline ? "Đang hoạt động" : "Hoạt động gần đây"}</p>
                </div>
                <div className="space-y-1 text-sm">
                  <button
                    onClick={() => {
                      setShowProfileModal(true);
                      setShowAccountMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-emerald-50"
                  >
                    <UserRoundPen size={16} /> Hồ sơ của bạn
                  </button>
                  <button
                    onClick={() => {
                      setShowSettingsModal(true);
                      setSettingsTab("GENERAL");
                      setShowAccountMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-emerald-50"
                  >
                    <Settings size={16} /> Cài đặt
                  </button>
                  <button onClick={auth.logout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-rose-600 transition hover:bg-rose-50">
                    <LogOut size={16} /> Đăng xuất
                  </button>
                </div>
              </div>
            ) : null}

            <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 hover:bg-white/30">
              <MessageSquare size={18} />
            </button>
            <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 hover:bg-white/30">
              <Users size={18} />
            </button>
            <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 hover:bg-white/30">
              <BookMarked size={18} />
            </button>
          </div>

          <div className="space-y-3">
            <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 hover:bg-white/30">
              <Bell size={18} />
            </button>
            <button className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 hover:bg-white/30">
              <Settings size={18} />
            </button>
          </div>
        </aside>

        <section className="border-r border-slate-200 bg-slate-50">
          <div className="border-b border-slate-200 p-3">
            <div className="flex items-center gap-2 rounded-xl bg-slate-200/70 px-3 py-2">
              <Search size={16} className="text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                placeholder="Tìm kiếm"
              />
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <div className="flex items-center gap-3 font-semibold">
                <button className="text-emerald-700">Ưu tiên</button>
                <button className="text-slate-500">Khác</button>
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <span>Phân loại</span>
                <ChevronDown size={14} />
              </div>
            </div>

            <div className="mt-2 flex gap-2">
              {[
                { key: "ALL", label: "Tất cả" },
                { key: "UNREAD", label: "Chưa đọc" },
                { key: "READ", label: "Đã đọc" },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => setReadFilter(item.key as ReadFilter)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    readFilter === item.key ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[calc(100vh-142px)] overflow-y-auto">
            {conversationsQuery.isLoading && conversationCards.length === 0 ? (
              <div className="px-5 py-8 text-sm text-slate-500">Đang tải hội thoại...</div>
            ) : null}

            {filteredConversations.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveConversationId(item.id)}
                className={`grid w-full grid-cols-[52px_1fr_auto] gap-3 border-b border-slate-100 px-3 py-3 text-left transition hover:bg-white ${
                  activeConversationId === item.id ? "bg-white" : "bg-transparent"
                }`}
              >
                <div className={`relative mt-0.5 h-12 w-12 rounded-full overflow-hidden bg-gradient-to-br ${item.avatarColor}`}>
                  {item.avatar || (item.otherId ? userCache[item.otherId]?.avatar : undefined) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.avatar || (item.otherId ? userCache[item.otherId]?.avatar : undefined)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    null
                  )}
                  {item.online ? <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" /> : null}
                </div>
                <div className="min-w-0">
                  {(() => {
                    const display = item.name || (item.otherId ? userCache[item.otherId]?.fullName : undefined) || item.otherId || "Cuộc trò chuyện";
                    return <p className="truncate font-semibold text-slate-800">{display}</p>;
                  })()}
                  <p className="truncate text-sm text-slate-500">{item.lastMessage}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-xs text-slate-500">{item.time}</span>
                  {item.unreadCount > 0 ? (
                    <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">{item.unreadCount}</span>
                  ) : null}
                </div>
              </button>
            ))}

            {filteredConversations.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-slate-500">Không có hội thoại phù hợp bộ lọc.</div>
            ) : null}
          </div>
        </section>

        <section className="relative h-full min-h-0 bg-white">
          {activeConversationId ? (
            <ChatWindow conversationId={activeConversationId} />
          ) : (
            <div className="flex h-full items-center justify-center bg-slate-100/70 px-5">
              <div className="mx-auto mt-8 max-w-2xl">
                <div className="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-100 to-amber-100 p-6 text-center shadow-sm">
                  <p className="text-2xl font-bold text-emerald-900">Chào mừng đến với QuickChat PC!</p>
                  <p className="mt-2 text-sm text-slate-700">
                    Khám phá những tiện ích hỗ trợ làm việc và trò chuyện cùng người thân, bạn bè được tối ưu hóa cho máy tính của bạn.
                  </p>
                </div>

                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-slate-700 shadow-sm">
                  <p className="font-semibold text-amber-900">Kinh doanh hiệu quả với zBusiness Pro</p>
                  <p className="mt-1">
                    Bán hàng chuyên nghiệp với Nhãn Business và Bộ công cụ kinh doanh, mở khóa tiềm năng tiếp cận khách hàng trên Zalo.
                  </p>
                </div>

                <div className="mt-6 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="font-semibold text-slate-800">Đồng bộ đa thiết bị</p>
                    <p className="mt-1 text-xs text-slate-500">Làm việc liên tục trên mọi nền tảng.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="font-semibold text-slate-800">Bảo mật linh hoạt</p>
                    <p className="mt-1 text-xs text-slate-500">Quản lý phiên đăng nhập và quyền riêng tư.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="font-semibold text-slate-800">Giao diện tối ưu</p>
                    <p className="mt-1 text-xs text-slate-500">Không gian làm việc gọn gàng, trực quan.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        <aside className="hidden border-l border-slate-200 bg-slate-50 lg:block">
          <div className="border-b border-slate-200 px-4 py-4 text-center">
            {activeConversation ? (
              <>
                <div className={`mx-auto h-20 w-20 rounded-full bg-gradient-to-br ${activeConversation.avatarColor}`} />
                <p className="mt-3 text-2xl font-bold text-slate-800">{activeConversation.name}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-600">
                  <button className="rounded-xl bg-white p-2 shadow-sm">
                    <Bell size={14} className="mx-auto" /> Tắt thông báo
                  </button>
                  <button className="rounded-xl bg-white p-2 shadow-sm">
                    <BookMarked size={14} className="mx-auto" /> Ghim hội thoại
                  </button>
                  <button className="rounded-xl bg-white p-2 shadow-sm">
                    <Users size={14} className="mx-auto" /> Tạo nhóm
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CircleUserRound size={34} />
                </div>
                <p className="mt-3 text-lg font-bold text-slate-800">Thông tin hội thoại</p>
                <p className="mt-1 text-sm text-slate-500">Hãy chọn một cuộc trò chuyện để xem chi tiết.</p>
              </>
            )}
          </div>

          <div className="space-y-2 p-4 text-sm">
            <div className="rounded-xl bg-white p-3 shadow-sm">
              <p className="mb-2 flex items-center gap-2 font-semibold text-slate-700">
                <Dot /> Danh sách nhắc hẹn
              </p>
              <p className="text-slate-500">2 nhóm chung</p>
            </div>

            <div className="rounded-xl bg-white p-3 shadow-sm">
              <p className="mb-2 font-semibold text-slate-700">Ảnh/Video</p>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={`thumb-${index}`} className="aspect-square rounded-lg bg-gradient-to-br from-slate-200 to-slate-300" />
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-white p-3 shadow-sm">
              <p className="mb-2 font-semibold text-slate-700">Tệp</p>
              <div className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2">
                <span>Proposal_Q2.pdf</span>
                <span className="text-xs text-slate-500">4.2MB</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {showProfileModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="scrollbar-hide max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="relative h-44 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500">
              {profile?.coverImage ? <Image src={profile.coverImage} alt="Ảnh bìa" fill className="object-cover" unoptimized /> : null}
              <button
                onClick={() => setShowProfileModal(false)}
                className="absolute right-3 top-3 rounded-lg bg-white/90 p-2 text-slate-700 hover:bg-white"
                aria-label="Đóng hồ sơ"
              >
                <X size={18} />
              </button>
              <button
                onClick={() => coverInputRef.current?.click()}
                className="absolute right-14 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
              >
                Sửa ảnh bìa
              </button>
              <input ref={coverInputRef} type="file" className="hidden" accept="image/*" onChange={handleCoverUpload} />

              <div className="absolute -bottom-12 left-6 flex items-end gap-3">
                <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-emerald-400 to-cyan-600 text-3xl font-bold text-white">
                  {profile?.avatar ? <Image src={profile.avatar} alt="Ảnh đại diện" fill className="object-cover" unoptimized /> : userInitial}
                </div>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  Cập nhật avatar
                </button>
                <input ref={avatarInputRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
              </div>
            </div>

            <div className="px-6 pb-6 pt-16">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-slate-900">Hồ sơ của bạn</h3>
                  <p className="mt-1 text-sm text-slate-500">Chỉnh sửa thông tin cá nhân của bạn.</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setProfileEditMode((prev) => !prev)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      profileEditMode
                        ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        : "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg hover:-translate-y-0.5"
                    }`}
                  >
                    {profileEditMode ? "Xem hồ sơ" : "Cập nhật"}
                  </button>
                  <button onClick={() => setShowProfileModal(false)} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
                    Đóng
                  </button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="text-sm text-slate-600">
                  Họ tên
                  <input
                    disabled={!profileEditMode}
                    value={profileForm.fullName}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, fullName: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                  />
                </label>
                <label className="text-sm text-slate-600">
                  Giới tính
                  <select
                    disabled={!profileEditMode}
                    value={profileForm.gender}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, gender: event.target.value as IUser["gender"] }))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                  >
                    <option value="male">Nam</option>
                    <option value="female">Nữ</option>
                    <option value="other">Khác</option>
                  </select>
                </label>
                <label className="text-sm text-slate-600">
                  Ngày sinh
                  <input
                    type="date"
                    disabled={!profileEditMode}
                    value={profileForm.dob}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, dob: event.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                  />
                </label>
                <label className="text-sm text-slate-600">
                  Số điện thoại
                  <input value={profile?.phone || auth.user.phone} disabled className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2" />
                </label>
                <label className="text-sm text-slate-600 md:col-span-2">
                  Email
                  <input value={profile?.email || auth.user.email} disabled className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2" />
                </label>
                <label className="text-sm text-slate-600 md:col-span-2">
                  Tiểu sử
                  <textarea
                    disabled={!profileEditMode}
                    value={profileForm.bio}
                    onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))}
                    className="mt-1 h-24 w-full rounded-xl border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                  />
                </label>
              </div>

              {profileEditMode ? (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={saveProfile}
                    disabled={updateProfileMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-60"
                  >
                    {updateProfileMutation.isPending ? "Đang cập nhật..." : "Lưu thay đổi"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {showSettingsModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="flex h-[78vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <aside className="w-64 border-r border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-800">Cài đặt</h3>
                <button onClick={() => setShowSettingsModal(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-200" aria-label="Đóng cài đặt">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-1 text-sm">
                {[
                  { key: "GENERAL", label: "Cài đặt chung", icon: Settings },
                  { key: "SECURITY", label: "Tài khoản và bảo mật", icon: ShieldCheck },
                  { key: "PRIVACY", label: "Quyền riêng tư", icon: Eye },
                  { key: "SESSIONS", label: "Quản lý phiên đăng nhập", icon: KeyRound },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      onClick={() => setSettingsTab(item.key as SettingsTab)}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition ${
                        settingsTab === item.key ? "bg-emerald-100 font-semibold text-emerald-900" : "text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <Icon size={16} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="flex-1 overflow-y-auto bg-slate-100 p-6">
              {settingsTab === "GENERAL" ? (
                <div className="space-y-5">
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-lg font-semibold text-slate-800">Danh bạ</p>
                    <p className="mt-1 text-sm text-slate-500">Danh sách bạn bè được hiển thị trong danh bạ</p>
                    <div className="mt-3 space-y-2">
                      <label className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm">
                        Hiển thị tất cả bạn bè
                        <input type="radio" name="friends-display" className="h-4 w-4" defaultChecked />
                      </label>
                      <label className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm">
                        Chỉ hiển thị bạn bè đang sử dụng Zalo
                        <input type="radio" name="friends-display" className="h-4 w-4" />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-lg font-semibold text-slate-800">Ngôn ngữ</p>
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm">
                      <span>Thay đổi ngôn ngữ</span>
                      <select
                        value={generalForm.language}
                        onChange={(event) => setGeneralForm((prev) => ({ ...prev, language: event.target.value as "vi" | "en" }))}
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1"
                      >
                        <option value="vi">Tiếng Việt</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-lg font-semibold text-slate-800">Khởi động và ghi nhớ tài khoản</p>
                    <div className="mt-3 space-y-2">
                      <label className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm">
                        Khởi động QuickChat khi mở máy
                        <input
                          type="checkbox"
                          checked={generalForm.startupWithSystem}
                          onChange={(event) => setGeneralForm((prev) => ({ ...prev, startupWithSystem: event.target.checked }))}
                          className="h-4 w-4"
                        />
                      </label>
                      <label className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm">
                        Ghi nhớ tài khoản đăng nhập
                        <input
                          type="checkbox"
                          checked={generalForm.rememberLogin}
                          onChange={(event) => setGeneralForm((prev) => ({ ...prev, rememberLogin: event.target.checked }))}
                          className="h-4 w-4"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-lg font-semibold text-slate-800">Trạng thái hoạt động</p>
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm">
                      <span>Hiển thị đang online</span>
                      <input
                        type="checkbox"
                        checked={Boolean(profile?.status?.isOnline)}
                        onChange={(event) => saveStatus(event.target.checked)}
                        disabled={updateStatusMutation.isPending}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {settingsTab === "SECURITY" ? (
                <div className="space-y-5">
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="mb-3 text-lg font-semibold text-slate-800">Tài khoản và bảo mật</p>
                    <label className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm">
                      Bật bảo mật 2 lớp
                      <input
                        type="checkbox"
                        checked={twoFactorEnabled}
                        onChange={(event) => setTwoFactorEnabled(event.target.checked)}
                        className="h-4 w-4"
                      />
                    </label>
                    <p className="mt-2 text-xs text-slate-500">Hiện tại chỉ lưu giao diện, có thể nối API 2FA khi backend cung cấp endpoint.</p>
                  </div>

                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="mb-3 text-lg font-semibold text-slate-800">Đổi mật khẩu</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="text-sm text-slate-600">
                        Mật khẩu cũ
                        <div className="relative mt-1">
                          <input
                            type={showOldPassword ? "text" : "password"}
                            value={passwordForm.oldPassword}
                            onChange={(event) => setPasswordForm((prev) => ({ ...prev, oldPassword: event.target.value }))}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOldPassword((prev) => !prev)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:bg-slate-100"
                          >
                            {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </label>
                      <label className="text-sm text-slate-600 md:col-span-1">
                        Mật khẩu mới
                        <div className="relative mt-1">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={passwordForm.newPassword}
                            onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword((prev) => !prev)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:bg-slate-100"
                          >
                            {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </label>
                      <label className="text-sm text-slate-600 md:col-span-2">
                        Xác nhận mật khẩu mới
                        <div className="relative mt-1">
                          <input
                            type={showConfirmNewPassword ? "text" : "password"}
                            value={passwordForm.confirmNewPassword}
                            onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmNewPassword: event.target.value }))}
                            className="w-full rounded-xl border border-slate-300 px-3 py-2 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:bg-slate-100"
                          >
                            {showConfirmNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </label>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={handleChangePassword}
                        disabled={changePasswordMutation.isPending}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {changePasswordMutation.isPending ? "Đang xử lý..." : "Đổi mật khẩu"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {settingsTab === "PRIVACY" ? (
                <div className="space-y-5">
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="mb-3 text-lg font-semibold text-slate-800">Quyền riêng tư</p>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="text-sm text-slate-600">
                        Hiển thị thông tin cá nhân với
                        <select
                          value={privacyForm.showPhone}
                          onChange={(event) => setPrivacyForm((prev) => ({ ...prev, showPhone: event.target.value as PrivacyStatus }))}
                          className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"
                        >
                          <option value="ALL">ALL</option>
                          <option value="FRIEND">FRIEND</option>
                          <option value="PRIVATE">PRIVATE</option>
                        </select>
                      </label>

                      <label className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
                        Cho phép tìm mình bằng số điện thoại
                        <input
                          type="checkbox"
                          checked={privacyForm.findByPhone}
                          onChange={(event) => setPrivacyForm((prev) => ({ ...prev, findByPhone: event.target.checked }))}
                          className="h-4 w-4"
                        />
                      </label>

                      <label className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
                        Hiển thị trạng thái online
                        <input
                          type="checkbox"
                          checked={privacyForm.showOnline}
                          onChange={(event) => setPrivacyForm((prev) => ({ ...prev, showOnline: event.target.checked }))}
                          className="h-4 w-4"
                        />
                      </label>

                      <label className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-700">
                        Cho phép nhận tin nhắn từ người lạ
                        <input
                          type="checkbox"
                          checked={privacyForm.allowStrangerMessage}
                          onChange={(event) => setPrivacyForm((prev) => ({ ...prev, allowStrangerMessage: event.target.checked }))}
                          className="h-4 w-4"
                        />
                      </label>
                    </div>

                    <div className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">Danh sách chặn (demo): spam_bot_01, quảng_cáo_02</div>

                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={savePrivacy}
                        disabled={updatePrivacyMutation.isPending}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {updatePrivacyMutation.isPending ? "Đang lưu..." : "Lưu quyền riêng tư"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              {settingsTab === "SESSIONS" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
                    <div>
                      <p className="text-lg font-semibold text-slate-800">Quản lý phiên đăng nhập</p>
                      <p className="text-sm text-slate-500">Xem các thiết bị đã đăng nhập và đăng xuất toàn bộ khi cần.</p>
                    </div>
                    <button
                      onClick={handleLogoutAllDevices}
                      disabled={logoutAllDevicesMutation.isPending}
                      className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {logoutAllDevicesMutation.isPending ? "Đang xử lý..." : "Đăng xuất tất cả thiết bị"}
                    </button>
                  </div>

                  <div className="space-y-3">
                    {sessionsQuery.data?.map((session) => (
                      <div key={session._id} className="rounded-2xl bg-white p-4 shadow-sm">
                        <p className="font-semibold text-slate-800">{session.deviceName}</p>
                        <p className="mt-1 text-sm text-slate-500">Thiết bị: {session.device}</p>
                        <p className="text-sm text-slate-500">IP: {session.ipAddress || "-"}</p>
                        <p className="text-sm text-slate-500">Thời gian: {new Date(session.createdAt).toLocaleString("vi-VN")}</p>
                        <p className={`mt-1 text-sm font-medium ${session.isCurrent ? "text-emerald-600" : "text-slate-500"}`}>
                          {session.isCurrent ? "Phiên hiện tại" : "Phiên khác"}
                        </p>
                      </div>
                    ))}

                    {!sessionsQuery.data?.length ? <div className="rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm">Chưa có phiên đăng nhập nào.</div> : null}
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      ) : null}
    </main>
  );
}
