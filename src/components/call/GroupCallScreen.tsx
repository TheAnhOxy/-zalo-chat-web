"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import { AvatarWidget } from "@/src/components/common/AvatarWidget";
import { callService, CallState } from "@/src/services/call/call-service";

export interface GroupPeerInfo {
  userId: string;
  name: string;
  avatar?: string;
}

interface GroupCallScreenProps {
  conversationId: string;
  groupName: string;
  groupAvatar?: string;
  participants: GroupPeerInfo[];
  callerId: string;
  isVideo: boolean;
  isIncoming: boolean;
  callId?: string;
  offer?: RTCSessionDescriptionInit;
  autoAnswer?: boolean;
  returnHref: string;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function fallbackNameFromId(userId: string): string {
  const short = userId.trim();
  if (!short) return "Người dùng";
  return `User ${short.slice(-4).toUpperCase()}`;
}

export function GroupCallScreen({
  conversationId,
  groupName,
  groupAvatar,
  participants,
  callerId,
  isVideo,
  isIncoming,
  callId,
  offer,
  autoAnswer,
  returnHref,
}: GroupCallScreenProps) {
  const router = useRouter();
  const [state, setState] = useState<CallState>(callService.callState);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});
  const [error, setError] = useState<string | null>(null);
  const closingRef = useRef(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const meAndPeers = useMemo(() => {
    const map = new Map<string, GroupPeerInfo>();
    for (const p of participants) {
      const id = p.userId?.trim();
      if (!id) continue;
      map.set(id, {
        userId: id,
        name: p.name?.trim() || fallbackNameFromId(id),
        avatar: p.avatar,
      });
    }
    for (const id of Object.keys(streams)) {
      if (!map.has(id)) {
        map.set(id, {
          userId: id,
          name: fallbackNameFromId(id),
        });
      }
    }
    for (const id of connectedIds) {
      if (!map.has(id)) {
        map.set(id, {
          userId: id,
          name: fallbackNameFromId(id),
        });
      }
    }
    return [...map.values()];
  }, [connectedIds, participants, streams]);

  const goBack = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    router.push(returnHref);
  }, [router, returnHref]);

  useEffect(() => {
    const onState = (s: CallState) => setState(s);
    callService.addStateListener(onState);
    return () => callService.removeStateListener(onState);
  }, []);

  useEffect(() => {
    if (state !== "connected") return;
    const t = window.setInterval(() => setSeconds((v) => v + 1), 1000);
    return () => window.clearInterval(t);
  }, [state]);

  useEffect(() => {
    const normalizeId = (v: unknown) => String(v ?? "").trim();
    const onJoined = (data: Record<string, unknown>) => {
      const id = normalizeId(data.userId);
      if (!id) return;
      setConnectedIds((prev) => new Set([...prev, id]));
    };
    const onLeft = (data: Record<string, unknown>) => {
      const id = normalizeId(data.userId);
      if (!id) return;
      setConnectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setStreams((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    };
    callService.onParticipantJoined = onJoined;
    callService.onParticipantLeft = onLeft;
    callService.onCallStarted = (data) => {
      const startedAt = String(data.startedAt ?? "");
      if (!startedAt) return;
      const elapsed = Math.max(
        0,
        Math.round((Date.now() - new Date(startedAt).getTime()) / 1000)
      );
      setSeconds(elapsed);
    };
    callService.onPeerRemoteStream = (peerId, stream) => {
      setStreams((prev) => ({ ...prev, [peerId]: stream }));
    };
    callService.onLocalStream = (stream) => {
      const local = localVideoRef.current;
      if (!local) return;
      local.srcObject = stream;
      void local.play().catch(() => undefined);
    };
    return () => {
      callService.onParticipantJoined = null;
      callService.onParticipantLeft = null;
      callService.onCallStarted = null;
      callService.onPeerRemoteStream = null;
      callService.onLocalStream = null;
    };
  }, []);

  useEffect(() => {
    Object.entries(streams).forEach(([peerId, stream]) => {
      const el = videoRefs.current[peerId];
      if (!el) return;
      el.srcObject = stream;
      void el.play().catch(() => undefined);
    });
  }, [streams]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isIncoming) {
          if (autoAnswer && callId && offer) {
            await callService.answerCall({
              conversationId,
              callId,
              peerId: callerId,
              offer,
              isVideo,
              isGroup: true,
            });
          } else {
            setState("incoming");
          }
        } else {
          await callService.startGroupCall({
            conversationId,
            participantIds: participants.map((p) => p.userId),
            isVideo,
          });
        }
      } catch {
        if (!cancelled) setError("Không thể bắt đầu cuộc gọi nhóm");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [autoAnswer, callId, callerId, conversationId, isIncoming, isVideo, offer, participants]);

  useEffect(() => {
    if (state !== "ended") return;
    const t = window.setTimeout(goBack, 700);
    return () => window.clearTimeout(t);
  }, [goBack, state]);

  const handleLeave = () => callService.leaveCall();
  const handleReject = () => {
    if (callId) callService.rejectCall(callId, conversationId);
    else callService.leaveCall();
    goBack();
  };
  const handleAccept = async () => {
    if (!callId || !offer) return;
    await callService.answerCall({
      conversationId,
      callId,
      peerId: callerId,
      offer,
      isVideo,
      isGroup: true,
    });
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#0f1218] text-white">
      <div className="px-6 pt-10 text-center">
        <AvatarWidget url={groupAvatar} name={groupName} size={72} />
        <h1 className="mt-3 text-xl font-bold">{groupName}</h1>
        <p className="mt-1 text-sm text-white/70">
          {error ?? (state === "connected" ? formatTimer(seconds) : "Đang kết nối cuộc gọi nhóm...")}
        </p>
      </div>

      <div className="mt-4 grid flex-1 grid-cols-2 gap-3 overflow-auto px-4 pb-36">
        {meAndPeers.map((peer) => {
          const stream = streams[peer.userId];
          const connected = connectedIds.has(peer.userId);
          const hasVideo = Boolean(stream?.getVideoTracks().some((t) => t.enabled));
          return (
            <div key={peer.userId} className="relative aspect-3/4 overflow-hidden rounded-xl bg-[#1a202c]">
              {hasVideo ? (
                <video
                  ref={(el) => {
                    videoRefs.current[peer.userId] = el;
                  }}
                  autoPlay
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2">
                  <AvatarWidget url={peer.avatar} name={peer.name} size={52} />
                  <p className="max-w-[90%] truncate text-xs">{peer.name}</p>
                  <p className={`text-[10px] ${connected ? "text-emerald-300" : "text-white/50"}`}>
                    {connected ? "Đã vào" : "Chưa tham gia"}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isVideo ? (
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className="absolute right-4 top-24 h-32 w-24 rounded-lg border border-white/30 bg-black object-cover"
        />
      ) : null}

      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-6 bg-black/50 px-4 py-6 backdrop-blur">
        {state === "incoming" ? (
          <>
            <button
              type="button"
              onClick={handleReject}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
            <button
              type="button"
              onClick={() => void handleAccept()}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500"
            >
              <Video className="h-6 w-6" />
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => {
                const next = !muted;
                setMuted(next);
                callService.toggleMute(next);
              }}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15"
            >
              {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>
            {isVideo ? (
              <button
                type="button"
                onClick={() => {
                  const next = !camOff;
                  setCamOff(next);
                  callService.toggleVideo(!next);
                }}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15"
              >
                {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleLeave}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
