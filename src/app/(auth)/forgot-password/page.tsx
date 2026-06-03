"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthShell } from "@/src/components/ui/auth-shell";
import { FormError } from "@/src/components/ui/form-error";
import { useToast } from "@/src/components/providers/toast-provider";
import { useRequestForgotPasswordOtp } from "@/src/hooks/use-auth-actions";
import { getErrorMessage } from "@/src/utils/error";
import { forgotPasswordSchema } from "@/src/utils/validators/auth";
import { Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const requestOtpMutation = useRequestForgotPasswordOtp();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    <AuthShell title="Quên mật khẩu" subtitle="Nhập thông tin để thiết lập lại mật khẩu">
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Email */}
        <div className="auth-input-group" style={{ marginBottom: 0 }}>
          <label htmlFor="email" className="auth-input-label">
            Email
          </label>
          <div className="auth-input-wrapper">
            <span className="auth-input-icon">
              <Mail className="size-4" />
            </span>
            <input
              id="email"
              {...form.register("email")}
              className="auth-input"
              placeholder="you@gmail.com"
            />
          </div>
          <FormError message={form.formState.errors.email?.message} />
        </div>

        {/* Mật khẩu mới */}
        <div className="auth-input-group" style={{ marginBottom: 0 }}>
          <label htmlFor="newPassword" className="auth-input-label">
            Mật khẩu mới
          </label>
          <div className="auth-input-wrapper">
            <span className="auth-input-icon">
              <Lock className="size-4" />
            </span>
            <input
              id="newPassword"
              type={showPassword ? "text" : "password"}
              {...form.register("newPassword")}
              className="auth-input auth-input-password"
              placeholder="Nhập mật khẩu mới"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="auth-eye-btn"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <FormError message={form.formState.errors.newPassword?.message} />
        </div>

        {/* Xác nhận mật khẩu mới */}
        <div className="auth-input-group" style={{ marginBottom: 0 }}>
          <label htmlFor="confirmPassword" className="auth-input-label">
            Xác nhận mật khẩu mới
          </label>
          <div className="auth-input-wrapper">
            <span className="auth-input-icon">
              <Lock className="size-4" />
            </span>
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              {...form.register("confirmPassword")}
              className="auth-input auth-input-password"
              placeholder="Nhập lại mật khẩu mới"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="auth-eye-btn"
            >
              {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <FormError message={form.formState.errors.confirmPassword?.message} />
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", paddingTop: "0.5rem" }}>
          <button
            type="submit"
            disabled={requestOtpMutation.isPending}
            className="auth-btn-primary"
          >
            {requestOtpMutation.isPending ? "Đang gửi OTP..." : "Gửi OTP"}
          </button>
          <Link href="/login" className="auth-btn-secondary" style={{ textDecoration: "none" }}>
            <ArrowLeft className="size-4" />
            Trở lại đăng nhập
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
