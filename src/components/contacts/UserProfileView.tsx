"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MessageCircle,
  UserPlus,
  UserMinus,
  Loader2,
} from "lucide-react";
import { IUser } from "@/src/types/user";
import { userService } from "@/src/services/user/user.service";
import { contactsService } from "@/src/services/contacts/contacts.service";
import { useToast } from "@/src/components/providers/toast-provider";
import { AvatarWidget } from "@/src/components/common/AvatarWidget";

interface UserProfileViewProps {
  userId: string;
  currentUserId: string;
  onBack?: () => void;
  chatReturnPath?: (conversationId: string) => string;
}

/** Nút Nhắn tin — giống mobile `_ActionButton` filled */
function ProfileActionButton({
  icon,
  label,
  onClick,
  disabled,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-[var(--qc-primary-light)] text-sm font-semibold text-[var(--qc-primary)] transition hover:brightness-[0.98] disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : icon}
      {label}
    </button>
  );
}

/** Nút icon vuông — giống mobile `_IconActionButton` */
function ProfileIconButton({
  icon,
  onClick,
  disabled,
  "aria-label": ariaLabel,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] border border-[var(--qc-divider)] bg-white text-[var(--qc-text-secondary)] transition hover:bg-[var(--qc-bg)] disabled:opacity-50"
    >
      {icon}
    </button>
  );
}

