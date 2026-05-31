export interface DeviceInfo {
  device: string;
  deviceName: string;
  deviceFingerprint?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  avatar?: string;
  coverImage?: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface LoginChallenge {
  requiresEmailConfirmation: boolean;
  challengeId: string;
  email: string;
  challengeExpiredAt: string;
  reason?: string;
}

export type LoginResponse = AuthResponse | LoginChallenge;

export interface LoginChallengeStatusResponse {
  challengeId: string;
  status: string;
  user?: AuthUser;
  tokens?: {
    accessToken: string;
    refreshToken: string;
    accessExpiredAt: string;
  };
  revokedOldSessions?: boolean;
}

export type LoginOption = "quick" | "otp" | "2fa";

export interface PendingLoginState extends AuthResponse {
  identifier: string;
  loginBy: "email" | "phone";
}

export interface SessionInfo {
  _id: string;
  userId: string;
  device: string;
  deviceName: string;
  ipAddress?: string;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OtpSessionResponse {
  sessionId: string;
  message: string;
}

export interface ApiMessageResponse {
  message: string;
}

export interface LoginRequest extends DeviceInfo {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  phone: string;
  email: string;
  password: string;
}

export interface VerifyOtpRequest {
  sessionId: string;
  otp: string;
}

export interface ResendOtpRequest {
  sessionId: string;
}

export interface ForgotPasswordRequestOtpRequest {
  email: string;
  newPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  userId: string;
  oldPassword: string;
  newPassword: string;
}

export interface LogoutAllDevicesRequest {
  userId: string;
}

export interface PhoneLoginRequestOtpRequest {
  phone: string;
}
