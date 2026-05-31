"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Camera,
  ChevronRight,
  HardDrive,
  Image as ImageIcon,
  Info,
  Pencil,
  Link2,
  LogOut,
  Pin,
  Search,
  Trash2,
  User,
  UserPlus,
  Users,
  Wallpaper,
  Copy,
  RefreshCw,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { IConversation } from "@/src/types/conversation";
import { IMessage } from "@/src/types/message";
import { conversationsApi } from "@/src/services/api/conversations";
import {
  conversationGroupApi,
  isGroupAdmin,
} from "@/src/services/api/conversation-group";
import { contactsService } from "@/src/services/contacts/contacts.service";
import { AddMembersModal } from "@/src/components/chat/AddMembersModal";
import { ConversationMediaGallery } from "@/src/components/chat/ConversationMediaGallery";
import { GroupMembersPanel } from "@/src/components/chat/GroupMembersPanel";
import { indexMessagesForGallery } from "@/src/lib/chat-media";
import { ChatTheme } from "@/src/hooks/useChatTheme";
import { WallpaperPickerPanel } from "@/src/components/chat/WallpaperPickerPanel";
import { MuteDurationSheet } from "@/src/components/chat/MuteDurationSheet";
import {
  computeMuteUntil,
  muteActionLabel,
  muteToastForOption,
  persistMute,
  readMuteState,
  clearMute,
  MuteDurationOption,
} from "@/src/lib/conversation-mute";
import { useToast } from "@/src/components/providers/toast-provider";
import { AvatarWidget } from "@/src/components/common/AvatarWidget";
import {
  getConversationAvatarUrl,
  getConversationDisplayName,
  getOtherParticipant,
} from "@/src/lib/conversation-display";
import { profileCacheForUser, usePeerProfile } from "@/src/hooks/usePeerProfile";
import { AddToGroupModal } from "@/src/components/chat/AddToGroupModal";
import { ConversationStoragePanel } from "@/src/components/chat/ConversationStoragePanel";
import { GroupDescriptionDialog } from "@/src/components/chat/GroupDescriptionDialog";
import { PinnedMessagesPanel } from "@/src/components/chat/PinnedMessagesPanel";

interface ChatOptionsPanelProps {
  open: boolean;
  onClose: () => void;
  conversation: IConversation;
  currentUserId: string;
  peerName: string;
  peerId?: string;
  privateTheme: ChatTheme;
  onPrivateThemeChange: (theme: ChatTheme) => void;
  selectedGroupBgIndex: number;
  onSelectGroupPreset: (index: number, applyForAll: boolean) => void | Promise<void>;
  onSelectGroupCustom: (base64: string, applyForAll: boolean) => void | Promise<void>;
  onSearchMessages: () => void;
  onOpenPinnedMessage?: (messageId: string) => void;
  onUnpinMessage?: (messageId: string) => void;
  onHistoryDeleted?: () => void;
  onConversationUpdated?: () => void;
  onLeftGroup?: () => void;
  onMemberKicked?: () => void;
  currentUserDisplayName?: string;
  openWallpaperSection?: boolean;
}

function SectionGap() {
  return <div className="h-2 shrink-0" />;
}

function OptionsSection({ children }: { children: React.ReactNode }) {
  return <div className="bg-[var(--qc-card)]">{children}</div>;
}

function SectionDivider() {
  return (
    <div className="pl-[62px]">
      <div className="h-px bg-[var(--qc-divider)]" />
    </div>
  );
}

