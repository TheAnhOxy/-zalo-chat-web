"use client";

import { MessageCircle, Users, Heart, Send, Globe, Smile, Shield, Zap } from "lucide-react";

export function AuthShell({
  title,
  subtitle,
  heroText,
  children,
}: {
  title?: string;
  subtitle?: string;
  heroText?: string;
  children: React.ReactNode;
}) {
  if (heroText) {
    // Split layout for login page
    return (
      <div className="auth-shell-bg">
        {/* Animated gradient background orbs */}
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />

        {/* Floating Icons */}
        <FloatingIcons />

        <div className="auth-split-container">
          {/* Left panel: Welcome / Tagline */}
          <div className="auth-split-left">
            <div className="auth-brand-left">
              <div className="auth-logo-icon">
                <MessageCircle className="size-8 fill-white text-white" />
              </div>
              <h1 className="auth-brand-name-left">QuickChat</h1>
            </div>
            
            <div className="auth-hero-section">
              <h2 className="auth-hero-text">{heroText}</h2>
              <div className="auth-hero-decorations">
                <div className="auth-dot auth-dot-1" />
                <div className="auth-dot auth-dot-2" />
                <div className="auth-dot auth-dot-3" />
              </div>
            </div>
          </div>

          {/* Right panel: Login card */}
          <div className="auth-split-right">
            <div className="auth-card">
              {title ? (
                <div className="auth-card-header">
                  <h2 className="auth-card-title">{title}</h2>
                  {subtitle ? <p className="auth-card-subtitle">{subtitle}</p> : null}
                </div>
              ) : null}
              <div className="auth-card-body">{children}</div>
            </div>
            
            <p className="auth-footer">
              © 2025 QuickChat — Nền tảng giao tiếp thời gian thực
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Standard centered layout for other auth pages (register, forgot password, etc.)
  return (
    <div className="auth-shell-bg">
      {/* Animated gradient background orbs */}
      <div className="auth-orb auth-orb-1" />
      <div className="auth-orb auth-orb-2" />
      <div className="auth-orb auth-orb-3" />

      {/* Floating Icons */}
      <FloatingIcons />

      {/* Main container */}
      <div className="auth-card-container">
        {/* Brand Logo */}
        <div className="auth-brand">
          <div className="auth-logo-icon">
            <MessageCircle className="size-8 fill-white text-white" />
          </div>
          <h1 className="auth-brand-name">QuickChat</h1>
          <p className="auth-brand-tagline">Kết nối bạn bè, chia sẻ khoảnh khắc</p>
        </div>

        {/* Card */}
        <div className="auth-card">
          {title ? (
            <div className="auth-card-header">
              <h2 className="auth-card-title">{title}</h2>
              {subtitle ? <p className="auth-card-subtitle">{subtitle}</p> : null}
            </div>
          ) : null}
          <div className="auth-card-body">{children}</div>
        </div>

        {/* Footer */}
        <p className="auth-footer">
          © 2025 QuickChat — Nền tảng giao tiếp thời gian thực
        </p>
      </div>
    </div>
  );
}

/* Shared floating background icons */
function FloatingIcons() {
  return (
    <>
      <div className="auth-floating-icon" style={{ left: "6%", top: "10%" }}>
        <MessageCircle className="size-10 md:size-14" />
      </div>
      <div className="auth-floating-icon auth-floating-icon-reverse" style={{ right: "8%", top: "12%" }}>
        <Users className="size-12 md:size-16" />
      </div>
      <div className="auth-floating-icon" style={{ left: "10%", bottom: "15%" }}>
        <Send className="size-8 md:size-12" />
      </div>
      <div className="auth-floating-icon auth-floating-icon-reverse" style={{ right: "6%", bottom: "18%" }}>
        <Heart className="size-10 md:size-14" />
      </div>
      <div className="auth-floating-icon" style={{ left: "20%", top: "40%" }}>
        <Globe className="size-8 md:size-10" />
      </div>
      <div className="auth-floating-icon auth-floating-icon-reverse" style={{ right: "18%", top: "55%" }}>
        <Smile className="size-8 md:size-10" />
      </div>
      <div className="auth-floating-icon" style={{ left: "5%", top: "60%" }}>
        <Shield className="size-7 md:size-9" />
      </div>
      <div className="auth-floating-icon auth-floating-icon-reverse" style={{ right: "5%", top: "30%" }}>
        <Zap className="size-7 md:size-9" />
      </div>
    </>
  );
}
