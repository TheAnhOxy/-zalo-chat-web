"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  MoreVertical,
  Search,
  Shield,
  Star,
  UserMinus,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { IConversation, IConversationParticipant } from "@/src/types/conversation";
import { AvatarWidget } from "@/src/components/common/AvatarWidget";
import { SubPanelShell } from "@/src/components/chat/SubPanelShell";
import {
  conversationGroupApi,
  countGroupAdmins,
  isGroupAdmin,
  roleLabel,
} from "@/src/services/api/conversation-group";
import { contactsService } from "@/src/services/contacts/contacts.service";
import { useToast } from "@/src/components/providers/toast-provider";
import { SOCKET_CLIENT } from "@/src/services/socket/adapter";
import { socketService } from "@/src/services/socket/socket.service";
import {
  resolveMemberDisplay,
  useGroupMemberProfiles,
} from "@/src/hooks/useGroupMemberProfiles";
import {
  emitMakeAdminSystemMessage,
  emitRevokeAdminSystemMessage,
} from "@/src/lib/group-chat-system";

interface GroupMembersPanelProps {
  conversation: IConversation;
  currentUserId: string;
  currentUserDisplayName?: string;
  onBack: () => void;
  onUpdated: (conversation: IConversation) => void;
  onAddMembers?: () => void;
  /** Sau khi kick — reload tin nhắn (tin SYSTEM) */
  onMemberKicked?: () => void;
}

