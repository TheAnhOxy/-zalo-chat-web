"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  Users,
  GalleryVertical,
  Bell,
  User,
  Sparkles,
} from "lucide-react";
import { useNotifications } from "@/src/hooks/use-notifications";

export type AppNavTab = "messages" | "contacts" | "stories" | "notifications" | "profile" | "ai";

type NavItem = {
  id: AppNavTab;
  href: string;
  label: string;
  icon: typeof MessageCircle;
  match: (pathname: string) => boolean;
};

const MAIN_NAV_ITEMS: NavItem[] = [
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

function resolveActiveTab(pathname: string): AppNavTab | null {
  if (pathname.startsWith("/ai")) return "ai";
  return MAIN_NAV_ITEMS.find((item) => item.match(pathname))?.id ?? null;
}

function NavButton({ item, active, badgeCount, onClick }: { item: NavItem; active: boolean; badgeCount?: number; onClick?: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={item.label}
      aria-label={item.label}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={`relative flex h-12 w-full items-center justify-center transition-colors ${
        active
          ? "bg-[var(--qc-primary-light)] text-[var(--qc-primary)] before:absolute before:left-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-r-full before:bg-[var(--qc-primary)]"
          : "bg-transparent text-[var(--qc-text-secondary)] hover:bg-[#f5f7fa] hover:text-[var(--qc-primary)]"
      }`}
    >
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="absolute right-3 top-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-[var(--qc-card)]">
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </Link>
  );
}

type AppNavSidebarProps = {
  activeTab?: AppNavTab;
};

export function AppNavSidebar({ activeTab }: AppNavSidebarProps) {
  const pathname = usePathname();
  const current = activeTab ?? resolveActiveTab(pathname);
  const { unreadCount, markAllAsRead } = useNotifications();
  const aiActive = current === "ai";

  const handleTabClick = (itemId: AppNavTab) => {
    if (itemId === "notifications" && unreadCount > 0) {
      markAllAsRead();
    }
  };

  return (
    <aside className="relative hidden h-full w-[72px] shrink-0 flex-col items-center border-r border-[var(--qc-divider)] bg-[var(--qc-card)] shadow-[2px_0_8px_rgba(0,0,0,0.04)] md:flex">
      <nav className="flex w-full flex-col items-center gap-0.5 px-0 pt-4">
        {MAIN_NAV_ITEMS.map((item) => (
          <NavButton 
            key={item.id} 
            item={item} 
            active={current === item.id} 
            badgeCount={item.id === "notifications" ? unreadCount : undefined}
            onClick={() => handleTabClick(item.id)}
          />
        ))}

        <div className="my-1.5 h-px w-10 bg-[var(--qc-divider)]" aria-hidden />

        <Link
          href="/ai"
          title="Trợ lý AI"
          aria-label="Trợ lý AI"
          aria-current={aiActive ? "page" : undefined}
          className={`flex h-11 w-11 items-center justify-center rounded-full text-white transition shadow-md ${
            aiActive
              ? "bg-gradient-to-br from-[var(--qc-primary-dark)] to-[var(--qc-primary)] ring-2 ring-[var(--qc-primary)]/35 ring-offset-2 ring-offset-white"
              : "bg-gradient-to-br from-[var(--qc-primary-dark)] to-[var(--qc-primary)] hover:brightness-110 hover:shadow-lg"
          }`}
          style={
            aiActive
              ? undefined
              : { boxShadow: "0 6px 16px rgba(56, 142, 60, 0.35), 0 2px 8px rgba(27, 94, 32, 0.2)" }
          }
        >
          <Sparkles size={20} strokeWidth={2} />
        </Link>
      </nav>
    </aside>
  );
}
