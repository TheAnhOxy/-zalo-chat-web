"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { IUser, PrivacyStatus } from "@/src/types/user";
import {
  Bell,
  BookImage,
  Briefcase,
  CheckCheck,
  CircleUserRound,
  Cloud,
  Lock,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  SquareDashedBottom,
  UserPlus,
  Users,
  X,
} from "lucide-react";

type ChatFilter = "all" | "unread" | "read";
type SettingsTab = "general" | "security" | "privacy";

type ConversationItem = {
  id: string;
  name: string;
  lastMessage: string;
  time: string;
  unread: number;
  online?: boolean;
};

const FAKE_SESSION_KEY = "zalo_fake_session";
const UPLOAD_ENDPOINT = process.env.NEXT_PUBLIC_UPLOAD_ENDPOINT;
const PROFILE_UPDATE_ENDPOINT = process.env.NEXT_PUBLIC_PROFILE_UPDATE_ENDPOINT;

const initialConversations: ConversationItem[] = [
  {
    id: "team-aurora",
    name: "Aurora Design Team",
    lastMessage: "Minh: Chốt màu gradient xanh ngọc cho release hôm nay nhé.",
    time: "1 phút",
    unread: 4,
    online: true,
  },
  {
    id: "ops-lab",
    name: "Ops Lab",
    lastMessage: "Hưng: Deploy xong môi trường staging, mời mọi người test.",
    time: "12 phút",
    unread: 0,
  },
  {
    id: "client-vesta",
    name: "Client Vesta",
    lastMessage: "Trang: Mockup dashboard đã gửi vào email, check giúp em.",
    time: "26 phút",
    unread: 1,
    online: true,
  },
  {
    id: "family",
    name: "Nhà mình",
    lastMessage: "Mẹ: Tối về ăn cơm nha con.",
    time: "1 giờ",
    unread: 0,
  },
  {
    id: "research",
    name: "Research Squad",
    lastMessage: "Khang: Đã note lại benchmark realtime chat ở Notion.",
    time: "3 giờ",
    unread: 6,
  },
  {
    id: "class-ai",
    name: "AI Class 2026",
    lastMessage: "Giảng viên: Deadline bài tập là 23:59 Chủ nhật.",
    time: "6 giờ",
    unread: 2,
  },
  {
    id: "music-club",
    name: "Acoustic Club",
    lastMessage: "An: T7 tập bài mới ở studio nhé mọi người.",
    time: "Hôm qua",
    unread: 0,
  },
];

const settingsItems = [
  { key: "general", label: "Cài đặt chung", icon: SlidersHorizontal },
  { key: "security", label: "Tài khoản và bảo mật", icon: ShieldCheck },
  { key: "privacy", label: "Quyền riêng tư", icon: Lock },
] as const;