export function UserProfileView({
  userId,
  currentUserId,
  onBack,
  chatReturnPath,
}: UserProfileViewProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [user, setUser] = useState<IUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [friendshipStatus, setFriendshipStatus] = useState<string | null>(null);
  const [loadingRelation, setLoadingRelation] = useState(true);
  const [openingChat, setOpeningChat] = useState(false);
  const [unfriending, setUnfriending] = useState(false);
  const [coverError, setCoverError] = useState(false);

  const isSelf = userId === currentUserId;
  const isFriend = friendshipStatus === "ACCEPTED";

  const loadUser = useCallback(async () => {
    setLoadingUser(true);
    setCoverError(false);
    try {
      const data = await userService.getProfile(userId);
      setUser(data);
    } catch {
      setUser(null);
      showToast("Không tìm thấy thông tin người dùng", "error");
    } finally {
      setLoadingUser(false);
    }
  }, [userId, showToast]);

  const loadRelation = useCallback(async () => {
    if (!currentUserId || isSelf) {
      setLoadingRelation(false);
      return;
    }
    setLoadingRelation(true);
    const rel = await contactsService.getFriendshipBetween(currentUserId, userId);
    setFriendshipId(rel?.id ?? null);
    setFriendshipStatus(rel?.status ?? null);
    setLoadingRelation(false);
  }, [currentUserId, userId, isSelf]);

  useEffect(() => {
    void loadUser();
    void loadRelation();
  }, [loadUser, loadRelation]);

  const handleBack = () => {
    if (onBack) onBack();
    else router.back();
  };

  const handleOpenChat = async () => {
    if (!currentUserId || openingChat) return;
    setOpeningChat(true);
    try {
      const conv = await contactsService.findOrCreateDirectConversation(currentUserId, userId);
      if (conv?._id) {
        const path = chatReturnPath ? chatReturnPath(conv._id) : `/?conversation=${conv._id}`;
        router.push(path);
      } else {
        showToast("Không thể mở cuộc trò chuyện", "error");
      }
    } catch {
      showToast("Không thể mở cuộc trò chuyện", "error");
    } finally {
      setOpeningChat(false);
    }
  };

  const handleUnfriend = async () => {
    if (!friendshipId) return;
    const name = user?.fullName?.trim() || "người này";
    if (!window.confirm(`Bạn có chắc muốn hủy kết bạn với ${name}?`)) return;
    setUnfriending(true);
    try {
      await contactsService.rejectFriendRequest(friendshipId);
      setFriendshipId(null);
      setFriendshipStatus(null);
      showToast("Đã hủy kết bạn");
    } catch {
      showToast("Hủy kết bạn thất bại", "error");
    } finally {
      setUnfriending(false);
    }
  };

  const handleAddFriend = () => {
    router.push(`/contacts/user/${userId}/friend-request`);
  };

  if (loadingUser) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--qc-bg)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--qc-primary)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-[var(--qc-bg)] px-6 text-center">
        <p className="text-sm text-[var(--qc-text-secondary)]">Không tải được trang cá nhân</p>
        <button
          type="button"
          onClick={handleBack}
          className="text-sm font-semibold text-[var(--qc-primary)] hover:underline"
        >
          Quay lại
        </button>
      </div>
    );
  }

  const displayName = user.fullName?.trim() || "Người dùng";
  /** Mobile dùng avatar làm ảnh cover, không dùng coverImage riêng */
  const coverUrl = user.avatar?.trim();
  const showCoverImage = Boolean(coverUrl) && !coverError;

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[var(--qc-bg)]">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* Cover 260px — giống mobile FoundUserScreen */}
        <div className="relative h-[260px] w-full">
          {showCoverImage ? (
            <Image
              src={coverUrl!}
              alt=""
              fill
              className="object-cover"
              unoptimized
              onError={() => setCoverError(true)}
            />
          ) : (
            <div
              className="h-full w-full"
              style={{
                background: "linear-gradient(135deg, #388E3C 0%, #66BB6A 100%)",
              }}
            />
          )}

          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-1 pt-[env(safe-area-inset-top,0px)]">
            <button
              type="button"
              onClick={handleBack}
              className="rounded-full p-2.5 text-white hover:bg-black/10"
              aria-label="Quay lại"
            >
              <ArrowLeft className="h-6 w-6" strokeWidth={2} />
            </button>
            {isFriend && !isSelf ? (
              <button
                type="button"
                onClick={() => void handleUnfriend()}
                disabled={unfriending}
                className="rounded-full p-2.5 text-white hover:bg-black/10 disabled:opacity-50"
                aria-label="Hủy kết bạn"
              >
                <UserMinus className="h-6 w-6" strokeWidth={2} />
              </button>
            ) : (
              <span className="w-11" />
            )}
          </div>
        </div>

        {/* Card trắng bắt đầu tại y=180 (chồng 80px lên bìa) — giống SizedBox(180) + Container mobile */}
        <div className="-mt-20 rounded-t-[20px] bg-white pb-10">
          <div className="flex flex-col items-center px-6 pt-[50px]">
            <h1 className="w-full text-center text-lg font-bold leading-snug text-[var(--qc-text-primary)]">
              {displayName}
            </h1>

            <div className="mt-3 min-h-[40px] w-full max-w-sm">
              {!isSelf && !loadingRelation ? (
                <p className="text-center text-[13px] leading-[1.5] text-[var(--qc-text-secondary)]">
                  {isFriend
                    ? "Chưa có hoạt động nào gần đây"
                    : `Bạn chưa thể xem nhật ký của ${displayName} khi chưa là bạn bè`}
                </p>
              ) : loadingRelation && !isSelf ? (
                <div className="flex justify-center py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-[var(--qc-primary)]" />
                </div>
              ) : null}
            </div>

            {!isSelf ? (
              <div className="mt-5 flex w-full max-w-sm items-center gap-3">
                <ProfileActionButton
                  icon={<MessageCircle className="h-[18px] w-[18px]" strokeWidth={2} />}
                  label="Nhắn tin"
                  onClick={() => void handleOpenChat()}
                  loading={openingChat}
                />
                {loadingRelation ? (
                  <div className="flex h-11 w-11 items-center justify-center">
                    <Loader2 className="h-[18px] w-[18px] animate-spin text-[var(--qc-primary)]" />
                  </div>
                ) : !isFriend ? (
                  <ProfileIconButton
                    icon={<UserPlus className="h-[22px] w-[22px]" strokeWidth={1.75} />}
                    onClick={handleAddFriend}
                    aria-label="Kết bạn"
                  />
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 h-px w-full bg-[var(--qc-divider)]" />
          </div>
        </div>
      </div>

      {/* Avatar chồng ranh giới bìa/card — top: 180px như mobile, không translate (tránh bị clip) */}
      <div
        className="pointer-events-none absolute left-0 right-0 z-20 flex justify-center"
        style={{ top: 180 }}
      >
        <div
          className="pointer-events-auto overflow-hidden rounded-full border-[3px] border-white bg-[#E5E7EB] shadow-sm"
          style={{ width: 88, height: 88 }}
        >
          <AvatarWidget url={user.avatar} name={displayName} size={88} />
        </div>
      </div>
    </div>
  );
}
