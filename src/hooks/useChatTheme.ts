import { useState, useEffect } from "react";

export type ChatTheme = "default" | "sky" | "mint" | "sunset";

export const CHAT_THEMES: Record<ChatTheme, { label: string; gradient: string }> = {
  default: {
    label: "Mặc định",
    gradient: "bg-gradient-to-br from-[#EDF2ED] to-[#E3EBE3]",
  },
  sky: {
    label: "Sky",
    gradient: "bg-gradient-to-b from-[#E8F5E9] to-[#C8E6C9]",
  },
  mint: {
    label: "Mint",
    gradient: "bg-gradient-to-br from-[#E9FFF6] to-[#D4F5E8]",
  },
  sunset: {
    label: "Sunset",
    gradient: "bg-gradient-to-br from-[#FFF1E6] to-[#FFDCC6]",
  },
};

export function useChatTheme(conversationId: string) {
  const [theme, setThemeState] = useState<ChatTheme>("default");

  useEffect(() => {
    if (!conversationId) return;
    const saved = localStorage.getItem(`chat_bg_${conversationId}`) as ChatTheme | null;
    if (saved && CHAT_THEMES[saved]) {
      setThemeState(saved);
    } else {
      setThemeState("default");
    }
  }, [conversationId]);

  const setTheme = (newTheme: ChatTheme) => {
    if (!conversationId) return;
    setThemeState(newTheme);
    localStorage.setItem(`chat_bg_${conversationId}`, newTheme);
  };

  return { theme, setTheme, themeClass: CHAT_THEMES[theme].gradient };
}
