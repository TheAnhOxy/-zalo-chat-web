"use client";

import Link from "next/link";
import { ChevronRight, LucideIcon } from "lucide-react";
import Image from "next/image";
import { ReactNode } from "react";

export const settingsInputClass =
  "mt-1 h-11 w-full rounded-xl border border-[var(--qc-divider)] bg-[var(--qc-bg)] px-3 text-sm text-[var(--qc-text-primary)] outline-none focus:border-[var(--qc-primary)] focus:ring-2 focus:ring-[var(--qc-primary)]/20";

export const settingsLabelClass = "text-sm font-medium text-[var(--qc-text-primary)]";

export function SettingsShell({
  children,
  title,
  backHref = "/settings",
  action,
}: {
  children: ReactNode;
  title: string;
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <section className="flex h-full min-h-0 flex-col bg-[var(--qc-bg)]">
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--qc-divider)] bg-[var(--qc-bg)] px-4 py-4 md:px-6">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="rounded-lg px-2 py-1 text-sm font-medium text-[var(--qc-primary)] hover:bg-[var(--qc-primary-light)] md:hidden"
          >
            ←
          </Link>
          <h1 className="text-lg font-bold text-[var(--qc-text-primary)]">{title}</h1>
        </div>
        {action}
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5">{children}</div>
    </section>
  );
}

export function SettingsCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-[var(--qc-divider)] bg-[var(--qc-card)] p-4 md:p-[18px] ${className}`}
    >
      {children}
    </div>
  );
}

export function SettingsGroup({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--qc-divider)] bg-[var(--qc-card)]">
      {children}
    </div>
  );
}

export function SettingsRow({
  icon: Icon,
  title,
  subtitle,
  href,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[var(--qc-bg)] text-[var(--qc-primary)]">
        <Icon size={22} strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-[var(--qc-text-primary)]">{title}</p>
        <p className="text-[13px] text-[var(--qc-text-secondary)]">{subtitle}</p>
      </div>
      <ChevronRight size={22} className="shrink-0 text-[var(--qc-text-secondary)] opacity-60" />
    </>
  );

  const className =
    "flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-[var(--qc-bg)]";

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

export function SettingsDivider() {
  return <div className="mx-5 h-px bg-[var(--qc-divider)]" />;
}

export function SettingsPrimaryButton({
  children,
  loading,
  type = "button",
  onClick,
}: {
  children: ReactNode;
  loading?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={loading}
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center rounded-[14px] bg-[var(--qc-primary)] text-sm font-semibold text-[var(--qc-text-primary)] transition hover:brightness-95 disabled:opacity-60"
    >
      {loading ? "Đang xử lý..." : children}
    </button>
  );
}

export function SettingsOutlineDangerButton({
  children,
  loading,
  onClick,
}: {
  children: ReactNode;
  loading?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-[14px] border border-[#e41e3f] bg-[var(--qc-card)] text-sm font-semibold text-[#e41e3f] transition hover:bg-rose-50 disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function ProfileHeaderCard({
  userName,
  userEmail,
  avatar,
  coverImage,
  onEditProfile,
}: {
  userName: string;
  userEmail: string;
  avatar?: string;
  coverImage?: string;
  onEditProfile: () => void;
}) {
  const initial = userName.charAt(0).toUpperCase();

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--qc-divider)] bg-[var(--qc-card)]">
      <div className="relative min-h-[140px]">
        {coverImage ? (
          <Image src={coverImage} alt="" fill className="object-cover" unoptimized />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg, #1a3a1a 0%, #1f4a1f 50%, #2e662e 100%)",
            }}
          />
        )}
        <div
          className={`absolute inset-0 ${coverImage ? "bg-black/38" : "bg-[var(--qc-card)]/95"}`}
        />
        <div className="relative flex flex-col items-center px-5 py-6">
          <div className="relative">
            <div className="relative h-[82px] w-[82px] overflow-hidden rounded-full border-4 border-[var(--qc-bg)] bg-[var(--qc-primary-light)]">
              {avatar ? (
                <Image src={avatar} alt={userName} fill className="object-cover" unoptimized />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-[var(--qc-primary)]">
                  {initial}
                </span>
              )}
            </div>
            <Link
              href="/settings/edit-profile"
              className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--qc-bg)] bg-[var(--qc-primary)] text-[var(--qc-text-primary)]"
              title="Chỉnh sửa hồ sơ"
            >
              ✎
            </Link>
          </div>
          <h2 className="mt-4 text-xl font-bold text-[var(--qc-text-primary)]">{userName}</h2>
          <p className="mt-1.5 text-sm text-[var(--qc-text-secondary)]">{userEmail}</p>
          <button
            type="button"
            onClick={onEditProfile}
            className="mt-4 w-full rounded-[14px] bg-[var(--qc-primary)] py-3.5 text-sm font-semibold text-[var(--qc-text-primary)] transition hover:brightness-95"
          >
            Chỉnh sửa hồ sơ
          </button>
        </div>
      </div>
    </div>
  );
}
