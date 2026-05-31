"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { SettingsLayout } from "@/src/components/settings/settings-layout";
import {
  SettingsCard,
  SettingsPrimaryButton,
  SettingsShell,
  settingsInputClass,
  settingsLabelClass,
} from "@/src/components/settings/settings-ui";
import { FormError } from "@/src/components/ui/form-error";
import { PageLoader } from "@/src/components/ui/page-state";
import { useToast } from "@/src/components/providers/toast-provider";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { useChangePassword } from "@/src/hooks/use-auth-actions";
import { changePasswordSchema } from "@/src/utils/validators/auth";

type Values = z.infer<typeof changePasswordSchema>;

function PasswordField({
  label,
  show,
  onToggle,
  ...register
}: {
  label: string;
  show: boolean;
  onToggle: () => void;
} & ReturnType<ReturnType<typeof useForm<Values>>["register"]>) {
  return (
    <div>
      <label className={settingsLabelClass}>{label}</label>
      <div className="relative mt-1">
        <input
          type={show ? "text" : "password"}
          className={`${settingsInputClass} pr-11`}
          {...register}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--qc-text-secondary)]"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  );
}

export default function AccountSecurityPage() {
  const auth = useAuthGuard();
  const router = useRouter();
  const { showToast } = useToast();
  const changePasswordMutation = useChangePassword();
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<Values>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  });

  if (!auth.isInitialized || !auth.user) return <PageLoader />;

  const onSubmit = form.handleSubmit(async (values) => {
    if (!auth.user) return;
    if (values.newPassword !== values.confirmPassword) {
      showToast("Xác nhận mật khẩu chưa khớp", "error");
      return;
    }
    try {
      await changePasswordMutation.mutateAsync({
        userId: auth.user._id,
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      showToast("Đổi mật khẩu thành công", "success");
      router.push("/settings");
    } catch {
      showToast("Mật khẩu cũ không chính xác", "error");
    }
  });

  return (
    <SettingsLayout>
      <SettingsShell title="Tài khoản & Bảo mật">
        <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-4 pb-8">
          <SettingsCard>
            <h2 className="text-[17px] font-bold text-[var(--qc-text-primary)]">Đổi mật khẩu</h2>
            <div className="mt-4 space-y-4">
              <PasswordField
                label="Mật khẩu hiện tại"
                show={showOld}
                onToggle={() => setShowOld((v) => !v)}
                {...form.register("oldPassword")}
              />
              <FormError message={form.formState.errors.oldPassword?.message} />
              <PasswordField
                label="Mật khẩu mới"
                show={showNew}
                onToggle={() => setShowNew((v) => !v)}
                {...form.register("newPassword")}
              />
              <FormError message={form.formState.errors.newPassword?.message} />
              <PasswordField
                label="Nhập lại mật khẩu mới"
                show={showConfirm}
                onToggle={() => setShowConfirm((v) => !v)}
                {...form.register("confirmPassword")}
              />
              <FormError message={form.formState.errors.confirmPassword?.message} />
            </div>
          </SettingsCard>
          <SettingsPrimaryButton type="submit" loading={changePasswordMutation.isPending}>
            Cập nhật mật khẩu
          </SettingsPrimaryButton>
        </form>
      </SettingsShell>
    </SettingsLayout>
  );
}
