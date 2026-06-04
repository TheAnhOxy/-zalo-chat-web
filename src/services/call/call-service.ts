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
type ParticipantListener = (data: Record<string, unknown>) => void;
type PeerStreamListener = (peerId: string, stream: MediaStream) => void;

// ICE Servers: STUN dùng để discover public IP,
// TURN dùng để RELAY media khi 2 peer ở sau NAT khác nhau (bắt buộc cho kết nối qua internet).
// Để dùng TURN server riêng: thay url/username/credential bên dưới.
// Free TURN: https://www.metered.ca/tools/openrelay/ hoặc Cloudflare TURN (có phí)
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    // STUN servers (giúp biết public IP)
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    // TURN servers (relay khi P2P không thể kết nối trực tiếp qua NAT)
    // Dùng OpenRelay free TURN server — thay bằng TURN server riêng cho production
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ],
  // Ưu tiên dùng relay khi các candidate type khác thất bại
  iceCandidatePoolSize: 10,
};

const getKey = (id: string | null | undefined) => (id ?? "").trim();
const toCandidate = (map: Record<string, unknown>): RTCIceCandidateInit => ({
  candidate: String(map.candidate ?? ""),
  sdpMid: map.sdpMid != null ? String(map.sdpMid) : undefined,
  sdpMLineIndex: map.sdpMLineIndex != null ? Number(map.sdpMLineIndex) : undefined,
});

function preferVp8Codec(desc: RTCSessionDescriptionInit): RTCSessionDescriptionInit {
  const sdp = desc.sdp;
  if (!sdp) return desc;
  const lines = sdp.split("\r\n");
  let mVideoIndex: number | null = null;
  const vp8Payloads: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("m=video ")) mVideoIndex = i;
    const match = /^a=rtpmap:(\d+) VP8\/\d+/i.exec(lines[i]);
    if (match) vp8Payloads.push(match[1]);
  }
  if (mVideoIndex == null || vp8Payloads.length === 0) return desc;
  const parts = lines[mVideoIndex].split(" ");
  if (parts.length <= 3) return desc;
  const payloads = parts.slice(3);
  const preferred = payloads.filter((p) => vp8Payloads.includes(p));
  const rest = payloads.filter((p) => !vp8Payloads.includes(p));
  lines[mVideoIndex] = [...parts.slice(0, 3), ...preferred, ...rest].join(" ");
  return { ...desc, sdp: lines.join("\r\n") };
}

class CallService {
  private userId = "";
  private user: AuthUser | null = null;
  private initialized = false;
  private state: CallState = "idle";
  private stateListeners = new Set<StateListener>();

  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private pendingRemoteCandidates = new Map<string, RTCIceCandidateInit[]>();
  private peerHasRemoteDescription = new Map<string, boolean>();

  private currentCallId: string | null = null;
  private currentConversationId: string | null = null;
  private currentPeerId: string | null = null;
  private isStartingCall = false;
  private isGroupCall = false;
  private callMediaIsVideo = false;
  private callConnectedEmitted = false;
  private pendingRejectBeforeCallId = false;
  private pendingRejectConversationId: string | null = null;
  private pendingIncomingOffer: RTCSessionDescriptionInit | null = null;
  private pendingIncomingCallId: string | null = null;

  onIncomingCall: IncomingListener | null = null;
  onLocalStream: StreamListener | null = null;
  onRemoteStream: StreamListener | null = null;
  onPeerRemoteStream: PeerStreamListener | null = null;
  onParticipantJoined: ParticipantListener | null = null;
  onParticipantLeft: ParticipantListener | null = null;
  onCallStarted: ParticipantListener | null = null;

  get callState() {
    return this.state;
  }
  get localMediaStream() {
    return this.localStream;
  }
  get remoteMediaStream() {
    return this.remoteStream;
  }
  get currentCallIdValue() {
    return this.currentCallId;
  }
  get currentUserId() {
    return this.userId;
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
    this.onPeerRemoteStream = null;
    this.onParticipantJoined = null;
    this.onParticipantLeft = null;
    this.onCallStarted = null;
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

  getStoredIncomingOffer(callId: string): RTCSessionDescriptionInit | undefined {
    if (this.pendingIncomingCallId === callId && this.pendingIncomingOffer) return this.pendingIncomingOffer;
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
      this.pendingIncomingCallId = null;
      this.pendingIncomingOffer = null;
    }
    if (typeof window !== "undefined") sessionStorage.removeItem(`pending_call_offer_${callId}`);
  }

