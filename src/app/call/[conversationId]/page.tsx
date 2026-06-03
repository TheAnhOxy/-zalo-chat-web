"use client";

import { Suspense, useEffect, useMemo } from "react";
import { callService } from "@/src/services/call/call-service";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useAuthGuard } from "@/src/hooks/use-auth-guard";
import { CallScreen } from "@/src/components/call/CallScreen";
import { GroupCallScreen } from "@/src/components/call/GroupCallScreen";
import { conversationsApi } from "@/src/services/api/conversations";
import {
  getConversationAvatarUrl,
  getConversationDisplayName,
} from "@/src/lib/conversation-display";
import { profileCacheForUser, usePeerProfile } from "@/src/hooks/usePeerProfile";
import { resolveMemberDisplay, useGroupMemberProfiles } from "@/src/hooks/useGroupMemberProfiles";

function CallPageContent() {
  const auth = useAuthGuard();
  const params = useParams();
  const searchParams = useSearchParams();
  const conversationId = String(params.conversationId ?? "");
  const userId = auth.user?._id;

  const callType = searchParams.get("type") === "video" ? "video" : "voice";
  const isVideo = callType === "video";
  const isIncoming = searchParams.get("incoming") === "1";
  const isGroupFromQuery = searchParams.get("group") === "1";
  const autoAnswer = searchParams.get("autoAnswer") === "1";
  const callId = searchParams.get("callId") ?? undefined;
  const callerIdParam = searchParams.get("callerId") ?? undefined;
  const callerNameParam = searchParams.get("callerName") ?? undefined;
  const callerAvatarParam = searchParams.get("callerAvatar") ?? undefined;
  const peerIdParam = searchParams.get("peerId") ?? undefined;

  const { data: conversation, isLoading } = useQuery({
    queryKey: ["conversation", conversationId, userId],
    queryFn: () => conversationsApi.getById(conversationId),
    enabled: Boolean(conversationId && userId && auth.isAuthenticated),
  });

  const peerUserId = useMemo(() => {
    if (isIncoming && callerIdParam) return callerIdParam;
    if (peerIdParam) return peerIdParam;
    if (!conversation || !userId) return undefined;
    const other = conversation.participants.find((p) => p.userId !== userId);
    return other?.userId;
  }, [callerIdParam, conversation, isIncoming, peerIdParam, userId]);

  const { data: peerUser, isLoading: isPeerUserLoading } = usePeerProfile(peerUserId, Boolean(peerUserId));
  const peerProfiles = profileCacheForUser(peerUserId, peerUser);
  const groupMemberIds = useMemo(() => {
    const ids = (conversation?.participants ?? [])
      .map((p) => p.userId)
      .filter((id): id is string => Boolean(id && id !== userId));
    if (isIncoming && callerIdParam && callerIdParam !== userId) ids.push(callerIdParam);
    return [...new Set(ids)];
  }, [callerIdParam, conversation?.participants, isIncoming, userId]);
  const { profiles: groupMemberProfiles } = useGroupMemberProfiles(groupMemberIds);

  const incomingParticipants = useMemo(() => {
    // When incoming group call, use groupMemberIds with profiles
    if (!isIncoming || !isGroupFromQuery) return undefined;
    
    const ids = groupMemberIds.filter((id) => id !== userId);
    return ids.map((id) => {
      const profile = groupMemberProfiles[id];
      return {
        userId: id,
        name: profile?.fullName || `User ${id.slice(-4).toUpperCase()}`,
        avatar: profile?.avatar,
      };
    });
  }, [isIncoming, isGroupFromQuery, userId, groupMemberIds, groupMemberProfiles]);

  const peer = useMemo(() => {
    if (!peerUserId || !userId) return null;

    if (isIncoming) {
      return {
        userId: peerUserId,
        name: callerNameParam || peerUser?.fullName?.trim() || "Người dùng",
        avatar: callerAvatarParam || peerUser?.avatar,
      };
    }

    if (!conversation) return null;
    const isGroup = conversation.type === "GROUP";
    if (isGroup) return null;

    return {
      userId: peerUserId,
      name: getConversationDisplayName(conversation, userId, peerProfiles),
      avatar: getConversationAvatarUrl(conversation, userId, peerProfiles),
    };
  }, [
    callerAvatarParam,
    callerNameParam,
    conversation,
    isIncoming,
    peerProfiles,
    peerUser,
    peerUserId,
    userId,
  ]);

  const offer = useMemo(() => {
    if (!isIncoming || !callId) return undefined;
    
    // Try to get from callService first
    let storedOffer = callService.getStoredIncomingOffer(callId);
    if (storedOffer) return storedOffer;
    
    // Fallback: try to get directly from sessionStorage
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem(`pending_call_offer_${callId}`);
        if (raw) {
          storedOffer = JSON.parse(raw) as RTCSessionDescriptionInit;
          if (storedOffer && storedOffer.sdp) {
            return storedOffer;
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
    
    return undefined;
  }, [callId, isIncoming]);

  useEffect(() => {
    return () => {
      if (callId) callService.clearStoredIncomingOffer(callId);
    };
  }, [callId]);

  const returnHref = conversationId ? `/?conversation=${conversationId}` : "/";
  const isGroupConversation = conversation?.type === "GROUP";

  // Determine if peer info is still being resolved.
  // For incoming calls: peerUserId comes from callerIdParam (URL) so it's immediately available,
  // but peerUser profile might still be loading. We should wait before evaluating `peer`.
  const isPeerLoading =
    Boolean(peerUserId) &&
    !isGroupConversation &&
    !isGroupFromQuery &&
    isPeerUserLoading &&
    !peer; // once `peer` is resolved, stop waiting

  if (!auth.isInitialized || isLoading || isPeerLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1a2e] text-white">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!conversationId || !userId || (!peer && !isGroupConversation && !isGroupFromQuery)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#1a1a2e] px-6 text-center text-white">
        <p className="text-sm text-white/80">
          {"Không thể bắt đầu cuộc gọi."}
        </p>
        <a href={returnHref} className="text-sm font-semibold text-(--qc-primary) hover:underline">
          Quay lại trò chuyện
        </a>
      </div>
    );
  }

  return (
    isGroupConversation || isGroupFromQuery ? (
      <GroupCallScreen
        conversationId={conversationId}
        groupName={conversation?.name || "Nhóm"}
        groupAvatar={conversation?.avatar}
        participants={
          incomingParticipants ||
          (conversation?.participants ?? [])
            .filter((p) => p.userId !== userId)
            .map((p) => {
              const display = resolveMemberDisplay(
                {
                  userId: p.userId,
                  fullName: p.fullName,
                  avatar: p.avatar,
                },
                groupMemberProfiles
              );
              return {
                userId: p.userId,
                name: display.name,
                avatar: display.avatar,
              };
            })
        }
        callerId={callerIdParam || userId}
        isVideo={isVideo}
        isIncoming={isIncoming}
        callId={callId}
        offer={offer}
        autoAnswer={autoAnswer && Boolean(callId && offer)}
        returnHref={returnHref}
      />
    ) : (
      <CallScreen
        conversationId={conversationId}
        peer={peer!}
        isVideo={isVideo}
        isIncoming={isIncoming}
        callId={callId}
        offer={offer}
        autoAnswer={autoAnswer && Boolean(callId && offer)}
        returnHref={returnHref}
      />
    )
  );
}

export default function CallPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] items-center justify-center bg-slate-950">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      }
    >
      <CallPageContent />
    </Suspense>
  );
}
