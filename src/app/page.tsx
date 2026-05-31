"use client";

import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { socketService } from "@/src/services/socket/socket.service";
import { useEffect, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { AppNavSidebar } from "@/src/components/layout/app-nav-sidebar";
import { ChatListPanel } from "@/src/components/chat/ChatListPanel";
import { dedupeConversations } from "@/src/lib/conversation-list";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { ChatWindow } from "@/src/components/chat/ChatWindow";
import { WelcomeEmptyState } from "@/src/components/chat/WelcomeEmptyState";
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
import { getErrorMessage } from "@/src/utils/error";
import { IUser, PrivacyStatus } from "@/src/types/user";
import { useChangePassword, useLogoutAllDevices, useSessions } from "@/src/hooks/use-auth-actions";
import { strongPasswordRegex } from "@/src/utils/validators/auth";
import axios from "axios";

type SettingsTab = "GENERAL" | "SECURITY" | "PRIVACY" | "SESSIONS";

export default function HomePage() {
  const auth = useAuthGuard();
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationIdParam = searchParams.get("conversation");
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

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
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

  const queryClient = useQueryClient();

  const conversationsQuery = useQuery({
    queryKey: ["conversations", currentUserId],
    queryFn: () => conversationsApi.listForUser(currentUserId!),
    enabled: Boolean(auth.isInitialized && currentUserId),
    staleTime: 30_000,
  });

  // ✅ Real-time: cập nhật danh sách conversation khi có tin nhắn mới
  useEffect(() => {
    if (!currentUserId) return;

    const handleNewMessage = () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", currentUserId] });
    };

    const handleConversationUpdated = () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", currentUserId] });
    };

    socketService.on("new_message", handleNewMessage);
    socketService.on("conversation_updated", handleConversationUpdated);
    socketService.on("conversation_created", handleConversationUpdated);
    socketService.on("conversation_removed", handleConversationUpdated);

    return () => {
      socketService.off("new_message", handleNewMessage);
      socketService.off("conversation_updated", handleConversationUpdated);
      socketService.off("conversation_created", handleConversationUpdated);
      socketService.off("conversation_removed", handleConversationUpdated);
    };
  }, [currentUserId, queryClient]);

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

  // Chỉ mở chat khi URL có ?conversation= (user chọn hoặc điều hướng từ danh bạ)
  useEffect(() => {
    if (!conversationIdParam) {
      setActiveConversationId(null);
      return;
    }
    const list = dedupeConversations(conversationsQuery.data ?? [], currentUserId ?? "");
    const exists = list.some((item) => item._id === conversationIdParam);
    setActiveConversationId(exists ? conversationIdParam : null);
  }, [conversationIdParam, conversationsQuery.data, currentUserId]);

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
      <div className="h-full w-full md:grid md:grid-cols-[72px_330px_1fr]">
        <AppNavSidebar activeTab="messages" />

        {currentUserId ? (
          <ChatListPanel
            userId={currentUserId}
            userName={userName}
            userAvatar={profile?.avatar || auth.user?.avatar}
            conversations={conversationsQuery.data ?? []}
            isLoading={conversationsQuery.isLoading}
            activeConversationId={activeConversationId}
            onOpenConversation={(id) => {
              setActiveConversationId(id);
              router.replace(`/?conversation=${id}`, { scroll: false });
            }}
            onRefresh={async () => {
              await conversationsQuery.refetch();
            }}
          />
        ) : null}

        <section className="relative h-full min-h-0 bg-white">
          {activeConversationId ? (
            <ChatWindow
              conversationId={activeConversationId}
              onConversationLeft={() => {
                setActiveConversationId(null);
                router.replace("/", { scroll: false });
                void conversationsQuery.refetch();
              }}
              onConversationUpdated={() => {
                void conversationsQuery.refetch();
              }}
            />
          ) : (
            <WelcomeEmptyState />
          )}
        </section>
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
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${profileEditMode
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
                      className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition ${settingsTab === item.key ? "bg-emerald-100 font-semibold text-emerald-900" : "text-slate-600 hover:bg-slate-200"
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
