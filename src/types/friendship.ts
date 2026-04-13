export type FriendStatus = 'PENDING' | 'ACCEPTED' | 'BLOCKED';
export interface IFriendship {
  _id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendStatus;
  createdAt: Date;
  updatedAt: Date;
}