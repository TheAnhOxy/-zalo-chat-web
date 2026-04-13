export type CallType = 'VOICE' | 'VIDEO';
export type CallStatus = 'CALLING' | 'ACCEPTED' | 'REJECTED' | 'MISSED' | 'ENDED';
export interface ICall {
  _id: string;
  conversationId: string;
  callerId: string;
  participants: string[];
  type: CallType;
  status: CallStatus;
  startedAt?: Date;
  endedAt?: Date;
  duration: number;
  createdAt: Date;
}

