"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useRouter } from "next/navigation";
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
import { useAuth } from "@/src/components/providers/auth-provider";
import { useToast } from "@/src/components/providers/toast-provider";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { useProfile, useUpdatePrivacy, useUpdateStatus } from "@/src/hooks/use-user";
import { getErrorMessage } from "@/src/utils/error";
import { updatePrivacySchema } from "@/src/utils/validators/user";

type PrivacyValues = z.infer<typeof updatePrivacySchema> & { isOnline?: boolean };

function ToggleRow({
  label,
  subtitle,
  checked,
  onChange,
}: {
  label: string;
  subtitle?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium text-[var(--qc-text-primary)]">{label}</p>
        {subtitle ? <p className="text-xs text-[var(--qc-text-secondary)]">{subtitle}</p> : null}
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 accent-[var(--qc-primary)]"
      />
    </label>
  );
}

export default function PrivacySettingsPage() {
  const auth = useAuthGuard();
  const { updateCurrentUser } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();
  const profileQuery = useProfile(auth.user?._id);
  const updatePrivacyMutation = useUpdatePrivacy(auth.user?._id);
  const updateStatusMutation = useUpdateStatus(auth.user?._id);

  const form = useForm<PrivacyValues>({
    resolver: zodResolver(updatePrivacySchema),
    defaultValues: {
      showPhone: "FRIEND",
      showOnline: true,
      allowStrangerMessage: false,
      findByPhone: true,
      isOnline: true,
    },
  });

  if (!auth.isInitialized || !auth.user || profileQuery.isLoading) {
    return <PageLoader />;
  }

  const profile = profileQuery.data;

  if (profile && form.getValues("showPhone") !== profile.privacy.showPhone) {
    form.reset({
      showPhone: profile.privacy.showPhone,
      showOnline: profile.privacy.showOnline,
      allowStrangerMessage: profile.privacy.allowStrangerMessage,
      findByPhone: profile.privacy.findByPhone,
      isOnline: profile.status?.isOnline ?? true,
    });
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updatePrivacyMutation.mutateAsync({
        showPhone: values.showPhone,
        showOnline: values.showOnline,
        allowStrangerMessage: values.allowStrangerMessage,
        findByPhone: values.findByPhone,
      });
      if (typeof values.isOnline === "boolean") {
        await updateStatusMutation.mutateAsync(values.isOnline);
      }
      await profileQuery.refetch();
      if (auth.user && profile) {
        updateCurrentUser({
          ...auth.user,
          avatar: profile.avatar,
          coverImage: profile.coverImage,
        });
      }
      showToast("Đã cập nhật quyền riêng tư", "success");
      router.push("/settings");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  });

  const isOnline = form.watch("isOnline") ?? true;

  return (
    <SettingsLayout>
      <SettingsShell title="Quyền riêng tư">
        <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-3 pb-8">
          <SettingsCard>
            <h2 className="text-base font-bold text-[var(--qc-text-primary)]">Quyền riêng tư</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className={settingsLabelClass}>Ai xem được số điện thoại</label>
                <select {...form.register("showPhone")} className={settingsInputClass}>
                  <option value="ALL">Mọi người</option>
                  <option value="FRIEND">Bạn bè</option>
                  <option value="PRIVATE">Chỉ mình tôi</option>
                </select>
                <FormError message={form.formState.errors.showPhone?.message} />
              </div>
              <ToggleRow
                label="Ai thấy trạng thái online"
                subtitle="Bật/tắt hiển thị trạng thái online"
                checked={form.watch("showOnline")}
                onChange={(v) => form.setValue("showOnline", v)}
              />
              <ToggleRow
                label="Trạng thái hoạt động"
                subtitle="Tắt trạng thái hoạt động như Zalo"
                checked={isOnline}
                onChange={(v) => form.setValue("isOnline", v)}
              />
              <ToggleRow
                label="Cho phép tìm bằng số điện thoại"
                checked={form.watch("findByPhone")}
                onChange={(v) => form.setValue("findByPhone", v)}
              />
              <ToggleRow
                label="Cho người lạ nhắn tin"
                checked={form.watch("allowStrangerMessage")}
                onChange={(v) => form.setValue("allowStrangerMessage", v)}
              />
            </div>
          </SettingsCard>

          {profile ? (
            <SettingsCard>
              <h3 className="text-[15px] font-bold text-[var(--qc-text-primary)]">Thông tin bảo mật</h3>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[var(--qc-text-secondary)]">isVerified</span>
                  <span className="font-semibold">{profile.isVerified ? "true" : "false"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--qc-text-secondary)]">isBlocked</span>
                  <span className="font-semibold">{profile.isBlocked ? "true" : "false"}</span>
                </div>
              </div>
            </SettingsCard>
          ) : null}

          <SettingsPrimaryButton
            type="submit"
            loading={updatePrivacyMutation.isPending || updateStatusMutation.isPending}
          >
            Lưu quyền riêng tư
          </SettingsPrimaryButton>
        </form>
      </SettingsShell>
    </SettingsLayout>
  );
}
