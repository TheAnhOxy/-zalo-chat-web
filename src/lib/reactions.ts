import { IReaction, ReactionType } from "@/src/types/message";

const EMOJI_MAP: Record<ReactionType, string> = {
  LIKE: "👍",
  LOVE: "❤️",
  HAHA: "😂",
  WOW: "😮",
  SAD: "😢",
  ANGRY: "😠",
};

export function reactionEmoji(type: ReactionType | string): string {
  const key = String(type).toUpperCase() as ReactionType;
  return EMOJI_MAP[key] ?? "👍";
}

export function groupReactions(
  reactions: IReaction[],
  currentUserId: string
): { type: ReactionType; count: number; mine: boolean }[] {
  const map = new Map<ReactionType, { count: number; mine: boolean }>();
  for (const r of reactions) {
    const prev = map.get(r.type) ?? { count: 0, mine: false };
    map.set(r.type, {
      count: prev.count + 1,
      mine: prev.mine || r.userId === currentUserId,
    });
  }
  return Array.from(map.entries()).map(([type, v]) => ({ type, ...v }));
}

export function currentUserReaction(
  reactions: IReaction[],
  currentUserId: string
): ReactionType | null {
  return reactions.find((r) => r.userId === currentUserId)?.type ?? null;
}
