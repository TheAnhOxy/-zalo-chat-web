"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/src/components/providers/auth-provider";
import { authService } from "@/src/services/auth/auth.service";
import {
  ChangePasswordRequest,
  ForgotPasswordRequestOtpRequest,
  LoginRequest,
  LogoutAllDevicesRequest,
  PhoneLoginRequestOtpRequest,
  RegisterRequest,
  ResendOtpRequest,
  VerifyOtpRequest,
} from "@/src/types/auth";

export function useLogin() {
  const auth = useAuth();

  return useMutation({
    mutationFn: (payload: LoginRequest) => authService.login(payload),
    onSuccess: (data) => {
      if (!("requiresEmailConfirmation" in data)) {
        auth.loginWithAuthResponse(data);
      }
    },
  });
}

export function useCheckLoginChallengeStatus() {
  return useMutation({
    mutationFn: (payload: { challengeId: string }) => authService.checkLoginChallengeStatus(payload),
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterRequest) => authService.register(payload),
  });
}

export function useVerifyRegisterOtp() {
  return useMutation({
    mutationFn: (payload: VerifyOtpRequest) => authService.verifyRegisterOtp(payload),
  });
}

export function useRequestForgotPasswordOtp() {
  return useMutation({
    mutationFn: (payload: ForgotPasswordRequestOtpRequest) => authService.requestForgotPasswordOtp(payload),
  });
}

export function useVerifyForgotPasswordOtp() {
  return useMutation({
    mutationFn: (payload: VerifyOtpRequest) => authService.verifyForgotPasswordOtp(payload),
  });
}

export function useResendOtp() {
  return useMutation({
    mutationFn: (payload: ResendOtpRequest) => authService.resendOtp(payload),
  });
}

export function useSessions(userId?: string) {
  return useQuery({
    queryKey: ["sessions", userId],
    queryFn: () => authService.getSessions(userId as string),
    enabled: Boolean(userId),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordRequest) => authService.changePassword(payload),
  });
}

export function useLogoutAllDevices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LogoutAllDevicesRequest) => authService.logoutAllDevices(payload),
    onSuccess: (_, payload) => {
      queryClient.invalidateQueries({ queryKey: ["sessions", payload.userId] });
    },
  });
}

export function useRequestPhoneLoginOtp() {
  return useMutation({
    mutationFn: (payload: PhoneLoginRequestOtpRequest) => authService.requestPhoneLoginOtp(payload),
  });
}

export function useVerifyPhoneLoginOtp() {
  const auth = useAuth();

  return useMutation({
    mutationFn: (payload: VerifyOtpRequest) => authService.verifyPhoneLoginOtp(payload),
    onSuccess: (data) => {
      auth.loginWithAuthResponse(data);
    },
  });
}
