export type MuteDurationOption = "1h" | "4h" | "until8am" | "untilOn";

export function muteKey(conversationId: string) {
  return `conv_mute_${conversationId}`;
}

export function muteUntilKey(conversationId: string) {
  return `conv_mute_until_${conversationId}`;
}

export interface MuteState {
  isMuted: boolean;
  muteUntil: Date | null;
}

export function readMuteState(conversationId: string): MuteState {
  if (typeof window === "undefined") return { isMuted: false, muteUntil: null };
  const muted = localStorage.getItem(muteKey(conversationId)) === "1";
  if (!muted) return { isMuted: false, muteUntil: null };

  const untilRaw = localStorage.getItem(muteUntilKey(conversationId));
  if (!untilRaw) return { isMuted: true, muteUntil: null };

  const untilMs = Number(untilRaw);
  if (!Number.isFinite(untilMs)) {
    clearMute(conversationId);
    return { isMuted: false, muteUntil: null };
  }

  if (Date.now() >= untilMs) {
    clearMute(conversationId);
    return { isMuted: false, muteUntil: null };
  }

  return { isMuted: true, muteUntil: new Date(untilMs) };
}

export function persistMute(conversationId: string, muted: boolean, until?: Date | null) {
  if (typeof window === "undefined") return;
  if (!muted) {
    clearMute(conversationId);
    return;
  }
  localStorage.setItem(muteKey(conversationId), "1");
  if (until) {
    localStorage.setItem(muteUntilKey(conversationId), String(until.getTime()));
  } else {
    localStorage.removeItem(muteUntilKey(conversationId));
  }
}

export function clearMute(conversationId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(muteKey(conversationId));
  localStorage.removeItem(muteUntilKey(conversationId));
}

export function computeMuteUntil(option: MuteDurationOption): Date | null {
  const now = new Date();
  switch (option) {
    case "1h":
      return new Date(now.getTime() + 60 * 60 * 1000);
    case "4h":
      return new Date(now.getTime() + 4 * 60 * 60 * 1000);
    case "until8am": {
      const eight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0);
      return now < eight ? eight : new Date(eight.getTime() + 24 * 60 * 60 * 1000);
    }
    case "untilOn":
      return null;
    default:
      return null;
  }
}

export function muteActionLabel(isMuted: boolean): string {
  return isMuted ? "Bật\nthông báo" : "Tắt\nthông báo";
}

export function muteToastForOption(option: MuteDurationOption): string {
  switch (option) {
    case "1h":
      return "Đã tắt thông báo trong 1 giờ";
    case "4h":
      return "Đã tắt thông báo trong 4 giờ";
    case "until8am":
      return "Đã tắt thông báo đến 8 giờ sáng";
    case "untilOn":
      return "Đã tắt thông báo cho đến khi được mở lại";
    default:
      return "Đã tắt thông báo";
  }
}
