export interface IUserPresence {
  userId: string;
  isOnline: boolean;
  lastSeen?: string | Date;
}
