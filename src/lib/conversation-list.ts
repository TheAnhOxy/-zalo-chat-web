import { IConversation } from "@/src/types/conversation";
import { getOtherParticipant } from "@/src/lib/conversation-display";

/** Dedup theo ID + mỗi cặp user 1-1 chỉ giữ 1 hội thoại (giống mobile) */
export function dedupeConversations(conversations: IConversation[], currentUserId: string): IConversation[] {
  const seenIds = new Set<string>();
  const deduped: IConversation[] = [];

  for (const conversation of conversations) {
    if (!conversation._id || !seenIds.add(conversation._id)) continue;
    deduped.push(conversation);
  }

  const seenPairs = new Set<string>();
  const result: IConversation[] = [];

  for (const conversation of deduped) {
    if (conversation.type === "PRIVATE") {
      const other = getOtherParticipant(conversation, currentUserId);
      const pairKey = [currentUserId, other?.userId ?? ""].sort().join("_");
      if (!pairKey || pairKey === "_") {
        result.push(conversation);
        continue;
      }
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);
    }
    result.push(conversation);
  }

  return result;
}

export function getPinnedConversationIds(conversations: IConversation[], currentUserId: string): Set<string> {
  const pinned = new Set<string>();
  for (const conversation of conversations) {
    const me = conversation.participants.find((p) => p.userId === currentUserId);
    if (me?.isPinned) pinned.add(conversation._id);
  }
  return pinned;
}

export function sortConversationsLikeMobile(
  conversations: IConversation[],
  pinnedIds: Set<string>
): IConversation[] {
  return [...conversations].sort((a, b) => {
    const aPinned = pinnedIds.has(a._id);
    const bPinned = pinnedIds.has(b._id);
    if (aPinned !== bPinned) return aPinned ? -1 : 1;

    const aTime = new Date(a.lastMessage?.createdAt ?? a.updatedAt).getTime();
    const bTime = new Date(b.lastMessage?.createdAt ?? b.updatedAt).getTime();
    return bTime - aTime;
  });
}
