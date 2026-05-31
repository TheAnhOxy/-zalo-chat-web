/** Socket events for WebRTC calls — matches backend CallsGateway + mobile call_service.dart */

export const SOCKET_CALL_CLIENT = {
  startCall: "start_call",
  answerCall: "answer_call",
  rejectCall: "reject_call",
  endCall: "end_call",
  leaveCall: "leave_call",
  iceCandidate: "ice_candidate",
  callConnected: "call_connected",
  callOffer: "call_offer",
} as const;

export const SOCKET_CALL_SERVER = {
  incomingCall: "incoming_call",
  callCreated: "call_created",
  callAnswered: "call_answered",
  iceCandidate: "ice_candidate",
  callEnded: "call_ended",
  callRejected: "call_rejected",
  callStarted: "call_started",
  participantJoined: "participant_joined",
  participantLeft: "participant_left",
  activeParticipants: "active_participants",
  callOffer: "call_offer",
} as const;

export type CallMediaType = "VOICE" | "VIDEO";

export interface IncomingCallPayload {
  callId: string;
  conversationId: string;
  callerId: string;
  callerName?: string;
  callerAvatar?: string;
  type: CallMediaType;
  offer?: RTCSessionDescriptionInit;
  isGroup?: boolean;
  participants?: string[];
  groupName?: string;
  groupAvatar?: string;
}
