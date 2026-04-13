import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

function isValidDateString(value: string) {
  if (!dateRegex.test(value)) {
    return false;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  // Guard invalid dates like 2026-02-31.
  const [year, month, day] = value.split("-").map(Number);
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() + 1 === month && parsed.getUTCDate() === day;
}

export const imageUrlSchema = z
  .string()
  .trim()
  .url("URL không hợp lệ")
  .refine((value) => {
    const parsed = new URL(value);
    return Boolean(parsed.protocol) && Boolean(parsed.hostname);
  }, "URL ảnh phải có scheme và host");

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Họ tên tối thiểu 2 ký tự"),
  bio: z.string().optional(),
  dob: z
    .string()
    .optional()
    .refine((value) => !value || isValidDateString(value), "Ngày sinh phải theo YYYY-MM-DD và là ngày hợp lệ"),
  gender: z.enum(["male", "female", "other"]),
  isBlocked: z.boolean().optional(),
});

export const updatePrivacySchema = z.object({
  showPhone: z.enum(["ALL", "FRIEND", "PRIVATE"]),
  showOnline: z.boolean(),
  allowStrangerMessage: z.boolean(),
  findByPhone: z.boolean(),
});
