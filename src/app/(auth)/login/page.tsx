"use client";

import Link from "next/link";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Smartphone, KeyRound, ArrowRight, ShieldAlert, User, Lock, Eye, EyeOff } from "lucide-react";
import { FormError } from "@/src/components/ui/form-error";
import { useToast } from "@/src/components/providers/toast-provider";
import { useLogin } from "@/src/hooks/use-auth-actions";
import { useAuth } from "@/src/components/providers/auth-provider";
import { getErrorMessage } from "@/src/utils/error";
import { loginSchema, requestPhoneOtpSchema } from "@/src/utils/validators/auth";
import { authService } from "@/src/services/auth/auth.service";
import { clearPendingLogin, getPendingLogin, setPendingLogin } from "@/src/utils/storage";
import { LoginOption, PendingLoginState, AuthResponse } from "@/src/types/auth";
import { AuthShell } from "@/src/components/ui/auth-shell";

type LoginValues = z.infer<typeof loginSchema>;

function getDeviceFingerprint(): string {
  if (typeof window === "undefined") return "";
  let fp = localStorage.getItem("device_fingerprint");
  if (!fp) {
    fp = "fp_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    localStorage.setItem("device_fingerprint", fp);
  }
  return fp;
}

function getDeviceName(): string {
  if (typeof window === "undefined") return "Chrome Windows";
  const userAgent = navigator.userAgent;
  if (userAgent.includes("Chrome")) return "Chrome Windows";
  if (userAgent.includes("Firefox")) return "Firefox Windows";
  if (userAgent.includes("Safari")) return "Safari macOS";
  return "Web Browser";
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const loginMutation = useLogin();
  const auth = useAuth();

  const reason = searchParams.get("reason");
  const alertMessage = (() => {
    if (reason === "logged_out_all_devices") {
      return "Tài khoản của bạn đã được đăng xuất khỏi tất cả các thiết bị khác.";
    }
    if (reason === "session_expired") {
      return "Phiên đăng nhập của bạn đã hết hạn hoặc đã bị hủy. Vui lòng đăng nhập lại.";
    }
    return null;
  })();

  const [showPassword, setShowPassword] = useState(false);
  const [loginStage, setLoginStage] = useState<"form" | "options">("form");
  const [pendingLogin, setPendingLoginState] = useState<PendingLoginState | null>(null);
  const [selectedOption, setSelectedOption] = useState<LoginOption>("otp");
  const [optionLoading, setOptionLoading] = useState(false);
  const [otpPhone, setOtpPhone] = useState("");
  const [otpPhoneError, setOtpPhoneError] = useState<string | null>(null);
  const [verificationMethod, setVerificationMethod] = useState<"phone" | "email">("phone");

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  useEffect(() => {
    if (auth.isAuthenticated) {
      router.replace("/");
    }
  }, [auth.isAuthenticated, router]);

  useEffect(() => {
    const storedPending = getPendingLogin();

    if (storedPending?.identifier && storedPending?.user?._id) {
      setPendingLoginState(storedPending);
      setLoginStage("options");
      form.setValue("identifier", storedPending.identifier);
      return;
    }

    clearPendingLogin();
  }, [form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const response = await loginMutation.mutateAsync({
        ...values,
        device: "web",
        deviceName: getDeviceName(),
        deviceFingerprint: getDeviceFingerprint(),
      });

      if ("requiresEmailConfirmation" in response && response.requiresEmailConfirmation) {
        showToast("Đăng nhập từ thiết bị mới. Vui lòng xác thực qua Email.", "info");
        const params = new URLSearchParams({
          challengeId: response.challengeId || "",
          email: response.email || "",
          challengeExpiredAt: response.challengeExpiredAt || "",
          reason: response.reason || "new_device",
        });
        router.push(`/login-challenge?${params.toString()}`);
        return;
      }

      showToast("Đăng nhập mật khẩu thành công", "success");

      const authData = response as AuthResponse;
      const loginBy = values.identifier.includes("@") ? "email" : "phone";
      const pendingState: PendingLoginState = {
        user: authData.user,
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken,
        identifier: values.identifier,
        loginBy,
      };

      setPendingLogin(pendingState);
      setPendingLoginState(pendingState);
      setLoginStage("options");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  });

  const finalizeQuickLogin = () => {
    if (!pendingLogin) {
      return;
    }

    auth.loginWithAuthResponse({
      user: pendingLogin.user,
      accessToken: pendingLogin.accessToken,
      refreshToken: pendingLogin.refreshToken,
    });

    clearPendingLogin();
    showToast("Đăng nhập nhanh thành công", "success");
    const redirect = searchParams.get("redirect");
    router.replace(redirect?.startsWith("/") ? redirect : "/");
  };

  const handlePhoneOtpRequest = async () => {
    if (!pendingLogin) {
      return;
    }

    const parsedPhone = requestPhoneOtpSchema.safeParse({ phone: otpPhone });
    if (!parsedPhone.success) {
      setOtpPhoneError(parsedPhone.error.issues[0]?.message || "Số điện thoại không hợp lệ");
      return;
    }

    setOtpPhoneError(null);

    try {
      setOptionLoading(true);
      const otpSession = await authService.requestPhoneLoginOtp({ phone: parsedPhone.data.phone });
      showToast("Đã gửi mã OTP đăng nhập về email của tài khoản", "success");
      router.push(`/verify-otp?mode=phone-login&sessionId=${otpSession.sessionId}`);
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setOptionLoading(false);
    }
  };

  const handleEmailOtpRequest = async () => {
    if (!pendingLogin) {
      return;
    }

    const phone = pendingLogin.user.phone;
    if (!phone) {
      showToast("Tài khoản chưa được liên kết với số điện thoại để thực hiện gửi OTP", "error");
      return;
    }

    try {
      setOptionLoading(true);
      const otpSession = await authService.requestPhoneLoginOtp({ phone });
      showToast("Đã gửi mã OTP đăng nhập về email của bạn", "success");
      router.push(`/verify-otp?mode=phone-login&sessionId=${otpSession.sessionId}`);
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setOptionLoading(false);
    }
  };

  const handleBackToForm = () => {
    clearPendingLogin();
    setPendingLoginState(null);
    setLoginStage("form");
    setSelectedOption("otp");
    setVerificationMethod("phone");
  };

  return (
    <AuthShell
      subtitle={
        loginStage === "form"
          ? undefined
          : "Đăng nhập thành công. Chọn cách tiếp tục vào ứng dụng."
      }
    >
      {/* Alert message for session/device events */}
      {alertMessage && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3.5 text-xs text-rose-600 animate-fadeIn">
          <ShieldAlert className="size-4 shrink-0 text-rose-500 mt-0.5" />
          <span className="leading-normal font-medium">{alertMessage}</span>
        </div>
      )}

      {loginStage === "form" ? (
        <>
          {/* Welcome section */}
          <div className="auth-welcome">
            <h2 className="auth-welcome-title">Đăng nhập</h2>
            <p className="auth-welcome-desc">
              Chào mừng bạn đến với QuickChat — nơi kết nối và trò chuyện cùng bạn bè!
            </p>
          </div>

          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {/* Identifier field */}
            <div className="auth-input-group" style={{ marginBottom: 0 }}>
              <label htmlFor="identifier" className="auth-input-label">
                Số điện thoại hoặc Email
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <User className="size-4" />
                </span>
                <input
                  id="identifier"
                  {...form.register("identifier")}
                  className="auth-input"
                  placeholder="Nhập SĐT hoặc email"
                />
              </div>
              <FormError message={form.formState.errors.identifier?.message} />
            </div>

            {/* Password field */}
            <div className="auth-input-group" style={{ marginBottom: 0 }}>
              <div className="auth-label-row">
                <label htmlFor="password" className="auth-input-label" style={{ marginBottom: 0 }}>
                  Mật khẩu
                </label>
                <Link href="/forgot-password" className="auth-forgot-link">
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <Lock className="size-4" />
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...form.register("password")}
                  className="auth-input auth-input-password"
                  placeholder="Nhập mật khẩu"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="auth-eye-btn"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <FormError message={form.formState.errors.password?.message} />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="auth-btn-primary"
              style={{ marginTop: "0.5rem" }}
            >
              {loginMutation.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>

            {/* Register link */}
            <div style={{ textAlign: "center", paddingTop: "0.25rem" }}>
              <span className="auth-text-muted">Chưa có tài khoản? </span>
              <Link href="/register" className="auth-link">
                Đăng ký ngay
              </Link>
            </div>
          </form>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Option Toggle / Tabs */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setVerificationMethod("phone")}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                verificationMethod === "phone"
                  ? "border-emerald-500 bg-emerald-50/70 text-emerald-800 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Số điện thoại
            </button>
            <button
              type="button"
              onClick={() => setVerificationMethod("email")}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                verificationMethod === "email"
                  ? "border-emerald-500 bg-emerald-50/70 text-emerald-800 shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Gmail / Email
            </button>
          </div>

          <div className="rounded-xl border border-emerald-500 bg-emerald-50/50 p-4 text-emerald-950">
            {verificationMethod === "phone" ? (
              <div className="space-y-3">
                <div className="flex w-full items-center justify-between text-left mb-3">
                  <div>
                    <p className="font-semibold text-sm">Xác thực qua Số điện thoại</p>
                    <p className="text-xs text-slate-500 mt-0.5">Nhập số điện thoại của bạn để nhận mã OTP</p>
                  </div>
                  <Smartphone className="size-4 text-emerald-600" />
                </div>
                <input
                  value={otpPhone}
                  onChange={(event) => {
                    setOtpPhone(event.target.value);
                    if (otpPhoneError) {
                      setOtpPhoneError(null);
                    }
                  }}
                  className="auth-input"
                  style={{ paddingLeft: "0.875rem" }}
                  placeholder="Nhập số điện thoại"
                />
                {otpPhoneError ? <FormError message={otpPhoneError} /> : null}
                <button
                  type="button"
                  onClick={handlePhoneOtpRequest}
                  disabled={optionLoading}
                  className="auth-btn-primary"
                  style={{ height: "2.75rem", fontSize: "0.875rem" }}
                >
                  {optionLoading ? "Đang gửi OTP..." : "Nhận mã OTP qua Email"}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex w-full items-center justify-between text-left mb-3">
                  <div>
                    <p className="font-semibold text-sm">Xác thực qua Gmail</p>
                    <p className="text-xs text-slate-500 mt-0.5">Mã OTP sẽ được gửi về hòm thư của tài khoản</p>
                  </div>
                  <KeyRound className="size-4 text-emerald-600" />
                </div>
                <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/30 p-3 text-center my-2">
                  <span className="text-xs text-slate-500 font-medium">Email đăng ký tài khoản:</span>
                  <p className="text-sm font-semibold text-emerald-800 mt-1">{maskEmail(pendingLogin?.user?.email)}</p>
                </div>
                <button
                  type="button"
                  onClick={handleEmailOtpRequest}
                  disabled={optionLoading}
                  className="auth-btn-primary"
                  style={{ height: "2.75rem", fontSize: "0.875rem" }}
                >
                  {optionLoading ? "Đang gửi OTP..." : "Nhận mã OTP về Gmail"}
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleBackToForm}
            className="auth-btn-secondary"
          >
            Quay lại form đăng nhập
          </button>
        </div>
      )}
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 text-emerald-600">
          <div className="text-center space-y-4">
            <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-500">Đang tải...</p>
          </div>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}

function maskEmail(email?: string): string {
  if (!email) return "";
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 3) {
    return `${local.substring(0, 1)}***@${domain}`;
  }
  return `${local.substring(0, 3)}***@${domain}`;
}
