"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  Lock,
  LogOut,
  MonitorSmartphone,
  Shield,
  UserRoundPen,
} from "lucide-react";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { useProfile } from "@/src/hooks/use-user";
import { AppNavSidebar } from "@/src/components/layout/app-nav-sidebar";
import { PageLoader } from "@/src/components/ui/page-state";

const menuGroups = [
  {
    items: [
      { href: "/profile", icon: UserRoundPen, title: "Chỉnh sửa hồ sơ", subtitle: "Tên, ảnh đại diện, tiểu sử" },
      { href: "/change-password", icon: Lock, title: "Tài khoản & Bảo mật", subtitle: "Mật khẩu, xác thực" },
      { href: "/sessions", icon: MonitorSmartphone, title: "Thiết bị & Phiên đăng nhập", subtitle: "Quản lý thiết bị đang kết nối" },
      { href: "/privacy", icon: Shield, title: "Quyền riêng tư", subtitle: "Ai được xem thông tin của bạn" },
    ],
  },
];

export default function SettingsPage() {
  const auth = useAuthGuard();
  const profileQuery = useProfile(auth.user?._id);

  if (!auth.isInitialized || !auth.user) return <PageLoader />;

  const profile = profileQuery.data;
  const userName = profile?.fullName || auth.user.fullName || "Người dùng";
  const userEmail = profile?.email || auth.user.email || "";
  const avatar = profile?.avatar || auth.user.avatar;

  return (
    <main className="h-screen overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-amber-50 text-slate-800">
      <div className="h-full w-full md:grid md:grid-cols-[72px_1fr]">
        <AppNavSidebar activeTab="profile" />

        <section className="h-full overflow-y-auto bg-slate-50">
          <header className="border-b border-slate-200 bg-white px-6 py-4">
            <h1 className="text-xl font-bold text-slate-900">Cá nhân</h1>
          </header>

          <div className="mx-auto max-w-2xl space-y-5 p-4 md:p-6">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="relative h-28 bg-gradient-to-br from-emerald-600 to-teal-700" />
              <div className="relative px-6 pb-6 pt-0">
                <div className="-mt-12 flex flex-col items-center">
                  <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-emerald-100 shadow-md">
                    {avatar ? (
                      <Image src={avatar} alt={userName} fill className="object-cover" unoptimized />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-emerald-700">
                        {userName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-slate-900">{userName}</h2>
                  <p className="text-sm text-slate-500">{userEmail}</p>
                  <Link
                    href="/profile"
                    className="mt-4 w-full rounded-xl bg-emerald-600 py-3 text-center text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Chỉnh sửa hồ sơ
                  </Link>
                </div>
              </div>
            </div>

            {menuGroups.map((group, gi) => (
              <div key={gi} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {group.items.map((item, ii) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-4 px-4 py-4 transition hover:bg-slate-50 ${
                        ii < group.items.length - 1 ? "border-b border-slate-100" : ""
                      }`}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <Icon size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-800">{item.title}</p>
                        <p className="text-xs text-slate-500">{item.subtitle}</p>
                      </div>
                      <ChevronRight size={18} className="shrink-0 text-slate-400" />
                    </Link>
                  );
                })}
              </div>
            ))}

            <button
              type="button"
              onClick={() => auth.logout()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 py-3.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
            >
              <LogOut size={18} />
              Đăng xuất
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
