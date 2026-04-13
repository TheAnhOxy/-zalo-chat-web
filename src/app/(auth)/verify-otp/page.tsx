"use client";

import { useEffect, useMemo, useState } from "react";
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

type VerifyOtpValues = z.infer<typeof verifyOtpSchema>;

function formatCountdown(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remaining = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

export default function VerifyOtpPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { showToast } = useToast();
  const auth = useAuth();

  const mode = searchParams.get("mode") || "register";
  const sessionId = searchParams.get("sessionId") || "";
  const isPhoneLogin = mode === "phone-login";
  const title = useMemo(() => {
    if (mode === "forgot") {
      return "Xác thực OTP khôi phục mật khẩu";
    }

    if (isPhoneLogin) {
      return "Xác thực OTP đăng nhập";
    }

    return "Xác thực OTP đăng ký";
  }, [isPhoneLogin, mode]);

  const subtitle = useMemo(() => {
    if (mode === "forgot") {
      return "Mã OTP hết hạn sau 120 giây. Bạn có thể gửi lại mã nếu cần.";
    }

    if (isPhoneLogin) {
      return "Nhập OTP vừa được gửi đến số điện thoại liên kết để hoàn tất đăng nhập.";
    }

    return "Nhập OTP để hoàn tất tạo tài khoản.";
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
      <form onSubmit={onSubmit} className="space-y-4">
        <input type="hidden" {...form.register("sessionId")} />

        <div>
          <label htmlFor="otp" className="text-sm font-medium">
            OTP
          </label>
          <input
            id="otp"
            {...form.register("otp")}
            className="mt-1 h-11 w-full rounded-lg border border-white/30 bg-white/90 px-3 text-sm text-slate-900"
            placeholder="Nhập 6 số OTP"
          />
          <FormError message={form.formState.errors.otp?.message} />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
        >
          {isSubmitting ? "Đang xác thực..." : "Xác thực"}
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={resendMutation.isPending || countdown > 0}
          className="h-11 w-full rounded-lg border border-white/40 bg-white/10 text-sm font-semibold transition hover:bg-white/20 disabled:opacity-60"
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
