"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "@/src/components/ui/app-shell";
import { FormError } from "@/src/components/ui/form-error";
import { PageLoader } from "@/src/components/ui/page-state";
import { useToast } from "@/src/components/providers/toast-provider";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { useProfile, useUpdatePrivacy } from "@/src/hooks/use-user";
import { getErrorMessage } from "@/src/utils/error";
import { updatePrivacySchema } from "@/src/utils/validators/user";

type PrivacyValues = z.infer<typeof updatePrivacySchema>;

export default function PrivacyPage() {
  const auth = useAuthGuard();
  const { showToast } = useToast();
  const profileQuery = useProfile(auth.user?._id);
  const updatePrivacyMutation = useUpdatePrivacy(auth.user?._id);

  const form = useForm<PrivacyValues>({
    resolver: zodResolver(updatePrivacySchema),
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
    });
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updatePrivacyMutation.mutateAsync(values);
      showToast("Cập nhật quyền riêng tư thành công", "success");
      profileQuery.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  });

  return (
    <AppShell title="Quyền riêng tư">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Hiển thị số điện thoại</label>
          <select {...form.register("showPhone")} className="mt-1 h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm md:max-w-sm">
            <option value="ALL">Tất cả mọi người</option>
            <option value="FRIEND">Bạn bè</option>
            <option value="PRIVATE">Riêng tư</option>
          </select>
          <FormError message={form.formState.errors.showPhone?.message} />
        </div>

        <label className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 md:max-w-sm">
          <span className="text-sm">Hiển thị trạng thái online</span>
          <input type="checkbox" {...form.register("showOnline")} className="size-5" />
        </label>

        <label className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 md:max-w-sm">
          <span className="text-sm">Cho phép người lạ nhắn tin</span>
          <input type="checkbox" {...form.register("allowStrangerMessage")} className="size-5" />
        </label>

        <label className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 md:max-w-sm">
          <span className="text-sm">Cho phép tìm bằng số điện thoại</span>
          <input type="checkbox" {...form.register("findByPhone")} className="size-5" />
        </label>

        <button
          type="submit"
          disabled={updatePrivacyMutation.isPending}
          className="h-11 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
        >
          {updatePrivacyMutation.isPending ? "Đang lưu..." : "Lưu quyền riêng tư"}
        </button>
      </form>
    </AppShell>
  );
}
