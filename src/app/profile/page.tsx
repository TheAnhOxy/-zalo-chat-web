"use client";

import { ChangeEvent, useState } from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppShell } from "@/src/components/ui/app-shell";
import { FormError } from "@/src/components/ui/form-error";
import { PageLoader } from "@/src/components/ui/page-state";
import { useAuth } from "@/src/components/providers/auth-provider";
import { useToast } from "@/src/components/providers/toast-provider";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { useProfile, useUpdateProfile, useUploadAvatar, useUploadCover } from "@/src/hooks/use-user";
import { userService } from "@/src/services/user/user.service";
import { getErrorMessage } from "@/src/utils/error";
import { imageUrlSchema, updateProfileSchema } from "@/src/utils/validators/user";

type ProfileValues = z.infer<typeof updateProfileSchema>;

export default function ProfilePage() {
  const auth = useAuthGuard();
  const { updateCurrentUser } = useAuth();
  const { showToast } = useToast();
  const profileQuery = useProfile(auth.user?._id);
  const updateProfileMutation = useUpdateProfile(auth.user?._id);
  const uploadAvatarMutation = useUploadAvatar(auth.user?._id);
  const uploadCoverMutation = useUploadCover(auth.user?._id);
  const [avatarUrlInput, setAvatarUrlInput] = useState("");
  const [coverUrlInput, setCoverUrlInput] = useState("");

  const form = useForm<ProfileValues>({
    resolver: zodResolver(updateProfileSchema),
  });

  if (!auth.isInitialized || !auth.user || profileQuery.isLoading) {
    return <PageLoader />;
  }

  const currentUser = auth.user;

  const profile = profileQuery.data;

  if (profile && form.getValues("fullName") !== profile.fullName) {
    form.reset({
      fullName: profile.fullName,
      bio: profile.bio || "",
      dob: profile.dob ? new Date(profile.dob).toISOString().slice(0, 10) : "",
      gender: profile.gender,
      isBlocked: profile.isBlocked,
    });
  }

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const updated = await updateProfileMutation.mutateAsync({
        fullName: values.fullName,
        bio: values.bio,
        dob: values.dob,
        gender: values.gender,
        isBlocked: values.isBlocked,
      });

      updateCurrentUser({
        _id: updated._id,
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone,
        avatar: updated.avatar,
        coverImage: updated.coverImage,
      });

      showToast("Cập nhật hồ sơ thành công", "success");
      profileQuery.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  });

  const handleUploadAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const updated = await uploadAvatarMutation.mutateAsync(file);
      updateCurrentUser({
        _id: currentUser._id,
        fullName: currentUser.fullName,
        email: currentUser.email,
        phone: currentUser.phone,
        avatar: updated.avatar,
        coverImage: currentUser.coverImage,
      });
      showToast("Cập nhật avatar thành công", "success");
      profileQuery.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  };

  const handleUpdateAvatarByUrl = async () => {
    const parsed = imageUrlSchema.safeParse(avatarUrlInput);
    if (!parsed.success) {
      showToast(parsed.error.issues[0]?.message || "URL ảnh đại diện không hợp lệ", "error");
      return;
    }

    try {
      const updated = await userService.updateAvatar(currentUser._id, { avatar: parsed.data });
      updateCurrentUser({
        _id: currentUser._id,
        fullName: currentUser.fullName,
        email: currentUser.email,
        phone: currentUser.phone,
        avatar: updated.avatar,
        coverImage: currentUser.coverImage,
      });
      showToast("Đã cập nhật avatar từ URL", "success");
      setAvatarUrlInput("");
      profileQuery.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  };

  const handleUploadCover = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const updated = await uploadCoverMutation.mutateAsync(file);
      updateCurrentUser({
        _id: currentUser._id,
        fullName: currentUser.fullName,
        email: currentUser.email,
        phone: currentUser.phone,
        avatar: currentUser.avatar,
        coverImage: updated.coverImage,
      });
      showToast("Cập nhật ảnh bìa thành công", "success");
      profileQuery.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  };

  const handleUpdateCoverByUrl = async () => {
    const parsed = imageUrlSchema.safeParse(coverUrlInput);
    if (!parsed.success) {
      showToast(parsed.error.issues[0]?.message || "URL ảnh bìa không hợp lệ", "error");
      return;
    }

    try {
      const updated = await userService.updateCover(currentUser._id, { coverImage: parsed.data });
      updateCurrentUser({
        _id: currentUser._id,
        fullName: currentUser.fullName,
        email: currentUser.email,
        phone: currentUser.phone,
        avatar: currentUser.avatar,
        coverImage: updated.coverImage,
      });
      showToast("Đã cập nhật ảnh bìa từ URL", "success");
      setCoverUrlInput("");
      profileQuery.refetch();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    }
  };

  return (
    <AppShell title="Hồ sơ của bạn">
      <div className="overflow-hidden rounded-2xl border border-slate-700">
        <div className="relative h-52 bg-slate-800">
          {profile?.coverImage ? (
            <Image src={profile.coverImage} alt="Cover" fill className="object-cover" unoptimized />
          ) : null}
          <label className="absolute right-4 top-4 cursor-pointer rounded-lg bg-black/60 px-3 py-2 text-xs font-semibold text-white">
            {uploadCoverMutation.isPending ? "Đang tải..." : "Đổi ảnh bìa"}
            <input type="file" accept="image/*" className="hidden" onChange={handleUploadCover} />
          </label>

          <div className="absolute bottom-3 left-4 right-4 flex gap-2 rounded-lg bg-slate-900/55 p-2">
            <input
              value={coverUrlInput}
              onChange={(event) => setCoverUrlInput(event.target.value)}
              placeholder="Dán URL ảnh bìa"
              className="h-8 flex-1 rounded-md px-2 text-xs text-slate-900"
            />
            <button type="button" onClick={handleUpdateCoverByUrl} className="rounded-md bg-white px-2 text-xs font-semibold text-slate-700">
              Lưu link
            </button>
          </div>
        </div>

        <div className="relative px-5 pb-5 pt-14">
          <div className="absolute -top-12 left-5 size-24 overflow-hidden rounded-full border-4 border-slate-900 bg-slate-700">
            {profile?.avatar ? (
              <Image src={profile.avatar} alt="Avatar" fill className="object-cover" unoptimized />
            ) : null}
          </div>

          <label className="absolute left-24 top-8 cursor-pointer rounded-full border border-slate-600 bg-slate-800 px-3 py-1 text-xs">
            {uploadAvatarMutation.isPending ? "..." : "Đổi"}
            <input type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} />
          </label>

          <div className="mt-4 flex max-w-lg items-center gap-2 rounded-xl bg-slate-800/70 p-2">
            <input
              value={avatarUrlInput}
              onChange={(event) => setAvatarUrlInput(event.target.value)}
              placeholder="Dán URL ảnh đại diện"
              className="h-9 flex-1 rounded-lg px-2 text-sm text-slate-900"
            />
            <button type="button" onClick={handleUpdateAvatarByUrl} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white">
              Lưu link
            </button>
          </div>

          <h3 className="text-2xl font-semibold">{profile?.fullName}</h3>
          <p className="mt-1 text-sm text-slate-400">{profile?.email}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Họ và tên</label>
          <input {...form.register("fullName")} className="mt-1 h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm" />
          <FormError message={form.formState.errors.fullName?.message} />
        </div>

        <div>
          <label className="text-sm font-medium">Giới tính</label>
          <select {...form.register("gender")} className="mt-1 h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm">
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
            <option value="other">Khác</option>
          </select>
          <FormError message={form.formState.errors.gender?.message} />
        </div>

        <div>
          <label className="text-sm font-medium">Ngày sinh</label>
          <input type="date" {...form.register("dob")} className="mt-1 h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm" />
          <FormError message={form.formState.errors.dob?.message} />
        </div>

        <div>
          <label className="text-sm font-medium">Bio</label>
          <input {...form.register("bio")} className="mt-1 h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm" />
          <FormError message={form.formState.errors.bio?.message} />
        </div>

        <div className="md:col-span-2">
          <button
            type="submit"
            disabled={updateProfileMutation.isPending}
            className="h-11 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-60"
          >
            {updateProfileMutation.isPending ? "Đang lưu..." : "Lưu hồ sơ"}
          </button>
        </div>
      </form>
    </AppShell>
  );
}
