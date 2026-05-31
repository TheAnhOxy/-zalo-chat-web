/** Giống mobile `DateUtils.formatChatTime` */
export function formatChatTime(value: string | Date): string {
  const local = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(local.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - local.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);

  if (diffMinutes < 1) return "Vừa xong";
  if (diffHours < 1) return `${diffMinutes} phút`;

  if (local.getDate() === now.getDate() && local.getMonth() === now.getMonth() && local.getFullYear() === now.getFullYear()) {
    return local.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    local.getDate() === yesterday.getDate() &&
    local.getMonth() === yesterday.getMonth() &&
    local.getFullYear() === yesterday.getFullYear()
  ) {
    return "Hôm qua";
  }

  const weekdays = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays < 7) return weekdays[local.getDay()] ?? local.toLocaleDateString("vi-VN");

  return local.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}
