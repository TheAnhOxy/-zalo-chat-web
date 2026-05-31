/** Giống mobile AvatarWidget._initials */
export function getAvatarInitials(name: string): string {
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return trimmed.length > 0 ? trimmed[0].toUpperCase() : "?";
}
