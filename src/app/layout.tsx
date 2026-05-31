import type { Metadata } from "next";
import "./globals.css"; // Đảm bảo dòng này có mặt để kích hoạt Tailwind
import { AppProvider } from "@/src/components/providers/app-provider";

export const metadata: Metadata = {
  title: "Zalo Clone - Thế Anh",
  description: "Chat App built with Next.js and NestJS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      {/* Thêm class "dark" vào body nếu bạn muốn test giao diện tối luôn */}
      <body className="font-sans font-normal antialiased" suppressHydrationWarning>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}