  async startCall(params: { conversationId: string; calleeId: string; isVideo?: boolean }) {
    if (this.isStartingCall) return;
    this.isStartingCall = true;
    this.cleanup();
    try {
      const { conversationId, calleeId, isVideo = false } = params;
      this.currentConversationId = conversationId;
      this.currentPeerId = calleeId;
      this.isGroupCall = false;
      this.callMediaIsVideo = isVideo;
      await this.ensureLocalStream(isVideo);
      const pc = await this.createPeerConnection(calleeId, isVideo);
      let offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: isVideo });
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
    } finally {
      this.isStartingCall = false;
    }
  }

  async startGroupCall(params: {
    conversationId: string;
    participantIds: string[];
    isVideo?: boolean;
  }) {
    if (this.isStartingCall) return null;
    this.isStartingCall = true;
    this.cleanup();
    try {
      const { conversationId, participantIds, isVideo = false } = params;
      this.currentConversationId = conversationId;
      this.isGroupCall = true;
      this.callMediaIsVideo = isVideo;
      await this.ensureLocalStream(isVideo);
      const offers: Array<{ targetId: string; offer: RTCSessionDescriptionInit }> = [];
      for (const id of participantIds.map(getKey).filter(Boolean)) {
        const pc = await this.createPeerConnection(id, isVideo);
        let offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: isVideo });
        offer = preferVp8Codec(offer);
        await pc.setLocalDescription(offer);
        offers.push({ targetId: id, offer: { sdp: offer.sdp, type: offer.type } });
      }
      socketService.emit(SOCKET_CALL_CLIENT.startCall, {
        callDto: {
          conversationId,
          callerId: this.userId,
          callerName: this.user?.fullName ?? "",
          callerAvatar: this.user?.avatar ?? "",
          participants: participantIds,
          type: isVideo ? "VIDEO" : "VOICE",
        },
        offers,
      });
      this.setState("calling");
      return this.currentCallId;
    } finally {
      this.isStartingCall = false;
    }
  }

  async answerCall(params: {
    conversationId: string;
    callId: string;
    peerId: string;
    offer: RTCSessionDescriptionInit;
    isVideo?: boolean;
    isGroup?: boolean;
  }) {
    const { conversationId, callId, peerId, offer, isVideo = false, isGroup = false } = params;
    this.currentConversationId = conversationId;
    this.currentCallId = callId;
    this.currentPeerId = peerId;
    this.isGroupCall = isGroup;
    this.callMediaIsVideo = isVideo;
    await this.ensureLocalStream(isVideo);
    const pc = await this.createPeerConnection(peerId, isVideo || this.callMediaIsVideo);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    this.peerHasRemoteDescription.set(getKey(peerId), true);
    await this.flushPendingIce(getKey(peerId), pc);
    let answer = await pc.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: isVideo || this.callMediaIsVideo,
    });
    answer = preferVp8Codec(answer);
    await pc.setLocalDescription(answer);
    socketService.emit(SOCKET_CALL_CLIENT.answerCall, {
      conversationId,
      callId,
      answer: { sdp: answer.sdp, type: answer.type },
      targetId: getKey(peerId),
      sourceId: this.userId,
    });
    this.setState("calling");
    if (isGroup) this.emitConnectedIfReady();
  }

  async joinGroupCall(params: { conversationId: string; callId: string; isVideo?: boolean }) {
    this.currentConversationId = params.conversationId;
    this.currentCallId = params.callId;
    this.isGroupCall = true;
    this.callMediaIsVideo = params.isVideo === true;
    await this.ensureLocalStream(this.callMediaIsVideo);
    this.emitConnectedIfReady();
    this.setState("calling");
  }

  rejectCall(callId: string, conversationId: string) {
    socketService.emit(SOCKET_CALL_CLIENT.rejectCall, { callId, conversationId });
    this.cleanup();
    this.setState("ended");
  }

  leaveCall() {
    if (!this.isGroupCall) return this.endCall();
    if (this.currentCallId && this.currentConversationId) {
      socketService.emit(SOCKET_CALL_CLIENT.leaveCall, {
        callId: this.currentCallId,
        conversationId: this.currentConversationId,
        userId: this.userId,
      });
    }
    this.cleanup();
    this.setState("ended");
  }

  endCall() {
    if (this.state === "ended") return;
    const wasConnected = this.state === "connected";
    this.setState("ended");
    if (this.currentCallId && this.currentConversationId) {
      socketService.emit(wasConnected ? SOCKET_CALL_CLIENT.endCall : SOCKET_CALL_CLIENT.rejectCall, {
        callId: this.currentCallId,
        conversationId: this.currentConversationId,
      });
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
    this.localStream?.getAudioTracks().forEach((t) => (t.enabled = !mute));
  }
  toggleVideo(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((t) => (t.enabled = enabled));
  }
  /**
   * Web: tắt/bật âm thanh từ xa.
   * Mute cả <audio> lẫn <video> vì trong group video call, remote stream
   * được phát qua <video autoPlay> — nếu chỉ mute audio thì loa vẫn phát.
   */
  toggleSpeaker(speakerOn: boolean) {
    if (typeof document === "undefined") return;
    // Mute remote audio elements (voice call, group voice call)
    document.querySelectorAll("audio").forEach((el) => {
      el.muted = !speakerOn;
    });
    // Mute remote video elements (1-1 video call, group video call)
    // Chỉ mute các video element KHÔNG phải local PiP (local video luôn muted=true sẵn)
    document.querySelectorAll("video").forEach((el) => {
      // Bỏ qua local video (đã có attribute muted cố định)
      if (el.hasAttribute("data-local")) return;
      el.muted = !speakerOn;
    });
  }

  private registerSocketHandlers() {
    socketService.on(SOCKET_CALL_SERVER.incomingCall, this.onIncomingCallEvent);
    socketService.on(SOCKET_CALL_SERVER.callCreated, this.onCallCreated);
    socketService.on(SOCKET_CALL_SERVER.callAnswered, this.onCallAnswered);
    socketService.on(SOCKET_CALL_SERVER.iceCandidate, this.onIceCandidate);
    socketService.on(SOCKET_CALL_SERVER.callEnded, this.onCallEnded);
    socketService.on(SOCKET_CALL_SERVER.callRejected, this.onCallRejected);
    socketService.on(SOCKET_CALL_SERVER.callOffer, this.onCallOffer);
    socketService.on(SOCKET_CALL_SERVER.participantJoined, this.onParticipantJoinedEvent);
    socketService.on(SOCKET_CALL_SERVER.participantLeft, this.onParticipantLeftEvent);
    socketService.on(SOCKET_CALL_SERVER.activeParticipants, this.onActiveParticipantsEvent);
    socketService.on(SOCKET_CALL_SERVER.callStarted, this.onCallStartedEvent);
  }
  private disposeSocketHandlers() {
    socketService.off(SOCKET_CALL_SERVER.incomingCall, this.onIncomingCallEvent);
    socketService.off(SOCKET_CALL_SERVER.callCreated, this.onCallCreated);
    socketService.off(SOCKET_CALL_SERVER.callAnswered, this.onCallAnswered);
    socketService.off(SOCKET_CALL_SERVER.iceCandidate, this.onIceCandidate);
    socketService.off(SOCKET_CALL_SERVER.callEnded, this.onCallEnded);
    socketService.off(SOCKET_CALL_SERVER.callRejected, this.onCallRejected);
    socketService.off(SOCKET_CALL_SERVER.callOffer, this.onCallOffer);
    socketService.off(SOCKET_CALL_SERVER.participantJoined, this.onParticipantJoinedEvent);
    socketService.off(SOCKET_CALL_SERVER.participantLeft, this.onParticipantLeftEvent);
    socketService.off(SOCKET_CALL_SERVER.activeParticipants, this.onActiveParticipantsEvent);
    socketService.off(SOCKET_CALL_SERVER.callStarted, this.onCallStartedEvent);
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
      participants: Array.isArray(map.participants) ? map.participants.map((p) => String(p)) : undefined,
      groupName: map.groupName != null ? String(map.groupName) : undefined,
      groupAvatar: map.groupAvatar != null ? String(map.groupAvatar) : undefined,
    };
    if (payload.offer && payload.callId && typeof window !== "undefined") {
      this.pendingIncomingOffer = payload.offer;
      this.pendingIncomingCallId = payload.callId;
      sessionStorage.setItem(`pending_call_offer_${payload.callId}`, JSON.stringify(payload.offer));
    }
    if (!payload.isGroup) this.setState("incoming");
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
      const responderId = getKey(String(map.responderId ?? map.sourceId ?? this.currentPeerId ?? ""));
      const pc = this.findPeerConnection(responderId);
      if (!pc) return;
      const answerMap = map.answer as Record<string, unknown> | undefined;
      if (!answerMap) return;
      const answer: RTCSessionDescriptionInit = {
        sdp: String(answerMap.sdp ?? ""),
        type: (answerMap.type as RTCSdpType) ?? "answer",
      };
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      const key = responderId || "default";
      this.peerHasRemoteDescription.set(key, true);
      await this.flushPendingIce(key, pc);
    } catch (e) {
      console.error("[Call] call_answered error:", e);
    }
  };

  private onIceCandidate = async (data: unknown) => {
    try {
      const map = data as Record<string, unknown>;
      const targetId = getKey(String(map.targetId ?? ""));
      if (targetId && targetId !== getKey(this.userId)) return;
      const sourceId = getKey(String(map.sourceId ?? ""));
      const peerId = sourceId || this.currentPeerId || "default";
      const candidate = toCandidate(map);
      const pc = this.findPeerConnection(peerId);
      if (!pc || !this.peerHasRemoteDescription.get(peerId)) {
        this.pendingRemoteCandidates.set(peerId, [...(this.pendingRemoteCandidates.get(peerId) ?? []), candidate]);
        return;
      }
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.error("[Call] ice_candidate error:", e);
    }
  };

  private onCallOffer = async (data: unknown) => {
    try {
      const map = data as Record<string, unknown>;
      const targetId = getKey(String(map.targetId ?? ""));
      if (targetId && targetId !== getKey(this.userId)) return;
      const sourceId = getKey(String(map.sourceId ?? ""));
      if (!sourceId || sourceId === getKey(this.userId)) return;
      const offerMap = (map.offer as Record<string, unknown>) ?? {};
      const offer: RTCSessionDescriptionInit = {
        sdp: String(offerMap.sdp ?? ""),
        type: (offerMap.type as RTCSdpType) ?? "offer",
      };
      this.currentCallId = this.currentCallId ?? String(map.callId ?? "");
      await this.answerPeerOffer(sourceId, offer);
    } catch (e) {
      console.error("[Call] call_offer error:", e);
    }
  };

  private onParticipantJoinedEvent = (data: unknown) => {
    const map = data as Record<string, unknown>;
    this.onParticipantJoined?.(map);
    const joinedId = getKey(String(map.userId ?? ""));
    if (this.isGroupCall) this.ensureMeshToPeer(joinedId);
  };
  private onParticipantLeftEvent = (data: unknown) => {
    this.onParticipantLeft?.(data as Record<string, unknown>);
  };
  private onActiveParticipantsEvent = (data: unknown) => {
    const map = data as Record<string, unknown>;
    const ids = Array.isArray(map.activeParticipants) ? map.activeParticipants.map((id) => String(id)) : [];
    for (const id of ids) {
      const key = getKey(id);
      if (!key || key === getKey(this.userId)) continue;
      this.onParticipantJoined?.({ userId: key });
      if (this.isGroupCall) this.ensureMeshToPeer(key);
    }
  };
  private onCallStartedEvent = (data: unknown) => {
    this.onCallStarted?.(data as Record<string, unknown>);
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

  private async ensureLocalStream(isVideo: boolean) {
    if (this.localStream) return;
    if (isVideo) {
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode: "user" } });
      } catch {
        try {
          this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        } catch {
          this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        }
      }
    } else {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    }
    this.onLocalStream?.(this.localStream);
  }

  private findPeerConnection(peerId: string) {
    const key = getKey(peerId);
    if (key && this.peerConnections.has(key)) return this.peerConnections.get(key) ?? null;
    return this.peerConnections.values().next().value ?? null;
  }

  private async createPeerConnection(peerId: string, isVideo: boolean) {
    const key = getKey(peerId) || "default";
    if (this.peerConnections.has(key)) return this.peerConnections.get(key)!;
    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peerConnections.set(key, pc);
    this.peerHasRemoteDescription.set(key, false);
    this.pendingRemoteCandidates.set(key, []);
    if (this.localStream) this.localStream.getTracks().forEach((t) => pc.addTrack(t, this.localStream!));
    pc.onicecandidate = (event) => {
      if (!event.candidate?.candidate) return;
      socketService.emit(SOCKET_CALL_CLIENT.iceCandidate, {
        conversationId: this.currentConversationId,
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
        targetId: key,
        sourceId: this.userId,
      });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        this.emitConnectedIfReady();
        if (this.state !== "connected") this.setState("connected");
      } else if ((pc.connectionState === "disconnected" || pc.connectionState === "failed") && !this.isGroupCall) {
        this.endCall();
      }
    };
    pc.ontrack = (event) => {
      const stream = event.streams[0] ?? (() => {
        const s = new MediaStream();
        s.addTrack(event.track);
        return s;
      })();
      this.remoteStream = stream;
      if (this.isGroupCall) this.onPeerRemoteStream?.(key, stream);
      this.onRemoteStream?.(stream);
      if (this.state === "calling") {
        this.emitConnectedIfReady();
        this.setState("connected");
      }
    };
    if (isVideo && this.localStream?.getVideoTracks().length === 0) {
      this.callMediaIsVideo = true;
    }
    return pc;
  }

  private async flushPendingIce(peerId: string, pc: RTCPeerConnection) {
    const pending = [...(this.pendingRemoteCandidates.get(peerId) ?? [])];
    this.pendingRemoteCandidates.set(peerId, []);
    for (const c of pending) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {
        // ignore invalid ICE candidate
      }
    }
  }

  private shouldInitiateOfferWith(peerId: string) {
    const myId = getKey(this.userId);
    return Boolean(myId && peerId && myId !== peerId && myId < peerId);
  }
  private ensureMeshToPeer(peerId: string) {
    const key = getKey(peerId);
    if (!key || key === getKey(this.userId) || this.peerConnections.has(key)) return;
    if (this.shouldInitiateOfferWith(key)) void this.createOfferForPeer(key);
  }
  private async createOfferForPeer(peerId: string) {
    const key = getKey(peerId);
    if (!this.isGroupCall || !key || !this.currentConversationId) return;
    await this.ensureLocalStream(this.callMediaIsVideo);
    const pc = await this.createPeerConnection(key, this.callMediaIsVideo);
    let offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: this.callMediaIsVideo,
    });
    offer = preferVp8Codec(offer);
    await pc.setLocalDescription(offer);
    socketService.emit(SOCKET_CALL_CLIENT.callOffer, {
      conversationId: this.currentConversationId,
      callId: this.currentCallId,
      targetId: key,
      sourceId: this.userId,
      offer: { sdp: offer.sdp, type: offer.type },
    });
  }
  private async answerPeerOffer(peerId: string, offer: RTCSessionDescriptionInit) {
    if (!this.isGroupCall) return;
    const key = getKey(peerId);
    await this.ensureLocalStream(this.callMediaIsVideo);
    const pc = await this.createPeerConnection(key, this.callMediaIsVideo);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    this.peerHasRemoteDescription.set(key, true);
    await this.flushPendingIce(key, pc);
    let answer = await pc.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: this.callMediaIsVideo,
    });
    answer = preferVp8Codec(answer);
    await pc.setLocalDescription(answer);
    socketService.emit(SOCKET_CALL_CLIENT.answerCall, {
      conversationId: this.currentConversationId,
      callId: this.currentCallId,
      answer: { sdp: answer.sdp, type: answer.type },
      targetId: key,
      sourceId: this.userId,
    });
  }

  private cleanup() {
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.pendingRemoteCandidates.clear();
    this.peerHasRemoteDescription.clear();
    this.currentCallId = null;
    this.currentConversationId = null;
    this.currentPeerId = null;
    this.isGroupCall = false;
    this.callMediaIsVideo = false;
    this.callConnectedEmitted = false;
    this.pendingRejectBeforeCallId = false;
    this.pendingRejectConversationId = null;
    if (this.state !== "ended") this.state = "idle";
  }
}

export const callService = new CallService();
