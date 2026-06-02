"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/components/providers/auth-provider";
import { IncomingCallModal } from "@/src/components/call/IncomingCallModal";
import { callService } from "@/src/services/call/call-service";
import { IncomingCallPayload } from "@/src/services/socket/call-events";

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [incoming, setIncoming] = useState<IncomingCallPayload | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?._id) {
      callService.dispose();
      setIncoming(null);
      return;
    }

    callService.init(user);

    callService.onIncomingCall = (payload) => {
      if (payload.isGroup) {
        setIncoming(payload);
        return;
      }
      setIncoming(payload);
    };

    const onState = (state: typeof callService.callState) => {
      if (state === "ended") setIncoming(null);
    };
    callService.addStateListener(onState);

    return () => {
      callService.onIncomingCall = null;
      callService.removeStateListener(onState);
    };
  }, [isAuthenticated, user]);

  const dismissIncoming = useCallback(() => setIncoming(null), []);

  const handleReject = useCallback(() => {
    if (!incoming) return;
    if (incoming.callId && incoming.conversationId) {
      callService.rejectCall(incoming.callId, incoming.conversationId);
    }
    dismissIncoming();
  }, [dismissIncoming, incoming]);

  const handleAccept = useCallback(() => {
    if (!incoming) return;
    const type = incoming.type === "VIDEO" ? "video" : "voice";
    const params = new URLSearchParams({
      type,
      incoming: "1",
      callId: incoming.callId,
      callerId: incoming.callerId,
      autoAnswer: "1",
    });
    if (incoming.isGroup) params.set("group", "1");
    if (incoming.callerName) params.set("callerName", incoming.callerName);
    if (incoming.callerAvatar) params.set("callerAvatar", incoming.callerAvatar);

    if (incoming.offer && incoming.callId && typeof window !== "undefined") {
      sessionStorage.setItem(
        `pending_call_offer_${incoming.callId}`,
        JSON.stringify(incoming.offer)
      );
    }

    dismissIncoming();
    router.push(`/call/${incoming.conversationId}?${params.toString()}`);
  }, [dismissIncoming, incoming, router]);

  return (
    <>
      {children}
      {incoming ? (
        <IncomingCallModal call={incoming} onAccept={handleAccept} onReject={handleReject} />
      ) : null}
    </>
  );
}
