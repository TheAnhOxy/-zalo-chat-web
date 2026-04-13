"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { userService, UpdatePrivacyPayload, UpdateUserPayload } from "@/src/services/user/user.service";

export function useProfile(userId?: string) {
  return useQuery({
    queryKey: ["profile", userId],
    queryFn: () => userService.getProfile(userId as string),
    enabled: Boolean(userId),
  });
}

export function useUpdateProfile(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateUserPayload) => userService.updateProfile(userId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });
}

export function useUpdatePrivacy(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdatePrivacyPayload) => userService.updatePrivacy(userId as string, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });
}

export function useUpdateStatus(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (isOnline: boolean) => userService.updateStatus(userId as string, { isOnline }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });
}

export function useUploadAvatar(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!file.type?.startsWith("image/")) {
        throw new Error("Chỉ chấp nhận tệp ảnh cho avatar");
      }

      const contentType = file.type || "image/jpeg";
      const presign = await userService.requestAvatarPresign(userId as string, {
        fileName: file.name,
        contentType,
      });

      await userService.uploadToPresignedUrl(presign.uploadUrl, file);
      return userService.updateAvatar(userId as string, { avatar: presign.fileUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });
}

export function useUploadCover(userId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!file.type?.startsWith("image/")) {
        throw new Error("Chỉ chấp nhận tệp ảnh cho ảnh bìa");
      }

      const contentType = file.type || "image/jpeg";
      const presign = await userService.requestCoverPresign(userId as string, {
        fileName: file.name,
        contentType,
      });

      await userService.uploadToPresignedUrl(presign.uploadUrl, file);
      return userService.updateCover(userId as string, { coverImage: presign.fileUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });
}
