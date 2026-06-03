"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { contactsService } from "@/src/services/contacts/contacts.service";
import { conversationGroupApi } from "@/src/services/api/conversation-group";
import { IConversationParticipant } from "@/src/types/conversation";
import { AvatarWidget } from "@/src/components/common/AvatarWidget";
import { useToast } from "@/src/components/providers/toast-provider";
import { emitAddMemberSystemMessages } from "@/src/lib/group-chat-system";

interface AddToGroupModalProps {
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserName?: string;
  targetUserId: string;
  targetName: string;
  onSuccess?: () => void;
}

export function AddToGroupModal({
  open,
  onClose,
  currentUserId,
  currentUserName = "Bạn",
  targetUserId,
  targetName,
  onSuccess,
}: AddToGroupModalProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [workingGroupId, setWorkingGroupId] = useState<string | null>(null);

  const groupsQuery = useQuery({
    queryKey: ["groups", currentUserId],
    queryFn: () => contactsService.getGroups(currentUserId),
    enabled: open && Boolean(currentUserId),
  });

  const groups = useMemo(() => groupsQuery.data ?? [], [groupsQuery.data]);

  if (!open) return null;

  const isPeerInGroup = (groupId: string) => {
    const g = groups.find((x) => x._id === groupId);
    return g?.members?.some((m) => m.userId === targetUserId) ?? false;
  };

  const handlePick = async (groupId: string, groupName: string) => {
    if (workingGroupId || isPeerInGroup(groupId)) return;

    const group = groups.find((g) => g._id === groupId);
    if (!group) return;

    setWorkingGroupId(groupId);
    try {
      const participants: IConversationParticipant[] =
        group.members?.map((m) => ({
          userId: m.userId,
          fullName: "",
          role: m.role as IConversationParticipant["role"],
        })) ?? [];

      await conversationGroupApi.addMembers(groupId, participants, [targetUserId]);

      await emitAddMemberSystemMessages(
        groupId,
        currentUserId,
        currentUserName,
        [targetUserId]
      );

      void queryClient.invalidateQueries({ queryKey: ["conversations", currentUserId] });
      void queryClient.invalidateQueries({ queryKey: ["groups", currentUserId] });

      showToast(`Đã thêm ${targetName} vào nhóm "${groupName}"`, "success");
      onSuccess?.();
      onClose();
    } catch {
      showToast("Không thể thêm vào nhóm", "error");
    } finally {
      setWorkingGroupId(null);
    }
  };

  return (
    <div className="absolute inset-0 z-[65] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="flex max-h-[70vh] w-full max-w-md flex-col rounded-t-2xl bg-[var(--qc-card)] shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--qc-divider)] px-4 py-3">
          <h2 className="text-base font-bold">Thêm {targetName} vào nhóm</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-[var(--qc-bg)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {groupsQuery.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-7 w-7 animate-spin text-[var(--qc-primary)]" />
            </div>
          ) : groupsQuery.isError ? (
            <p className="p-6 text-center text-sm text-[var(--qc-text-secondary)]">
              Không tải được danh sách nhóm
            </p>
          ) : groups.length === 0 ? (
            <p className="p-6 text-center text-sm text-[var(--qc-text-secondary)]">
              Bạn chưa tham gia nhóm nào.
            </p>
          ) : (
            groups.map((g) => {
              const already = isPeerInGroup(g._id);
              const busy = workingGroupId === g._id;

              return (
                <button
                  key={g._id}
                  type="button"
                  disabled={already || Boolean(workingGroupId)}
                  className={`flex w-full items-center gap-3 border-b border-[var(--qc-divider)] px-4 py-3 text-left transition ${
                    already || workingGroupId
                      ? "cursor-default opacity-80"
                      : "hover:bg-[var(--qc-bg)]"
                  }`}
                  onClick={() => void handlePick(g._id, g.name)}
                >
                  <AvatarWidget url={g.avatar} name={g.name} size={44} className="rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--qc-text-primary)]">
                      {g.name}
                    </p>
                    <p className="text-xs text-[var(--qc-text-secondary)]">
                      {g.memberCount} thành viên
                    </p>
                  </div>
                  {busy ? (
                    <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[var(--qc-primary)]" />
                  ) : (
                    <span
                      className={`shrink-0 text-sm font-bold ${
                        already ? "text-[var(--qc-text-secondary)]" : "text-[var(--qc-primary)]"
                      }`}
                    >
                      {already ? "Đã có" : "Thêm"}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-[var(--qc-divider)] p-3">
          <button
            type="button"
            className="w-full rounded-xl border border-[var(--qc-primary)] py-2.5 text-sm font-bold text-[var(--qc-primary)] hover:bg-[var(--qc-primary-light)] disabled:opacity-50"
            disabled={Boolean(workingGroupId) || groupsQuery.isFetching}
            onClick={() => void groupsQuery.refetch()}
          >
            Tải lại danh sách nhóm
          </button>
        </div>
      </div>
    </div>
  );
}
