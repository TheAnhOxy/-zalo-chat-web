"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  GalleryVertical,
  MessageCircle,
  Sparkles,
  User,
  Users,
} from "lucide-react";

type MobileNavTab = "messages" | "contacts" | "stories" | "notifications" | "profile" | "ai";

const ITEMS: {
  id: MobileNavTab;
  href: string;
  label: string;
  icon: typeof MessageCircle;
  match: (pathname: string) => boolean;
}[] = [
  {
    id: "messages",
    href: "/",
    label: "Tin nhắn",
    icon: MessageCircle,
    match: (p) => p === "/",
  },
  {
    id: "contacts",
    href: "/contacts",
    label: "Danh bạ",
    icon: Users,
    match: (p) => p.startsWith("/contacts"),
  },
  {
    id: "stories",
    href: "/stories",
    label: "Tin",
    icon: GalleryVertical,
    match: (p) => p.startsWith("/stories"),
  },
  {
    id: "notifications",
    href: "/notifications",
    label: "Thông báo",
    icon: Bell,
    match: (p) => p.startsWith("/notifications"),
  },
  {
    id: "profile",
    href: "/settings",
    label: "Cá nhân",
    icon: User,
    match: (p) => p.startsWith("/settings") || p === "/profile",
  },
];

type MobileBottomNavProps = {
  activeTab?: MobileNavTab;
};

export function MobileBottomNav({ activeTab }: MobileBottomNavProps) {
  const pathname = usePathname();
  const aiActive = activeTab === "ai" || pathname.startsWith("/ai");

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--qc-divider)] bg-[var(--qc-card)] pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Điều hướng chính"
    >
      <div className="flex h-14 items-stretch justify-around px-1">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeTab ? activeTab === item.id : item.match(pathname);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium transition ${
                active ? "text-[var(--qc-primary)]" : "text-[var(--qc-text-secondary)]"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.25 : 1.75} />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
        <Link
          href="/ai"
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-medium ${
            aiActive ? "text-[var(--qc-primary)]" : "text-[var(--qc-text-secondary)]"
          }`}
          aria-label="Trợ lý AI"
        >
          <span
            className={`flex h-7 w-7 items-center justify-center rounded-full text-white ${
              aiActive
                ? "bg-gradient-to-br from-[var(--qc-primary-dark)] to-[var(--qc-primary)]"
                : "bg-gradient-to-br from-[var(--qc-primary-dark)] to-[var(--qc-primary)] opacity-90"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="truncate">AI</span>
        </Link>
      </div>
    </nav>
  );
}
