"use client";

import { use } from "react";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { ChatWindow } from "@/src/components/chat/ChatWindow";
import { PageLoader } from "@/src/components/ui/page-state";

type PageProps = {
  params: Promise<{ conversationId: string }>;
};

export default function ChatConversationPage({ params }: PageProps) {
  const { conversationId } = use(params);
  const auth = useAuthGuard();

  if (!auth.isInitialized || !auth.user) {
    return <PageLoader />;
  }

  return (
    <main className="relative mx-auto flex h-[100dvh] max-w-4xl flex-col bg-white md:my-4 md:h-[calc(100dvh-2rem)] md:rounded-xl md:border md:shadow-lg">
      <ChatWindow conversationId={conversationId} />
    </main>
  );
}
