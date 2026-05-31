import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { clearStoredTokens, clearStoredUser, getStoredTokens, setStoredTokens } from "@/src/utils/storage";

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!baseURL) {
  console.warn("NEXT_PUBLIC_API_BASE_URL is not set");
}

export const apiClient = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

const publicAuthPaths = [
  "/auth/login",
  "/auth/register",
  "/auth/verify-register-otp",
  "/auth/forgot-password/request-otp",
  "/auth/forgot-password/verify-otp",
  "/auth/otp/resend",
  "/auth/refresh-token",
  "/auth/phone-login/request-otp",
  "/auth/phone-login/verify-otp",
];

function isPublicAuthRequest(config?: AxiosRequestConfig) {
  const requestUrl = config?.url || "";
  return publicAuthPaths.some((path) => requestUrl.includes(path));
}

let isRefreshing = false;
let queue: Array<(token: string | null) => void> = [];

function flushQueue(token: string | null) {
  queue.forEach((cb) => cb(token));
  queue = [];
}

async function refreshAccessToken(): Promise<string | null> {
  const tokens = getStoredTokens();

  if (!tokens?.refreshToken) {
    return null;
  }

  const response = await axios.post<unknown>(
    `${baseURL}/auth/refresh-token`,
    {
      refreshToken: tokens.refreshToken,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const payload = response.data as {
    accessToken?: string;
    refreshToken?: string;
    tokens?: {
      accessToken?: string;
      refreshToken?: string;
    };
    data?: {
      accessToken?: string;
      refreshToken?: string;
      tokens?: {
        accessToken?: string;
        refreshToken?: string;
      };
    };
  };

  const accessToken =
    payload.accessToken || payload.tokens?.accessToken || payload.data?.accessToken || payload.data?.tokens?.accessToken;
  const refreshToken =
    payload.refreshToken || payload.tokens?.refreshToken || payload.data?.refreshToken || payload.data?.tokens?.refreshToken;

  if (!accessToken || !refreshToken) {
    return null;
  }

  setStoredTokens({ accessToken, refreshToken });

  return accessToken;
}

apiClient.interceptors.request.use((config) => {
  if (isPublicAuthRequest(config)) {
    return config;
  }

  const tokens = getStoredTokens();

  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  return config;
});

function handleUnauthorizedRedirect() {
  if (typeof window === "undefined") return;
  clearStoredTokens();
  clearStoredUser();
  window.sessionStorage.removeItem("quickchat_pending_login");

  window.location.href = "/login?reason=session_expired";
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest || error.response?.status !== 401 || originalRequest._retry || isPublicAuthRequest(originalRequest)) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        queue.push((token) => {
          if (!token) {
            reject(error);
            return;
          }

          if (!originalRequest.headers) {
            originalRequest.headers = {};
          }

          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(originalRequest));
        });
      });
    }

    isRefreshing = true;

    try {
      const token = await refreshAccessToken();

      if (!token) {
        handleUnauthorizedRedirect();
        flushQueue(null);
        return Promise.reject(error);
      }

      flushQueue(token);

      if (!originalRequest.headers) {
        originalRequest.headers = {};
      }

      originalRequest.headers.Authorization = `Bearer ${token}`;

      return apiClient(originalRequest);
    } catch (refreshError) {
      handleUnauthorizedRedirect();
      flushQueue(null);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
