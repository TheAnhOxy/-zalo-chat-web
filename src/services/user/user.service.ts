import { apiClient } from "@/src/services/api/client";
import { PresignRequest, PresignResponse } from "@/src/types/api";
import { PrivacyStatus, IUser } from "@/src/types/user";

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

function unwrapEnvelope<T>(payload: unknown): T {
  const data = payload as ApiEnvelope<T> | T;

  if (data && typeof data === "object" && "data" in data && "success" in data) {
    return (data as ApiEnvelope<T>).data as T;
  }

  return data as T;
}

export interface UpdateUserPayload {
  fullName?: string;
  bio?: string;
  dob?: string;
  gender?: IUser["gender"];
  isBlocked?: boolean;
}

export interface UpdatePrivacyPayload {
  showPhone: PrivacyStatus;
  showOnline: boolean;
  allowStrangerMessage: boolean;
  findByPhone: boolean;
}

export interface UpdateStatusPayload {
  isOnline: boolean;
}

export interface UpdateAvatarPayload {
  avatar: string;
}

export interface UpdateCoverPayload {
  coverImage: string;
}

export const userService = {
  getProfile(userId: string) {
    return apiClient.get<unknown>(`/users/${userId}`).then((res) => unwrapEnvelope<IUser>(res.data));
  },

  updateProfile(userId: string, payload: UpdateUserPayload) {
    return apiClient.put<unknown>(`/users/${userId}`, payload).then((res) => unwrapEnvelope<IUser>(res.data));
  },

  updatePrivacy(userId: string, payload: UpdatePrivacyPayload) {
    return apiClient.patch<unknown>(`/users/${userId}/privacy`, payload).then((res) => unwrapEnvelope<IUser>(res.data));
  },

  updateStatus(userId: string, payload: UpdateStatusPayload) {
    return apiClient.patch<unknown>(`/users/${userId}/status`, payload).then((res) => unwrapEnvelope<IUser>(res.data));
  },

  requestAvatarPresign(userId: string, payload: PresignRequest) {
    return apiClient
      .post<unknown>(`/users/${userId}/avatar/presign`, payload)
      .then((res) => unwrapEnvelope<PresignResponse>(res.data));
  },

  updateAvatar(userId: string, payload: UpdateAvatarPayload) {
    return apiClient.patch<unknown>(`/users/${userId}/avatar`, payload).then((res) => unwrapEnvelope<IUser>(res.data));
  },

  requestCoverPresign(userId: string, payload: PresignRequest) {
    return apiClient
      .post<unknown>(`/users/${userId}/cover/presign`, payload)
      .then((res) => unwrapEnvelope<PresignResponse>(res.data));
  },

  updateCover(userId: string, payload: UpdateCoverPayload) {
    return apiClient.patch<unknown>(`/users/${userId}/cover`, payload).then((res) => unwrapEnvelope<IUser>(res.data));
  },

  async uploadToPresignedUrl(uploadUrl: string, file: File) {
    try {
      const response = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
      });

      if (!response.ok) {
        throw new Error("Tải ảnh lên S3 thất bại");
      }
    } catch {
      throw new Error("Không thể tải ảnh lên S3 từ trình duyệt. Vui lòng kiểm tra cấu hình CORS của bucket S3.");
    }
  },
};
