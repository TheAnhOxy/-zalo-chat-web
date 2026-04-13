import { z } from "zod";

export const STRONG_PASSWORD_MESSAGE =
  "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và chữ số";

export const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
export const vietnamPhoneRegex = /^(?:0|84)(?:3|5|7|8|9)\d{8}$/;

export function normalizePhone(value: string) {
  return value.replace(/\s+/g, "").trim();
}

export const loginSchema = z.object({
  identifier: z.string().min(1, "Vui lòng nhập email hoặc số điện thoại"),
  password: z.string().regex(strongPasswordRegex, STRONG_PASSWORD_MESSAGE),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Họ tên tối thiểu 2 ký tự"),
    phone: z
      .string()
      .transform(normalizePhone)
      .refine((value) => vietnamPhoneRegex.test(value), "Số điện thoại Việt Nam không hợp lệ"),
    email: z.string().trim().email("Email không hợp lệ"),
    password: z.string().regex(strongPasswordRegex, STRONG_PASSWORD_MESSAGE),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Xác nhận mật khẩu không khớp",
    path: ["confirmPassword"],
  });

export const verifyOtpSchema = z.object({
  sessionId: z.string().min(1, "Thiếu sessionId"),
  otp: z.string().regex(/^\d{6}$/, "OTP phải gồm đúng 6 chữ số"),
});

export const forgotPasswordSchema = z
  .object({
    email: z.string().trim().email("Email không hợp lệ"),
    newPassword: z.string().regex(strongPasswordRegex, STRONG_PASSWORD_MESSAGE),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Xác nhận mật khẩu không khớp",
    path: ["confirmPassword"],
  });

export const requestPhoneOtpSchema = z.object({
  phone: z
    .string()
    .transform(normalizePhone)
    .refine((value) => vietnamPhoneRegex.test(value), "Số điện thoại Việt Nam không hợp lệ"),
});

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(8, "Mật khẩu cũ tối thiểu 8 ký tự"),
    newPassword: z.string().regex(strongPasswordRegex, STRONG_PASSWORD_MESSAGE),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "Xác nhận mật khẩu không khớp",
    path: ["confirmPassword"],
  });
