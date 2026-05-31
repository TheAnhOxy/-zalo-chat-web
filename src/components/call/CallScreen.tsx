"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Volume2,
} from "lucide-react";
import { AvatarWidget } from "@/src/components/common/AvatarWidget";
import { callService, CallState } from "@/src/services/call/call-service";

export interface CallPeerInfo {
  userId: string;
  name: string;
  avatar?: string;
}

interface CallScreenProps {
  conversationId: string;
  peer: CallPeerInfo;
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

function statusLabel(state: CallState, isIncoming: boolean, isVideo: boolean): string {
  switch (state) {
    case "incoming":
      return isVideo ? "Cuộc gọi video đến..." : "Cuộc gọi thoại đến...";
    case "calling":
      return isVideo ? "Đang gọi video..." : "Đang gọi...";
    case "connected":
      return "Đang kết nối";
    case "ended":
      return "Cuộc gọi đã kết thúc";
    default:
      return isIncoming ? "Cuộc gọi đến" : "Đang khởi tạo...";
  }
}

export function CallScreen({
  conversationId,
  peer,
  isVideo,
  isIncoming,
  callId,
  offer,
  autoAnswer = false,
  returnHref,
}: CallScreenProps) {
  const router = useRouter();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const [callState, setCallState] = useState<CallState>(callService.callState);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [speaker, setSpeaker] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const closingRef = useRef(false);

  const connected = callState === "connected";
  const wasConnectedRef = useRef(false);
  if (connected) wasConnectedRef.current = true;

  const goBack = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    router.push(returnHref);
  }, [router, returnHref]);

  const handleEnd = useCallback(() => {
    callService.endCall();
  }, []);

  const handleAccept = useCallback(async () => {
    if (!callId || !offer) {
      setError("Thiếu thông tin cuộc gọi");
      return;
    }
    try {
      await callService.answerCall({
        conversationId,
        callId,
        peerId: peer.userId,
        offer,
        isVideo,
      });
    } catch {
      setError("Không thể trả lời cuộc gọi");
    }
  }, [callId, conversationId, isVideo, offer, peer.userId]);

  const handleReject = useCallback(() => {
    if (callId) {
      callService.rejectCall(callId, conversationId);
    } else {
      callService.endCall();
    }
    goBack();
  }, [callId, conversationId, goBack]);

  useEffect(() => {
    const onState = (s: CallState) => setCallState(s);
    callService.addStateListener(onState);
    return () => callService.removeStateListener(onState);
  }, []);

  useEffect(() => {
    if (callState !== "connected") return;
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [callState]);

  useEffect(() => {
    if (callState !== "ended") return;
    const delay = wasConnectedRef.current ? 1200 : 400;
    const t = window.setTimeout(goBack, delay);
    return () => window.clearTimeout(t);
  }, [callState, goBack]);

  useEffect(() => {
    const attachLocal = (stream: MediaStream) => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        void localVideoRef.current.play().catch(() => undefined);
      }
    };
    const attachRemote = (stream: MediaStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        void remoteVideoRef.current.play().catch(() => undefined);
      }
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        void remoteAudioRef.current.play().catch(() => undefined);
      }
    };

    callService.onLocalStream = attachLocal;
    callService.onRemoteStream = attachRemote;

    if (callService.localMediaStream) attachLocal(callService.localMediaStream);
    if (callService.remoteMediaStream) attachRemote(callService.remoteMediaStream);

    return () => {
      callService.onLocalStream = null;
      callService.onRemoteStream = null;
    };
  }, []);

  useEffect(() => {
    if (initialized) return;
    let cancelled = false;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setError("Trình duyệt không hỗ trợ cuộc gọi");
          return;
        }

        if (isIncoming) {
          if (autoAnswer && callId && offer) {
            await callService.answerCall({
              conversationId,
              callId,
              peerId: peer.userId,
              offer,
              isVideo,
            });
          } else {
            setCallState("incoming");
          }
        } else {
          await callService.startCall({
            conversationId,
            calleeId: peer.userId,
            isVideo,
          });
        }
      } catch {
        if (!cancelled) setError("Không truy cập được micro/camera");
      } finally {
        if (!cancelled) setInitialized(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    autoAnswer,
    callId,
    conversationId,
    initialized,
    isIncoming,
    isVideo,
    offer,
    peer.userId,
  ]);

  useEffect(() => {
    return () => {
      const s = callService.callState;
      if (s === "calling" || s === "connected") {
        callService.endCall();
      }
    };
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    callService.toggleMute(next);
  };

  const toggleVideo = () => {
    const next = !videoOff;
    setVideoOff(next);
    callService.toggleVideo(!next);
  };

  const bgClass = isVideo
    ? "bg-[#0d1117]"
    : "bg-gradient-to-b from-[#1a3a1a] to-[#0d1f0d]";

  return (
    <div className={`relative flex min-h-screen flex-col text-white ${bgClass}`}>
      {/* Remote video (full screen for video call) */}
      {isVideo ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 h-full w-full object-cover ${
            connected ? "opacity-100" : "opacity-30"
          }`}
        />
      ) : null}

      {/* Local PiP */}
      {isVideo ? (
        <div className="absolute right-4 top-20 z-20 h-36 w-28 overflow-hidden rounded-xl border-2 border-white/30 bg-black shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover ${videoOff ? "opacity-0" : ""}`}
          />
          {videoOff ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <VideoOff className="h-8 w-8 text-white/70" />
            </div>
          ) : null}
        </div>
      ) : null}

      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />

      <div className="relative z-10 flex flex-1 flex-col items-center px-6 pb-10 pt-16">
        {!isVideo || !connected ? (
          <div className="mt-8 flex flex-col items-center">
            <div
              className={`rounded-full p-1 ${
                callState === "calling" || callState === "incoming"
                  ? "animate-pulse ring-4 ring-white/20"
                  : ""
              }`}
            >
              <AvatarWidget url={peer.avatar} name={peer.name} size={120} />
            </div>
            <h1 className="mt-6 text-center text-2xl font-bold">{peer.name}</h1>
            <p className="mt-2 text-center text-sm text-white/70">
              {error ?? (connected ? formatTimer(seconds) : statusLabel(callState, isIncoming, isVideo))}
            </p>
          </div>
        ) : (
          <div className="mt-4 text-center">
            <p className="text-lg font-semibold drop-shadow-md">{peer.name}</p>
            <p className="mt-1 text-sm text-white/80 drop-shadow">
              {error ?? (connected ? formatTimer(seconds) : statusLabel(callState, isIncoming, isVideo))}
            </p>
          </div>
        )}

        <div className="mt-auto flex w-full max-w-md items-center justify-center gap-6">
          {callState === "incoming" ? (
            <>
              <button
                type="button"
                onClick={handleReject}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 shadow-lg hover:bg-red-600"
                aria-label="Từ chối"
              >
                <PhoneOff className="h-7 w-7" />
              </button>
              <button
                type="button"
                onClick={() => void handleAccept()}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--qc-primary)] shadow-lg hover:brightness-95"
                aria-label="Trả lời"
              >
                <Phone className="h-7 w-7" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleMute}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
                aria-label={muted ? "Bật mic" : "Tắt mic"}
              >
                {muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </button>

              <button
                type="button"
                onClick={handleEnd}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 shadow-lg hover:bg-red-600"
                aria-label="Kết thúc"
              >
                <PhoneOff className="h-7 w-7" />
              </button>

              {isVideo ? (
                <button
                  type="button"
                  onClick={toggleVideo}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 hover:bg-white/25"
                  aria-label={videoOff ? "Bật camera" : "Tắt camera"}
                >
                  {videoOff ? (
                    <VideoOff className="h-6 w-6" />
                  ) : (
                    <Video className="h-6 w-6" />
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setSpeaker((s) => !s)}
                  className={`flex h-14 w-14 items-center justify-center rounded-full ${
                    speaker ? "bg-white/15" : "bg-white/5"
                  } hover:bg-white/25`}
                  aria-label="Loa ngoài"
                >
                  <Volume2 className="h-6 w-6" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
