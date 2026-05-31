import { socketService } from "@/src/services/socket/socket.service";
import {
  IncomingCallPayload,
  SOCKET_CALL_CLIENT,
  SOCKET_CALL_SERVER,
} from "@/src/services/socket/call-events";
import { AuthUser } from "@/src/types/auth";

export type CallState = "idle" | "calling" | "incoming" | "connected" | "ended";

type StateListener = (state: CallState) => void;
type StreamListener = (stream: MediaStream) => void;
type IncomingListener = (data: IncomingCallPayload) => void;

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function peerKey(id: string | null | undefined): string {
  return (id ?? "").trim();
}

function preferVp8Codec(desc: RTCSessionDescriptionInit): RTCSessionDescriptionInit {
  const sdp = desc.sdp;
  if (!sdp) return desc;

  const lines = sdp.split("\r\n");
  let mVideoIndex: number | null = null;
  const vp8Payloads: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("m=video ")) mVideoIndex = i;
    const match = /^a=rtpmap:(\d+) VP8\/\d+/i.exec(line);
    if (match) vp8Payloads.push(match[1]);
  }

  if (mVideoIndex == null || vp8Payloads.length === 0) return desc;

  const mParts = lines[mVideoIndex].split(" ");
  if (mParts.length <= 3) return desc;

  const header = mParts.slice(0, 3);
  const payloads = mParts.slice(3);
  const preferred: string[] = [];
  const rest: string[] = [];

  for (const p of payloads) {
    if (vp8Payloads.includes(p)) preferred.push(p);
    else rest.push(p);
  }

  lines[mVideoIndex] = [...header, ...preferred, ...rest].join(" ");
  return { ...desc, sdp: lines.join("\r\n") };
}

function sdpConstraints(isVideo: boolean): RTCOfferOptions {
  return {
    offerToReceiveAudio: true,
    offerToReceiveVideo: isVideo,
  };
}

class CallService {
  private userId = "";
  private user: AuthUser | null = null;
  private initialized = false;

  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  private pendingIce: RTCIceCandidateInit[] = [];
  private hasRemoteDescription = false;

  private state: CallState = "idle";
  private currentCallId: string | null = null;
  private currentConversationId: string | null = null;
  private currentPeerId: string | null = null;

  private isStartingCall = false;
  private isVideoCall = false;
  private callConnectedEmitted = false;
  private pendingRejectBeforeCallId = false;
  private pendingRejectConversationId: string | null = null;
  private pendingIncomingOffer: RTCSessionDescriptionInit | null = null;
  private pendingIncomingCallId: string | null = null;

  private stateListeners = new Set<StateListener>();
  onIncomingCall: IncomingListener | null = null;
  onLocalStream: StreamListener | null = null;
  onRemoteStream: StreamListener | null = null;

  get callState(): CallState {
    return this.state;
  }

  get localMediaStream(): MediaStream | null {
    return this.localStream;
  }

  get remoteMediaStream(): MediaStream | null {
    return this.remoteStream;
  }

  get currentCallIdValue(): string | null {
    return this.currentCallId;
  }

  init(user: AuthUser) {
    if (this.initialized && this.userId === user._id) return;
    this.disposeSocketHandlers();
    this.userId = user._id;
    this.user = user;
    this.initialized = true;
    this.registerSocketHandlers();
  }

  dispose() {
    this.disposeSocketHandlers();
    this.cleanup();
    this.userId = "";
    this.user = null;
    this.initialized = false;
    this.onIncomingCall = null;
    this.onLocalStream = null;
    this.onRemoteStream = null;
  }

  addStateListener(listener: StateListener) {
    this.stateListeners.add(listener);
    listener(this.state);
  }

  removeStateListener(listener: StateListener) {
    this.stateListeners.delete(listener);
  }

  private setState(next: CallState) {
    this.state = next;
    for (const l of this.stateListeners) l(next);
  }

