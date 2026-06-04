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

// Fallback ICE config — có cả STUN và TURN (OpenRelay) để vẫn kết nối được khi backend fail
// OpenRelay là công cộng, không ổn định — chỉ làm fallback kờ để tránh mất kết nối hoàn toàn
const FALLBACK_ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    // TURN fallback — nếu backend fail, vẫn có TURN để xuyên NAT 4G
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
  ],
  iceCandidatePoolSize: 10,
};

/**
 * Lấy ICE config từ backend.
 * Đã có cơ chế retry 1 lần + timeout 5s để tránh treo.
 * Fallback: STUN + TURN OpenRelay (vẫn kết nối được, ít ổn hơn Metered nhưng đủ dùng).
 * 
 * Lưu ý: Hàm này chỉ nên gọi 1 lần mỗi cuộc gọi và cache lại
 * (xem cachedIceConfig trong CallService).
 */
async function fetchIceConfigOnce(userId: string): Promise<RTCConfiguration> {
  const attempt = async (): Promise<RTCConfiguration> => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081";
    const { getStoredTokens } = await import("@/src/utils/storage");
    const token = getStoredTokens()?.accessToken ?? "";
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000); // 5s timeout
    try {
      const res = await fetch(
        `${baseUrl}/calls/ice-config?userId=${encodeURIComponent(userId)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          cache: "no-store",
          signal: controller.signal,
        },
      );
      if (!res.ok) throw new Error(`ice-config HTTP ${res.status}`);
      const body = (await res.json()) as { iceServers: RTCIceServer[] };
      if (!Array.isArray(body?.iceServers) || body.iceServers.length === 0) {
        throw new Error("ice-config response invalid");
      }
      return { iceServers: body.iceServers, iceCandidatePoolSize: 10 };
    } finally {
      window.clearTimeout(timeout);
    }
  };

  try {
    return await attempt();
  } catch (err1) {
    console.warn("[ICE] fetch ice-config lần 1 thất bại, thử lại sau 1s:", err1);
    // Retry 1 lần sau 1 giây (trường hợp mạng chậm hoặc server vừa khởi động)
    await new Promise((r) => window.setTimeout(r, 1000));
    try {
      return await attempt();
    } catch (err2) {
      console.warn("[ICE] fetch ice-config thất bại sau 2 lần, dùng fallback có TURN:", err2);
      return FALLBACK_ICE_CONFIG; // Fallback: STUN + TURN OpenRelay
    }
  }
}

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
  // Cache ICE config cho toàn bộ 1 cuộc gọi — tránh fetch riêng cho mỗi peer.
  // Trong group call có 3 người, nếu không cache sẽ fetch 3 lần riêng biệt
  // → một số peer có TURN, một số không (fallback STUN) → kết nối lúc được lúc không!
  private cachedIceConfig: RTCConfiguration | null = null;
  private iceConfigFetchPromise: Promise<RTCConfiguration> | null = null;

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
    // BUG FIX: Reset stale "ended" state khi có incoming call mới.
    // Sau khi 1 call kết thúc, state = "ended" và cleanup() KHÔNG reset về "idle"
    // (vì guard: if (this.state !== "ended") this.state = "idle").
    // Nếu không reset ở đây, GroupCallScreen sẽ mount với state = "ended"
    // → useEffect sẽ ngay lập tức gọi goBack() → văng ra khỏi phòng.
    if (this.state === "ended") {
      this.state = "idle";
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
      // BUG FIX: Dùng findPeerConnectionEntry để lấy đúng actualKey trong Map.
      // Code cũ: const key = responderId || "default" → sai khi responderId rỗng
      // → peerHasRemoteDescription.set("default") và flushPendingIce("default", ...)
      // → candidates được queue dưới key thật (userId) nhưng flush dưới "default" → KHÔNG flush!
      const entry = this.findPeerConnectionEntry(responderId);
      if (!entry) {
        console.warn("[Call] call_answered: no PeerConnection for responderId:", responderId);
        return;
      }
      const [actualKey, pc] = entry;
      const answerMap = map.answer as Record<string, unknown> | undefined;
      if (!answerMap) return;
      const answer: RTCSessionDescriptionInit = {
        sdp: String(answerMap.sdp ?? ""),
        type: (answerMap.type as RTCSdpType) ?? "answer",
      };
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      // Dùng actualKey (key thật trong Map) — đảm bảo flush đúng candidates
      this.peerHasRemoteDescription.set(actualKey, true);
      await this.flushPendingIce(actualKey, pc);
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
      // peerId = người đã gửi candidate này (source)
      const peerId = sourceId || this.currentPeerId || "default";
      const candidate = toCandidate(map);
      // Dùng findPeerConnectionEntry để biết actualKey được dùng trong Map.
      // ICE candidates được queue dưới peerId (sourceId), nhưng
      // peerHasRemoteDescription được set dưới actualKey.
      // Hai key này có thể khác nhau nếu fallback xảy ra.
      const entry = this.findPeerConnectionEntry(peerId);
      const actualKey = entry?.[1] ? (this.getKeyForPc(entry[1]) ?? peerId) : peerId;
      if (!entry || !this.peerHasRemoteDescription.get(actualKey)) {
        // Queue dưới peerId — sẽ flush khi setRemoteDescription xong (flushPendingIce)
        const queue = this.pendingRemoteCandidates.get(peerId) ?? [];
        queue.push(candidate);
        this.pendingRemoteCandidates.set(peerId, queue);
        return;
      }
      await entry[1].addIceCandidate(new RTCIceCandidate(candidate));
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

  private onCallEnded = (data?: unknown) => {
    // NOTE: Guard trước đây (forced/allLeft) đã được XÓA bật vì sai.
    // Stale "ended" state (lý do thực sự gây văng khỏi phòng) đã được fix bằng:
    //   - cleanup() luôn reset state = "idle"
    //   - onIncomingCallEvent reset state khi call mới đến
    //   - hasCalledRef guard trong GroupCallScreen/CallScreen
    // Bây giờ: khi server gửi "call_ended" → luôn kết thúc call, bất kể group hay 1-1.
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

  /**
   * Tìm [actualKey, PeerConnection] theo peerId.
   * Trả về actualKey được dùng trong Map — cần thiết để flush đúng candidates.
   * BUG FIX: Code cũ dùng `responderId || "default"` làm key → sai khi responderId rỗng.
   */
  private findPeerConnectionEntry(peerId: string): [string, RTCPeerConnection] | null {
    const key = getKey(peerId);
    if (key && this.peerConnections.has(key)) return [key, this.peerConnections.get(key)!];
    // 1-1 call: chỉ có 1 PC, an toàn trả về với KEY THẬT của nó
    if (!this.isGroupCall && this.peerConnections.size === 1) {
      const entries = [...this.peerConnections.entries()];
      return entries[0] ?? null;
    }
    // Group call: không fallback — trả null để tránh routing sai
    if (key) console.warn(`[WebRTC] findPeerConnectionEntry: "${key}" not found (${this.peerConnections.size} peers)`);
    return null;
  }

  /** Reverse lookup: lấy key từ PeerConnection instance */
  private getKeyForPc(pc: RTCPeerConnection): string | undefined {
    for (const [k, v] of this.peerConnections) {
      if (v === pc) return k;
    }
    return undefined;
  }

  /**
   * Tìm PeerConnection theo peerId (backward compat).
   * BUG FIX: Code cũ có fallback về PC đầu tiên trong Map nếu không tìm thấy peerId.
   * Trong group call, fallback này có thể route ICE candidate tới SAI PeerConnection.
   */
  private findPeerConnection(peerId: string): RTCPeerConnection | null {
    return this.findPeerConnectionEntry(peerId)?.[1] ?? null;
  }

  /**
   * Lấy ICE config — cache dùng chung cho toàn bộ 1 cuộc gọi.
   * BUG FIX: Trước đây mỗi createPeerConnection gọi fetchIceConfig() riêng.
   * Trong group call 3 người → 3 fetch → nếu 1 fetch fail → peer đó STUN-only
   * → kết nối khác mạng fail ngẫu nhiên. Bây giờ chỉ fetch 1 lần, share cho tất cả.
   */
  private getOrFetchIceConfig(): Promise<RTCConfiguration> {
    if (this.cachedIceConfig) return Promise.resolve(this.cachedIceConfig);
    if (!this.iceConfigFetchPromise) {
      this.iceConfigFetchPromise = fetchIceConfigOnce(this.userId).then((cfg) => {
        this.cachedIceConfig = cfg;
        return cfg;
      });
    }
    return this.iceConfigFetchPromise;
  }

  private async createPeerConnection(peerId: string, isVideo: boolean) {
    const key = getKey(peerId) || "default";
    if (this.peerConnections.has(key)) return this.peerConnections.get(key)!;
    // Dùng ICE config đã cache — đảm bảo TẤT CẢ peers trong 1 call dùng cùng config (đều có TURN)
    const iceConfig = await this.getOrFetchIceConfig();
    const pc = new RTCPeerConnection(iceConfig);
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
      const state = pc.connectionState;
      console.log(`[WebRTC] Peer "${key}" connectionState: ${state}`);
      if (state === "connected") {
        this.emitConnectedIfReady();
        if (this.state !== "connected") this.setState("connected");
      } else if (state === "failed") {
        if (!this.isGroupCall) {
          // 1-1 call: kết thúc người dùng
          this.endCall();
        } else {
          // Group call: thử ICE restart — chờ 2s trước retry
          // ICE restart tạo offer mới với tham số iceRestart:true → reset ICE gathering
          console.warn(`[WebRTC] Group peer "${key}" failed. Attempting ICE restart in 2s...`);
          window.setTimeout(async () => {
            // Kiểm tra: PC vẫn còn trong map và vẫn ở failed state
            if (!this.peerConnections.has(key) || pc.connectionState !== "failed") return;
            try {
              const offer = await pc.createOffer({ iceRestart: true });
              await pc.setLocalDescription(offer);
              socketService.emit(SOCKET_CALL_CLIENT.callOffer, {
                conversationId: this.currentConversationId,
                callId: this.currentCallId,
                targetId: key,
                sourceId: this.userId,
                offer: { sdp: offer.sdp, type: offer.type },
              });
              console.log(`[WebRTC] ICE restart offer sent to "${key}"`);
            } catch (err) {
              console.error(`[WebRTC] ICE restart failed for "${key}":`, err);
            }
          }, 2000);
        }
      } else if (state === "disconnected" && !this.isGroupCall) {
        // 1-1: disconnected thường do mạng yếu, đợi thêm 5s rồi mới kết thúc
        window.setTimeout(() => {
          if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
            this.endCall();
          }
        }, 5000);
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
    // Reset ICE cache — cuộc gọi mới cần fetch ICE config mới (credentials có TTL)
    this.cachedIceConfig = null;
    this.iceConfigFetchPromise = null;
    // BUG FIX: Luôn reset state về "idle" sau cleanup.
    // Code cũ: if (this.state !== "ended") this.state = "idle"
    // → Nếu state = "ended", KHÔNG reset → stale state tồn tại sang call tiếp theo
    // → GroupCallScreen mount với state = "ended" → ngay lập tức goBack()!
    this.state = "idle";
  }
}

export const callService = new CallService();
