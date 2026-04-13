import axios from "axios";
import { ApiErrorPayload } from "@/src/types/api";

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) {
      return "Sai tài khoản hoặc mật khẩu";
    }

    const data = error.response?.data as ApiErrorPayload | undefined;

    if (data?.message) {
      return data.message;
    }

    if (typeof data?.error === "string") {
      return data.error;
    }

    return error.message || "Có lỗi xảy ra";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Có lỗi xảy ra";
}
