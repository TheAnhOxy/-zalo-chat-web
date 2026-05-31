"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IConversation } from "@/src/types/conversation";
import {
  clampGroupBgIndex,
  groupBgCustomKey,
  groupBgGradientClass,
  groupBgIndexKey,
  groupBgOverrideKey,
} from "@/src/lib/group-chat-backgrounds";
import { CHAT_THEMES, ChatTheme } from "@/src/hooks/useChatTheme";

export interface ConversationBackground {
  backgroundClass: string;
  backgroundStyle?: React.CSSProperties;
}

function readPrivateTheme(conversationId: string): ChatTheme {
  if (typeof window === "undefined") return "default";
  const saved = localStorage.getItem(`chat_bg_${conversationId}`) as ChatTheme | null;
  return saved && CHAT_THEMES[saved] ? saved : "default";
}

function resolveGroupBackground(
  conversation: IConversation | null | undefined,
  conversationId: string
): ConversationBackground {
  const override = localStorage.getItem(groupBgOverrideKey(conversationId)) === "1";

  if (override) {
    const custom = localStorage.getItem(groupBgCustomKey(conversationId));
    if (custom) {
      return {
        backgroundClass: "",
        backgroundStyle: {
          backgroundImage: `url(data:image/jpeg;base64,${custom})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        },
      };
    }
    const idx = clampGroupBgIndex(Number(localStorage.getItem(groupBgIndexKey(conversationId)) ?? 0));
    return { backgroundClass: groupBgGradientClass(idx) };
  }

  const gs = conversation?.groupSettings;
  if (gs?.chatBackgroundType === "CUSTOM" && gs.chatBackgroundCustomBase64) {
    const b64 = gs.chatBackgroundCustomBase64;
    return {
      backgroundClass: "",
      backgroundStyle: {
        backgroundImage: `url(data:image/jpeg;base64,${b64})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      },
    };
  }

  const idx = clampGroupBgIndex(gs?.chatBackgroundIndex ?? 0);
  return { backgroundClass: groupBgGradientClass(idx) };
}

function resolvePrivateBackground(conversationId: string): ConversationBackground {
  const theme = readPrivateTheme(conversationId);
  return { backgroundClass: CHAT_THEMES[theme].gradient };
}

/**
 * Nền khung chat: nhóm đồng bộ groupSettings (hoặc override local); 1-1 lưu preset local.
 */
export function useConversationBackground(
  conversationId: string,
  conversation: IConversation | null | undefined
) {
  const isGroup = conversation?.type === "GROUP";
  const [privateTheme, setPrivateTheme] = useState<ChatTheme>("default");
  const [groupRevision, setGroupRevision] = useState(0);

  useEffect(() => {
    if (!conversationId) return;
    if (!isGroup) setPrivateTheme(readPrivateTheme(conversationId));
    else setGroupRevision((r) => r + 1);
  }, [conversationId, isGroup, conversation?.groupSettings?.chatBackgroundIndex, conversation?.groupSettings?.chatBackgroundType, conversation?.groupSettings?.chatBackgroundCustomBase64]);

  const background = useMemo((): ConversationBackground => {
    if (!conversationId) return { backgroundClass: CHAT_THEMES.default.gradient };
    if (isGroup) return resolveGroupBackground(conversation, conversationId);
    return resolvePrivateBackground(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, isGroup, conversation, privateTheme, groupRevision]);

  const setPrivateChatTheme = useCallback(
    (theme: ChatTheme) => {
      if (!conversationId || isGroup) return;
      setPrivateTheme(theme);
      localStorage.setItem(`chat_bg_${conversationId}`, theme);
    },
    [conversationId, isGroup]
  );

  const applyLocalGroupPreset = useCallback(
    (index: number) => {
      if (!conversationId) return;
      localStorage.setItem(groupBgOverrideKey(conversationId), "1");
      localStorage.removeItem(groupBgCustomKey(conversationId));
      localStorage.setItem(groupBgIndexKey(conversationId), String(clampGroupBgIndex(index)));
      setGroupRevision((r) => r + 1);
    },
    [conversationId]
  );

  const applyLocalGroupCustom = useCallback(
    (base64: string) => {
      if (!conversationId) return;
      localStorage.setItem(groupBgOverrideKey(conversationId), "1");
      localStorage.setItem(groupBgCustomKey(conversationId), base64);
      setGroupRevision((r) => r + 1);
    },
    [conversationId]
  );

  const clearGroupOverride = useCallback(() => {
    if (!conversationId) return;
    localStorage.removeItem(groupBgOverrideKey(conversationId));
    localStorage.removeItem(groupBgIndexKey(conversationId));
    localStorage.removeItem(groupBgCustomKey(conversationId));
    setGroupRevision((r) => r + 1);
  }, [conversationId]);

  const refreshBackground = useCallback(() => {
    setGroupRevision((r) => r + 1);
  }, []);

  return {
    isGroup,
    background,
    privateTheme,
    setPrivateChatTheme,
    applyLocalGroupPreset,
    applyLocalGroupCustom,
    clearGroupOverride,
    refreshBackground,
  };
}