const defaultUser: IUser = {
  _id: "demo-user-001",
  phone: "0987654321",
  email: "demo@quickchat.local",
  fullName: "Thế Anh",
  avatar: "",
  coverImage: "/images/anhnen.jpg",
  dob: new Date("2003-09-16"),
  gender: "male",
  bio: "Xây QuickChat chân thực cho team.",
  status: {
    isOnline: true,
    lastSeen: new Date(),
  },
  privacy: {
    showPhone: "FRIEND",
    showOnline: true,
    allowStrangerMessage: true,
    findByPhone: true,
  },
  settings: {
    darkMode: false,
    language: "vi",
    twoFactorAuth: false,
  },
  fcmTokens: [],
  isVerified: true,
  isBlocked: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const toInputDate = (value?: Date) => {
  if (!value) {
    return "";
  }

  return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const statusLabel = (value: PrivacyStatus) => {
  if (value === "ALL") {
    return "Tất cả mọi người";
  }

  if (value === "FRIEND") {
    return "Bạn bè";
  }

  return "Riêng tư";
};

async function uploadFileToS3(file: File): Promise<string> {
  if (!UPLOAD_ENDPOINT) {
    return URL.createObjectURL(file);
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(UPLOAD_ENDPOINT, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload failed");
  }

  const data = (await response.json()) as { url?: string; data?: { url?: string } };

  const url = data.url ?? data.data?.url;

  if (!url) {
    throw new Error("Upload response missing url");
  }

  return url;
}

export default function HomePage() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [chatFilter, setChatFilter] = useState<ChatFilter>("all");
  const [conversations, setConversations] = useState(initialConversations);
  const [activeChatId, setActiveChatId] = useState(initialConversations[0]?.id ?? "");

  const [menuOpen, setMenuOpen] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [openSettings, setOpenSettings] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("general");

  const [user, setUser] = useState<IUser>(defaultUser);
  const [blockedList, setBlockedList] = useState<string[]>(["spam_007", "marketing-bot"]);
  const [newBlockedUser, setNewBlockedUser] = useState("");

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const [newPassword, setNewPassword] = useState({
    currentPassword: "",
    nextPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const sessionRaw = localStorage.getItem(FAKE_SESSION_KEY);

    if (!sessionRaw) {
      router.replace("/login");
      return;
    }

    try {
      const session = JSON.parse(sessionRaw) as {
        fullName?: string;
        email?: string;
        phone?: string;
        avatar?: string;
      };

      setUser((prev) => ({
        ...prev,
        fullName: session.fullName || prev.fullName,
        email: session.email || prev.email,
        phone: session.phone || prev.phone,
        avatar: session.avatar || prev.avatar,
      }));
    } catch {
      localStorage.removeItem(FAKE_SESSION_KEY);
      router.replace("/login");
      return;
    }

    setIsReady(true);
  }, [router]);

  const filteredConversations = useMemo(() => {
    return conversations.filter((item) => {
      const keywordMatched =
        item.name.toLowerCase().includes(keyword.toLowerCase()) ||
        item.lastMessage.toLowerCase().includes(keyword.toLowerCase());

      const filterMatched =
        chatFilter === "all" ? true : chatFilter === "unread" ? item.unread > 0 : item.unread === 0;

      return keywordMatched && filterMatched;
    });
  }, [chatFilter, conversations, keyword]);

  const activeConversation = useMemo(
    () => conversations.find((item) => item.id === activeChatId),
    [activeChatId, conversations]
  );

  if (!isReady) {
    return (
      <main className="flex h-screen items-center justify-center bg-[#111827] text-white">
        Đang tải QuickChat...
      </main>
    );
  }

  const selectConversation = (id: string) => {
    setActiveChatId(id);
    setConversations((prev) => prev.map((item) => (item.id === id ? { ...item, unread: 0 } : item)));
  };

  const openProfileModal = () => {
    setMenuOpen(false);
    setOpenProfile(true);
  };

  const openSettingsModal = () => {
    setMenuOpen(false);
    setSettingsTab("general");
    setOpenSettings(true);
  };

  const handleLogout = () => {
    localStorage.removeItem(FAKE_SESSION_KEY);
    router.replace("/login");
  };

  const applyUserPatch = (patch: Partial<IUser>) => {
    setUser((prev) => ({ ...prev, ...patch, updatedAt: new Date() }));
  };

  const applyPrivacyPatch = (patch: Partial<IUser["privacy"]>) => {
    setUser((prev) => ({
      ...prev,
      updatedAt: new Date(),
      privacy: {
        ...prev.privacy,
        ...patch,
      },
    }));
  };

  const applySettingsPatch = (patch: Partial<IUser["settings"]>) => {
    setUser((prev) => ({
      ...prev,
      updatedAt: new Date(),
      settings: {
        ...prev.settings,
        ...patch,
      },
    }));
  };

  const onUploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadingAvatar(true);

    try {
      const url = await uploadFileToS3(file);
      applyUserPatch({ avatar: url });
      setSaveMessage("Cập nhật avatar thành công.");
    } catch {
      setSaveMessage("Upload avatar thất bại. Kiểm tra API upload S3.");
    } finally {
      setUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const onUploadCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadingCover(true);

    try {
      const url = await uploadFileToS3(file);
      applyUserPatch({ coverImage: url });
      setSaveMessage("Cập nhật ảnh bìa thành công.");
    } catch {
      setSaveMessage("Upload ảnh bìa thất bại. Kiểm tra API upload S3.");
    } finally {
      setUploadingCover(false);
      event.target.value = "";
    }
  };

  const handleSaveProfile = async () => {
    setProfileLoading(true);
    setSaveMessage("");

    try {
      if (PROFILE_UPDATE_ENDPOINT) {
        const response = await fetch(PROFILE_UPDATE_ENDPOINT, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: user.fullName,
            gender: user.gender,
            dob: user.dob?.toISOString(),
            bio: user.bio,
            avatar: user.avatar,
            coverImage: user.coverImage,
            privacy: user.privacy,
            settings: user.settings,
          }),
        });

        if (!response.ok) {
          throw new Error("Save profile failed");
        }
      }

      setIsEditingProfile(false);
      setSaveMessage("Đã cập nhật hồ sơ.");
    } catch {
      setSaveMessage("Lưu hồ sơ thất bại. Kiểm tra API update profile.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword.nextPassword.length < 6) {
      setSaveMessage("Mật khẩu mới cần từ 6 ký tự.");
      return;
    }

    if (newPassword.nextPassword !== newPassword.confirmPassword) {
      setSaveMessage("Xác nhận mật khẩu chưa khớp.");
      return;
    }

    setPasswordLoading(true);

    try {
      setSaveMessage("Đổi mật khẩu thành công (mock).");
      setNewPassword({
        currentPassword: "",
        nextPassword: "",
        confirmPassword: "",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const addBlockedUser = () => {
    const value = newBlockedUser.trim();

    if (!value || blockedList.includes(value)) {
      return;
    }

    setBlockedList((prev) => [value, ...prev]);
    setNewBlockedUser("");
  };

  return (
    <main className="h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_15%_10%,#1d3f56_0%,#0f1f2d_45%,#0b1520_100%)] text-white">
      <div className="flex h-full w-full bg-white/5 backdrop-blur-sm">
        <aside className="relative flex w-[70px] shrink-0 flex-col items-center justify-between bg-[linear-gradient(180deg,#15314a,#11273a)] py-4">
          <div className="flex w-full flex-col items-center gap-3">
            <button
              onClick={() => setMenuOpen((prev) => !prev)}
              className="relative rounded-full border-2 border-[#56e0c6]/70 p-[2px] transition hover:scale-105"
            >
              {user.avatar ? (
                <img src={user.avatar} alt="Avatar" className="size-10 rounded-full object-cover" />
              ) : (
                <div className="flex size-10 items-center justify-center rounded-full bg-[linear-gradient(145deg,#56e0c6,#2f93ff)] text-sm font-bold text-slate-900">
                  {user.fullName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </button>

            <button className="relative flex size-10 items-center justify-center rounded-xl bg-[#56e0c6]/20 text-[#9ff3e3] transition hover:bg-[#56e0c6]/35">
              <MessageCircle className="size-5" />
              <span className="absolute -right-1 -top-1 rounded-full bg-[#ff7c5c] px-1.5 text-[10px] font-bold leading-4 text-white">
                8
              </span>
            </button>
            <button className="flex size-10 items-center justify-center rounded-xl text-[#b6c8d9] transition hover:bg-white/15 hover:text-white">
              <Users className="size-5" />
            </button>
            <button className="flex size-10 items-center justify-center rounded-xl text-[#b6c8d9] transition hover:bg-white/15 hover:text-white">
              <Cloud className="size-5" />
            </button>
            <button className="flex size-10 items-center justify-center rounded-xl text-[#b6c8d9] transition hover:bg-white/15 hover:text-white">
              <SquareDashedBottom className="size-5" />
            </button>
            <button className="flex size-10 items-center justify-center rounded-xl text-[#b6c8d9] transition hover:bg-white/15 hover:text-white">
              <Briefcase className="size-5" />
            </button>
          </div>

          <button
            onClick={openSettingsModal}
            className="flex size-10 items-center justify-center rounded-xl text-[#b6c8d9] transition hover:bg-white/15 hover:text-white"
          >
            <Settings className="size-5" />
          </button>

          {menuOpen ? (
            <div className="absolute left-[78px] top-4 z-30 w-64 rounded-2xl border border-[#2d475f] bg-[#132738] p-3 shadow-2xl">
              <p className="px-3 pb-2 text-xs uppercase tracking-[0.18em] text-[#80f2df]">Quick Menu</p>
              <div className="mb-2 rounded-xl bg-[#1b3449] p-3">
                <p className="text-sm font-semibold">{user.fullName}</p>
                <p className="text-xs text-[#9cc3df]">{user.status.isOnline ? "Đang hoạt động" : "Không hoạt động"}</p>
              </div>
              <button
                onClick={openProfileModal}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#dde9f7] transition hover:bg-[#1f3a53]"
              >
                <CircleUserRound className="size-4" />
                Hồ sơ của bạn
              </button>
              <button
                onClick={openSettingsModal}
                className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#dde9f7] transition hover:bg-[#1f3a53]"
              >
                <Settings className="size-4" />
                Cài đặt
              </button>
              <button
                onClick={handleLogout}
                className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-[#ffd4cb] transition hover:bg-[#4d2b2e]"
              >
                <LogOut className="size-4" />
                Đăng xuất
              </button>
            </div>
          ) : null}
        </aside>

        <section className="flex h-full w-[360px] shrink-0 flex-col border-r border-[#2f4c65] bg-[#eaf0f6] text-[#0f2b3f]">
          <div className="space-y-3 border-b border-[#c9d9e8] p-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#5f7590]" />
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="Tìm kiếm cuộc trò chuyện"
                  className="h-10 w-full rounded-xl border border-[#c7d7e8] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[#7f93aa] focus:border-[#32b9b0]"
                />
              </div>
              <button className="rounded-lg bg-white p-2 text-[#4f6483] shadow-sm transition hover:bg-[#dff6f2]">
                <UserPlus className="size-4" />
              </button>
              <button className="rounded-lg bg-white p-2 text-[#4f6483] shadow-sm transition hover:bg-[#dff6f2]">
                <Bell className="size-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setChatFilter("all")}
                  className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                    chatFilter === "all" ? "bg-[#cff4ef] text-[#087067]" : "text-[#5e738e] hover:bg-white"
                  }`}
                >
                  Tất cả
                </button>
                <button
                  onClick={() => setChatFilter("unread")}
                  className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                    chatFilter === "unread" ? "bg-[#cff4ef] text-[#087067]" : "text-[#5e738e] hover:bg-white"
                  }`}
                >
                  Chưa đọc
                </button>
                <button
                  onClick={() => setChatFilter("read")}
                  className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                    chatFilter === "read" ? "bg-[#cff4ef] text-[#087067]" : "text-[#5e738e] hover:bg-white"
                  }`}
                >
                  Đã đọc
                </button>
              </div>
              <span className="inline-flex items-center gap-1 text-[#536c86]">
                <SlidersHorizontal className="size-4" />
                Phân loại
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map((item) => (
              <button
                key={item.id}
                onClick={() => selectConversation(item.id)}
                className={`flex w-full items-start gap-3 border-b border-[#dce6f0] px-4 py-3 text-left transition hover:bg-[#dff5f1] ${
                  activeChatId === item.id ? "bg-[#d8f2ee]" : ""
                }`}
              >
                <div className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(150deg,#4fd5c6,#2e8fff)] text-sm font-semibold text-white shadow-sm">
                  {item.name.slice(0, 2).toUpperCase()}
                  {item.online ? (
                    <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-emerald-400" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[18px] font-semibold leading-none text-[#15314a]">{item.name}</p>
                    <span className="shrink-0 text-xs text-[#647a95]">{item.time}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <p className="truncate text-sm text-[#4f6680]">{item.lastMessage}</p>
                    {item.unread > 0 ? (
                      <span className="rounded-full bg-[#ff8f73] px-1.5 text-[11px] font-semibold text-white">{item.unread}</span>
                    ) : (
                      <CheckCheck className="size-4 text-[#62bdb2]" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="relative hidden flex-1 flex-col items-center justify-center px-6 text-center md:flex">
          <div className="max-w-3xl rounded-3xl border border-white/15 bg-white/10 p-10 shadow-xl backdrop-blur-sm">
            <h1 className="text-4xl font-semibold tracking-tight text-white">Chào mừng đến với QuickChat!</h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-[#c2d6e7]">
              Không gian trò chuyện mới mượt hơn, gọn hơn và đồng bộ tốt cho nhóm của bạn.
            </p>

            <div className="mt-8 rounded-2xl border border-white/15 bg-[#0f2436]/80 p-7 text-left">
              <h2 className="text-2xl font-semibold text-[#84f1df]">QuickChat Team Pro</h2>
              <p className="mt-2 text-sm leading-6 text-[#bfd3e3]">
                Tập trung thảo luận công việc, quản lý nhóm và cập nhật tiến độ theo thời gian thực với giao diện cân bằng và trực quan hơn.
              </p>
              <button className="mt-5 rounded-xl bg-[linear-gradient(90deg,#47d7c5,#4da7ff)] px-5 py-2.5 text-sm font-semibold text-[#0c2538] transition hover:brightness-110">
                Khám phá không gian nhóm
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <span className="size-2 rounded-full bg-white/30" />
            <span className="size-2 rounded-full bg-[#5ee7d0]" />
            <span className="size-2 rounded-full bg-white/30" />
            <span className="size-2 rounded-full bg-white/30" />
          </div>

          {activeConversation ? (
            <div className="mt-8 rounded-2xl border border-white/15 bg-white/10 px-6 py-4 text-left text-sm text-[#dce9f4]">
              Đang mở: <span className="font-semibold text-white">{activeConversation.name}</span>
            </div>
          ) : null}
        </section>

        <section className="flex flex-1 items-center justify-center p-8 text-center text-white/80 md:hidden">
          Chọn cuộc trò chuyện để bắt đầu.
        </section>
      </div>

      {openProfile ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-[#f1f4f8] text-[#22324a] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#d2dbe5] bg-white px-6 py-4">
              <h3 className="text-2xl font-semibold">Thông tin tài khoản</h3>
              <button onClick={() => setOpenProfile(false)} className="rounded-md p-1 text-[#5d738f] hover:bg-[#e7edf4]">
                <X className="size-6" />
              </button>
            </div>

            <div className="relative h-44 bg-[#0f2436]">
              {user.coverImage ? <img src={user.coverImage} alt="Cover" className="h-full w-full object-cover" /> : null}
              <label className="absolute right-4 top-4 cursor-pointer rounded-lg bg-black/50 px-3 py-1.5 text-xs font-medium text-white">
                {uploadingCover ? "Đang upload..." : "Đổi ảnh bìa"}
                <input type="file" accept="image/*" className="hidden" onChange={onUploadCover} />
              </label>
            </div>

            <div className="relative px-6 pb-6 pt-14">
              <div className="absolute -top-12 left-6 size-24 overflow-hidden rounded-full border-4 border-[#f1f4f8] bg-white">
                {user.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#4fd5c6,#2e8fff)] text-xl font-bold text-white">
                    {user.fullName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>

              <label className="absolute left-24 top-9 cursor-pointer rounded-full border border-[#b8c7d8] bg-white p-2 text-[#415a78] shadow-sm">
                {uploadingAvatar ? <span className="px-1 text-[10px]">...</span> : <BookImage className="size-4" />}
                <input type="file" accept="image/*" className="hidden" onChange={onUploadAvatar} />
              </label>

              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-4xl font-semibold">{user.fullName}</h4>
                  <p className="mt-1 text-sm text-[#57708d]">{user.status.isOnline ? "Đang hoạt động" : "Không hoạt động"}</p>
                </div>
                <button
                  onClick={() => setIsEditingProfile((prev) => !prev)}
                  className="rounded-xl bg-[#d8ebff] px-4 py-2 text-sm font-semibold text-[#134672] transition hover:bg-[#c6e0fb]"
                >
                  {isEditingProfile ? "Xong" : "Cập nhật"}
                </button>
              </div>

              <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
                <h5 className="text-3xl font-semibold">Thông tin cá nhân</h5>

                <div className="mt-4 grid grid-cols-[130px_1fr] gap-y-2 text-[17px]">
                  <p className="text-[#61788f]">Giới tính</p>
                  {isEditingProfile ? (
                    <select
                      value={user.gender}
                      onChange={(event) => applyUserPatch({ gender: event.target.value as IUser["gender"] })}
                      className="w-full rounded-lg border border-[#d4dde7] bg-white px-3 py-2 text-sm"
                    >
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                      <option value="other">Khác</option>
                    </select>
                  ) : (
                    <p className="font-medium">{user.gender === "male" ? "Nam" : user.gender === "female" ? "Nữ" : "Khác"}</p>
                  )}

                  <p className="text-[#61788f]">Ngày sinh</p>
                  {isEditingProfile ? (
                    <input
                      type="date"
                      value={toInputDate(user.dob)}
                      onChange={(event) => applyUserPatch({ dob: new Date(event.target.value) })}
                      className="w-full rounded-lg border border-[#d4dde7] bg-white px-3 py-2 text-sm"
                    />
                  ) : (
                    <p className="font-medium">{user.dob ? user.dob.toLocaleDateString("vi-VN") : "Chưa cập nhật"}</p>
                  )}

                  <p className="text-[#61788f]">Điện thoại</p>
                  <p className="font-medium">{user.phone}</p>

                  <p className="text-[#61788f]">Email</p>
                  <p className="font-medium">{user.email}</p>

                  <p className="text-[#61788f]">Tên hiển thị</p>
                  {isEditingProfile ? (
                    <input
                      value={user.fullName}
                      onChange={(event) => applyUserPatch({ fullName: event.target.value })}
                      className="w-full rounded-lg border border-[#d4dde7] bg-white px-3 py-2 text-sm"
                    />
                  ) : (
                    <p className="font-medium">{user.fullName}</p>
                  )}

                  <p className="text-[#61788f]">Bio</p>
                  {isEditingProfile ? (
                    <textarea
                      value={user.bio || ""}
                      onChange={(event) => applyUserPatch({ bio: event.target.value })}
                      rows={2}
                      className="w-full rounded-lg border border-[#d4dde7] bg-white px-3 py-2 text-sm"
                    />
                  ) : (
                    <p className="font-medium">{user.bio || "Chưa cập nhật"}</p>
                  )}
                </div>

                {saveMessage ? <p className="mt-4 text-sm text-[#0c746b]">{saveMessage}</p> : null}

                {isEditingProfile ? (
                  <button
                    onClick={handleSaveProfile}
                    disabled={profileLoading}
                    className="mt-5 rounded-xl bg-[linear-gradient(90deg,#47d7c5,#4da7ff)] px-5 py-2 text-sm font-semibold text-[#0c2538] transition hover:brightness-110 disabled:opacity-60"
                  >
                    {profileLoading ? "Đang lưu..." : "Lưu cập nhật"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {openSettings ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4">
          <div className="flex h-[88vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-[#eef2f7] text-[#21344a] shadow-2xl">
            <aside className="w-72 border-r border-[#ced8e4] bg-[#f8fbff] p-4">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-2xl font-semibold">Cài đặt</h3>
                <button onClick={() => setOpenSettings(false)} className="rounded-md p-1 text-[#607997] hover:bg-[#e7eef6]">
                  <X className="size-6" />
                </button>
              </div>
              <div className="space-y-1">
                {settingsItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.key}
                      onClick={() => setSettingsTab(item.key)}
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                        settingsTab === item.key
                          ? "bg-[#d5e9ff] font-semibold text-[#174f80]"
                          : "text-[#4f6580] hover:bg-[#e9f1fa]"
                      }`}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="flex-1 overflow-y-auto p-6">
              {settingsTab === "general" ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-3xl font-semibold">Danh bạ</h4>
                    <p className="mt-1 text-sm text-[#607896]">Danh sách bạn bè được hiển thị trong danh bạ</p>
                    <div className="mt-3 rounded-xl bg-white p-4 shadow-sm">
                      <label className="flex items-center justify-between py-2">
                        <span>Hiển thị tất cả bạn bè</span>
                        <input type="radio" name="friend-filter" />
                      </label>
                      <label className="flex items-center justify-between py-2">
                        <span>Chỉ hiển thị bạn bè đang sử dụng QuickChat</span>
                        <input type="radio" name="friend-filter" defaultChecked />
                      </label>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-3xl font-semibold">Ngôn ngữ</h4>
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-white p-4 shadow-sm">
                      <span>Thay đổi ngôn ngữ</span>
                      <select
                        value={user.settings.language}
                        onChange={(event) => applySettingsPatch({ language: event.target.value as "vi" | "en" })}
                        className="rounded-lg border border-[#d4dde8] bg-white px-3 py-2 text-sm"
                      >
                        <option value="vi">Tiếng Việt</option>
                        <option value="en">English</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-3xl font-semibold">Khởi động & ghi nhớ tài khoản</h4>
                    <div className="mt-3 rounded-xl bg-white p-4 shadow-sm">
                      <label className="flex items-center justify-between py-2">
                        <span>Khởi động QuickChat khi mở máy</span>
                        <input type="checkbox" defaultChecked className="size-5" />
                      </label>
                      <label className="flex items-center justify-between py-2">
                        <span>Ghi nhớ tài khoản đăng nhập</span>
                        <input type="checkbox" defaultChecked className="size-5" />
                      </label>
                    </div>
                  </div>
                </div>
              ) : null}

              {settingsTab === "security" ? (
                <div className="space-y-6">
                  <div className="rounded-xl bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-2xl font-semibold">Xác thực 2 lớp</h4>
                        <p className="mt-1 text-sm text-[#5f7895]">Bảo vệ tài khoản tốt hơn bằng xác thực hai lớp.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={user.settings.twoFactorAuth}
                        onChange={(event) => applySettingsPatch({ twoFactorAuth: event.target.checked })}
                        className="size-5"
                      />
                    </div>
                  </div>

                  <form onSubmit={handleChangePassword} className="rounded-xl bg-white p-5 shadow-sm">
                    <h4 className="text-2xl font-semibold">Đổi mật khẩu</h4>
                    <div className="mt-4 grid gap-3">
                      <input
                        type="password"
                        placeholder="Mật khẩu hiện tại"
                        value={newPassword.currentPassword}
                        onChange={(event) =>
                          setNewPassword((prev) => ({
                            ...prev,
                            currentPassword: event.target.value,
                          }))
                        }
                        className="h-11 rounded-lg border border-[#d5deea] bg-white px-3 text-sm"
                      />
                      <input
                        type="password"
                        placeholder="Mật khẩu mới"
                        value={newPassword.nextPassword}
                        onChange={(event) =>
                          setNewPassword((prev) => ({
                            ...prev,
                            nextPassword: event.target.value,
                          }))
                        }
                        className="h-11 rounded-lg border border-[#d5deea] bg-white px-3 text-sm"
                      />
                      <input
                        type="password"
                        placeholder="Xác nhận mật khẩu mới"
                        value={newPassword.confirmPassword}
                        onChange={(event) =>
                          setNewPassword((prev) => ({
                            ...prev,
                            confirmPassword: event.target.value,
                          }))
                        }
                        className="h-11 rounded-lg border border-[#d5deea] bg-white px-3 text-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className="mt-4 rounded-xl bg-[linear-gradient(90deg,#47d7c5,#4da7ff)] px-5 py-2 text-sm font-semibold text-[#0c2538] transition hover:brightness-110 disabled:opacity-60"
                    >
                      {passwordLoading ? "Đang xử lý..." : "Đổi mật khẩu"}
                    </button>
                  </form>
                </div>
              ) : null}

              {settingsTab === "privacy" ? (
                <div className="space-y-6">
                  <div className="rounded-xl bg-white p-5 shadow-sm">
                    <h4 className="text-2xl font-semibold">Cá nhân</h4>
                    <div className="mt-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <span>Hiển thị ngày sinh</span>
                        <select
                          value={user.privacy.showPhone}
                          onChange={(event) => applyPrivacyPatch({ showPhone: event.target.value as PrivacyStatus })}
                          className="rounded-lg border border-[#d4dde8] bg-white px-3 py-2 text-sm"
                        >
                          <option value="ALL">Tất cả</option>
                          <option value="FRIEND">Bạn bè</option>
                          <option value="PRIVATE">Không hiển thị</option>
                        </select>
                      </div>
                      <label className="flex items-center justify-between">
                        <span>Hiển thị trạng thái truy cập</span>
                        <input
                          type="checkbox"
                          checked={user.privacy.showOnline}
                          onChange={(event) => applyPrivacyPatch({ showOnline: event.target.checked })}
                          className="size-5"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-5 shadow-sm">
                    <h4 className="text-2xl font-semibold">Tin nhắn và cuộc gọi</h4>
                    <div className="mt-3 space-y-3">
                      <label className="flex items-center justify-between">
                        <span>Hiển thị trạng thái &quot;Đã xem&quot;</span>
                        <input
                          type="checkbox"
                          checked={user.privacy.allowStrangerMessage}
                          onChange={(event) => applyPrivacyPatch({ allowStrangerMessage: event.target.checked })}
                          className="size-5"
                        />
                      </label>

                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p>Cho phép nhắn tin</p>
                          <p className="text-sm text-[#65809f]">Ai được nhắn tin cho bạn</p>
                        </div>
                        <select className="rounded-lg border border-[#d4dde8] bg-white px-3 py-2 text-sm">
                          <option>Tất cả mọi người</option>
                          <option>Bạn bè</option>
                          <option>Không ai</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p>Cho phép gọi điện</p>
                          <p className="text-sm text-[#65809f]">Ai được gọi cho bạn</p>
                        </div>
                        <select className="rounded-lg border border-[#d4dde8] bg-white px-3 py-2 text-sm">
                          <option>Bạn bè và người lạ từng liên hệ</option>
                          <option>Chỉ bạn bè</option>
                          <option>Không ai</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-5 shadow-sm">
                    <h4 className="text-2xl font-semibold">Quyền riêng tư theo database</h4>
                    <div className="mt-3 grid gap-3">
                      <div className="flex items-center justify-between">
                        <span>Hiển thị số điện thoại với</span>
                        <select
                          value={user.privacy.showPhone}
                          onChange={(event) => applyPrivacyPatch({ showPhone: event.target.value as PrivacyStatus })}
                          className="rounded-lg border border-[#d4dde8] bg-white px-3 py-2 text-sm"
                        >
                          <option value="ALL">{statusLabel("ALL")}</option>
                          <option value="FRIEND">{statusLabel("FRIEND")}</option>
                          <option value="PRIVATE">{statusLabel("PRIVATE")}</option>
                        </select>
                      </div>
                      <label className="flex items-center justify-between">
                        <span>Cho phép tìm bằng số điện thoại</span>
                        <input
                          type="checkbox"
                          checked={user.privacy.findByPhone}
                          onChange={(event) => applyPrivacyPatch({ findByPhone: event.target.checked })}
                          className="size-5"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-5 shadow-sm">
                    <h4 className="text-2xl font-semibold">Chặn tin nhắn</h4>
                    <div className="mt-3 flex gap-2">
                      <input
                        value={newBlockedUser}
                        onChange={(event) => setNewBlockedUser(event.target.value)}
                        placeholder="Nhập username cần chặn"
                        className="h-10 flex-1 rounded-lg border border-[#d4dde8] px-3 text-sm"
                      />
                      <button
                        onClick={addBlockedUser}
                        type="button"
                        className="rounded-lg bg-[#e4ecf7] px-3 text-sm font-medium text-[#1f466b]"
                      >
                        Thêm
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {blockedList.map((item) => (
                        <div key={item} className="flex items-center justify-between rounded-lg border border-[#e0e7f1] px-3 py-2 text-sm">
                          <span>{item}</span>
                          <button
                            type="button"
                            onClick={() => setBlockedList((prev) => prev.filter((name) => name !== item))}
                            className="text-[#cd4b4b]"
                          >
                            Bỏ chặn
                          </button>
                        </div>
                      ))}
                    </div>
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
