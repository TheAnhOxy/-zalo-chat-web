"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, PhoneOff, Video, VideoOff, Volume2, VolumeOff } from "lucide-react";
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
  const [speakerOn, setSpeakerOn] = useState(true);
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set());
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});
  const [error, setError] = useState<string | null>(null);
  const closingRef = useRef(false);
  const initializedRef = useRef(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

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
    // Filter out current user when connected
    const myId = callService.currentUserId?.trim();
    const result = [...map.values()];
    if (state === "connected" && myId) {
      return result.filter((p) => p.userId?.trim() !== myId);
    }
    return result;
  }, [connectedIds, participants, state, streams]);

  // Calculate responsive grid layout based on participant count
  const gridLayout = useMemo(() => {
    const count = meAndPeers.length;
    if (count <= 1) return { cols: 1, rows: 1 };
    if (count === 2) return { cols: 2, rows: 1 };
    if (count === 3) return { cols: 3, rows: 1 };
    if (count === 4) return { cols: 2, rows: 2 };
    if (count <= 6) return { cols: 3, rows: 2 };
    if (count <= 9) return { cols: 3, rows: 3 };
    return { cols: 4, rows: Math.ceil(count / 4) };
  }, [meAndPeers.length]);

  const goBack = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    router.push(returnHref);
  }, [router, returnHref]);

  useEffect(() => {
    const onState = (s: CallState) => {
      console.log("[GroupCallScreen] Call state changed:", s);
      setState(s);
    };
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
      // Attach to video element (for video calls)
      const videoEl = videoRefs.current[peerId];
      if (videoEl) {
        videoEl.srcObject = stream;
        void videoEl.play().catch(() => undefined);
      }
      // Always attach to audio element for voice audio playback
      const audioEl = audioRefs.current[peerId];
      if (audioEl) {
        audioEl.srcObject = stream;
        void audioEl.play().catch(() => undefined);
      }
    });
  }, [streams]);

  useEffect(() => {
    // Guard: only initialize once to prevent double-call when deps change (e.g. participants re-render)
    if (initializedRef.current) return;
    initializedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        if (isIncoming) {
          if (autoAnswer && callId && offer) {
            // Validate offer before passing it
            if (!offer.sdp || !offer.type) {
              console.error("[GroupCallScreen] Invalid offer:", { offerType: offer.type, sdpLength: offer.sdp?.length });
              setError("Lỗi: Offer không hợp lệ. Vui lòng thử lại");
              return;
            }
            console.log("[GroupCallScreen] Auto-answering with offer:", { callId, offerSdp: offer.sdp?.slice(0, 50) });
            await callService.answerCall({
              conversationId,
              callId,
              peerId: callerId,
              offer,
              isVideo,
              isGroup: true,
            });
            console.log("[GroupCallScreen] answerCall completed successfully");
          } else {
            console.log("[GroupCallScreen] Manual accept - waiting for user to click accept button", { autoAnswer, callId, hasOffer: !!offer });
            setState("incoming");
          }
        } else {
          console.log("[GroupCallScreen] Starting group call");
          await callService.startGroupCall({
            conversationId,
            participantIds: participants.map((p) => p.userId),
            isVideo,
          });
        }
      } catch (err) {
        console.error("[GroupCallScreen] Error during call initialization:", err);
        if (!cancelled) {
          const errMsg = err instanceof Error ? err.message : String(err);
          setError(`Lỗi khởi tạo cuộc gọi: ${errMsg}`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount — initializedRef guards against StrictMode double-invoke

  useEffect(() => {
    if (state !== "ended") return;
    console.log("[GroupCallScreen] Call ended, will navigate back in 700ms");
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
    try {
      await callService.answerCall({
        conversationId,
        callId,
        peerId: callerId,
        offer,
        isVideo,
        isGroup: true,
      });
    } catch (err) {
      setError("Lỗi khi bắt máy: " + (err instanceof Error ? err.message : "Không xác định"));
    }
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

      <div className="mt-4 flex flex-1 flex-col items-center justify-center px-4 pb-32">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${gridLayout.cols}, minmax(0, 1fr))`,
            gap: "12px",
            width: "100%",
            height: "100%",
            maxHeight: `calc(100vh - 280px)`,
            overflow: "hidden",
          }}
        >
          {meAndPeers.map((peer) => {
            const stream = streams[peer.userId];
            const connected = connectedIds.has(peer.userId);
            const hasVideo = Boolean(stream?.getVideoTracks().some((t) => t.enabled));
            return (
              <div
                key={peer.userId}
                className="relative flex overflow-hidden rounded-xl bg-[#1a202c]"
                style={{ aspectRatio: "3/4" }}
              >
                {/* Hidden audio element — always needed to play remote audio (especially for voice-only calls) */}
                <audio
                  ref={(el) => {
                    audioRefs.current[peer.userId] = el;
                  }}
                  autoPlay
                  playsInline
                  className="hidden"
                />
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
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2">
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
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
              title={muted ? "Bật mic" : "Tắt mic"}
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
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/25"
                title={camOff ? "Bật camera" : "Tắt camera"}
              >
                {camOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                const next = !speakerOn;
                setSpeakerOn(next);
                callService.toggleSpeaker(next);
              }}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                speakerOn ? "bg-white/15 hover:bg-white/25" : "bg-orange-500/60 hover:bg-orange-500"
              }`}
              title={speakerOn ? "Tắt loa" : "Bật loa"}
            >
              {speakerOn ? <Volume2 className="h-5 w-5" /> : <VolumeOff className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={handleLeave}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 transition hover:bg-red-600"
              title="Kết thúc gọi"
            >
              <PhoneOff className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