export function GroupMembersPanel({
  conversation,
  currentUserId,
  currentUserDisplayName = "Bạn",
  onBack,
  onUpdated,
  onAddMembers,
  onMemberKicked,
}: GroupMembersPanelProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [members, setMembers] = useState(conversation.participants);

  useEffect(() => {
    setMembers(conversation.participants);
  }, [conversation.participants]);

  const memberIds = useMemo(() => members.map((m) => m.userId), [members]);
  const { profiles, isLoading: loadingProfiles, isError: profileError } =
    useGroupMemberProfiles(memberIds);

  const friendsQuery = useQuery({
    queryKey: ["friends", currentUserId],
    queryFn: () => contactsService.getFriends(currentUserId),
    enabled: Boolean(currentUserId),
    staleTime: 60_000,
  });

  const friendIds = useMemo(
    () => new Set((friendsQuery.data ?? []).map((f) => f._id)),
    [friendsQuery.data]
  );

  const [query, setQuery] = useState("");
  const [actionTarget, setActionTarget] = useState<IConversationParticipant | null>(null);
  const [busy, setBusy] = useState(false);

  const canManage = isGroupAdmin(members, currentUserId);
  const adminCount = countGroupAdmins(members);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const { name } = resolveMemberDisplay(m, profiles);
      return name.toLowerCase().includes(q);
    });
  }, [members, query, profiles]);

  const closeActions = () => setActionTarget(null);

  const openActions = (p: IConversationParticipant) => {
    if (p.userId === currentUserId) return;
    if (!canManage) {
      router.push(`/contacts/user/${p.userId}`);
      return;
    }
    setActionTarget(p);
  };

  const handleKick = useCallback(async () => {
    if (!actionTarget) return;
    const { name } = resolveMemberDisplay(actionTarget, profiles);
    if (!window.confirm(`Bạn có chắc muốn xóa ${name} khỏi nhóm?`)) return;
    setBusy(true);
    try {
      const updated = await conversationGroupApi.kickMember(
        conversation._id,
        members,
        actionTarget.userId
      );
      setMembers(updated.participants);
      onUpdated(updated);
      const actor = currentUserDisplayName.trim() || "Bạn";
      socketService.emit(SOCKET_CLIENT.sendMessage, {
        conversationId: conversation._id,
        senderId: currentUserId,
        type: "SYSTEM",
        content: `REMOVE_MEMBER|${actor}|${name}`,
      });
      onMemberKicked?.();
      showToast(`Đã xóa ${name} khỏi nhóm`);
      closeActions();
    } catch {
      showToast("Không thể xóa thành viên", "error");
    } finally {
      setBusy(false);
    }
  }, [
    actionTarget,
    conversation._id,
    currentUserId,
    currentUserDisplayName,
    members,
    onMemberKicked,
    onUpdated,
    profiles,
    showToast,
  ]);

  const handleRoleChange = useCallback(
    async (newRole: "ADMIN" | "MEMBER") => {
      if (!actionTarget) return;
      const { name } = resolveMemberDisplay(actionTarget, profiles);
      if (newRole === "MEMBER" && actionTarget.role === "ADMIN" && adminCount <= 1) {
        showToast("Nhóm phải có ít nhất một quản trị viên", "error");
        return;
      }
      const isPromote = newRole === "ADMIN";
      const ok = window.confirm(
        isPromote
          ? `Phân quyền quản trị viên cho ${name}?`
          : `Thu hồi quyền quản trị viên của ${name}?`
      );
      if (!ok) return;
      setBusy(true);
      try {
        const updated = await conversationGroupApi.updateMemberRole(
          conversation._id,
          members,
          actionTarget.userId,
          newRole
        );
        if (isPromote) {
          emitMakeAdminSystemMessage(
            conversation._id,
            currentUserId,
            currentUserDisplayName,
            name
          );
        } else {
          emitRevokeAdminSystemMessage(
            conversation._id,
            currentUserId,
            currentUserDisplayName,
            name
          );
        }
        setMembers(updated.participants);
        onUpdated(updated);
        showToast(isPromote ? `Đã thêm quản trị viên: ${name}` : `Đã hủy quyền quản trị viên: ${name}`);
        closeActions();
      } catch {
        showToast("Không thể cập nhật vai trò", "error");
      } finally {
        setBusy(false);
      }
    },
    [
      actionTarget,
      adminCount,
      conversation._id,
      currentUserId,
      currentUserDisplayName,
      members,
      onUpdated,
      profiles,
      showToast,
    ]
  );

  const actionDisplay = actionTarget
    ? resolveMemberDisplay(actionTarget, profiles)
    : null;

  return (
    <SubPanelShell
      title={`Thành viên (${members.length})`}
      onBack={onBack}
      headerExtra={
        canManage && onAddMembers ? (
          <button
            type="button"
            onClick={onAddMembers}
            className="mr-2 rounded-lg px-2 py-1 text-xs font-semibold hover:bg-white/10"
          >
            + Thêm
          </button>
        ) : null
      }
    >
      <div className="border-b border-[var(--qc-divider)] bg-[var(--qc-card)] px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-[var(--qc-bg)] px-3 py-2">
          <Search className="h-4 w-4 text-[var(--qc-text-secondary)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm thành viên"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[var(--qc-card)]">
        {loadingProfiles ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--qc-primary)]" />
          </div>
        ) : profileError ? (
          <p className="px-6 py-12 text-center text-sm text-[var(--qc-text-secondary)]">
            Không thể tải danh sách thành viên
          </p>
        ) : filtered.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-[var(--qc-text-secondary)]">
            {query.trim() ? "Không tìm thấy thành viên" : "Chưa có thành viên"}
          </p>
        ) : (
          filtered.map((p) => {
            const isMe = p.userId === currentUserId;
            const isAdmin = p.role === "ADMIN";
            const { name, avatar } = resolveMemberDisplay(p, profiles);
            const canTap = !isMe;
            const canAddFriend = !isMe && !friendIds.has(p.userId);
            const showMenu = canManage && !isMe;

            return (
              <div
                key={p.userId}
                role={canTap ? "button" : undefined}
                tabIndex={canTap ? 0 : undefined}
                onClick={() => canTap && openActions(p)}
                onKeyDown={(e) => {
                  if (canTap && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    openActions(p);
                  }
                }}
                className={`flex items-center gap-3 border-b border-[var(--qc-divider)] px-4 py-3 last:border-0 ${
                  canTap ? "cursor-pointer hover:bg-[var(--qc-bg)]/60" : ""
                }`}
              >
                <AvatarWidget url={avatar} name={name} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--qc-text-primary)]">
                    {name}
                    {isMe ? " (Bạn)" : ""}
                  </p>
                  {isAdmin ? (
                    <p className="text-xs font-medium text-[var(--qc-primary)]">Quản trị viên</p>
                  ) : p.role === "MODERATOR" ? (
                    <p className="text-xs text-[var(--qc-text-secondary)]">{roleLabel(p.role)}</p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {isAdmin ? (
                    <span className="rounded-lg bg-[var(--qc-primary-light)] px-2 py-0.5 text-[11px] font-bold text-[var(--qc-primary)]">
                      Admin
                    </span>
                  ) : null}
                  {canAddFriend ? (
                    <Link
                      href={`/contacts/user/${p.userId}`}
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-full p-2 text-[var(--qc-primary)] hover:bg-[var(--qc-primary-light)]"
                      aria-label="Thêm bạn"
                    >
                      <UserPlus className="h-5 w-5" strokeWidth={1.75} />
                    </Link>
                  ) : null}
                  {showMenu ? (
                    <button
                      type="button"
                      className="rounded-full p-2 hover:bg-[var(--qc-bg)]"
                      aria-label="Tùy chọn thành viên"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionTarget(p);
                      }}
                    >
                      <MoreVertical className="h-5 w-5 text-[var(--qc-text-secondary)]" />
                    </button>
                  ) : canTap && !canManage ? (
                    <UserRound className="h-5 w-5 text-[var(--qc-text-secondary)]/50" />
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {actionTarget && actionDisplay ? (
        <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-sm rounded-t-2xl bg-[var(--qc-card)] shadow-xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-[var(--qc-divider)] px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <AvatarWidget url={actionDisplay.avatar} name={actionDisplay.name} size={40} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--qc-text-primary)]">
                    {actionDisplay.name}
                  </p>
                  <p className="text-xs text-[var(--qc-text-secondary)]">
                    {roleLabel(actionTarget.role)}
                  </p>
                </div>
              </div>
              <button type="button" onClick={closeActions} className="rounded-full p-1 hover:bg-[var(--qc-bg)]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-1">
              <Link
                href={`/contacts/user/${actionTarget.userId}`}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--qc-bg)]"
                onClick={closeActions}
              >
                <UserRound className="h-5 w-5 text-[var(--qc-text-secondary)]" />
                Xem trang cá nhân
              </Link>

              {actionTarget.role !== "ADMIN" ? (
                <button
                  type="button"
                  disabled={busy}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm text-[var(--qc-primary)] hover:bg-[var(--qc-bg)] disabled:opacity-50"
                  onClick={() => void handleRoleChange("ADMIN")}
                >
                  <Star className="h-5 w-5" />
                  Thêm quản trị viên
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  className="flex w-full items-center gap-3 px-4 py-3 text-sm hover:bg-[var(--qc-bg)] disabled:opacity-50"
                  onClick={() => void handleRoleChange("MEMBER")}
                >
                  <Shield className="h-5 w-5 text-[var(--qc-text-secondary)]" />
                  Hủy quản trị viên
                </button>
              )}

              <button
                type="button"
                disabled={busy}
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-[#e41e3f] hover:bg-[var(--qc-bg)] disabled:opacity-50"
                onClick={() => void handleKick()}
              >
                <UserMinus className="h-5 w-5" />
                Xóa khỏi nhóm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </SubPanelShell>
  );
}
