"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/components/providers/auth-provider";

const navItems = [
  { href: "/", label: "Trang chủ" },
  { href: "/profile", label: "Hồ sơ" },
  { href: "/privacy", label: "Quyền riêng tư" },
  { href: "/change-password", label: "Đổi mật khẩu" },
  { href: "/sessions", label: "Phiên đăng nhập" },
  { href: "/contacts", label: "Danh bạ bạn bè" },
  { href: "/groups", label: "Nhóm" },
];

export function AppShell({ title, children }: { title: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const auth = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/90">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">QuickChat</p>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{auth.user?.fullName}</p>
            <p className="text-xs text-slate-400">{auth.user?.email}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-6 md:grid-cols-[250px_1fr]">
        <aside className="h-fit rounded-xl border border-slate-800 bg-slate-900 p-3">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm transition ${
                  pathname === item.href ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            onClick={auth.logout}
            className="mt-3 w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Đăng xuất
          </button>
        </aside>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-4 md:p-6">{children}</section>
      </div>
    </div>
  );
}
