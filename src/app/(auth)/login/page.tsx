"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Eye, EyeOff, MessageCircle, ShieldCheck, Sparkles, Smartphone, Zap, KeyRound, ArrowRight, ShieldAlert } from "lucide-react";
import { FormError } from "@/src/components/ui/form-error";
import { useToast } from "@/src/components/providers/toast-provider";
import { useLogin } from "@/src/hooks/use-auth-actions";
import { useAuth } from "@/src/components/providers/auth-provider";
import { getErrorMessage } from "@/src/utils/error";
import { loginSchema, requestPhoneOtpSchema } from "@/src/utils/validators/auth";
import { authService } from "@/src/services/auth/auth.service";
import { clearPendingLogin, getPendingLogin, setPendingLogin } from "@/src/utils/storage";
import { LoginOption, PendingLoginState, AuthResponse } from "@/src/types/auth";

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
  const [selectedOption, setSelectedOption] = useState<LoginOption>("quick");
  const [optionLoading, setOptionLoading] = useState(false);
  const [otpPhone, setOtpPhone] = useState("");
  const [otpPhoneError, setOtpPhoneError] = useState<string | null>(null);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

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

  const introCards = useMemo(
    () => [
      {
        icon: MessageCircle,
        title: "Realtime Chat",
        text: "Nhắn tin nhanh, mượt, không nhiễu",
      },
      {
        icon: ShieldCheck,
        title: "An toàn phiên",
        text: "Giữ token và refresh an toàn",
      },
      {
        icon: Zap,
        title: "Tối ưu tốc độ",
        text: "Giao diện nhẹ, phản hồi nhanh",
      },
    ],
    []
  );

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
    router.replace("/");
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
      // Calls request phone OTP with ONLY phone as required
      const otpSession = await authService.requestPhoneLoginOtp({ phone: parsedPhone.data.phone });
      showToast("Đã gửi mã OTP đăng nhập về email của tài khoản", "success");
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
    setSelectedOption("quick");
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4 md:p-8">
      <Image src="/images/anhnen.jpg" alt="QuickChat background" fill priority className="-z-20 object-cover" />
      <div className="absolute inset-0 -z-10 bg-slate-950/60" />

      <div className="grid w-full max-w-6xl gap-6 rounded-3xl border border-white/20 bg-white/10 p-4 shadow-2xl backdrop-blur-md md:grid-cols-[1.2fr_1fr] md:p-8">
        <section className="order-2 rounded-2xl border border-white/30 bg-white/15 p-6 text-white shadow-xl backdrop-blur-xl md:order-2 md:p-8">
          {loginStage === "form" ? (
            <>
              <h2 className="text-3xl font-bold">Đăng nhập</h2>
              <p className="mt-2 text-sm text-white/80">Sử dụng Email/Số điện thoại và Mật khẩu</p>

              {alertMessage && (
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-200 animate-fadeIn">
                  <ShieldAlert className="size-4 shrink-0 text-rose-400 mt-0.5" />
                  <span className="leading-normal font-medium">{alertMessage}</span>
                </div>
              )}

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="identifier" className="text-sm font-medium">
                    Email hoặc số điện thoại
                  </label>
                  <input
                    id="identifier"
                    {...form.register("identifier")}
                    className="mt-1 h-11 w-full rounded-lg border border-white/35 bg-white/95 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Nhập email hoặc số điện thoại"
                  />
                  <FormError message={form.formState.errors.identifier?.message} />
                </div>

                <div>
                  <label htmlFor="password" className="text-sm font-medium">
                    Mật khẩu
                  </label>
                  <div className="relative mt-1">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      {...form.register("password")}
                      className="h-11 w-full rounded-lg border border-white/35 bg-white/95 px-3 pr-11 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="Nhập mật khẩu"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-600 transition hover:bg-slate-200"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  <FormError message={form.formState.errors.password?.message} />
                </div>

                <button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="h-11 w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  {loginMutation.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
                </button>

                <div className="flex justify-between text-sm text-white/90">
                  <Link href="/register" className="underline underline-offset-4">
                    Đăng ký tài khoản
                  </Link>
                  <Link href="/forgot-password" className="underline underline-offset-4">
                    Quên mật khẩu
                  </Link>
                </div>
              </form>
            </>
          ) : (
            <div className="space-y-5">
              <div>
                <h2 className="text-3xl font-bold">Chọn cách đăng nhập</h2>
                <p className="mt-2 text-sm text-white/80">
                  Đăng nhập thành công. Chọn 1 trong các lựa chọn để vào ứng dụng.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={finalizeQuickLogin}
                  className={`flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
                    selectedOption === "quick"
                      ? "border-cyan-300 bg-cyan-300/15"
                      : "border-white/20 bg-white/10 hover:bg-white/15"
                  }`}
                  onMouseEnter={() => setSelectedOption("quick")}
                >
                  <div>
                    <p className="font-semibold">Đăng nhập nhanh</p>
                    <p className="text-xs text-white/75">Vào thẳng QuickChat bằng phiên hiện tại</p>
                  </div>
                  <ArrowRight className="size-4" />
                </button>

                <div
                  className={`rounded-2xl border px-4 py-4 ${
                    selectedOption === "otp"
                      ? "border-cyan-300 bg-cyan-300/15"
                      : "border-white/20 bg-white/10"
                  }`}
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between text-left"
                    onClick={() => setSelectedOption("otp")}
                  >
                    <div>
                      <p className="font-semibold">Xác thực OTP</p>
                      <p className="text-xs text-white/75">Nhập số điện thoại để nhận OTP đăng nhập</p>
                    </div>
                    <Smartphone className="size-4" />
                  </button>

                  {selectedOption === "otp" ? (
                    <div className="mt-4 space-y-3">
                      <input
                        value={otpPhone}
                        onChange={(event) => {
                          setOtpPhone(event.target.value);
                          if (otpPhoneError) {
                            setOtpPhoneError(null);
                          }
                        }}
                        className="h-11 w-full rounded-lg border border-white/35 bg-white/95 px-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder="Nhập số điện thoại Việt Nam"
                      />
                      {otpPhoneError ? <FormError message={otpPhoneError} /> : null}
                      <button
                        type="button"
                        onClick={handlePhoneOtpRequest}
                        disabled={optionLoading}
                        className="h-11 w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                      >
                        {optionLoading ? "Đang gửi OTP..." : "Nhận mã OTP qua Email"}
                      </button>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOption("2fa")}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/20 bg-white/10 px-4 py-4 text-left opacity-80"
                >
                  <div>
                    <p className="font-semibold">Xác thực 2FA</p>
                    <p className="text-xs text-white/75">Chưa triển khai ở backend hiện tại</p>
                  </div>
                  <KeyRound className="size-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={handleBackToForm}
                className="text-sm text-cyan-100 underline underline-offset-4"
              >
                Quay lại form đăng nhập
              </button>
            </div>
          )}
        </section>

        <section className="order-1 relative overflow-hidden rounded-2xl border border-cyan-300/25 bg-[linear-gradient(160deg,#0d2a47,#133d5e,#1b5f7a)] p-7 text-white md:order-1 md:p-10">
          <div className="pointer-events-none absolute -right-14 -top-14 size-48 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-8 size-52 rounded-full bg-blue-400/20 blur-3xl" />

          <p className="inline-flex items-center gap-2 rounded-full border border-cyan-100/40 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-100">
            QuickChat
            <Sparkles className="size-3 animate-pulse" />
          </p>

          <h1 className="mt-6 text-4xl font-extrabold leading-tight md:text-5xl">
            Kết nối nhóm
            <br />
            Nhanh và bảo mật
          </h1>

          <p className="mt-4 max-w-md text-base text-cyan-50/90 md:text-lg">
            Không gian trò chuyện realtime cho đội của bạn với trải nghiệm mượt, rõ và hiện đại.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {introCards.map((card, index) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.title}
                  className="animate-fadeIn rounded-xl border border-white/15 bg-white/10 p-3"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  <Icon className="size-5 text-cyan-200" />
                  <p className="mt-2 text-sm font-medium">{card.title}</p>
                  <p className="mt-1 text-xs text-cyan-50/75">{card.text}</p>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
          <div className="text-center space-y-4">
            <div className="h-10 w-10 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-white/60">Đang tải...</p>
          </div>
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}
