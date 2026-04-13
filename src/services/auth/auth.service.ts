import { apiClient } from "@/src/services/api/client";
import {
  ApiMessageResponse,
  AuthResponse,
  ChangePasswordRequest,
  ForgotPasswordRequestOtpRequest,
  LoginRequest,
  LogoutAllDevicesRequest,
  LogoutRequest,
  OtpSessionResponse,
  PhoneLoginRequestOtpRequest,
  RegisterRequest,
  ResendOtpRequest,
  SessionInfo,
  VerifyOtpRequest,
} from "@/src/types/auth";

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type RawAuthData = {
  user?: {
    _id?: string;
    id?: string;
    fullName?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    coverImage?: string;
  };
  accessToken?: string;
  refreshToken?: string;
  tokens?: {
    accessToken?: string;
    refreshToken?: string;
  };
};

function unwrapEnvelope<T>(payload: unknown): T {
  const data = payload as ApiEnvelope<T> | T;

  if (data && typeof data === "object" && "data" in data && "success" in data) {
    return (data as ApiEnvelope<T>).data as T;
  }

  return data as T;
}

function normalizeAuthResponse(payload: unknown): AuthResponse {
  const raw = unwrapEnvelope<RawAuthData>(payload);

  const user = raw?.user;
  const accessToken = raw?.accessToken || raw?.tokens?.accessToken || "";
  const refreshToken = raw?.refreshToken || raw?.tokens?.refreshToken || "";

  return {
    user: {
      _id: user?._id || user?.id || "",
      fullName: user?.fullName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      avatar: user?.avatar,
      coverImage: user?.coverImage,
    },
    accessToken,
    refreshToken,
  };
}

export const authService = {
  login(payload: LoginRequest) {
    if (process.env.NODE_ENV === "development") {
      // Helps verify the browser payload matches Postman when backend returns 401.
      console.log("[login payload]", payload);
    }

    return apiClient.post<unknown>("/auth/login", payload).then((res) => normalizeAuthResponse(res.data));
  },

  register(payload: RegisterRequest) {
    return apiClient.post<unknown>("/auth/register", payload).then((res) => unwrapEnvelope<OtpSessionResponse>(res.data));
  },

  verifyRegisterOtp(payload: VerifyOtpRequest) {
    return apiClient.post<unknown>("/auth/verify-register-otp", payload).then((res) => normalizeAuthResponse(res.data));
  },

  requestForgotPasswordOtp(payload: ForgotPasswordRequestOtpRequest) {
    return apiClient
      .post<unknown>("/auth/forgot-password/request-otp", payload)
      .then((res) => unwrapEnvelope<OtpSessionResponse>(res.data));
  },

  verifyForgotPasswordOtp(payload: VerifyOtpRequest) {
    return apiClient
      .post<unknown>("/auth/forgot-password/verify-otp", payload)
      .then((res) => unwrapEnvelope<ApiMessageResponse>(res.data));
  },

  resendOtp(payload: ResendOtpRequest) {
    return apiClient.post<unknown>("/auth/otp/resend", payload).then((res) => unwrapEnvelope<OtpSessionResponse>(res.data));
  },

  logout(payload: LogoutRequest) {
    return apiClient.post<unknown>("/auth/logout", payload).then((res) => unwrapEnvelope<ApiMessageResponse>(res.data));
  },

  getSessions(userId: string) {
    return apiClient.get<unknown>(`/auth/sessions/${userId}`).then((res) => unwrapEnvelope<SessionInfo[]>(res.data));
  },

  changePassword(payload: ChangePasswordRequest) {
    return apiClient
      .post<unknown>("/auth/change-password", payload)
      .then((res) => unwrapEnvelope<ApiMessageResponse>(res.data));
  },

  logoutAllDevices(payload: LogoutAllDevicesRequest) {
    return apiClient
      .post<unknown>("/auth/logout-all-devices", payload)
      .then((res) => unwrapEnvelope<ApiMessageResponse>(res.data));
  },

  requestPhoneLoginOtp(payload: PhoneLoginRequestOtpRequest) {
    return apiClient
      .post<unknown>("/auth/phone-login/request-otp", payload)
      .then((res) => unwrapEnvelope<OtpSessionResponse>(res.data));
  },

  verifyPhoneLoginOtp(payload: VerifyOtpRequest) {
    return apiClient.post<unknown>("/auth/phone-login/verify-otp", payload).then((res) => normalizeAuthResponse(res.data));
  },
};
