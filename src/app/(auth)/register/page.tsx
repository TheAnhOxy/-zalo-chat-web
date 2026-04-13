"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthShell } from "@/src/components/ui/auth-shell";
import { FormError } from "@/src/components/ui/form-error";
import { useToast } from "@/src/components/providers/toast-provider";
import { useRegister } from "@/src/hooks/use-auth-actions";
import { getErrorMessage } from "@/src/utils/error";
import { registerSchema } from "@/src/utils/validators/auth";

type RegisterValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const registerMutation = useRegister();

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
    <AuthShell title="Đăng ký" subtitle="Sử dụng API /auth/register để tạo phiên OTP">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="text-sm font-medium">
            Họ và tên
          </label>
          <input
            id="fullName"
            {...form.register("fullName")}
            className="mt-1 h-11 w-full rounded-lg border border-white/30 bg-white/90 px-3 text-sm text-slate-900"
            placeholder="Ví dụ: Nguyễn Văn A"
          />
          <FormError message={form.formState.errors.fullName?.message} />
        </div>

        <div>
          <label htmlFor="phone" className="text-sm font-medium">
            Số điện thoại
          </label>
          <input
            id="phone"
            {...form.register("phone")}
            className="mt-1 h-11 w-full rounded-lg border border-white/30 bg-white/90 px-3 text-sm text-slate-900"
            placeholder="Ví dụ: 0912345678 hoặc 84912345678"
          />
          <FormError message={form.formState.errors.phone?.message} />
        </div>

        <div>
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            {...form.register("email")}
            className="mt-1 h-11 w-full rounded-lg border border-white/30 bg-white/90 px-3 text-sm text-slate-900"
            placeholder="name@company.com"
          />
          <FormError message={form.formState.errors.email?.message} />
        </div>

        <div>
          <label htmlFor="password" className="text-sm font-medium">
            Mật khẩu
          </label>
          <input
            id="password"
            type="password"
            {...form.register("password")}
            className="mt-1 h-11 w-full rounded-lg border border-white/30 bg-white/90 px-3 text-sm text-slate-900"
            placeholder="Tối thiểu 8 ký tự, gồm hoa/thường/số"
          />
          <FormError message={form.formState.errors.password?.message} />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="text-sm font-medium">
            Xác nhận mật khẩu
          </label>
          <input
            id="confirmPassword"
            type="password"
            {...form.register("confirmPassword")}
            className="mt-1 h-11 w-full rounded-lg border border-white/30 bg-white/90 px-3 text-sm text-slate-900"
            placeholder="Nhập lại mật khẩu"
          />
          <FormError message={form.formState.errors.confirmPassword?.message} />
        </div>

        <button
          type="submit"
          disabled={registerMutation.isPending}
          className="h-11 w-full rounded-lg bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
        >
          {registerMutation.isPending ? "Đang gửi..." : "Đăng ký"}
        </button>
      </form>
    </AuthShell>
  );
}
