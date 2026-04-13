import { AuthTokens, AuthUser, PendingLoginState } from "@/src/types/auth";

const TOKENS_KEY = "quickchat_tokens";
const USER_KEY = "quickchat_user";
const PENDING_LOGIN_KEY = "quickchat_pending_login";

export function getStoredTokens(): AuthTokens | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(TOKENS_KEY);

  if (!raw || raw === "undefined" || raw === "null") {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthTokens;
  } catch {
    return null;
  }
}

export function setStoredTokens(tokens: AuthTokens): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!tokens?.accessToken || !tokens?.refreshToken) {
    window.localStorage.removeItem(TOKENS_KEY);
    return;
  }

  window.localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
}

export function clearStoredTokens(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TOKENS_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(USER_KEY);

  if (!raw || raw === "undefined" || raw === "null") {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!user || typeof user !== "object") {
    window.localStorage.removeItem(USER_KEY);
    return;
  }

  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(USER_KEY);
}

export function getPendingLogin(): PendingLoginState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(PENDING_LOGIN_KEY);

  if (!raw || raw === "undefined" || raw === "null") {
    return null;
  }

  try {
    return JSON.parse(raw) as PendingLoginState;
  } catch {
    return null;
  }
}

export function setPendingLogin(payload: PendingLoginState): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!payload || typeof payload !== "object") {
    window.sessionStorage.removeItem(PENDING_LOGIN_KEY);
    return;
  }

  window.sessionStorage.setItem(PENDING_LOGIN_KEY, JSON.stringify(payload));
}

export function clearPendingLogin(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(PENDING_LOGIN_KEY);
}
