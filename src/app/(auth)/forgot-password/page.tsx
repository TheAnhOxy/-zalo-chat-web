"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthShell } from "@/src/components/ui/auth-shell";
import { FormError } from "@/src/components/ui/form-error";
import { useToast } from "@/src/components/providers/toast-provider";
import { useRequestForgotPasswordOtp } from "@/src/hooks/use-auth-actions";
import { getErrorMessage } from "@/src/utils/error";
import { forgotPasswordSchema } from "@/src/utils/validators/auth";

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const requestOtpMutation = useRequestForgotPasswordOtp();

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const response = await requestOtpMutation.mutateAsync({
        email: values.email,
        newPassword: values.newPassword,
      });
      showToast("Đã gửi OTP khôi phục mật khẩu", "success");
      router.push(`/verify-otp?mode=forgot&sessionId=${response.sessionId}`);
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  });

  return (
    <AuthShell title="Quên mật khẩu" subtitle="Sử dụng API /auth/forgot-password/request-otp">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            {...form.register("email")}
            className="mt-1 h-11 w-full rounded-lg border border-white/30 bg-white/90 px-3 text-sm text-slate-900"
            placeholder="Nhập email"
          />
          <FormError message={form.formState.errors.email?.message} />
        </div>

        <div>
          <label htmlFor="newPassword" className="text-sm font-medium">
            Mật khẩu mới
          </label>
          <input
            id="newPassword"
            type="password"
            {...form.register("newPassword")}
            className="mt-1 h-11 w-full rounded-lg border border-white/30 bg-white/90 px-3 text-sm text-slate-900"
            placeholder="Tối thiểu 8 ký tự, gồm hoa/thường/số"
          />
          <FormError message={form.formState.errors.newPassword?.message} />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Xác nhận mật khẩu mới
          </label>
          <input
            id="confirmPassword"
            type="password"
            {...form.register("confirmPassword")}
            className="mt-1 h-11 w-full rounded-lg border border-white/30 bg-white/90 px-3 text-sm text-slate-900"
            placeholder="Nhập lại mật khẩu mới"
          />
          <FormError message={form.formState.errors.confirmPassword?.message} />
        </div>

        <button
          type="submit"
          disabled={requestOtpMutation.isPending}
          className="h-11 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
        >
          {requestOtpMutation.isPending ? "Đang gửi OTP..." : "Gửi OTP"}
        </button>
      </form>
    </AuthShell>
  );
}
