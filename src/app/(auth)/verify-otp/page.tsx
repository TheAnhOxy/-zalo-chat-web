"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthShell } from "@/src/components/ui/auth-shell";
import { FormError } from "@/src/components/ui/form-error";
import { useToast } from "@/src/components/providers/toast-provider";
import {
  useResendOtp,
  useVerifyForgotPasswordOtp,
  useVerifyPhoneLoginOtp,
  useVerifyRegisterOtp,
} from "@/src/hooks/use-auth-actions";
import { getErrorMessage } from "@/src/utils/error";
import { verifyOtpSchema } from "@/src/utils/validators/auth";
import { useAuth } from "@/src/components/providers/auth-provider";
import { KeyRound } from "lucide-react";

type VerifyOtpValues = z.infer<typeof verifyOtpSchema>;

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remaining = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

function VerifyOtpInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const auth = useAuth();

  const mode = searchParams.get("mode") || "register";
  const sessionId = searchParams.get("sessionId") || "";
  const isPhoneLogin = mode === "phone-login";
  
  const title = useMemo(() => {
    return "Xác thực OTP";
  }, []);

  const subtitle = useMemo(() => {
    if (mode === "forgot") {
      return "Mã OTP đã được gửi đến email của bạn để xác thực khôi phục mật khẩu.";
    }

    if (isPhoneLogin) {
      return "Mã OTP đã được gửi đến email liên kết với số điện thoại của bạn.";
    }

    return "Mã OTP đã được gửi đến email đăng ký của bạn để hoàn tất tạo tài khoản.";
  }, [isPhoneLogin, mode]);

  const verifyRegisterMutation = useVerifyRegisterOtp();
  const verifyForgotMutation = useVerifyForgotPasswordOtp();
  const verifyPhoneLoginMutation = useVerifyPhoneLoginOtp();
  const resendMutation = useResendOtp();
  const [countdown, setCountdown] = useState(120);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [sessionId]);

  const form = useForm<VerifyOtpValues>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: {
      sessionId,
      otp: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (mode === "forgot") {
        await verifyForgotMutation.mutateAsync(values);
        showToast("Đổi mật khẩu thành công, vui lòng đăng nhập", "success");
        router.replace("/login");
        return;
      }

      if (isPhoneLogin) {
        const data = await verifyPhoneLoginMutation.mutateAsync(values);
        auth.loginWithAuthResponse(data);
        showToast("Đăng nhập bằng OTP thành công", "success");
        router.replace("/");
        return;
      }

      await verifyRegisterMutation.mutateAsync(values);
      showToast("Xác thực OTP thành công, vui lòng đăng nhập", "success");
      router.replace("/login");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  });

  const handleResend = async () => {
    try {
      await resendMutation.mutateAsync({ sessionId: form.getValues("sessionId") });
      showToast("Đã gửi lại OTP", "success");
      setCountdown(120);
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  };

  const isSubmitting = verifyRegisterMutation.isPending || verifyForgotMutation.isPending || verifyPhoneLoginMutation.isPending;

  return (
    <AuthShell title={title} subtitle={subtitle}>
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <input type="hidden" {...form.register("sessionId")} />

        {/* OTP input */}
        <div className="auth-input-group" style={{ marginBottom: 0 }}>
          <label htmlFor="otp" className="auth-input-label">
            Mã OTP
          </label>
          <div className="auth-input-wrapper">
            <span className="auth-input-icon">
              <KeyRound className="size-4" />
            </span>
            <input
              id="otp"
              {...form.register("otp")}
              className="auth-input"
              placeholder="Nhập 6 số OTP"
            />
          </div>
          <FormError message={form.formState.errors.otp?.message} />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="auth-btn-primary"
        >
          {isSubmitting ? "Đang xác thực..." : "Xác thực"}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resendMutation.isPending || countdown > 0}
          className="auth-btn-secondary"
        >
          {resendMutation.isPending
            ? "Đang gửi lại..."
            : countdown > 0
              ? `Gửi lại sau ${formatCountdown(countdown)}`
              : "Gửi lại OTP"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function VerifyOtpPage() {
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
      <VerifyOtpInner />
    </Suspense>
  );
}
