"use client";

import { ChangeEvent, useState } from "react";
import Image from "next/image";
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
import { useProfile, useUpdateProfile, useUploadAvatar, useUploadCover } from "@/src/hooks/use-user";
import { getErrorMessage } from "@/src/utils/error";
import { updateProfileSchema } from "@/src/utils/validators/user";

type ProfileValues = z.infer<typeof updateProfileSchema>;

export default function EditProfilePage() {
  const auth = useAuthGuard();
  const router = useRouter();
  const { updateCurrentUser } = useAuth();
  const { showToast } = useToast();
  const profileQuery = useProfile(auth.user?._id);
  const updateProfileMutation = useUpdateProfile(auth.user?._id);
  const uploadAvatarMutation = useUploadAvatar(auth.user?._id);
  const uploadCoverMutation = useUploadCover(auth.user?._id);

  const form = useForm<ProfileValues>({ resolver: zodResolver(updateProfileSchema) });

  if (!auth.isInitialized || !auth.user || profileQuery.isLoading) {
    return <PageLoader />;
  }

  const profile = profileQuery.data;
  const currentUser = auth.user;

  if (profile && form.getValues("fullName") !== profile.fullName) {
    form.reset({
      fullName: profile.fullName,
      bio: profile.bio || "",
      dob: profile.dob ? new Date(profile.dob).toISOString().slice(0, 10) : "",
      gender: profile.gender,
      isBlocked: profile.isBlocked,
    });
  }

  const syncUser = (updated: {
    _id: string;
    fullName: string;
    email: string;
    phone: string;
    avatar?: string;
    coverImage?: string;
  }) => {
    updateCurrentUser({
      _id: updated._id,
      fullName: updated.fullName,
      email: updated.email,
      phone: updated.phone,
      avatar: updated.avatar,
      coverImage: updated.coverImage,
    });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const updated = await updateProfileMutation.mutateAsync({
        fullName: values.fullName,
        bio: values.bio,
        dob: values.dob,
        gender: values.gender,
        isBlocked: values.isBlocked,
      });
      syncUser(updated);
      showToast("Cập nhật hồ sơ thành công", "success");
      profileQuery.refetch();
      router.push("/settings");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  });

  const handleUploadAvatar = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const updated = await uploadAvatarMutation.mutateAsync(file);
      syncUser({ ...currentUser, avatar: updated.avatar });
      showToast("Cập nhật ảnh đại diện thành công", "success");
      profileQuery.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  };

  const handleUploadCover = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const updated = await uploadCoverMutation.mutateAsync(file);
      syncUser({ ...currentUser, coverImage: updated.coverImage });
      showToast("Cập nhật ảnh bìa thành công", "success");
      profileQuery.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  };

  return (
    <SettingsLayout>
      <SettingsShell title="Chỉnh sửa hồ sơ">
        <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-4 pb-8">
          <SettingsCard className="!p-0 overflow-hidden">
            <div className="relative h-40 bg-[var(--qc-bg)]">
              {profile?.coverImage ? (
                <Image src={profile.coverImage} alt="" fill className="object-cover" unoptimized />
              ) : null}
              <label className="absolute right-3 top-3 cursor-pointer rounded-lg bg-black/50 px-3 py-1.5 text-xs font-semibold text-white">
                {uploadCoverMutation.isPending ? "Đang tải..." : "Đổi ảnh bìa"}
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadCover} />
              </label>
            </div>
            <div className="relative px-4 pb-4 pt-12">
              <div className="absolute -top-10 left-4 h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-[var(--qc-primary-light)]">
                {profile?.avatar ? (
                  <Image src={profile.avatar} alt="" fill className="object-cover" unoptimized />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xl font-bold text-[var(--qc-primary)]">
                    {(profile?.fullName || "U").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <label className="absolute left-24 top-2 cursor-pointer rounded-full border border-[var(--qc-divider)] bg-white px-3 py-1 text-xs font-medium">
                {uploadAvatarMutation.isPending ? "..." : "Đổi avatar"}
                <input type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} />
              </label>
              <p className="mt-2 text-sm text-[var(--qc-text-secondary)]">{profile?.phone}</p>
              <p className="text-sm text-[var(--qc-text-secondary)]">{profile?.email}</p>
            </div>
          </SettingsCard>

          <SettingsCard>
            <div className="space-y-4">
              <div>
                <label className={settingsLabelClass}>Họ và tên</label>
                <input {...form.register("fullName")} className={settingsInputClass} />
                <FormError message={form.formState.errors.fullName?.message} />
              </div>
              <div>
                <label className={settingsLabelClass}>Giới tính</label>
                <select {...form.register("gender")} className={settingsInputClass}>
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>
              <div>
                <label className={settingsLabelClass}>Ngày sinh</label>
                <input type="date" {...form.register("dob")} className={settingsInputClass} />
                <FormError message={form.formState.errors.dob?.message} />
              </div>
              <div>
                <label className={settingsLabelClass}>Tiểu sử</label>
                <textarea
                  {...form.register("bio")}
                  rows={3}
                  className={`${settingsInputClass} min-h-[88px] resize-none py-2`}
                />
                <FormError message={form.formState.errors.bio?.message} />
              </div>
            </div>
          </SettingsCard>

          <SettingsPrimaryButton type="submit" loading={updateProfileMutation.isPending}>
            Lưu hồ sơ
          </SettingsPrimaryButton>
        </form>
      </SettingsShell>
    </SettingsLayout>
  );
}