function OptionsNavRow({
  icon,
  label,
  onClick,
  href,
  trailing,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
  trailing?: React.ReactNode;
  danger?: boolean;
}) {
  const textClass = danger ? "text-[#e41e3f]" : "text-[var(--qc-text-primary)]";
  const className =
    "flex w-full items-center gap-3.5 px-4 py-3.5 text-left transition hover:bg-[var(--qc-bg)]/60";

  const inner = (
    <>
      <span className={`shrink-0 ${danger ? "text-[#e41e3f]" : "text-[var(--qc-text-secondary)]"}`}>
        {icon}
      </span>
      <span className={`flex-1 text-sm font-medium ${textClass}`}>{label}</span>
      {trailing}
      {!trailing && !danger ? (
        <ChevronRight className="h-5 w-5 shrink-0 text-[var(--qc-text-secondary)]/70" strokeWidth={1.5} />
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} onClick={onClick}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {inner}
    </button>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-[68px] max-w-[80px] flex-col items-center gap-1.5 px-1"
    >
      <span className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-[var(--qc-bg)] text-[var(--qc-text-secondary)]">
        {icon}
      </span>
      <span className="whitespace-pre-line text-center text-[11px] leading-[1.3] text-[var(--qc-text-secondary)]">
        {label}
      </span>
    </button>
  );
}

function SubPanelShell({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[var(--qc-bg)]">
      <div className="flex shrink-0 items-center gap-1 bg-[var(--qc-primary)] px-1 py-2 text-white">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full p-2 hover:bg-white/10"
          aria-label="Quay lại"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h3 className="flex-1 text-[17px] font-bold">{title}</h3>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}

export function ChatOptionsPanel({
  open,
  onClose,
  conversation,
  currentUserId,
  peerName,
  peerId,
  privateTheme,
  onPrivateThemeChange,
  selectedGroupBgIndex,
  onSelectGroupPreset,
  onSelectGroupCustom,
  onSearchMessages,
  onOpenPinnedMessage,
  onUnpinMessage,
  onHistoryDeleted,
  onConversationUpdated,
  onLeftGroup,
  onMemberKicked,
  currentUserDisplayName = "Bạn",
  openWallpaperSection = false,
}: ChatOptionsPanelProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const isGroup = conversation.type === "GROUP";
  const otherParticipant = getOtherParticipant(conversation, currentUserId);
  const peerUserId = !isGroup ? peerId ?? otherParticipant?.userId : undefined;
  const { data: peerUser } = usePeerProfile(peerUserId, open && !isGroup);
  const peerProfiles = profileCacheForUser(peerUserId, peerUser);

  const memberCount = conversation.participants.length;
  const displayPeer =
    peerProfiles?.[peerUserId ?? ""]?.fullName?.trim() ||
    peerName.trim() ||
    otherParticipant?.fullName?.trim() ||
    "bạn";

  const me = conversation.participants.find((p) => p.userId === currentUserId);
  const [isPinned, setIsPinned] = useState(Boolean(me?.isPinned));
  const [isMuted, setIsMuted] = useState(false);
  const [showMuteSheet, setShowMuteSheet] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<IMessage[]>(conversation.pinnedMessages ?? []);
  const [mediaPreview, setMediaPreview] = useState<IMessage[]>([]);
  const [showWallpaper, setShowWallpaper] = useState(false);
  const [showPinnedList, setShowPinnedList] = useState(false);
  const [showMediaList, setShowMediaList] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDissolve, setConfirmDissolve] = useState(false);
  const [dissolving, setDissolving] = useState(false);
  const [showInviteLink, setShowInviteLink] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [inviteEnabled, setInviteEnabled] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteToggling, setInviteToggling] = useState(false);
  const [showStorage, setShowStorage] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showDescDialog, setShowDescDialog] = useState(false);
  const [savingDesc, setSavingDesc] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showAddToGroup, setShowAddToGroup] = useState(false);
  const [addMembersLoading, setAddMembersLoading] = useState(false);
  const [localDescription, setLocalDescription] = useState(conversation.description ?? "");
  const [groupConversation, setGroupConversation] = useState(conversation);

  const isAdmin = isGroupAdmin(groupConversation.participants, currentUserId);

  const title = getConversationDisplayName(groupConversation, currentUserId, peerProfiles);
  const headerAvatar = getConversationAvatarUrl(groupConversation, currentUserId, peerProfiles);
  const canEditGroupHeader = isGroup && isAdmin;

  const friendsQuery = useQuery({
    queryKey: ["friends", currentUserId],
    queryFn: () => contactsService.getFriends(currentUserId),
    enabled: open && showAddMembers,
  });

  useEffect(() => {
    setGroupConversation(conversation);
    setLocalDescription(conversation.description ?? "");
  }, [conversation]);

  useEffect(() => {
    if (!open) return;
    if (openWallpaperSection) setShowWallpaper(true);
    setIsPinned(Boolean(me?.isPinned));
    setIsMuted(readMuteState(conversation._id).isMuted);

    void conversationsApi.getPinnedMessages(conversation._id, currentUserId).then(setPinnedMessages).catch(() => {
      setPinnedMessages(conversation.pinnedMessages ?? []);
    });

    void conversationsApi
      .getMessages(conversation._id, currentUserId, { limit: 80, skip: 0 })
      .then((page) => {
        const { media } = indexMessagesForGallery(page.messages);
        setMediaPreview(media.slice(-3).reverse());
      })
      .catch(() => setMediaPreview([]));
  }, [open, openWallpaperSection, conversation._id, conversation.pinnedMessages, currentUserId, me?.isPinned]);

  const togglePin = useCallback(
    async (value: boolean) => {
      setIsPinned(value);
      try {
        await conversationsApi.setConversationPinned(conversation._id, currentUserId, value);
        showToast(value ? "Đã ghim trò chuyện" : "Đã bỏ ghim trò chuyện");
      } catch {
        setIsPinned(!value);
        showToast("Không thể ghim trò chuyện", "error");
      }
    },
    [conversation._id, currentUserId, showToast]
  );

  const handleMuteTap = useCallback(() => {
    if (isMuted) {
      clearMute(conversation._id);
      setIsMuted(false);
      showToast(isGroup ? "Đã bật thông báo cho nhóm này" : "Đã bật thông báo");
      return;
    }
    setShowMuteSheet(true);
  }, [conversation._id, isGroup, isMuted, showToast]);

  const handleMuteDuration = useCallback(
    (option: MuteDurationOption) => {
      const until = computeMuteUntil(option);
      persistMute(conversation._id, true, until);
      setIsMuted(true);
      showToast(muteToastForOption(option));
    },
    [conversation._id, showToast]
  );

  const handleDeleteHistory = useCallback(async () => {
    setConfirmDelete(false);
    try {
      await conversationsApi.deleteConversationHistoryForMe(conversation._id, currentUserId);
      showToast("Đã xóa lịch sử trò chuyện");
      onHistoryDeleted?.();
      onClose();
    } catch {
      showToast("Xóa lịch sử thất bại", "error");
    }
  }, [conversation._id, currentUserId, onClose, onHistoryDeleted, showToast]);

  const handleLeaveGroup = useCallback(async () => {
    setConfirmLeave(false);
    try {
      await conversationGroupApi.leaveGroup(
        groupConversation._id,
        currentUserId,
        groupConversation.participants
      );
      showToast("Đã rời nhóm");
      onClose();
      onLeftGroup?.();
    } catch {
      showToast("Rời nhóm thất bại", "error");
    }
  }, [groupConversation, currentUserId, onClose, onLeftGroup, showToast]);

  const openInviteLinkPanel = useCallback(async () => {
    setShowInviteLink(true);
    setInviteLoading(true);
    try {
      const data = await conversationGroupApi.getInviteLink(groupConversation._id);
      setInviteLink(data.link ?? "");
      setInviteEnabled(data.enabled !== false);
    } catch {
      showToast("Không lấy được link mời", "error");
      setShowInviteLink(false);
    } finally {
      setInviteLoading(false);
    }
  }, [groupConversation._id, showToast]);

  const handleInviteToggle = useCallback(
    async (enabled: boolean) => {
      if (!isAdmin) return;
      setInviteEnabled(enabled);
      setInviteToggling(true);
      try {
        await conversationGroupApi.setInviteLinkEnabled(groupConversation._id, enabled);
        showToast(enabled ? "Đã bật link mời" : "Đã tắt link mời");
      } catch {
        setInviteEnabled(!enabled);
        showToast("Không cập nhật được", "error");
      } finally {
        setInviteToggling(false);
      }
    },
    [groupConversation._id, isAdmin, showToast]
  );

  const handleRegenerateInvite = useCallback(async () => {
    setInviteLoading(true);
    try {
      const data = await conversationGroupApi.regenerateInviteLink(groupConversation._id);
      setInviteLink(data.link ?? "");
      setInviteEnabled(data.enabled !== false);
      showToast("Đã tạo link mời mới");
    } catch {
      showToast("Không tạo được link mới", "error");
    } finally {
      setInviteLoading(false);
    }
  }, [groupConversation._id, showToast]);

  const openRenameDialog = useCallback(() => {
    if (!canEditGroupHeader) return;
    setRenameValue(groupConversation.name?.trim() || "");
    setShowRename(true);
  }, [canEditGroupHeader, groupConversation.name]);

  const handleSaveGroupName = useCallback(async () => {
    const name = renameValue.trim();
    if (!name) {
      showToast("Tên nhóm không được để trống", "error");
      return;
    }
    setRenaming(true);
    try {
      const updated = await conversationGroupApi.updateName(groupConversation._id, name);
      setGroupConversation(updated);
      setShowRename(false);
      showToast("Đã đổi tên nhóm");
      onConversationUpdated?.();
    } catch {
      showToast("Đổi tên nhóm thất bại", "error");
    } finally {
      setRenaming(false);
    }
  }, [groupConversation._id, renameValue, onConversationUpdated, showToast]);

  const handleAvatarFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !canEditGroupHeader) return;
      if (!file.type.startsWith("image/")) {
        showToast("Vui lòng chọn file ảnh", "error");
        return;
      }
      setUploadingAvatar(true);
      try {
        const url = await contactsService.uploadGroupAvatar(file);
        const updated = await conversationGroupApi.updateAvatar(groupConversation._id, url);
        setGroupConversation(updated);
        showToast("Đã cập nhật ảnh nhóm");
        onConversationUpdated?.();
      } catch {
        showToast("Không cập nhật được ảnh nhóm", "error");
      } finally {
        setUploadingAvatar(false);
      }
    },
    [canEditGroupHeader, groupConversation._id, onConversationUpdated, showToast]
  );

  const handleCopyInvite = useCallback(async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      showToast("Đã sao chép link");
    } catch {
      showToast("Không sao chép được", "error");
    }
  }, [inviteLink, showToast]);

  const openDescriptionDialog = useCallback(() => {
    setShowDescDialog(true);
  }, []);

  const handleSaveDescription = useCallback(
    async (next: string) => {
      if (!isAdmin) return;
      setSavingDesc(true);
      try {
        const updated = await conversationGroupApi.updateDescription(groupConversation._id, next);
        setGroupConversation(updated);
        setLocalDescription(updated.description ?? "");
        setShowDescDialog(false);
        showToast("Đã cập nhật mô tả");
        onConversationUpdated?.();
      } catch {
        showToast("Cập nhật mô tả thất bại", "error");
      } finally {
        setSavingDesc(false);
      }
    },
    [isAdmin, groupConversation._id, onConversationUpdated, showToast]
  );

  const refreshPinned = useCallback(async () => {
    try {
      const list = await conversationsApi.getPinnedMessages(groupConversation._id, currentUserId);
      setPinnedMessages(list);
      onConversationUpdated?.();
    } catch {
      setPinnedMessages(groupConversation.pinnedMessages ?? []);
    }
  }, [groupConversation._id, groupConversation.pinnedMessages, currentUserId, onConversationUpdated]);

  const handleDissolveGroup = useCallback(async () => {
    setConfirmDissolve(false);
    setDissolving(true);
    try {
      await conversationGroupApi.dissolveGroup(groupConversation._id);
      showToast("Đã giải tán nhóm");
      onClose();
      onLeftGroup?.();
    } catch {
      showToast("Giải tán nhóm thất bại", "error");
    } finally {
      setDissolving(false);
    }
  }, [groupConversation._id, onClose, onLeftGroup, showToast]);

  const handleAddMembers = useCallback(
    async (userIds: string[]) => {
      setAddMembersLoading(true);
      try {
        const updated = await conversationGroupApi.addMembers(
          groupConversation._id,
          groupConversation.participants,
          userIds
        );
        setGroupConversation(updated);
        setShowAddMembers(false);
        showToast(`Đã thêm ${userIds.length} thành viên`);
        onConversationUpdated?.();
      } catch {
        showToast("Thêm thành viên thất bại", "error");
      } finally {
        setAddMembersLoading(false);
      }
    },
    [groupConversation, onConversationUpdated, showToast]
  );

  if (!open) return null;

  const descEmpty = !localDescription.trim();
  const descPreview = descEmpty ? "Chưa có mô tả nhóm" : localDescription.trim();
  const descTitle = descEmpty && isAdmin ? "Thêm mô tả nhóm" : "Mô tả nhóm";

  const muteLabel = muteActionLabel(isMuted);

  return (
    <>
      <div className="absolute inset-0 z-30 bg-black/25" aria-hidden onClick={onClose} />

      <aside
        className="absolute inset-y-0 right-0 z-40 flex w-full max-w-[420px] flex-col bg-[var(--qc-bg)] shadow-xl"
        role="dialog"
        aria-label="Tùy chọn trò chuyện"
      >
        {/* AppBar — giống mobile ChatOptionsScreen */}
        <div className="flex shrink-0 items-center gap-1 bg-[var(--qc-primary)] px-1 py-2 text-white">
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-white/10" aria-label="Đóng">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="flex-1 text-[17px] font-bold">Tùy chọn</h2>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Header avatar + tên */}
          <div className="flex flex-col items-center bg-[var(--qc-card)] py-5">
            {isGroup ? (
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleAvatarFile(e)}
              />
            ) : null}
            <button
              type="button"
              className={`relative rounded-full ${canEditGroupHeader ? "cursor-pointer" : "cursor-default"}`}
              disabled={uploadingAvatar}
              onClick={() => {
                if (canEditGroupHeader) avatarInputRef.current?.click();
                else if (isGroup) showToast("Chỉ quản trị viên mới đổi được ảnh nhóm", "error");
              }}
              aria-label={canEditGroupHeader ? "Đổi ảnh nhóm" : undefined}
            >
              <AvatarWidget url={headerAvatar} name={title} size={80} />
              {canEditGroupHeader ? (
                <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[var(--qc-card)] bg-[var(--qc-bg)] text-[var(--qc-text-secondary)]">
                  <Camera className="h-3.5 w-3.5" />
                </span>
              ) : null}
            </button>
            {uploadingAvatar ? (
              <p className="mt-1 text-xs text-[var(--qc-text-secondary)]">Đang tải ảnh...</p>
            ) : null}
            {canEditGroupHeader ? (
              <button
                type="button"
                onClick={openRenameDialog}
                className="mt-2.5 flex max-w-[90%] items-center gap-1 truncate text-center text-lg font-bold text-[var(--qc-text-primary)] hover:opacity-80"
              >
                <span className="truncate">{title}</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--qc-text-secondary)]" strokeWidth={2} />
              </button>
            ) : (
              <p className="mt-2.5 max-w-[90%] truncate text-center text-lg font-bold text-[var(--qc-text-primary)]">
                {title}
              </p>
            )}
            {isGroup ? (
              <p className="mt-0.5 text-sm text-[var(--qc-text-secondary)]">{memberCount} thành viên</p>
            ) : null}
          </div>

          <SectionGap />

          {/* 4 nút hành động */}
          <div className="bg-[var(--qc-card)] px-2 py-3.5">
            <div className="flex justify-evenly">
              <ActionButton
                icon={<Search className="h-6 w-6" strokeWidth={1.75} />}
                label={"Tìm\ntin nhắn"}
                onClick={() => {
                  onClose();
                  onSearchMessages();
                }}
              />
              <ActionButton
                icon={
                  isGroup ? (
                    <UserPlus className="h-6 w-6" strokeWidth={1.75} />
                  ) : (
                    <User className="h-6 w-6" strokeWidth={1.75} />
                  )
                }
                label={isGroup ? "Thêm\nthành viên" : "Trang\ncá nhân"}
                onClick={() => {
                  if (isGroup) {
                    setShowAddMembers(true);
                  } else if (peerUserId) {
                    onClose();
                    router.push(`/contacts/user/${peerUserId}`);
                  } else {
                    showToast("Không xác định được người dùng", "error");
                  }
                }}
              />
              <ActionButton
                icon={<Wallpaper className="h-6 w-6" strokeWidth={1.75} />}
                label={"Đổi\nhình nền"}
                onClick={() => setShowWallpaper(true)}
              />
              <ActionButton
                icon={
                  isMuted ? (
                    <BellOff className="h-6 w-6" strokeWidth={1.75} />
                  ) : (
                    <Bell className="h-6 w-6" strokeWidth={1.75} />
                  )
                }
                label={muteLabel}
                onClick={handleMuteTap}
              />
            </div>
          </div>

          <SectionGap />

          {/* Section 1: Mô tả (nhóm) / Media / Ghim */}
          <OptionsSection>
            {isGroup ? (
              <>
                <button
                  type="button"
                  className="flex w-full items-start gap-3.5 px-4 py-3.5 text-left hover:bg-[var(--qc-bg)]/60"
                  onClick={openDescriptionDialog}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--qc-primary-light)]">
                    <Info className="h-[18px] w-[18px] text-[var(--qc-primary)]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-[var(--qc-text-secondary)]">{descTitle}</span>
                    <span
                      className={`mt-1 line-clamp-2 block text-xs ${
                        descEmpty ? "text-[var(--qc-text-secondary)]/80" : "text-[var(--qc-primary)]"
                      }`}
                    >
                      {descPreview}
                    </span>
                  </span>
                  {isAdmin ? (
                    <Pencil className="h-[18px] w-[18px] shrink-0 text-[var(--qc-text-secondary)]/70" />
                  ) : null}
                </button>
                <SectionDivider />
              </>
            ) : null}

            <button
              type="button"
              className="w-full px-4 py-3 text-left hover:bg-[var(--qc-bg)]/60"
              onClick={() => setShowMediaList(true)}
            >
              <div className="flex items-center gap-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#fff3e0]">
                  <ImageIcon className="h-[18px] w-[18px] text-[#ff9800]" />
                </span>
                <span className="flex-1 text-sm font-semibold text-[var(--qc-text-primary)]">Ảnh, file, link</span>
                <ChevronRight className="h-5 w-5 text-[var(--qc-text-secondary)]/70" strokeWidth={1.5} />
              </div>
              {mediaPreview.length > 0 ? (
                <div className="mt-2.5 flex items-center gap-1.5 pl-[46px]">
                  {mediaPreview.map((m) => (
                    <div
                      key={m._id}
                      className="h-[60px] w-[60px] shrink-0 overflow-hidden rounded-lg bg-[var(--qc-bg)]"
                    >
                      {m.type === "IMAGE" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.content} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-[var(--qc-text-secondary)]" />
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex h-[60px] min-w-0 flex-1 items-center justify-center rounded-lg bg-[var(--qc-bg)]">
                    <ChevronRight className="h-5 w-5 text-[var(--qc-primary)]" strokeWidth={2} />
                  </div>
                </div>
              ) : null}
            </button>

            <SectionDivider />

            <OptionsNavRow
              icon={<Pin className="h-[22px] w-[22px]" strokeWidth={1.75} />}
              label="Tin nhắn đã ghim"
              trailing={
                pinnedMessages.length > 0 ? (
                  <span className="text-xs text-[var(--qc-text-secondary)]">{pinnedMessages.length}</span>
                ) : undefined
              }
              onClick={() => setShowPinnedList(true)}
            />
          </OptionsSection>

          <SectionGap />

          {/* Section 2: Nhóm / 1-1 + Ghim CV */}
          <OptionsSection>
            {isGroup ? (
              <>
                <OptionsNavRow
                  icon={<Users className="h-[22px] w-[22px]" strokeWidth={1.75} />}
                  label="Xem thành viên"
                  trailing={<span className="text-[13px] text-[var(--qc-text-secondary)]/70">({memberCount})</span>}
                  onClick={() => setShowMembers(true)}
                />
                <SectionDivider />
                <OptionsNavRow
                  icon={<Link2 className="h-[22px] w-[22px]" strokeWidth={1.75} />}
                  label="Link nhóm"
                  onClick={() => void openInviteLinkPanel()}
                />
                <SectionDivider />
              </>
            ) : (
              <>
                <OptionsNavRow
                  icon={<Users className="h-[22px] w-[22px]" strokeWidth={1.75} />}
                  label={`Tạo nhóm với ${displayPeer}`}
                  href={peerUserId ? `/groups/create?prefill=${peerUserId}` : "/groups/create"}
                  onClick={onClose}
                />
                <SectionDivider />
                <OptionsNavRow
                  icon={<UserPlus className="h-[22px] w-[22px]" strokeWidth={1.75} />}
                  label={`Thêm ${displayPeer} vào nhóm`}
                  onClick={() => {
                    if (!peerUserId) {
                      showToast("Không xác định được người dùng", "error");
                      return;
                    }
                    setShowAddToGroup(true);
                  }}
                />
                <SectionDivider />
              </>
            )}

            <div className="flex items-center gap-3.5 px-4 py-2.5">
              <Pin className="h-[22px] w-[22px] shrink-0 text-[var(--qc-text-secondary)]" strokeWidth={1.75} />
              <span className="flex-1 text-sm font-medium text-[var(--qc-text-primary)]">Ghim trò chuyện</span>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={isPinned}
                  onChange={(e) => void togglePin(e.target.checked)}
                  aria-label="Ghim trò chuyện"
                />
                <span className="h-6 w-11 rounded-full bg-[var(--qc-divider)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[var(--qc-primary)] peer-checked:after:translate-x-5" />
              </label>
            </div>
          </OptionsSection>

          <SectionGap />

          {/* Section 3: Dung lượng */}
          <OptionsSection>
            <OptionsNavRow
              icon={<HardDrive className="h-[22px] w-[22px]" strokeWidth={1.75} />}
              label="Dung lượng trò chuyện"
              onClick={() => setShowStorage(true)}
            />
          </OptionsSection>

          <SectionGap />

          {/* Section 4: Xóa / Rời nhóm */}
          <OptionsSection>
            <OptionsNavRow
              icon={<Trash2 className="h-[22px] w-[22px]" strokeWidth={1.75} />}
              label="Xóa lịch sử trò chuyện"
              danger
              onClick={() => setConfirmDelete(true)}
            />
            {isGroup ? (
              <>
                <SectionDivider />
                <OptionsNavRow
                  icon={<LogOut className="h-[22px] w-[22px]" strokeWidth={1.75} />}
                  label="Rời nhóm"
                  danger
                  onClick={() => setConfirmLeave(true)}
                />
                {isAdmin ? (
                  <>
                    <SectionDivider />
                    <OptionsNavRow
                      icon={<Trash2 className="h-[22px] w-[22px]" strokeWidth={1.75} />}
                      label="Giải tán nhóm"
                      danger
                      onClick={() => setConfirmDissolve(true)}
                    />
                  </>
                ) : null}
              </>
            ) : null}
          </OptionsSection>

          <div className="h-6" />
        </div>

        {showWallpaper ? (
          <WallpaperPickerPanel
            isGroup={isGroup}
            isAdmin={isAdmin}
            privateTheme={privateTheme}
            selectedGroupIndex={selectedGroupBgIndex}
            onBack={() => setShowWallpaper(false)}
            onSelectPrivate={(t) => {
              onPrivateThemeChange(t);
              showToast("Đã đổi hình nền");
            }}
            onSelectGroupPreset={onSelectGroupPreset}
            onSelectGroupCustom={onSelectGroupCustom}
          />
        ) : null}

        <MuteDurationSheet
          open={showMuteSheet}
          onClose={() => setShowMuteSheet(false)}
          onSelect={handleMuteDuration}
        />

        {showPinnedList && isGroup ? (
          <PinnedMessagesPanel
            conversationId={groupConversation._id}
            userId={currentUserId}
            participants={groupConversation.participants}
            chatAvatar={groupConversation.avatar}
            initialMessages={pinnedMessages}
            onBack={() => setShowPinnedList(false)}
            onOpenMessage={(messageId) => {
              onOpenPinnedMessage?.(messageId);
              setShowPinnedList(false);
              onClose();
            }}
            onUnpin={(messageId) => {
              onUnpinMessage?.(messageId);
              void refreshPinned();
            }}
          />
        ) : showPinnedList ? (
          <SubPanelShell title="Tin nhắn đã ghim" onBack={() => setShowPinnedList(false)}>
            {pinnedMessages.length === 0 ? (
              <p className="p-8 text-center text-sm text-[var(--qc-text-secondary)]">Chưa có tin nhắn ghim</p>
            ) : (
              pinnedMessages.map((m) => (
                <button
                  key={m._id}
                  type="button"
                  className="block w-full border-b border-[var(--qc-divider)] px-4 py-3.5 text-left hover:bg-[var(--qc-card)]"
                  onClick={() => {
                    onOpenPinnedMessage?.(m._id);
                    setShowPinnedList(false);
                    onClose();
                  }}
                >
                  <p className="truncate text-sm text-[var(--qc-text-primary)]">{m.content || `[${m.type}]`}</p>
                  <p className="mt-1 text-xs text-[var(--qc-text-secondary)]">
                    {new Date(m.createdAt).toLocaleString("vi-VN")}
                  </p>
                </button>
              ))
            )}
          </SubPanelShell>
        ) : null}

        {showMediaList ? (
          <ConversationMediaGallery
            conversationId={conversation._id}
            userId={currentUserId}
            title="Ảnh, file, link"
            onBack={() => setShowMediaList(false)}
          />
        ) : null}

        {showMembers ? (
          <GroupMembersPanel
            conversation={groupConversation}
            currentUserId={currentUserId}
            currentUserDisplayName={currentUserDisplayName}
            onBack={() => setShowMembers(false)}
            onUpdated={(updated) => {
              setGroupConversation(updated);
              onConversationUpdated?.();
            }}
            onMemberKicked={onMemberKicked}
            onAddMembers={
              isAdmin
                ? () => {
                    setShowMembers(false);
                    setShowAddMembers(true);
                  }
                : undefined
            }
          />
        ) : null}

        <GroupDescriptionDialog
          open={showDescDialog && isGroup}
          editable={isAdmin}
          initialDescription={localDescription}
          saving={savingDesc}
          onClose={() => setShowDescDialog(false)}
          onSave={isAdmin ? handleSaveDescription : undefined}
          onReadOnlyInteract={
            !isAdmin
              ? () => showToast("Chỉ QTV mới sửa", "error")
              : undefined
          }
        />

        {showStorage ? (
          <ConversationStoragePanel
            conversationId={conversation._id}
            userId={currentUserId}
            onBack={() => setShowStorage(false)}
          />
        ) : null}

        {showInviteLink ? (
          <SubPanelShell title="Link nhóm" onBack={() => setShowInviteLink(false)}>
            <div className="p-4">
              {inviteLoading ? (
                <p className="text-center text-sm text-[var(--qc-text-secondary)]">Đang tải...</p>
              ) : (
                <>
                  {isAdmin ? (
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-[13px] text-[var(--qc-text-secondary)]">
                        Cho phép mời bằng link
                      </span>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={inviteEnabled}
                          disabled={inviteToggling}
                          onChange={(e) => void handleInviteToggle(e.target.checked)}
                        />
                        <span className="h-6 w-11 rounded-full bg-[var(--qc-divider)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[var(--qc-primary)] peer-checked:after:translate-x-5 peer-disabled:opacity-50" />
                      </label>
                    </div>
                  ) : null}
                  <p className="break-all rounded-lg border border-[var(--qc-divider)] bg-[var(--qc-bg)] p-3 text-sm text-[var(--qc-text-primary)]">
                    {inviteEnabled ? inviteLink || "Chưa có link" : "Link mời đã tắt"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--qc-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--qc-primary)] disabled:opacity-40"
                      onClick={() => void handleCopyInvite()}
                      disabled={!inviteEnabled || !inviteLink || inviteToggling}
                    >
                      <Copy className="h-4 w-4" />
                      Sao chép
                    </button>
                    {isAdmin ? (
                      <button
                        type="button"
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--qc-primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
                        onClick={() => void handleRegenerateInvite()}
                        disabled={inviteLoading || inviteToggling}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Tạo mới
                      </button>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </SubPanelShell>
        ) : null}

        {showRename ? (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[var(--qc-card)] p-5 shadow-xl">
              <h3 className="text-base font-bold text-[var(--qc-text-primary)]">Đổi tên nhóm</h3>
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="Nhập tên nhóm"
                className="mt-3 w-full rounded-lg bg-[var(--qc-bg)] px-3 py-2.5 text-sm text-[var(--qc-text-primary)] outline-none ring-1 ring-[var(--qc-divider)] focus:ring-[var(--qc-primary)]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") void handleSaveGroupName();
                }}
              />
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg px-4 py-2 text-sm text-[var(--qc-text-secondary)] hover:bg-[var(--qc-bg)]"
                  onClick={() => setShowRename(false)}
                  disabled={renaming}
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-[var(--qc-primary)] px-4 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
                  onClick={() => void handleSaveGroupName()}
                  disabled={renaming}
                >
                  {renaming ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {peerUserId ? (
          <AddToGroupModal
            open={showAddToGroup}
            onClose={() => setShowAddToGroup(false)}
            currentUserId={currentUserId}
            targetUserId={peerUserId}
            targetName={displayPeer}
            onSuccess={() => showToast(`Đã thêm ${displayPeer} vào nhóm`)}
          />
        ) : null}

        <AddMembersModal
          open={showAddMembers}
          onClose={() => setShowAddMembers(false)}
          friends={friendsQuery.data ?? []}
          existingMemberIds={groupConversation.participants.map((p) => p.userId)}
          onConfirm={handleAddMembers}
          loading={addMembersLoading}
        />

        {confirmDissolve ? (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[var(--qc-card)] p-5 shadow-xl">
              <h3 className="text-base font-bold text-[var(--qc-text-primary)]">Giải tán nhóm</h3>
              <p className="mt-2 text-sm text-[var(--qc-text-secondary)]">
                Toàn bộ thành viên sẽ mất quyền truy cập nhóm và lịch sử sẽ bị xóa vĩnh viễn. Thao tác không thể hoàn
                tác.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg px-4 py-2 text-sm text-[var(--qc-text-secondary)] hover:bg-[var(--qc-bg)]"
                  onClick={() => setConfirmDissolve(false)}
                  disabled={dissolving}
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-[#e41e3f] px-4 py-2 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
                  onClick={() => void handleDissolveGroup()}
                  disabled={dissolving}
                >
                  {dissolving ? "Đang xử lý..." : "Giải tán"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {confirmLeave ? (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[var(--qc-card)] p-5 shadow-xl">
              <h3 className="text-base font-bold text-[var(--qc-text-primary)]">Rời nhóm</h3>
              <p className="mt-2 text-sm text-[var(--qc-text-secondary)]">
                Bạn sẽ không còn nhận tin nhắn từ nhóm này. Bạn có chắc muốn rời?
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg px-4 py-2 text-sm text-[var(--qc-text-secondary)] hover:bg-[var(--qc-bg)]"
                  onClick={() => setConfirmLeave(false)}
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-[#e41e3f] px-4 py-2 text-sm font-semibold text-white hover:brightness-95"
                  onClick={() => void handleLeaveGroup()}
                >
                  Rời nhóm
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {confirmDelete ? (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[var(--qc-card)] p-5 shadow-xl">
              <h3 className="text-base font-bold text-[var(--qc-text-primary)]">Xóa lịch sử trò chuyện</h3>
              <p className="mt-2 text-sm text-[var(--qc-text-secondary)]">
                Toàn bộ tin nhắn sẽ bị xóa khỏi thiết bị của bạn. Thao tác này không thể hoàn tác.
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-lg px-4 py-2 text-sm text-[var(--qc-text-secondary)] hover:bg-[var(--qc-bg)]"
                  onClick={() => setConfirmDelete(false)}
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-[#e41e3f] px-4 py-2 text-sm font-semibold text-white hover:brightness-95"
                  onClick={handleDeleteHistory}
                >
                  Xóa
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </aside>
    </>
  );
}
