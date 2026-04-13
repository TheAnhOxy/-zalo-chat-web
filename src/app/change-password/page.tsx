"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Eye, EyeOff } from "lucide-react";
import { AppShell } from "@/src/components/ui/app-shell";
import { FormError } from "@/src/components/ui/form-error";
import { PageLoader } from "@/src/components/ui/page-state";
import { useToast } from "@/src/components/providers/toast-provider";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { useChangePassword } from "@/src/hooks/use-auth-actions";
import { changePasswordSchema } from "@/src/utils/validators/auth";

type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordPage() {
  const auth = useAuthGuard();
  const { showToast } = useToast();
  const changePasswordMutation = useChangePassword();
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  if (!auth.isInitialized || !auth.user) {
    return <PageLoader />;
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (values.newPassword !== values.confirmPassword) {
      showToast("Xác nhận mật khẩu mới không khớp", "error");
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({
        userId: auth.user._id,
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });

      showToast("Đổi mật khẩu thành công", "success");
      form.reset();
    } catch {
      showToast("Mật khẩu cũ không chính xác", "error");
    }
  });

  return (
    <AppShell title="Đổi mật khẩu">
      <form onSubmit={onSubmit} className="max-w-md space-y-4">
        <div>
          <label className="text-sm font-medium">Mật khẩu cũ</label>
          <div className="relative mt-1">
            <input
              type={showOldPassword ? "text" : "password"}
              {...form.register("oldPassword")}
              className="h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 pr-11 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowOldPassword((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-700"
            >
              {showOldPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <FormError message={form.formState.errors.oldPassword?.message} />
        </div>

        <div>
          <label className="text-sm font-medium">Mật khẩu mới</label>
          <div className="relative mt-1">
            <input
              type={showNewPassword ? "text" : "password"}
              {...form.register("newPassword")}
              className="h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 pr-11 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-700"
            >
              {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <FormError message={form.formState.errors.newPassword?.message} />
        </div>

        <div>
          <label className="text-sm font-medium">Xác nhận mật khẩu mới</label>
          <div className="relative mt-1">
            <input
              type={showConfirmPassword ? "text" : "password"}
              {...form.register("confirmPassword")}
              className="h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 pr-11 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-700"
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <FormError message={form.formState.errors.confirmPassword?.message} />
        </div>

        <button
          type="submit"
          disabled={changePasswordMutation.isPending}
          className="h-11 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
        >
          {changePasswordMutation.isPending ? "Đang cập nhật..." : "Đổi mật khẩu"}
        </button>
      </form>
    </AppShell>
  );
}
