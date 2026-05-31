/** 16 preset nền chat nhóm — khớp mobile GroupChatBackgrounds */

export const GROUP_BG_COUNT = 16;

export const GROUP_BG_LABELS = [
  "Mặc định",
  "Sky",
  "Mint",
  "Sunset",
  "Peach",
  "Lilac",
  "Ocean",
  "Meadow",
  "Rose",
  "Cloud",
  "Berry",
  "Sand",
  "Aqua",
  "Coral",
  "Leaf",
  "Night",
] as const;

/** Tailwind gradient classes tương ứng mobile */
export const GROUP_BG_GRADIENTS: string[] = [
  "bg-gradient-to-br from-[#EDF2ED] to-[#E3EBE3]",
  "bg-gradient-to-b from-[#E8F5E9] to-[#C8E6C9]",
  "bg-gradient-to-br from-[#E9FFF6] to-[#D4F5E8]",
  "bg-gradient-to-br from-[#FFF1E6] to-[#FFDCC6]",
  "bg-gradient-to-br from-[#FFF3E8] to-[#FFD6BA]",
  "bg-gradient-to-t from-[#F2EDFF] to-[#DCCEFF]",
  "bg-gradient-to-br from-[#E8F6FF] to-[#CCE9FF]",
  "bg-gradient-to-t from-[#EFFBEF] to-[#DCF3DC]",
  "bg-gradient-to-br from-[#FFEEF6] to-[#FFD5E8]",
  "bg-gradient-to-t from-[#F5F9FF] to-[#E7EEF9]",
  "bg-gradient-to-br from-[#F7EDFF] to-[#E4CBFF]",
  "bg-gradient-to-t from-[#FFF7EA] to-[#FFE7BF]",
  "bg-gradient-to-br from-[#E6FFFB] to-[#C7F7ED]",
  "bg-gradient-to-t from-[#FFF0EB] to-[#FFD8CB]",
  "bg-gradient-to-br from-[#F0FFF0] to-[#D4F3D4]",
  "bg-gradient-to-t from-[#EEF2FF] to-[#D8E2FF]",
];

export function clampGroupBgIndex(index: number): number {
  return Math.max(0, Math.min(GROUP_BG_COUNT - 1, index));
}

export function groupBgGradientClass(index: number): string {
  return GROUP_BG_GRADIENTS[clampGroupBgIndex(index)];
}

export function groupBgOverrideKey(conversationId: string) {
  return `group_chat_bg_override_${conversationId}`;
}

export function groupBgIndexKey(conversationId: string) {
  return `group_chat_bg_${conversationId}`;
}

export function groupBgCustomKey(conversationId: string) {
  return `group_chat_bg_custom_${conversationId}`;
}
