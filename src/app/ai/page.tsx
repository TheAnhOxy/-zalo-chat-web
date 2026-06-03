"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { AiShell } from "@/src/components/layout/ai-shell";
import { AiChatPanel } from "@/src/components/ai/AiChatPanel";
import { PageLoader } from "@/src/components/ui/page-state";

function AiPageContent() {
  const auth = useAuthGuard();
  const searchParams = useSearchParams();
  const targetConversationId = searchParams.get("targetConversationId");
  const autoSummarize = searchParams.get("summarize") === "1";

  if (!auth.isInitialized || !auth.user) return <PageLoader />;

  return (
    <AiShell>
      <section className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <AiChatPanel
          layout="page"
          userId={auth.user._id}
          targetConversationId={targetConversationId}
          autoSummarizeOnOpen={autoSummarize && Boolean(targetConversationId)}
        />
      </section>
    </AiShell>
  );
}

export default function AiPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AiPageContent />
    </Suspense>
  );
}
