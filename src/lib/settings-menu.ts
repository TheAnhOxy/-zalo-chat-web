import {
  Bell,
  BookOpen,
  Cloud,
  Globe,
  HardDrive,
  Headphones,
  Lock,
  MessageCircle,
  MonitorSmartphone,
  Palette,
  Shield,
} from "lucide-react";

export type SettingsMenuItem = {
  icon: typeof Lock;
  title: string;
  subtitle: string;
  href?: string;
};

export const SETTINGS_MENU_ITEMS: SettingsMenuItem[] = [
  {
    icon: Lock,
    title: "Tài khoản & Bảo mật",
    subtitle: "Mật khẩu, xác thực 2 lớp",
    href: "/settings/account-security",
  },
  {
    icon: MonitorSmartphone,
    title: "Thiết bị & Phiên đăng nhập",
    subtitle: "Quản lý các thiết bị đang kết nối",
    href: "/settings/device-sessions",
  },
  {
    icon: Bell,
    title: "Thông báo",
    subtitle: "Âm thanh, rung, cảnh báo",
  },
  {
    icon: Shield,
    title: "Quyền riêng tư",
    subtitle: "Ai có thể nhìn tin, trạng thái",
    href: "/settings/privacy",
  },
  {
    icon: MessageCircle,
    title: "Tin nhắn & Cuộc gọi",
    subtitle: "Cài đặt trò chuyện, media",
  },
  {
    icon: Palette,
    title: "Giao diện & Chủ đề",
    subtitle: "Đổi chủ đề, hình nền",
  },
  {
    icon: Globe,
    title: "Ngôn ngữ & Phông chữ",
    subtitle: "Tiếng Việt, cỡ chữ hệ thống",
  },
  {
    icon: HardDrive,
    title: "Dữ liệu & Bộ nhớ",
    subtitle: "Bộ nhớ đệm, tự động tải",
  },
  {
    icon: Cloud,
    title: "Sao lưu & Khôi phục",
    subtitle: "Sao lưu lên Google Drive",
  },
  {
    icon: Headphones,
    title: "Trung tâm trợ giúp",
    subtitle: "Câu hỏi thường gặp, hướng dẫn",
  },
  {
    icon: BookOpen,
    title: "Điều khoản & Chính sách",
    subtitle: "Quy định sử dụng, bảo mật dữ liệu",
  },
];
