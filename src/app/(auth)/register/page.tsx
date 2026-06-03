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
import { useRegister } from "@/src/hooks/use-auth-actions";
import { getErrorMessage } from "@/src/utils/error";
import { registerSchema } from "@/src/utils/validators/auth";
import { User, Phone, Mail, Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const registerMutation = useRegister();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const response = await registerMutation.mutateAsync({
        fullName: values.fullName,
        phone: values.phone,
        email: values.email,
        password: values.password,
      });
      showToast("Đăng ký thành công, vui lòng nhập OTP", "success");
      router.push(`/verify-otp?mode=register&sessionId=${response.sessionId}`);
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  });

  return (
    <AuthShell title="Đăng ký" subtitle="Tạo tài khoản QuickChat mới">
      <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Họ và tên */}
        <div className="auth-input-group" style={{ marginBottom: 0 }}>
          <label htmlFor="fullName" className="auth-input-label">
            Họ và tên
          </label>
          <div className="auth-input-wrapper">
            <span className="auth-input-icon">
              <User className="size-4" />
            </span>
            <input
              id="fullName"
              {...form.register("fullName")}
              className="auth-input"
              placeholder="Nguyễn Văn A"
            />
          </div>
          <FormError message={form.formState.errors.fullName?.message} />
        </div>

        {/* Số điện thoại */}
        <div className="auth-input-group" style={{ marginBottom: 0 }}>
          <label htmlFor="phone" className="auth-input-label">
            Số điện thoại
          </label>
          <div className="auth-input-wrapper">
            <span className="auth-input-icon">
              <Phone className="size-4" />
            </span>
            <input
              id="phone"
              {...form.register("phone")}
              className="auth-input"
              placeholder="0901234567"
            />
          </div>
          <FormError message={form.formState.errors.phone?.message} />
        </div>

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

        {/* Mật khẩu */}
        <div className="auth-input-group" style={{ marginBottom: 0 }}>
          <label htmlFor="password" className="auth-input-label">
            Mật khẩu
          </label>
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

        {/* Xác nhận mật khẩu */}
        <div className="auth-input-group" style={{ marginBottom: 0 }}>
          <label htmlFor="confirmPassword" className="auth-input-label">
            Xác nhận mật khẩu
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
              placeholder="Nhập lại mật khẩu"
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
            disabled={registerMutation.isPending}
            className="auth-btn-primary"
          >
            {registerMutation.isPending ? "Đang đăng ký..." : "Đăng ký"}
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
