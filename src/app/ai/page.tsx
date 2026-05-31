"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { AppNavSidebar } from "@/src/components/layout/app-nav-sidebar";
import { AiChatPanel } from "@/src/components/ai/AiChatPanel";
import { PageLoader } from "@/src/components/ui/page-state";

function AiPageContent() {
  const auth = useAuthGuard();
  const searchParams = useSearchParams();
  const targetConversationId = searchParams.get("targetConversationId");
  const autoSummarize = searchParams.get("summarize") === "1";

  if (!auth.isInitialized || !auth.user) return <PageLoader />;

  return (
    <main className="h-screen overflow-hidden bg-[var(--qc-bg)] text-slate-800">
      <div className="h-full w-full md:grid md:grid-cols-[72px_1fr]">
        <AppNavSidebar activeTab="ai" />
        <section className="h-full min-h-0 overflow-hidden">
          <AiChatPanel
            userId={auth.user._id}
            targetConversationId={targetConversationId}
            autoSummarizeOnOpen={autoSummarize && Boolean(targetConversationId)}
          />
        </section>
      </div>
    </main>
  );
}

export default function AiPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AiPageContent />
    </Suspense>
  );
}
