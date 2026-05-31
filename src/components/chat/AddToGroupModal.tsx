"use client";

import { useQuery } from "@tanstack/react-query";
import { X, Users } from "lucide-react";
import { contactsService } from "@/src/services/contacts/contacts.service";
import { conversationsApi } from "@/src/services/api/conversations";
import { conversationGroupApi } from "@/src/services/api/conversation-group";

interface AddToGroupModalProps {
  open: boolean;
  onClose: () => void;
  currentUserId: string;
  targetUserId: string;
  targetName: string;
  onSuccess?: () => void;
}

export function AddToGroupModal({
  open,
  onClose,
  currentUserId,
  targetUserId,
  targetName,
  onSuccess,
}: AddToGroupModalProps) {
  const groupsQuery = useQuery({
    queryKey: ["groups", currentUserId],
    queryFn: () => contactsService.getGroups(currentUserId),
    enabled: open && Boolean(currentUserId),
  });

  if (!open) return null;

  const handlePick = async (groupId: string) => {
    try {
      const conv = await conversationsApi.getById(groupId);
      await conversationGroupApi.addMembers(groupId, conv.participants, [targetUserId]);
      onSuccess?.();
      onClose();
    } catch {
      alert("Không thể thêm vào nhóm");
    }
  };

  const groups = groupsQuery.data ?? [];

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
            <p className="p-6 text-center text-sm text-[var(--qc-text-secondary)]">Đang tải...</p>
          ) : groups.length === 0 ? (
            <p className="p-6 text-center text-sm text-[var(--qc-text-secondary)]">Bạn chưa có nhóm nào</p>
          ) : (
            groups.map((g) => (
              <button
                key={g._id}
                type="button"
                className="flex w-full items-center gap-3 border-b border-[var(--qc-divider)] px-4 py-3 text-left hover:bg-[var(--qc-bg)]"
                onClick={() => void handlePick(g._id)}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--qc-primary-light)]">
                  <Users className="h-5 w-5 text-[var(--qc-primary)]" />
                </span>
                <span className="truncate text-sm font-medium">{g.name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
