"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { useProfile } from "@/src/hooks/use-user";
import { SettingsLayout } from "@/src/components/settings/settings-layout";
import {
  ProfileHeaderCard,
  SettingsDivider,
  SettingsGroup,
  SettingsOutlineDangerButton,
  SettingsRow,
  SettingsShell,
} from "@/src/components/settings/settings-ui";
import { SETTINGS_MENU_ITEMS } from "@/src/lib/settings-menu";
import { PageLoader } from "@/src/components/ui/page-state";
import { useToast } from "@/src/components/providers/toast-provider";

export default function SettingsPage() {
  const auth = useAuthGuard();
  const router = useRouter();
  const { showToast } = useToast();
  const profileQuery = useProfile(auth.user?._id);
  const [logoutLoading, setLogoutLoading] = useState(false);

  if (!auth.isInitialized || !auth.user) return <PageLoader />;

  const profile = profileQuery.data;
  const userName = profile?.fullName || auth.user.fullName || "Người dùng";
  const userEmail = profile?.email || auth.user.email || "";

  const handleLogout = async () => {
    if (logoutLoading) return;
    setLogoutLoading(true);
    try {
      await auth.logout();
      router.replace("/login");
    } catch {
      showToast("Không thể đăng xuất", "error");
    } finally {
      setLogoutLoading(false);
    }
  };

  return (
    <SettingsLayout>
      <SettingsShell title="Cá nhân">
        <div className="mx-auto max-w-2xl space-y-5 pb-6">
          <ProfileHeaderCard
            userName={userName}
            userEmail={userEmail}
            avatar={profile?.avatar || auth.user.avatar}
            coverImage={profile?.coverImage || auth.user.coverImage}
            onEditProfile={() => router.push("/settings/edit-profile")}
          />

          <SettingsGroup>
            {SETTINGS_MENU_ITEMS.map((item, index) => (
              <div key={item.title}>
                <SettingsRow
                  icon={item.icon}
                  title={item.title}
                  subtitle={item.subtitle}
                  href={item.href}
                  onClick={
                    item.href
                      ? undefined
                      : () => showToast("Tính năng đang phát triển", "success")
                  }
                />
                {index < SETTINGS_MENU_ITEMS.length - 1 ? <SettingsDivider /> : null}
              </div>
            ))}
          </SettingsGroup>

          <SettingsOutlineDangerButton loading={logoutLoading} onClick={() => void handleLogout()}>
            <LogOut size={18} />
            {logoutLoading ? "Đang đăng xuất..." : "Đăng xuất"}
          </SettingsOutlineDangerButton>
        </div>
      </SettingsShell>
    </SettingsLayout>
  );
}