  private emitConnectedIfReady() {
    if (this.callConnectedEmitted) return;
    if (!this.currentCallId || !this.currentConversationId || !this.userId) return;
    this.callConnectedEmitted = true;
    socketService.emit(SOCKET_CALL_CLIENT.callConnected, {
      callId: this.currentCallId,
      conversationId: this.currentConversationId,
      userId: this.userId,
    });
  }

  getStoredIncomingOffer(callId: string): RTCSessionDescriptionInit | undefined {
    if (this.pendingIncomingCallId === callId && this.pendingIncomingOffer) {
      return this.pendingIncomingOffer;
    }
    if (typeof window === "undefined") return undefined;
    const raw = sessionStorage.getItem(`pending_call_offer_${callId}`);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as RTCSessionDescriptionInit;
    } catch {
      return undefined;
    }
  }

  clearStoredIncomingOffer(callId: string) {
    if (this.pendingIncomingCallId === callId) {
      this.pendingIncomingOffer = null;
      this.pendingIncomingCallId = null;
    }
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(`pending_call_offer_${callId}`);
    }
  }

  async startCall({
    conversationId,
    calleeId,
    isVideo = false,
  }: {
    conversationId: string;
    calleeId: string;
    isVideo?: boolean;
  }): Promise<void> {
    if (this.isStartingCall) return;
    this.isStartingCall = true;
    this.cleanup();
    this.setState("idle");

    try {
      this.currentConversationId = conversationId;
      this.currentPeerId = calleeId;
      this.isVideoCall = isVideo;

      await this.ensureLocalStream(isVideo);
      const pc = await this.createPeerConnection(calleeId, isVideo);

      let offer = await pc.createOffer(sdpConstraints(isVideo));
      offer = preferVp8Codec(offer);
      await pc.setLocalDescription(offer);

      socketService.emit(SOCKET_CALL_CLIENT.startCall, {
        callDto: {
          conversationId,
          callerId: this.userId,
          callerName: this.user?.fullName ?? "",
          callerAvatar: this.user?.avatar ?? "",
          participants: [calleeId],
          type: isVideo ? "VIDEO" : "VOICE",
        },
        offer: { sdp: offer.sdp, type: offer.type },
      });

      this.setState("calling");
    } catch (e) {
      console.error("[Call] startCall error:", e);
      this.cleanup();
      throw e;
    } finally {
      this.isStartingCall = false;
    }
  }

  async answerCall({
    conversationId,
    callId,
    peerId,
    offer,
    isVideo = false,
  }: {
    conversationId: string;
    callId: string;
    peerId: string;
    offer: RTCSessionDescriptionInit;
    isVideo?: boolean;
  }): Promise<void> {
    try {
      this.currentConversationId = conversationId;
      this.currentCallId = callId;
      this.currentPeerId = peerId;
      this.isVideoCall = isVideo;

      await this.ensureLocalStream(isVideo);
      const pc = await this.createPeerConnection(peerId, isVideo);

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      this.hasRemoteDescription = true;
      await this.flushPendingIce(pc);

      let answer = await pc.createAnswer(sdpConstraints(isVideo));
      answer = preferVp8Codec(answer);
      await pc.setLocalDescription(answer);

      socketService.emit(SOCKET_CALL_CLIENT.answerCall, {
        conversationId,
        callId,
        answer: { sdp: answer.sdp, type: answer.type },
        targetId: peerKey(peerId),
        sourceId: this.userId,
      });

      this.setState("calling");
    } catch (e) {
      console.error("[Call] answerCall error:", e);
      this.cleanup();
      throw e;
    }
  }

  rejectCall(callId: string, conversationId: string) {
    socketService.emit(SOCKET_CALL_CLIENT.rejectCall, { callId, conversationId });
    this.cleanup();
    this.setState("ended");
  }

  endCall() {
    if (this.state === "ended") return;
    const wasConnected = this.state === "connected";

    this.setState("ended");

    if (this.currentCallId && this.currentConversationId) {
      if (wasConnected) {
        socketService.emit(SOCKET_CALL_CLIENT.endCall, {
          callId: this.currentCallId,
          conversationId: this.currentConversationId,
        });
      } else {
        socketService.emit(SOCKET_CALL_CLIENT.rejectCall, {
          callId: this.currentCallId,
          conversationId: this.currentConversationId,
        });
      }
    } else if (this.currentConversationId && !wasConnected) {
      this.pendingRejectBeforeCallId = true;
      this.pendingRejectConversationId = this.currentConversationId;
      socketService.emit(SOCKET_CALL_CLIENT.rejectCall, {
        conversationId: this.currentConversationId,
        callerId: this.userId,
      });
    }

    this.cleanup();
  }

  toggleMute(mute: boolean) {
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !mute;
    });
  }

  toggleVideo(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => {
      t.enabled = enabled;
    });
  }

  private registerSocketHandlers() {
    socketService.on(SOCKET_CALL_SERVER.incomingCall, this.onIncomingCallEvent);
    socketService.on(SOCKET_CALL_SERVER.callCreated, this.onCallCreated);
    socketService.on(SOCKET_CALL_SERVER.callAnswered, this.onCallAnswered);
    socketService.on(SOCKET_CALL_SERVER.iceCandidate, this.onIceCandidate);
    socketService.on(SOCKET_CALL_SERVER.callEnded, this.onCallEnded);
    socketService.on(SOCKET_CALL_SERVER.callRejected, this.onCallRejected);
  }

  private disposeSocketHandlers() {
    socketService.off(SOCKET_CALL_SERVER.incomingCall, this.onIncomingCallEvent);
    socketService.off(SOCKET_CALL_SERVER.callCreated, this.onCallCreated);
    socketService.off(SOCKET_CALL_SERVER.callAnswered, this.onCallAnswered);
    socketService.off(SOCKET_CALL_SERVER.iceCandidate, this.onIceCandidate);
    socketService.off(SOCKET_CALL_SERVER.callEnded, this.onCallEnded);
    socketService.off(SOCKET_CALL_SERVER.callRejected, this.onCallRejected);
  }

  private onIncomingCallEvent = (data: unknown) => {
    const map = data as Record<string, unknown>;
    const payload: IncomingCallPayload = {
      callId: String(map.callId ?? ""),
      conversationId: String(map.conversationId ?? ""),
      callerId: String(map.callerId ?? ""),
      callerName: map.callerName != null ? String(map.callerName) : undefined,
      callerAvatar: map.callerAvatar != null ? String(map.callerAvatar) : undefined,
      type: map.type === "VIDEO" ? "VIDEO" : "VOICE",
      offer: map.offer as RTCSessionDescriptionInit | undefined,
      isGroup: map.isGroup === true,
      participants: Array.isArray(map.participants)
        ? map.participants.map((p) => String(p))
        : undefined,
      groupName: map.groupName != null ? String(map.groupName) : undefined,
      groupAvatar: map.groupAvatar != null ? String(map.groupAvatar) : undefined,
    };

    if (payload.offer && payload.callId) {
      this.pendingIncomingOffer = payload.offer;
      this.pendingIncomingCallId = payload.callId;
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          `pending_call_offer_${payload.callId}`,
          JSON.stringify(payload.offer)
        );
      }
    }

    if (payload.isGroup) {
      this.onIncomingCall?.(payload);
      return;
    }

    this.setState("incoming");
    this.onIncomingCall?.(payload);
  };

  private onCallCreated = (data: unknown) => {
    const map = data as Record<string, unknown>;
    const callId = String(map.callId ?? "");
    if (callId) this.currentCallId = callId;

    const createdConversationId = String(map.conversationId ?? "");
    if (
      this.pendingRejectBeforeCallId &&
      this.currentCallId &&
      this.pendingRejectConversationId &&
      (!createdConversationId || createdConversationId === this.pendingRejectConversationId)
    ) {
      socketService.emit(SOCKET_CALL_CLIENT.rejectCall, {
        callId: this.currentCallId,
        conversationId: this.pendingRejectConversationId,
      });
      this.pendingRejectBeforeCallId = false;
      this.pendingRejectConversationId = null;
    }
  };

  private onCallAnswered = async (data: unknown) => {
    try {
      const map = data as Record<string, unknown>;
      const groupReject = map.isGroup === true;
      if (groupReject) return;

      const pc = this.pc;
      if (!pc) return;

      const answerMap = map.answer as Record<string, unknown> | undefined;
      if (!answerMap) return;

      const answer: RTCSessionDescriptionInit = {
        sdp: String(answerMap.sdp ?? ""),
        type: (answerMap.type as RTCSdpType) ?? "answer",
      };

      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      this.hasRemoteDescription = true;
      await this.flushPendingIce(pc);
    } catch (e) {
      console.error("[Call] call_answered error:", e);
    }
  };

  private onIceCandidate = async (data: unknown) => {
    try {
      const map = data as Record<string, unknown>;
      const targetId = peerKey(map.targetId as string);
      if (targetId && targetId !== peerKey(this.userId)) return;

      const candidate: RTCIceCandidateInit = {
        candidate: String(map.candidate ?? ""),
        sdpMid: map.sdpMid != null ? String(map.sdpMid) : undefined,
        sdpMLineIndex:
          map.sdpMLineIndex != null ? Number(map.sdpMLineIndex) : undefined,
      };

      const pc = this.pc;
      if (!pc) {
        this.pendingIce.push(candidate);
        return;
      }

      if (!this.hasRemoteDescription) {
        this.pendingIce.push(candidate);
        return;
      }

      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error("[Call] ice_candidate error:", e);
    }
  };

  private onCallEnded = () => {
    this.cleanup();
    this.setState("ended");
  };

  private onCallRejected = (data: unknown) => {
    const map = data as Record<string, unknown>;
    if (map.isGroup === true) return;
    this.cleanup();
    this.setState("ended");
  };

  private async ensureLocalStream(isVideo: boolean) {
    if (this.localStream) return;

    if (isVideo) {
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: { facingMode: "user" },
        });
      } catch {
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: true,
          });
        } catch {
          this.localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
        }
      }
    } else {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    }

    if (this.pc && this.localStream) {
      for (const track of this.localStream.getTracks()) {
        this.pc.addTrack(track, this.localStream);
      }
    }

    this.onLocalStream?.(this.localStream);
  }

  private async createPeerConnection(peerId: string, _isVideo: boolean): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.pc = pc;
    this.hasRemoteDescription = false;
    this.pendingIce = [];

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }

    pc.onicecandidate = (event) => {
      if (!event.candidate?.candidate) return;
      socketService.emit(SOCKET_CALL_CLIENT.iceCandidate, {
        conversationId: this.currentConversationId,
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
        targetId: peerKey(peerId),
        sourceId: this.userId,
      });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        this.emitConnectedIfReady();
        if (this.state !== "connected") this.setState("connected");
      } else if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        this.endCall();
      }
    };

    pc.ontrack = (event) => {
      const stream =
        event.streams[0] ??
        (() => {
          const s = new MediaStream();
          s.addTrack(event.track);
          return s;
        })();

      this.remoteStream = stream;
      this.onRemoteStream?.(stream);

      if (this.state === "calling") {
        this.emitConnectedIfReady();
        this.setState("connected");
      }
    };

    return pc;
  }

  private async flushPendingIce(pc: RTCPeerConnection) {
    const pending = [...this.pendingIce];
    this.pendingIce = [];
    for (const c of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch (e) {
        console.warn("[Call] flush ICE failed:", e);
      }
    }
  }

  private cleanup() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;

    this.remoteStream = null;

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    this.pendingIce = [];
    this.hasRemoteDescription = false;
    this.currentCallId = null;
    this.currentConversationId = null;
    this.currentPeerId = null;
    this.isVideoCall = false;
    this.callConnectedEmitted = false;
    this.pendingRejectBeforeCallId = false;
    this.pendingRejectConversationId = null;

    if (this.state !== "ended") {
      this.state = "idle";
    }
  }
}

export const callService = new CallService();
