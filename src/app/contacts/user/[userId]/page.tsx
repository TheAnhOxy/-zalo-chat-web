"use client";

import { use } from "react";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { PageLoader } from "@/src/components/ui/page-state";
import { ContactsShell } from "@/src/components/layout/contacts-shell";
import { UserProfileView } from "@/src/components/contacts/UserProfileView";

type PageProps = {
  params: Promise<{ userId: string }>;
};

export default function ContactUserProfilePage({ params }: PageProps) {
  const { userId } = use(params);
  const auth = useAuthGuard();

  if (!auth.isInitialized || !auth.user) {
    return <PageLoader />;
  }

  return (
    <ContactsShell>
      <section className="flex h-full min-h-0 justify-center overflow-hidden bg-[var(--qc-bg)]">
        <div className="h-full w-full max-w-[480px] bg-[var(--qc-bg)] md:border-x md:border-[var(--qc-divider)]">
          <UserProfileView userId={userId} currentUserId={auth.user._id} />
        </div>
      </section>
    </ContactsShell>
  );
}
